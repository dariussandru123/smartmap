import { useState, useEffect, useRef } from 'react';
import {
  Building2,
  FileCheck,
  AlertCircle,
  Loader2,
  MessageSquare,
  Map as MapIcon,
  FileText,
  Menu,
  Search,
  FilePlus,
  Calendar,
  User,
  MapPin,
  Download,
  Database,
  Save,
  X,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import Map from './Map';
import FeedbackModal from './FeedbackModal';
import AgriculturalRegistry from './AgriculturalRegistry';
import UrbanismCertificateForm from './UrbanismCertificateForm';
import { parseShapefile, type ShapefileLayer } from '../utils/shapefileParser';
import type { LatLngBounds } from 'leaflet';
import { contractService } from '../services/contractService';
import { urbanismService } from '../services/urbanismService';
import { gisDataService, type GISDataEntry } from '../services/gisDataService';
import type { UrbanismCertificate } from '../types/urbanism';
import { pdf } from '@react-pdf/renderer';
import UrbanismCertificatePDF from './UrbanismCertificatePDF';

type Tab = 'gis' | 'registry' | 'urbanism' | 'data';

interface GISFormData {
  proprietar: string;
  cf: string;
  suprafata: string;
  observatii: string;
}

export default function UATDashboardNew() {
  const { currentUser, userData } = useAuth();
  const [layers, setLayers] = useState<ShapefileLayer[]>([]);
  const [bounds, setBounds] = useState<LatLngBounds | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('Inițializare...');
  const [error, setError] = useState('');
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);

  // Navigation
  const [activeTab, setActiveTab] = useState<Tab>('gis');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Registry redirect
  const [registrySearchTerm, setRegistrySearchTerm] = useState('');

  // Urbanism
  const [showUrbanismForm, setShowUrbanismForm] = useState(false);
  const [urbanismSearchCf, setUrbanismSearchCf] = useState('');
  const [showCfSearchModal, setShowCfSearchModal] = useState(false);
  const [certificates, setCertificates] = useState<UrbanismCertificate[]>([]);
  const [loadingCertificates, setLoadingCertificates] = useState(false);
  const [downloadingCertId, setDownloadingCertId] = useState<string | null>(null);

  // GIS Data Entry
  const [gisFormData, setGisFormData] = useState<GISFormData>({
    proprietar: '',
    cf: '',
    suprafata: '',
    observatii: ''
  });
  const [submittingGisData, setSubmittingGisData] = useState(false);
  const [gisDataSuccess, setGisDataSuccess] = useState(false);
  const [gisDataEntries, setGisDataEntries] = useState<GISDataEntry[]>([]);
  const [loadingGisEntries, setLoadingGisEntries] = useState(false);

  const prevUserUidRef = useRef<string | null>(null);

  // Load shapefile on mount
  useEffect(() => {
    let isMounted = true;

    async function loadAssignedShapefile() {
      if (!currentUser || !userData) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        setLoadingMessage('Se verifică contul...');
        setLoadingProgress(10);

        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
          if (isMounted) {
            setError('Contul UAT nu a fost găsit');
            setLoading(false);
          }
          return;
        }

        const data = userDoc.data();

        if (!data.shapefileUrl) {
          if (isMounted) {
            setError('Nu aveți o hartă asignată încă. Vă rugăm să contactați administratorul.');
            setLoading(false);
          }
          return;
        }

        setLoadingMessage('Se pregătește descărcarea...');
        setLoadingProgress(20);

        const urlParts = data.shapefileUrl.split('/o/')[1];
        const storagePath = decodeURIComponent(urlParts.split('?')[0]);
        const fileRef = ref(storage, storagePath);

        setLoadingMessage('Se obține link-ul de descărcare...');
        setLoadingProgress(30);

        const downloadUrl = await getDownloadURL(fileRef);
        const idToken = await currentUser.getIdToken();

        setLoadingMessage('Se descarcă fișierul...');
        setLoadingProgress(50);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        try {
          const response = await fetch(downloadUrl, {
            headers: { Authorization: `Bearer ${idToken}` },
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

          setLoadingMessage('Se procesează fișierul...');
          setLoadingProgress(60);

          const blob = await response.blob();

          if (blob.size === 0) throw new Error('Downloaded file is empty');

          const file = new File([blob], data.shapefileMetadata?.fileName || 'shapefile.zip');

          setLoadingMessage('Se analizează harta...');
          setLoadingProgress(70);

          const { layers: parsedLayers, bounds: fileBounds } = await parseShapefile(file);

          setLoadingMessage('Se încarcă harta...');
          setLoadingProgress(90);

          if (isMounted) {
            setLayers(parsedLayers);
            setBounds(fileBounds);
            setError('');
            setLoadingProgress(100);
            setTimeout(() => setLoading(false), 300);
          }
        } catch (fetchError) {
          clearTimeout(timeoutId);
          throw fetchError;
        }
      } catch (err: any) {
        console.error('Error loading shapefile:', err);
        if (!isMounted) return;

        let errorMessage = 'Eroare la încărcarea hărții.';
        if (err.code === 'storage/object-not-found') errorMessage = 'Fișierul hartă nu a fost găsit.';
        else if (err.code === 'storage/unauthorized') errorMessage = 'Nu aveți permisiunea de a accesa harta.';

        setError(errorMessage);
        setLoading(false);
      }
    }

    loadAssignedShapefile();

    return () => {
      isMounted = false;
    };
  }, [currentUser, userData]);

  // Load certificates when urbanism tab becomes active
  useEffect(() => {
    const uid = currentUser?.uid;
    if (activeTab === 'urbanism' && uid && uid !== prevUserUidRef.current) {
      prevUserUidRef.current = uid;
      loadCertificates();
    }
  }, [activeTab, currentUser?.uid]);

  // Load GIS data entries when data tab becomes active
  useEffect(() => {
    if (activeTab === 'data' && currentUser) {
      loadGisDataEntries();
    }
  }, [activeTab, currentUser]);

  const loadCertificates = async () => {
    if (!currentUser) return;

    try {
      setLoadingCertificates(true);
      const certs = await urbanismService.getCertificates(currentUser.uid);
      const sorted = certs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setCertificates(sorted);
    } catch (error) {
      console.error('Error loading certificates:', error);
    } finally {
      setLoadingCertificates(false);
    }
  };

  const loadGisDataEntries = async () => {
    if (!currentUser) return;

    try {
      setLoadingGisEntries(true);
      const entries = await gisDataService.getEntries(currentUser.uid);
      setGisDataEntries(entries);
    } catch (error) {
      console.error('Error loading GIS data entries:', error);
    } finally {
      setLoadingGisEntries(false);
    }
  };

  const handleDownloadCertificate = async (certificate: UrbanismCertificate) => {
    if (!userData) return;

    try {
      setDownloadingCertId(certificate.id || null);
      const pdfDoc = <UrbanismCertificatePDF certificate={certificate} uatName={userData.uatName} />;
      const blob = await pdf(pdfDoc).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Certificat_Urbanism_${certificate.number.replace('/', '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading certificate:', error);
      alert('Eroare la descărcarea certificatului. Vă rugăm să încercați din nou.');
    } finally {
      setDownloadingCertId(null);
    }
  };

  const handleCheckContract = async (cf: string) => {
    if (!currentUser) return false;
    return await contractService.checkContractExists(currentUser.uid, cf);
  };

  const handleRedirectToRegistry = (cf: string) => {
    setRegistrySearchTerm(cf);
    setActiveTab('registry');
  };

  const handleUrbanismSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (urbanismSearchCf.trim()) {
      setShowCfSearchModal(false);
      setShowUrbanismForm(true);
    }
  };

  const handleGisDataSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser || !userData) {
      alert('Eroare: Nu sunteți autentificat.');
      return;
    }

    try {
      setSubmittingGisData(true);

      await gisDataService.createEntry({
        uatId: currentUser.uid,
        uatName: userData.uatName || '',
        proprietar: gisFormData.proprietar,
        cf: gisFormData.cf,
        suprafata: gisFormData.suprafata,
        observatii: gisFormData.observatii,
        createdBy: currentUser.email || ''
      });

      setGisDataSuccess(true);
      setGisFormData({ proprietar: '', cf: '', suprafata: '', observatii: '' });

      await loadGisDataEntries();

      setTimeout(() => setGisDataSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving GIS data:', error);
      alert('Eroare la salvarea datelor. Vă rugăm să încercați din nou.');
    } finally {
      setSubmittingGisData(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ro-RO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center max-w-md w-full px-6">
          <Loader2 className="h-16 w-16 text-blue-600 animate-spin mx-auto mb-6" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Se încarcă harta</h2>
          <p className="text-sm text-gray-600 mb-6">{loadingMessage}</p>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
            <div
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full transition-all duration-500 ease-out shadow-sm"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  const menuItems = [
    { id: 'gis', label: 'GIS (Hartă)', icon: MapIcon },
    { id: 'registry', label: 'Registrul Agricol', icon: FileText },
    { id: 'urbanism', label: 'Certificat de Urbanism', icon: FileCheck },
    { id: 'data', label: 'Adaugă Date', icon: Database }
  ] as const;

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 lg:hidden"
            >
              <Menu size={20} />
            </button>
            <Building2 className="h-6 w-6 text-blue-600 hidden sm:block" />
            <div>
              <h1 className="text-lg font-semibold text-gray-900 leading-tight">
                {userData?.uatName || 'UAT Dashboard'}
              </h1>
              <p className="text-xs text-gray-500">Cod UAT: {userData?.uatCode || 'N/A'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {userData?.shapefileMetadata && (
              <div className="hidden sm:flex items-center space-x-2 text-xs text-green-600 bg-green-50 px-3 py-1.5 rounded-full border border-green-100">
                <FileCheck className="h-3.5 w-3.5" />
                <span className="font-medium truncate max-w-[150px]">
                  {userData.shapefileMetadata.fileName}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar */}
        <div
          className={`absolute lg:relative z-30 h-full bg-white border-r border-gray-200 transition-all duration-300 ease-in-out ${
            isSidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full lg:w-0 lg:translate-x-0 lg:overflow-hidden'
          }`}
        >
          <div className="flex flex-col h-full">
            <div className="p-4 space-y-1 flex-1">
              <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Meniu Principal
              </p>
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id as Tab);
                      if (window.innerWidth < 1024) setIsSidebarOpen(false);
                      if (item.id !== 'registry') setRegistrySearchTerm('');
                    }}
                    className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon size={18} className={isActive ? 'text-blue-600' : 'text-gray-400'} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="p-4 border-t border-gray-200">
              <button
                onClick={() => setIsFeedbackModalOpen(true)}
                className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
              >
                <MessageSquare size={18} className="text-gray-400" />
                <span>Contactează Admin</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile overlay */}
        {isSidebarOpen && (
          <div className="absolute inset-0 bg-black/20 z-20 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
        )}

        {/* Content Area */}
        <div className="flex-1 relative bg-gray-50 overflow-hidden flex flex-col">
          {/* GIS Tab */}
          {activeTab === 'gis' && (
            error ? (
              <div className="h-full flex items-center justify-center p-4">
                <div className="text-center max-w-md bg-white p-8 rounded-xl shadow-sm border border-gray-200">
                  <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">Eroare la încărcarea hărții</h2>
                  <p className="text-gray-600 text-sm">{error}</p>
                </div>
              </div>
            ) : (
              <Map
                layers={layers}
                bounds={bounds}
                onCheckContract={handleCheckContract}
                onRedirectToRegistry={handleRedirectToRegistry}
              />
            )
          )}

          {/* Registry Tab */}
          {activeTab === 'registry' && <AgriculturalRegistry initialSearchTerm={registrySearchTerm} />}

          {/* Urbanism Tab */}
          {activeTab === 'urbanism' && (
            <div className="h-full p-8 overflow-y-auto">
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Certificate de Urbanism</h2>
                    <p className="text-gray-500 mt-1">Gestionare și emitere certificate</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                  <button
                    onClick={() => setShowCfSearchModal(true)}
                    className="flex flex-col items-center justify-center p-8 bg-white border-2 border-blue-100 rounded-xl hover:border-blue-500 hover:shadow-md transition-all group text-center h-64"
                  >
                    <div className="bg-blue-50 p-4 rounded-full mb-4 group-hover:bg-blue-100 transition-colors">
                      <Search className="h-8 w-8 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Caută după CF</h3>
                    <p className="text-sm text-gray-500 max-w-xs">
                      Completează automat datele imobilului folosind numărul de Carte Funciară existent în baza de date.
                    </p>
                  </button>

                  <button
                    onClick={() => {
                      setUrbanismSearchCf('');
                      setShowUrbanismForm(true);
                    }}
                    className="flex flex-col items-center justify-center p-8 bg-white border-2 border-green-100 rounded-xl hover:border-green-500 hover:shadow-md transition-all group text-center h-64"
                  >
                    <div className="bg-green-50 p-4 rounded-full mb-4 group-hover:bg-green-100 transition-colors">
                      <FilePlus className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Creează Custom</h3>
                    <p className="text-sm text-gray-500 max-w-xs">
                      Completează manual toate datele pentru emiterea unui certificat nou fără referință automată.
                    </p>
                  </button>
                </div>

                {/* Recent Certificates */}
                <div className="mt-12">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Certificate Recente</h3>
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    {loadingCertificates ? (
                      <div className="p-8 text-center">
                        <Loader2 className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-2" />
                        <p className="text-gray-500">Se încarcă certificatele...</p>
                      </div>
                    ) : certificates.length === 0 ? (
                      <div className="p-8 text-center text-gray-500">
                        Nu există certificate emise recent.
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-200">
                        {certificates.map((cert) => (
                          <div key={cert.id} className="p-6 hover:bg-gray-50 transition-colors">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h4 className="text-lg font-semibold text-gray-900">
                                    Certificat Nr. {cert.number}
                                  </h4>
                                  <span
                                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                                      cert.status === 'issued' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                    }`}
                                  >
                                    {cert.status === 'issued' ? 'Emis' : 'Draft'}
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600 mb-3">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-gray-400" />
                                    <span>{formatDate(cert.issueDate)}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-gray-400" />
                                    <span className="truncate">{cert.applicant.name}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-gray-400" />
                                    <span className="truncate">{cert.property.address}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-gray-400" />
                                    <span>CF: {cert.property.cadastralNumber}</span>
                                  </div>
                                </div>

                                <p className="text-sm text-gray-500 line-clamp-2">{cert.purpose}</p>
                              </div>

                              <button
                                onClick={() => handleDownloadCertificate(cert)}
                                disabled={downloadingCertId === cert.id}
                                className="ml-4 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {downloadingCertId === cert.id ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>Descărcare...</span>
                                  </>
                                ) : (
                                  <>
                                    <Download className="h-4 w-4" />
                                    <span>Descarcă</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Data Entry Tab */}
          {activeTab === 'data' && (
            <div className="h-full overflow-y-auto">
              <div className="max-w-6xl mx-auto p-8">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900">Adaugă Date GIS</h2>
                  <p className="text-gray-500 mt-1">Completați datele lipsă din sistemul GIS</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Form Section */}
                  <div>
                    {gisDataSuccess && (
                      <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                        <div className="flex-shrink-0">
                          <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                            <FileCheck className="h-5 w-5 text-green-600" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-green-900">Datele au fost salvate cu succes!</p>
                        </div>
                      </div>
                    )}

                    <div className="bg-white rounded-xl border border-gray-200 p-8">
                      <form onSubmit={handleGisDataSubmit} className="space-y-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Proprietar <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={gisFormData.proprietar}
                            onChange={(e) => setGisFormData({ ...gisFormData, proprietar: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            placeholder="Introduceți numele proprietarului..."
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Număr Carte Funciară <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={gisFormData.cf}
                            onChange={(e) => setGisFormData({ ...gisFormData, cf: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            placeholder="Ex: 123456"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Suprafață (mp) <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={gisFormData.suprafata}
                            onChange={(e) => setGisFormData({ ...gisFormData, suprafata: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            placeholder="Ex: 1500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Observații
                          </label>
                          <textarea
                            value={gisFormData.observatii}
                            onChange={(e) => setGisFormData({ ...gisFormData, observatii: e.target.value })}
                            rows={4}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                            placeholder="Adăugați observații suplimentare..."
                          />
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                          <button
                            type="button"
                            onClick={() => setGisFormData({ proprietar: '', cf: '', suprafata: '', observatii: '' })}
                            className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                          >
                            <X className="h-4 w-4" />
                            Resetează
                          </button>

                          <button
                            type="submit"
                            disabled={submittingGisData}
                            className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {submittingGisData ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Se salvează...
                              </>
                            ) : (
                              <>
                                <Save className="h-4 w-4" />
                                Salvează Date
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    </div>

                    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex gap-3">
                        <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-900">
                          <p className="font-medium mb-1">Informații importante:</p>
                          <ul className="list-disc list-inside space-y-1 text-blue-800">
                            <li>Toate câmpurile marcate cu * sunt obligatorii</li>
                            <li>Verificați corectitudinea informațiilor înainte de salvare</li>
														<li>Doar adminul poate sterge datele introduse gresit!</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Previous Entries Section */}
                  <div>
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                        <h3 className="text-lg font-semibold text-gray-900">Intrări Anterioare</h3>
                        <p className="text-sm text-gray-500 mt-1">Istoric date adăugate</p>
                      </div>

                      <div className="max-h-[600px] overflow-y-auto">
                        {loadingGisEntries ? (
                          <div className="p-8 text-center">
                            <Loader2 className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-2" />
                            <p className="text-gray-500">Se încarcă datele...</p>
                          </div>
                        ) : gisDataEntries.length === 0 ? (
                          <div className="p-8 text-center">
                            <Database className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">Nu există date adăugate încă.</p>
                            <p className="text-sm text-gray-400 mt-1">
                              Completați formularul pentru a adăuga prima intrare.
                            </p>
                          </div>
                        ) : (
                          <div className="divide-y divide-gray-200">
                            {gisDataEntries.map((entry) => (
                              <div key={entry.id} className="p-6 hover:bg-gray-50 transition-colors">
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex-1">
                                    <h4 className="text-base font-semibold text-gray-900 mb-1">
                                      {entry.proprietar}
                                    </h4>
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                      <Clock className="h-3.5 w-3.5" />
                                      <span>{formatDate(entry.createdAt)}</span>
                                    </div>
                                  </div>

                                  <span
                                    className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                                      entry.status === 'processed'
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-yellow-100 text-yellow-700'
                                    }`}
                                  >
                                    {entry.status === 'processed' ? (
                                      <span className="flex items-center gap-1">
                                        <CheckCircle2 className="h-3 w-3" />
                                        Procesat
                                      </span>
                                    ) : (
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        Neprocesat
                                      </span>
                                    )}
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 gap-3 text-sm">
                                  <div>
                                    <span className="text-gray-500">CF:</span>
                                    <span className="ml-2 font-medium text-gray-900">{entry.cf}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Suprafață:</span>
                                    <span className="ml-2 font-medium text-gray-900">{entry.suprafata} mp</span>
                                  </div>
                                </div>

                                {entry.observatii && (
                                  <div className="mt-3 pt-3 border-t border-gray-100">
                                    <p className="text-xs text-gray-500 mb-1">Observații:</p>
                                    <p className="text-sm text-gray-700">{entry.observatii}</p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modals */}
          {showCfSearchModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Căutare după CF</h3>
                <form onSubmit={handleUrbanismSearch}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Număr Carte Funciară
                    </label>
                    <input
                      type="text"
                      required
                      value={urbanismSearchCf}
                      onChange={(e) => setUrbanismSearchCf(e.target.value)}
                      className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Introduceți nr. CF..."
                      autoFocus
                    />
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setShowCfSearchModal(false)}
                      className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                    >
                      Anulează
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Continuă
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {showUrbanismForm && (
            <UrbanismCertificateForm
              onClose={() => setShowUrbanismForm(false)}
              onSuccess={() => {
                setShowUrbanismForm(false);
                loadCertificates();
              }}
              initialCf={urbanismSearchCf}
              layers={layers}
            />
          )}

          {isFeedbackModalOpen && (
            <FeedbackModal onClose={() => setIsFeedbackModalOpen(false)} />
          )}
        </div>
      </div>
    </div>
  );
}
