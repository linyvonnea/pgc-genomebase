// src/hooks/useAuth.ts
import { useEffect, useState } from "react";
import { auth, googleProvider, db } from "@/lib/firebase";
import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

interface AdminInfo {
  name: string;
  position: string;
}

export default function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminInfo, setAdminInfo] = useState<AdminInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setIsAdmin(false);
        setAdminInfo(null);
        setLoading(false);
        return;
      }

      setUser(firebaseUser);

      const email = firebaseUser.email!;
      const uid = firebaseUser.uid;

      // Check if admin (from "admins" collection by email)
      const adminRef = doc(db, "admins", email);
      const adminSnap = await getDoc(adminRef);

      if (adminSnap.exists()) {
        const { name, position } = adminSnap.data();
        setIsAdmin(true);
        setAdminInfo({ name, position });

        // Save admin in /users if not already
        const userRef = doc(db, "users", uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            uid,
            name,
            email,
            photoURL: firebaseUser.photoURL || "",
            role: "admin",
            createdAt: new Date().toISOString(),
          });
        }
      } else {
        // Save non-admin as client in /users
        const userRef = doc(db, "users", uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            uid,
            name: firebaseUser.displayName || "",
            email,
            photoURL: firebaseUser.photoURL || "",
            role: "client",
            createdAt: new Date().toISOString(),
          });
        }
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Google sign-in error:", error);
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setIsAdmin(false);
    setAdminInfo(null);
    window.location.href = "/login";
  };

  return {
    user,
    isAdmin,
    adminInfo,
    loading,
    signIn,
    signOut,
  };
}
