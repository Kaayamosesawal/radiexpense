import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  orderBy 
} from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

/**
 * Hook for Firestore CRUD operations.
 * Focuses strictly on data stream and persistence.
 */
export const useTransactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    // Reference the transactions collection
    const colRef = collection(db, "transactions");

    // Query: Filter by current user UID and sort by newest first
    const q = query(
      colRef,
      where("uid", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    // Real-time listener
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTransactions(data);
      setLoading(false);
    }, (error) => {
      console.error("Firestore subscription error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  /**
   * Adds a transaction to Firestore.
   * Returns the document reference so the calling component 
   * can trigger notifications upon success.
   */
  const addTransaction = async (amount, category, type = 'expense') => {
    if (!user) throw new Error("User must be logged in to add data");

    const docRef = await addDoc(collection(db, "transactions"), {
      uid: user.uid,
      amount: Number(amount),
      category,
      type,
      createdAt: serverTimestamp()
    });

    return docRef;
  };

  return { transactions, addTransaction, loading };
};