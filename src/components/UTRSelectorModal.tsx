import { useState, useEffect } from 'react';
import { X, Search, FileText, AlertTriangle, Check } from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { UTR } from '../types/utr';

interface Props {
  uatId: string;
  onClose: () => void;
  onSelect: (utr: UTR) => void;
}

export default function UTRSelectorModal({ uatId, onClose, onSelect }: Props) {
  const [utrs, setUtrs] = useState<UTR[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const q = query(
      collection(db, 'utrs'),
      where('uatId', '==', uatId)
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const utrList: UTR[] = [];
        snapshot.forEach((doc) => {
          utrList.push({ id: doc.id, ...doc.data() } as UTR);
        });
        
        // Client-side sort (Newest first)
        utrList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        setUtrs(utrList);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching UTRs:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [uatId]);

  const filteredUtrs = utrs.filter(utr => 
    utr.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50 rounded-t-xl">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Selectează UTR</h3>
            <p className="text-sm text-gray-500">Alegeți un UTR pentru a completa automat regimul tehnic.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200">
            <X size={24} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Caută după denumire UTR..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Se încarcă lista UTR...</div>
          ) : filteredUtrs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? 'Nu s-au găsit rezultate.' : 'Nu există UTR-uri definite.'}
            </div>
          ) : (
            filteredUtrs.map((utr) => (
              <button
                key={utr.id}
                onClick={() => onSelect(utr)}
                className="w-full text-left bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-500 hover:shadow-md transition-all group"
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-gray-900 group-hover:text-blue-700">{utr.name}</h4>
                  <span className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    Selectează <Check size={12} />
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
                  <div className="flex gap-2">
                    <FileText size={14} className="text-blue-500 shrink-0" />
                    <span className="line-clamp-2">{utr.technicalRegime || 'Fără regim tehnic'}</span>
                  </div>
                  <div className="flex gap-2">
                    <AlertTriangle size={14} className="text-orange-500 shrink-0" />
                    <span className="line-clamp-2">{utr.restrictions || 'Fără restricții'}</span>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
