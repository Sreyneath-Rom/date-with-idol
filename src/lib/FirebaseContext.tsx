// FirebaseContext.tsx

import React, {
  createContext,
  useContext,
  useState,
  useEffect
} from 'react';

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

import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType
} from './firebase';

/* =========================
   USER PROFILE TYPE
========================= */

export interface UserProfile {
  name: string;
  selectedIdolId: string | null;
  affection: number;
}

/* =========================
   CONTEXT TYPE
========================= */

interface FirebaseContextType {
  user: User | null;
  loading: boolean;

  profile: UserProfile;

  setProfile: React.Dispatch<
    React.SetStateAction<UserProfile>
  >;

  loginWithGoogle: () => Promise<void>;

  logout: () => Promise<void>;

  updateFirestoreProfile: (
    newProfile: UserProfile
  ) => Promise<void>;
}

/* =========================
   CREATE CONTEXT
========================= */

const FirebaseContext =
  createContext<FirebaseContextType | undefined>(
    undefined
  );

/* =========================
   PROVIDER
========================= */

export function FirebaseProvider({
  children
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] =
    useState<User | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [profile, setProfile] =
    useState<UserProfile>({
      name: 'Player',
      selectedIdolId: null,
      affection: 12
    });

  /* =========================
     AUTH LISTENER
  ========================= */

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser);

        if (!currentUser) {
          setLoading(false);
        }
      }
    );

    return () => unsubscribe();
  }, []);

  /* =========================
     REALTIME FIRESTORE SYNC
  ========================= */

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const userDocRef = doc(
      db,
      'users',
      user.uid
    );

    setLoading(true);

    const unsubscribe = onSnapshot(
      userDocRef,

      async (snapshot) => {
        if (snapshot.exists()) {
          const data =
            snapshot.data() as UserProfile;

          setProfile(data);
        } else {
          const initialProfile: UserProfile = {
            name:
              user.displayName || 'Player',

            selectedIdolId: null,

            affection: 12
          };

          try {
            await setDoc(
              userDocRef,
              initialProfile
            );

            setProfile(initialProfile);
          } catch (error) {
            handleFirestoreError(
              error,
              OperationType.WRITE,
              `users/${user.uid}`
            );
          }
        }

        setLoading(false);
      },

      (error) => {
        handleFirestoreError(
          error,
          OperationType.GET,
          `users/${user.uid}`
        );

        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  /* =========================
     GOOGLE LOGIN
  ========================= */

  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(
        auth,
        googleProvider
      );
    } catch (error) {
      console.error(
        'Google authentication failed:',
        error
      );
    }
  };

  /* =========================
     LOGOUT
  ========================= */

  const logout = async () => {
    try {
      await signOut(auth);

      setProfile({
        name: 'Player',
        selectedIdolId: null,
        affection: 12
      });
    } catch (error) {
      console.error(
        'Sign out failed:',
        error
      );
    }
  };

  /* =========================
     UPDATE PROFILE
  ========================= */

  const updateFirestoreProfile =
    async (newProfile: UserProfile) => {
      if (!user) {
        setProfile(newProfile);
        return;
      }

      const userDocRef = doc(
        db,
        'users',
        user.uid
      );

      try {
        await setDoc(
          userDocRef,
          newProfile
        );
      } catch (error) {
        handleFirestoreError(
          error,
          OperationType.WRITE,
          `users/${user.uid}`
        );
      }
    };

  /* =========================
     PROVIDER RETURN
  ========================= */

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

/* =========================
   CUSTOM HOOK
========================= */

export function useFirebase() {
  const context =
    useContext(FirebaseContext);

  if (context === undefined) {
    throw new Error(
      'useFirebase must be used within FirebaseProvider'
    );
  }

  return context;
}
