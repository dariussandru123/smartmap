import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, FileText, AlertTriangle } from 'lucide-react';
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { UTR } from '../types/utr';
import type { UATAccount } from '../types/user';

interface UTRManagementModalProps {
  uat: UATAccount;
  onClose: () => void;
}

export default function UTRManagementModal({ uat, onClose }: UTRManagementModalProps) {
  const [utrs, setUtrs] = useState<UTR[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [technicalRegime, setTechnicalRegime] = useState('');
  const [restrictions, setRestrictions] = useState('');

  useEffect(() => {
    // Removed orderBy to avoid "Missing Index" errors. We sort client-side instead.
    const q = query(
      collection(db, 'utrs'),
      where('uatId', '==', uat.id)
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const utrList: UTR[] = [];
        snapshot.forEach((doc) => {
          utrList.push({ id: doc.id, ...doc.data() } as UTR);
        });
        
        // Client-side sorting by date (newest first)
        utrList.sort((a, b) => {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return dateB - dateA;
        });

        setUtrs(utrList);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching UTRs:", error);
        setLoading(false); // Stop loading even if there's an error
      }
    );

    return () => unsubscribe();
  }, [uat.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      await addDoc(collection(db, 'utrs'), {
        uatId: uat.id,
        name,
        technicalRegime,
        restrictions,
        createdAt: new Date().toISOString()
      });

      // Reset form
      setName('');
      setTechnicalRegime('');
      setRestrictions('');
      setIsAdding(false);
    } catch (error) {
      console.error('Error adding UTR:', error);
      alert('Eroare la salvarea UTR-ului. Verificați consola pentru detalii.');
    }
  };

  const handleDelete = async (utrId: string) => {
    if (!confirm('Sigur doriți să ștergeți acest UTR?')) return;
    try {
      await deleteDoc(doc(db, 'utrs', utrId));
    } catch (error) {
      console.error('Error deleting UTR:', error);
      alert('Eroare la ștergerea UTR-ului');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Gestiune UTR-uri</h2>
            <p className="text-sm text-gray-500 mt-1">Pentru: {uat.uatName} ({uat.uatCode})</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Add New UTR Section */}
          {!isAdding ? (
            <button
              onClick={() => setIsAdding(true)}
              className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors flex items-center justify-center gap-2 mb-6"
            >
              <Plus className="h-5 w-5" />
              <span>Adaugă UTR Nou</span>
            </button>
          ) : (
            <div className="bg-gray-50 rounded-lg p-6 mb-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-900">Adăugare UTR Nou</h3>
                <button 
                  onClick={() => setIsAdding(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Denumire UTR *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="ex: L1 - Locuințe individuale"
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Regimul tehnic și urbanistic
                    </label>
                    <textarea
                      value={technicalRegime}
                      onChange={(e) => setTechnicalRegime(e.target.value)}
                      rows={4}
                      placeholder="Detalii despre POT, CUT, regim de înălțime..."
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Servituți și restricții
                    </label>
                    <textarea
                      value={restrictions}
                      onChange={(e) => setRestrictions(e.target.value)}
                      rows={4}
                      placeholder="Zone de protecție, interdicții de construire..."
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    <Save className="h-4 w-4" />
                    Salvează UTR
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* List Existing UTRs */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900 mb-4">Lista UTR-uri existente ({utrs.length})</h3>
            
            {loading ? (
              <div className="text-center py-8 text-gray-500">Se încarcă...</div>
            ) : utrs.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-100">
                <p className="text-gray-500">Nu există UTR-uri definite pentru această primărie.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {utrs.map((utr) => (
                  <div key={utr.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="font-semibold text-lg text-blue-900">{utr.name}</h4>
                      <button
                        onClick={() => handleDelete(utr.id)}
                        className="text-red-600 hover:text-red-700 p-1 rounded hover:bg-red-50"
                        title="Șterge UTR"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                      <div className="bg-blue-50 p-3 rounded border border-blue-100">
                        <div className="flex items-center gap-2 text-blue-800 font-medium mb-2">
                          <FileText className="h-4 w-4" />
                          Regimul tehnic și urbanistic
                        </div>
                        <p className="text-gray-700 whitespace-pre-wrap">
                          {utr.technicalRegime || 'Nu este specificat'}
                        </p>
                      </div>

                      <div className="bg-amber-50 p-3 rounded border border-amber-100">
                        <div className="flex items-center gap-2 text-amber-800 font-medium mb-2">
                          <AlertTriangle className="h-4 w-4" />
                          Servituți și restricții
                        </div>
                        <p className="text-gray-700 whitespace-pre-wrap">
                          {utr.restrictions || 'Nu sunt specificate'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
