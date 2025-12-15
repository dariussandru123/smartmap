import { useState } from 'react';
import { X, Upload, FileText, AlertCircle, Loader2, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { contractService } from '../services/contractService';

interface ContractFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function ContractForm({ onClose, onSuccess }: ContractFormProps) {
  const { currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const [formData, setFormData] = useState({
    // A. Date Parcela
    parcelaId: '', // CF
    nrCadastral: '',
    suprafataParcela: '',
    categoriaFolosinta: '',
    localizare: '',

    // B. Tip Contract
    tipContract: 'Arendare',

    // C. Date Titular
    titularTip: 'PF',
    numeDenumire: '',
    cnpCui: '',
    adresa: '',
    telefon: '',
    email: '',

    // D. Date Contract
    numarContract: '',
    dataIncheiere: '',
    dataExpirare: '',
    suprafataContractata: '',
    pret: '',
    periodicitatePlata: 'Anual',
    modAtribuire: 'Direct',
    hclNumar: '',
    hclData: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== 'application/pdf') {
        setError('Vă rugăm să încărcați doar fișiere PDF.');
        return;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setError('Fișierul este prea mare (max 10MB).');
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) {
      setError('Nu sunteți autentificat.');
      return;
    }

    if (!selectedFile) {
      setError('Vă rugăm să atașați copia contractului (PDF).');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      await contractService.createContract({
        ...formData,
        uatId: currentUser.uid
      }, selectedFile);

      onSuccess();
    } catch (err) {
      console.error('Error saving contract:', err);
      setError('A apărut o eroare la salvarea contractului. Vă rugăm încercați din nou.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl my-8 flex flex-col animate-in fade-in zoom-in duration-200 max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white rounded-t-xl z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Adaugă Contract Nou</h2>
            <p className="text-sm text-gray-500">Introduceți datele contractului și atașați documentul scanat</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <form id="contract-form" onSubmit={handleSubmit} className="space-y-8">
            
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                <AlertCircle size={20} />
                <p>{error}</p>
              </div>
            )}

            {/* 1. Document Upload Section - Highlighted */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Document Contract (Obligatoriu)
              </h3>
              
              <div className="flex items-center justify-center w-full">
                <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                  selectedFile ? 'border-green-400 bg-green-50' : 'border-blue-300 bg-white hover:bg-blue-50'
                }`}>
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {selectedFile ? (
                      <>
                        <Check className="w-10 h-10 text-green-500 mb-2" />
                        <p className="mb-1 text-sm text-green-700 font-medium">{selectedFile.name}</p>
                        <p className="text-xs text-green-600">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                        <p className="mt-2 text-xs text-green-600 underline">Click pentru a schimba</p>
                      </>
                    ) : (
                      <>
                        <Upload className="w-10 h-10 text-blue-400 mb-2" />
                        <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click pentru încărcare</span> sau trage fișierul aici</p>
                        <p className="text-xs text-gray-500">PDF (MAX. 10MB)</p>
                      </>
                    )}
                  </div>
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="application/pdf"
                    onChange={handleFileChange}
                  />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Column */}
              <div className="space-y-6">
                <section>
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 pb-2 border-b">
                    A. Date Parcelă
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Număr Carte Funciară (CF) *</label>
                      <input
                        required
                        type="text"
                        name="parcelaId"
                        value={formData.parcelaId}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        placeholder="ex: 12345"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nr. Cadastral</label>
                        <input
                          type="text"
                          name="nrCadastral"
                          value={formData.nrCadastral}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Suprafață (mp)</label>
                        <input
                          type="number"
                          name="suprafataParcela"
                          value={formData.suprafataParcela}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Categorie Folosință</label>
                      <select
                        name="categoriaFolosinta"
                        value={formData.categoriaFolosinta}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Selectează...</option>
                        <option value="Arabil">Arabil</option>
                        <option value="Pasune">Pășune</option>
                        <option value="Fanete">Fânețe</option>
                        <option value="Vie">Vie</option>
                        <option value="Livada">Livadă</option>
                        <option value="Padure">Pădure</option>
                        <option value="Curti Constructii">Curți Construcții</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Localizare / Toponim</label>
                      <input
                        type="text"
                        name="localizare"
                        value={formData.localizare}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        placeholder="ex: Tarlaua 5, Parcela 20"
                      />
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 pb-2 border-b">
                    B. Date Titular
                  </h3>
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="titularTip"
                          value="PF"
                          checked={formData.titularTip === 'PF'}
                          onChange={handleChange}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">Persoană Fizică</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="titularTip"
                          value="PJ"
                          checked={formData.titularTip === 'PJ'}
                          onChange={handleChange}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">Persoană Juridică</span>
                      </label>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nume / Denumire *</label>
                      <input
                        required
                        type="text"
                        name="numeDenumire"
                        value={formData.numeDenumire}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">CNP / CUI</label>
                      <input
                        type="text"
                        name="cnpCui"
                        value={formData.cnpCui}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Adresă</label>
                      <textarea
                        name="adresa"
                        value={formData.adresa}
                        onChange={handleChange}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </section>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                <section>
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 pb-2 border-b">
                    C. Detalii Contract
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tip Contract</label>
                      <select
                        name="tipContract"
                        value={formData.tipContract}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="Arendare">Arendare</option>
                        <option value="Concesiune">Concesiune</option>
                        <option value="Inchiriere">Închiriere</option>
                        <option value="Comodat">Comodat</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Număr Contract *</label>
                        <input
                          required
                          type="text"
                          name="numarContract"
                          value={formData.numarContract}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Data Încheierii *</label>
                        <input
                          required
                          type="date"
                          name="dataIncheiere"
                          value={formData.dataIncheiere}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Data Expirării *</label>
                      <input
                        required
                        type="date"
                        name="dataExpirare"
                        value={formData.dataExpirare}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Suprafață Contr. (mp)</label>
                        <input
                          type="number"
                          name="suprafataContractata"
                          value={formData.suprafataContractata}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Preț / Redevență (RON)</label>
                        <input
                          type="number"
                          name="pret"
                          value={formData.pret}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 pb-2 border-b">
                    D. Informații Administrative
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Mod Atribuire</label>
                      <select
                        name="modAtribuire"
                        value={formData.modAtribuire}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="Direct">Încredințare Directă</option>
                        <option value="Licitatie">Licitație Publică</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nr. HCL</label>
                        <input
                          type="text"
                          name="hclNumar"
                          value={formData.hclNumar}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Data HCL</label>
                        <input
                          type="date"
                          name="hclData"
                          value={formData.hclData}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            disabled={isLoading}
          >
            Anulează
          </button>
          <button
            type="submit"
            form="contract-form"
            disabled={isLoading}
            className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Se salvează...
              </>
            ) : (
              'Salvează Contract'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
