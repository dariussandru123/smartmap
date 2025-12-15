import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { UrbanismCertificate } from '../types/urbanism';

const COLLECTION_NAME = 'urbanism_certificates';

export const urbanismService = {
  async createCertificate(data: Omit<UrbanismCertificate, 'id'>) {
    try {
      console.log('🔵 Creating certificate with data:', data);
      const docRef = await addDoc(collection(db, COLLECTION_NAME), data);
      console.log('✅ Certificate created with ID:', docRef.id);
      return { id: docRef.id, ...data };
    } catch (error) {
      console.error('❌ Error creating certificate:', error);
      throw error;
    }
  },

  async getCertificates(uatId: string) {
    try {
      console.log('🔍 Fetching certificates for uatId:', uatId);
      console.log('🔍 Collection name:', COLLECTION_NAME);
      
      const q = query(
        collection(db, COLLECTION_NAME),
        where('uatId', '==', uatId)
      );
      
      console.log('🔍 Query created, executing...');
      const querySnapshot = await getDocs(q);
      
      console.log('📊 Query results:', {
        empty: querySnapshot.empty,
        size: querySnapshot.size,
        docs: querySnapshot.docs.length
      });
      
      const certificates = querySnapshot.docs.map(doc => {
        const data = doc.data();
        console.log('📄 Document:', { id: doc.id, data });
        return {
          id: doc.id,
          ...data
        };
      }) as UrbanismCertificate[];
      
      console.log('✅ Returning certificates:', certificates);
      return certificates;
    } catch (error) {
      console.error('❌ Error fetching certificates:', error);
      throw error;
    }
  },

  generateCertificateNumber(): string {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${year}/${random}`;
  }
};
