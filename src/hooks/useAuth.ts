import { useEffect, useState } from "react";
import { auth, googleProvider, db } from "@/lib/firebase";
import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

export default function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminInfo, setAdminInfo] = useState<{ name: string; position: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setIsAdmin(false);
      setAdminInfo(null);

      if (firebaseUser?.email) {
        // Check if admin
        const adminRef = doc(db, "admins", firebaseUser.email);
        const adminSnap = await getDoc(adminRef);

        if (adminSnap.exists()) {
          setIsAdmin(true);
          const { name, position } = adminSnap.data();
          setAdminInfo({ name, position });
        }

        // Save to /users if not already
        const userRef = doc(db, "users", firebaseUser.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          await setDoc(userRef, {
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || "",
            email: firebaseUser.email || "",
            photoURL: firebaseUser.photoURL || "",
            createdAt: new Date().toISOString(),
          });
        }
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async () => await signInWithPopup(auth, googleProvider);
  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setIsAdmin(false);
    setAdminInfo(null);
  };

  return { user, isAdmin, adminInfo, loading, signIn, signOut };
}