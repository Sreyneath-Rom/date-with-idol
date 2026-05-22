import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut 
} from 'firebase/auth';
import { 
  doc, 
  onSnapshot, 
  setDoc
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from './firebase';
import { UserProfile } from '../types';

interface FirebaseContextType {
  user: User | null;
  loading: boolean;
  profile: UserProfile;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateFirestoreProfile: (newProfile: UserProfile) => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile>({
    name: 'Player',
    selectedIdolId: null,
    affection: 12
  });

  // Handle Authentication State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Sync Profile with Firestore in real-time
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const userDocRef = doc(db, 'users', user.uid);
    setLoading(true);

    const unsubscribe = onSnapshot(userDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as UserProfile;
        setProfile(data);
      } else {
        // If profile doesn't exist, bootstrap it in Firestore
        const initialProfile: UserProfile = {
          name: user.displayName || 'Player',
          selectedIdolId: null,
          affection: 12
        };
        // Run safe write with error context matching our Firebase specification
        setDoc(userDocRef, initialProfile)
          .catch((error) => {
            handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
          });
        setProfile(initialProfile);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Google authentication failed:", error);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setProfile({
        name: 'Player',
        selectedIdolId: null,
        affection: 12
      });
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  };

  const updateFirestoreProfile = async (newProfile: UserProfile) => {
    if (!user) {
      // Offline/Local default
      setProfile(newProfile);
      return;
    }
    const userDocRef = doc(db, 'users', user.uid);
    try {
      await setDoc(userDocRef, newProfile);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    }
  };

  return (
    <FirebaseContext.Provider
      value={{
        user,
        loading,
        profile,
        setProfile,
        loginWithGoogle,
        logout,
        updateFirestoreProfile
      }}
    >
      {children}
    </FirebaseContext.Provider>
  );
}

export function useFirebase() {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
}
