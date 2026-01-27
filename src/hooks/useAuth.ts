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
import { logActivity } from "@/services/activityLogService";
import { UserRole } from "@/types/Permissions";

interface AdminInfo {
  name: string;
  position: string;
  email: string;
  role?: UserRole;
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
        const { name, position, role } = adminSnap.data();
        setIsAdmin(true);
        setAdminInfo({ name, position, email, role: role || "viewer" });

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
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Log the login activity
      try {
        await logActivity({
          userId: user.email || user.uid,
          userEmail: user.email || "unknown@user.com",
          userName: user.displayName || "Unknown User",
          action: "LOGIN",
          entityType: "user",
          entityId: user.uid,
          entityName: user.displayName || user.email || "User",
          description: `User ${user.displayName || user.email} logged in`,
        });
      } catch (logError) {
        console.error("Failed to log login activity:", logError);
      }
    } catch (error) {
      console.error("Google sign-in error:", error);
    }
  };

  const signOut = async () => {
    // Log the logout activity before signing out
    if (user) {
      try {
        await logActivity({
          userId: user.email || user.uid,
          userEmail: user.email || "unknown@user.com",
          userName: user.displayName || "Unknown User",
          action: "LOGOUT",
          entityType: "user",
          entityId: user.uid,
          entityName: user.displayName || user.email || "User",
          description: `User ${user.displayName || user.email} logged out`,
        });
      } catch (logError) {
        console.error("Failed to log logout activity:", logError);
      }
    }
    
    await firebaseSignOut(auth);
    setUser(null);
    setIsAdmin(false);
    setAdminInfo(null);
    window.location.href = "/";
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
