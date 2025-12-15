import { useState, useEffect, useMemo } from 'react';
import { Database, Search, 
  Download, 
  Filter, 
  X, 
  ChevronDown, 
  ChevronUp,
  Building2,
  Calendar,
  MapPin,
  FileText,
  Loader2,
  AlertCircle,
  Clock
} from 'lucide-react';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { UATAccount } from '../types/user';

interface Contract {
  id: string;
  uatId: string;
  uatName?: string;
  parcelaId: string;
  nrCadastral: string;
  numeDenumire: string;
  suprafataContractata: number;
  localizare: string;
  dataExpirare: string;
  utr?: string;
  tarla?: string;
  parcela?: string;
  createdAt: string;
  createdBy: string;
}

interface AdminRegistryViewerProps {
  uatAccounts: UATAccount[];
}

type SortField = 'uatName' | 'parcelaId' | 'numeDenumire' | 'suprafataContractata' | 'createdAt' | 'daysUntilExpiration';
type SortDirection = 'asc' | 'desc';

export default function AdminRegistryViewer({ uatAccounts }: AdminRegistryViewerProps) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUAT, setSelectedUAT] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Create UAT lookup map
  const uatMap = useMemo(() => {
    const map = new Map<string, string>();
    uatAccounts.forEach(uat => {
      map.set(uat.id, uat.uatName);
    });
    return map;
  }, [uatAccounts]);

  useEffect(() => {
    loadContracts();
  }, []);

  const loadContracts = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'contracts'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const contractsData: Contract[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log('Contract data:', data);
        
        contractsData.push({
          id: doc.id,
          uatId: data.uatId || '',
          uatName: uatMap.get(data.uatId) || 'UAT Necunoscut',
          parcelaId: data.parcelaId || data.nrCadastral || '',
          nrCadastral: data.nrCadastral || '',
          numeDenumire: data.numeDenumire || '',
          suprafataContractata: data.suprafataContractata || 0,
          localizare: data.localizare || data.adresa || '',
          dataExpirare: data.dataExpirare || '',
          utr: data.utr || '',
          tarla: data.tarla || '',
          parcela: data.parcela || '',
          createdAt: data.createdAt || '',
          createdBy: data.createdBy || ''
        });
      });

      console.log('Loaded contracts:', contractsData);
      setContracts(contractsData);
    } catch (error) {
      console.error('Error loading contracts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate days until expiration
  const calculateDaysUntilExpiration = (expirationDate: string): number | null => {
    if (!expirationDate) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const expDate = new Date(expirationDate);
    expDate.setHours(0, 0, 0, 0);
    
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  // Get expiration status color and text
  const getExpirationStatus = (days: number | null) => {
    if (days === null) {
      return {
        color: 'text-gray-500',
        bgColor: 'bg-gray-100',
        text: 'Nedefinit',
        icon: null
      };
    }

    if (days < 0) {
      return {
        color: 'text-red-700',
        bgColor: 'bg-red-100',
        text: `Expirat (${Math.abs(days)} zile)`,
        icon: <AlertCircle className="h-4 w-4" />
      };
    }

    if (days === 0) {
      return {
        color: 'text-orange-700',
        bgColor: 'bg-orange-100',
        text: 'Expiră astăzi',
        icon: <Clock className="h-4 w-4" />
      };
    }

    if (days <= 30) {
      return {
        color: 'text-orange-700',
        bgColor: 'bg-orange-100',
        text: `${days} ${days === 1 ? 'zi' : 'zile'}`,
        icon: <Clock className="h-4 w-4" />
      };
    }

    if (days <= 90) {
      return {
        color: 'text-yellow-700',
        bgColor: 'bg-yellow-100',
        text: `${days} zile`,
        icon: <Clock className="h-4 w-4" />
      };
    }

    return {
      color: 'text-green-700',
      bgColor: 'bg-green-100',
      text: `${days} zile`,
      icon: <Clock className="h-4 w-4" />
    };
  };

  // Filter and sort contracts
  const filteredAndSortedContracts = useMemo(() => {
    let filtered = contracts;

    // Filter by UAT
    if (selectedUAT !== 'all') {
      filtered = filtered.filter(c => c.uatId === selectedUAT);
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const extractCFNumber = (str: string): string => {
        const match = str.match(/\d+/);
        return match ? match[0] : str;
      };
      const searchNumber = extractCFNumber(searchTerm);

      filtered = filtered.filter(c => {
        const parcelaNumber = extractCFNumber(c.parcelaId);
        const cadastralNumber = extractCFNumber(c.nrCadastral);

        return (
          c.parcelaId.toLowerCase().includes(term) ||
          c.nrCadastral.toLowerCase().includes(term) ||
          c.numeDenumire.toLowerCase().includes(term) ||
          c.localizare.toLowerCase().includes(term) ||
          (c.uatName && c.uatName.toLowerCase().includes(term)) ||
          parcelaNumber.includes(searchNumber) ||
          cadastralNumber.includes(searchNumber) ||
          searchNumber.includes(parcelaNumber) ||
          searchNumber.includes(cadastralNumber)
        );
      });
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      // Handle days until expiration
      if (sortField === 'daysUntilExpiration') {
        const aDays = calculateDaysUntilExpiration(a.dataExpirare);
        const bDays = calculateDaysUntilExpiration(b.dataExpirare);
        
        // Null values go to the end
        if (aDays === null && bDays === null) return 0;
        if (aDays === null) return 1;
        if (bDays === null) return -1;
        
        aVal = aDays;
        bVal = bDays;
      }

      // Handle numeric fields
      if (sortField === 'suprafataContractata') {
        aVal = parseFloat(String(aVal)) || 0;
        bVal = parseFloat(String(bVal)) || 0;
      }

      // Handle date fields
      if (sortField === 'createdAt') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }

      // Handle string fields
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [contracts, selectedUAT, searchTerm, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const exportToCSV = () => {
    const headers = ['UAT', 'Nr. CF', 'Proprietar', 'Suprafață (mp)', 'Adresă', 'Data Expirare', 'Zile până la Expirare', 'Data Înregistrării'];
    const rows = filteredAndSortedContracts.map(c => {
      const days = calculateDaysUntilExpiration(c.dataExpirare);
      return [
        c.uatName || '',
        c.parcelaId,
        c.numeDenumire,
        c.suprafataContractata,
        c.localizare,
        c.dataExpirare ? new Date(c.dataExpirare).toLocaleDateString('ro-RO') : '',
        days !== null ? days : '',
        new Date(c.createdAt).toLocaleDateString('ro-RO')
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `registru_agricol_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? 
      <ChevronUp className="h-4 w-4" /> : 
      <ChevronDown className="h-4 w-4" />;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Database className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Registru Agricol - Toate UAT-urile
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {filteredAndSortedContracts.length} {filteredAndSortedContracts.length === 1 ? 'înregistrare' : 'înregistrări'}
                {selectedUAT !== 'all' && ' (filtrate)'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                showFilters 
                  ? 'bg-blue-50 border-blue-200 text-blue-700' 
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Filter className="h-4 w-4" />
              <span>Filtre</span>
            </button>

            <button
              onClick={exportToCSV}
              disabled={filteredAndSortedContracts.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Căutare
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Caută după CF, proprietar, adresă..."
                    className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* UAT Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filtrează după UAT
                </label>
                <select
                  value={selectedUAT}
                  onChange={(e) => setSelectedUAT(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">Toate UAT-urile</option>
                  {uatAccounts.map(uat => (
                    <option key={uat.id} value={uat.id}>
                      {uat.uatName} ({uat.uatCode})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Active Filters Summary */}
            {(searchTerm || selectedUAT !== 'all') && (
              <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                <span className="text-sm text-gray-600">Filtre active:</span>
                {searchTerm && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                    Căutare: "{searchTerm}"
                    <button onClick={() => setSearchTerm('')} className="hover:text-blue-900">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {selectedUAT !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                    UAT: {uatMap.get(selectedUAT)}
                    <button onClick={() => setSelectedUAT('all')} className="hover:text-blue-900">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-gray-500">Se încarcă datele...</p>
          </div>
        ) : filteredAndSortedContracts.length === 0 ? (
          <div className="p-12 text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Nu s-au găsit înregistrări</p>
            <p className="text-sm text-gray-400 mt-1">
              {searchTerm || selectedUAT !== 'all' 
                ? 'Încercați să modificați filtrele de căutare' 
                : 'Nu există date în registrul agricol'}
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th 
                  onClick={() => handleSort('uatName')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    <span>UAT</span>
                    <SortIcon field="uatName" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('parcelaId')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span>Nr. CF</span>
                    <SortIcon field="parcelaId" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('numeDenumire')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span>Proprietar</span>
                    <SortIcon field="numeDenumire" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('suprafataContractata')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span>Suprafață</span>
                    <SortIcon field="suprafataContractata" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>Adresă</span>
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('daysUntilExpiration')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>Expirare</span>
                    <SortIcon field="daysUntilExpiration" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('createdAt')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Data</span>
                    <SortIcon field="createdAt" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAndSortedContracts.map((contract) => {
                const daysUntilExpiration = calculateDaysUntilExpiration(contract.dataExpirare);
                const status = getExpirationStatus(daysUntilExpiration);
                
                return (
                  <tr key={contract.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <Building2 className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {contract.uatName}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{contract.parcelaId || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{contract.numeDenumire || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {contract.suprafataContractata ? `${contract.suprafataContractata} mp` : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate" title={contract.localizare}>
                        {contract.localizare || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${status.bgColor} ${status.color}`}>
                        {status.icon}
                        <span>{status.text}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {new Date(contract.createdAt).toLocaleDateString('ro-RO', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer with stats */}
      {!loading && filteredAndSortedContracts.length > 0 && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-6">
              <span>
                Total înregistrări: <strong className="text-gray-900">{filteredAndSortedContracts.length}</strong>
              </span>
              {selectedUAT !== 'all' && (
                <span>
                  UAT selectat: <strong className="text-gray-900">{uatMap.get(selectedUAT)}</strong>
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500">
              Ultima actualizare: {new Date().toLocaleString('ro-RO')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
