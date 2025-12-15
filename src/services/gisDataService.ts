import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs,
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';

const COLLECTION_NAME = 'gis_data_entries';

export interface GISDataEntry {
  id?: string;
  uatId: string;
  uatName: string;
  proprietar: string;
  cf: string;
  suprafata: string;
  observatii: string;
  createdAt: string;
  createdBy: string;
  status: 'pending' | 'processed';
}

export const gisDataService = {
  /**
   * Creates a new GIS data entry
   */
  async createEntry(data: Omit<GISDataEntry, 'id' | 'createdAt' | 'status'>) {
    try {
      console.log('🔵 [GIS Service] Creating entry with data:', data);
      
      const entryData: Omit<GISDataEntry, 'id'> = {
        ...data,
        createdAt: new Date().toISOString(),
        status: 'pending'
      };

      console.log('🔵 [GIS Service] Full entry data to save:', entryData);
      console.log('🔵 [GIS Service] Collection name:', COLLECTION_NAME);

      const docRef = await addDoc(collection(db, COLLECTION_NAME), entryData);
      console.log('✅ [GIS Service] Entry created successfully with ID:', docRef.id);
      
      return { id: docRef.id, ...entryData };
    } catch (error) {
      console.error('❌ [GIS Service] Error creating entry:', error);
      throw error;
    }
  },

  /**
   * Fetches all GIS data entries for a specific UAT
   */
  async getEntries(uatId: string) {
    try {
      console.log('🔍 [GIS Service] Fetching entries for uatId:', uatId);
      console.log('🔍 [GIS Service] Collection name:', COLLECTION_NAME);
      
      const q = query(
        collection(db, COLLECTION_NAME),
        where('uatId', '==', uatId),
        orderBy('createdAt', 'desc')
      );

      console.log('🔍 [GIS Service] Query created, executing...');
      const querySnapshot = await getDocs(q);
      
      console.log('🔍 [GIS Service] Query executed. Documents found:', querySnapshot.size);
      
      const entries = querySnapshot.docs.map(doc => {
        const data = doc.data();
        console.log('📄 [GIS Service] Document data:', { id: doc.id, ...data });
        return {
          id: doc.id,
          ...data
        };
      }) as GISDataEntry[];

      console.log('✅ [GIS Service] Total entries returned:', entries.length);
      console.log('✅ [GIS Service] Entries:', entries);

      return entries;
    } catch (error) {
      console.error('❌ [GIS Service] Error fetching entries:', error);
      console.error('❌ [GIS Service] Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        code: (error as any)?.code,
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  },

  /**
   * Gets entries by status
   */
  async getEntriesByStatus(uatId: string, status: 'pending' | 'processed') {
    try {
      console.log('🔍 [GIS Service] Fetching entries by status:', { uatId, status });
      
      const q = query(
        collection(db, COLLECTION_NAME),
        where('uatId', '==', uatId),
        where('status', '==', status),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      console.log('🔍 [GIS Service] Status query found:', querySnapshot.size, 'documents');
      
      const entries = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as GISDataEntry[];

      return entries;
    } catch (error) {
      console.error('❌ [GIS Service] Error fetching entries by status:', error);
      throw error;
    }
  }
};
