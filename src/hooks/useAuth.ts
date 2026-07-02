// src/hooks/useAuth.ts
import { useEffect, useState } from "react";
import { auth, googleProvider, db } from "@/lib/firebase";
import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
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
    let unsubscribeAdmin: (() => void) | null = null;

    const ensureUserProfile = async (
      uid: string,
      email: string,
      name: string,
      photoURL: string,
      role: "admin" | "client",
    ) => {
      try {
        const userRef = doc(db, "users", uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            uid,
            name,
            email,
            photoURL,
            role,
            createdAt: new Date().toISOString(),
          });
        }
      } catch (profileError) {
        console.error("Failed to ensure /users profile:", profileError);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (unsubscribeAdmin) {
        unsubscribeAdmin();
        unsubscribeAdmin = null;
      }

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

      if (!email) {
        await ensureUserProfile(
          uid,
          "",
          firebaseUser.displayName || "",
          firebaseUser.photoURL || "",
          "client",
        );
        setIsAdmin(false);
        setAdminInfo(null);
        setLoading(false);
        return;
      }

      // Check if admin (from "admins" collection by email)
      const adminRef = doc(db, "admins", email);

      // Use real-time listener for admin role changes
      unsubscribeAdmin = onSnapshot(
        adminRef,
        async (adminSnap) => {
          if (adminSnap.exists()) {
            const { name, position, role, status } = adminSnap.data();

            if (status === "deactivated") {
              setIsAdmin(false);
              setAdminInfo(null);
              setUser(null);
              setLoading(false);
              await firebaseSignOut(auth);
              return;
            }

            setIsAdmin(true);
            setAdminInfo({ name, position, email, role: role || "viewer" });

            await ensureUserProfile(
              uid,
              email,
              name || firebaseUser.displayName || "",
              firebaseUser.photoURL || "",
              "admin",
            );
          } else {
            setIsAdmin(false);
            setAdminInfo(null);

            await ensureUserProfile(
              uid,
              email,
              firebaseUser.displayName || "",
              firebaseUser.photoURL || "",
              "client",
            );
          }

          setLoading(false);
        },
        async (error) => {
          // Non-admin users may be denied read on admins/{email}. Fall back gracefully.
          console.warn(
            "Admin role check failed; defaulting to client role.",
            error,
          );
          setIsAdmin(false);
          setAdminInfo(null);

          await ensureUserProfile(
            uid,
            email,
            firebaseUser.displayName || "",
            firebaseUser.photoURL || "",
            "client",
          );
          setLoading(false);
        },
      );
    });

    return () => {
      if (unsubscribeAdmin) unsubscribeAdmin();
      unsubscribe();
    };
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
