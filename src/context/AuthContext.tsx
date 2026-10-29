import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../firebase/config';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  profile: UserProfile | null;
  role: UserRole;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  updateProfileData: (data: Partial<UserProfile>) => Promise<void>;
  changeUsername: (newUsername: string) => Promise<{ success: boolean; error?: string }>;
  isTeacherOrAdmin: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Generate safe initial username from email or display name
function generateUsernameFromGoogle(name: string, email: string): string {
  const base = (name || email.split('@')[0])
    .toLowerCase()
    .replace(/[^a-z0-9_.]/g, '')
    .slice(0, 14);
  const clean = base.replace(/^[._]+|[._]+$/g, '');
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  return `${clean || 'student'}_${randomSuffix}`;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        try {
          const snapshot = await getDoc(userDocRef);
          if (!snapshot.exists()) {
            // Initial user creation
            const initialUsername = generateUsernameFromGoogle(
              user.displayName || '',
              user.email || ''
            );
            const initialRole: UserRole =
              user.email === 'nurlansleepyfactshub@gmail.com' || user.email === 'dev.nurlan@gmail.com'
                ? 'admin'
                : 'student';

            const newProfile: UserProfile = {
              uid: user.uid,
              displayName: user.displayName || 'New Scholar',
              username: initialUsername,
              usernameLower: initialUsername.toLowerCase(),
              photoURL: user.photoURL || '',
              email: user.email || '',
              role: initialRole,
              createdAt: new Date().toISOString(),
              streak: 1,
              bio: '',
            };

            await setDoc(userDocRef, {
              ...newProfile,
              serverCreatedAt: serverTimestamp(),
            });

            // Register username
            try {
              await setDoc(doc(db, 'usernames', initialUsername.toLowerCase()), {
                uid: user.uid,
              });
            } catch (err) {
              console.warn('Username reservation notice:', err);
            }
          }

          // Realtime listener on user doc
          unsubscribeProfile = onSnapshot(
            userDocRef,
            (docSnap) => {
              if (docSnap.exists()) {
                setProfile(docSnap.data() as UserProfile);
              }
              setLoading(false);
            },
            (error) => {
              handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
              setLoading(false);
            }
          );
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
          setLoading(false);
        }
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Google Sign In failed:', error);
      throw error;
    }
  };

  const signOutUser = async () => {
    try {
      await signOut(auth);
      setProfile(null);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const updateProfileData = async (data: Partial<UserProfile>) => {
    if (!firebaseUser) return;
    try {
      // Optimistic state update for instant UI feedback
      setProfile((prev) => (prev ? { ...prev, ...data } : null));

      const userDocRef = doc(db, 'users', firebaseUser.uid);
      await setDoc(
        userDocRef,
        {
          ...data,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${firebaseUser.uid}`);
    }
  };

  const changeUsername = async (newUsername: string): Promise<{ success: boolean; error?: string }> => {
    if (!firebaseUser || !profile) return { success: false, error: 'Not authenticated' };

    const clean = newUsername.trim().toLowerCase();
    const usernameRegex = /^[a-z0-9_]{3,20}$/;
    if (!usernameRegex.test(clean)) {
      return {
        success: false,
        error: 'Username must be 3-20 characters long using lowercase letters, numbers, and underscores only.',
      };
    }

    if (['admin', 'teacher', 'support', 'speakbloom'].includes(clean)) {
      return { success: false, error: 'This username is reserved.' };
    }

    try {
      const usernameDocRef = doc(db, 'usernames', clean);
      const existing = await getDoc(usernameDocRef);
      if (existing.exists() && existing.data().uid !== firebaseUser.uid) {
        return { success: false, error: 'Username is already taken.' };
      }

      // Reserve new username doc
      await setDoc(usernameDocRef, { uid: firebaseUser.uid });

      // Update user document
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      await updateDoc(userDocRef, {
        username: clean,
        usernameLower: clean,
        usernameChangedAt: new Date().toISOString(),
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Could not update username. Please retry.' };
    }
  };

  const role: UserRole = profile?.role || 'student';
  const isTeacherOrAdmin = role === 'teacher' || role === 'admin';
  const isAdmin = role === 'admin';

  const value = useMemo(
    () => ({
      firebaseUser,
      profile,
      role,
      loading,
      signInWithGoogle,
      signOutUser,
      updateProfileData,
      changeUsername,
      isTeacherOrAdmin,
      isAdmin,
    }),
    [firebaseUser, profile, role, loading, isTeacherOrAdmin, isAdmin]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
