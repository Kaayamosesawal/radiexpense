import React, { createContext, useContext, useEffect, useState } from "react";
import { 
  signInWithEmailAndPassword,
  signOut, 
  onAuthStateChanged, 
  deleteUser 
} from "firebase/auth";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  deleteDoc, 
  doc,
  getDoc,
} from "firebase/firestore";
import { auth, db } from "../firebase/config";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  // ── 1. Email + password sign-in ───────────────────────────────────────────
  // Returns the Firebase UserCredential on success; throws on failure so the
  // caller can catch the error and show the right message.
  const loginWithEmail = async (email, password) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result;
  };

  // ── 2. Check whether a UID already has an onboarding profile in Firestore ─
  // Returns true  → user completed onboarding, send to dashboard.
  // Returns false → first-time user, send to OnboardingFree.
  const hasUserProfile = async (uid) => {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists();
  };

  // ── 3. Sign out ───────────────────────────────────────────────────────────
  const logout = () => signOut(auth);

  // ── 4. Delete account & all user data ────────────────────────────────────
  const removeAccountAndData = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const confirmDelete = window.confirm(
      "Are you sure you want to delete your account? This will permanently erase all your expense data."
    );

    if (confirmDelete) {
      try {
        const q = query(
          collection(db, "transactions"),
          where("uid", "==", currentUser.uid)
        );
        const querySnapshot = await getDocs(q);
        const deletePromises = querySnapshot.docs.map((document) =>
          deleteDoc(doc(db, "transactions", document.id))
        );
        await Promise.all(deletePromises);
        await deleteUser(currentUser);
        console.log("Account and data deleted successfully.");
      } catch (error) {
        console.error("Error deleting account:", error);
        alert("For security reasons, please log out and log back in before deleting your account.");
      }
    }
  };

  // ── Auth state listener ───────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loginWithEmail,    // Email + password sign-in
        hasUserProfile,    // Firestore profile check
        logout,
        removeAccountAndData,
        loading,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);