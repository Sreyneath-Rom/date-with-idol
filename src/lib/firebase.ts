// firebase.ts
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';

import {
  getFirestore,
  doc,
  getDocFromServer,
  setDoc,
  onSnapshot
} from 'firebase/firestore';

/* =========================
   FIREBASE CONFIG
========================= */

const firebaseConfig = {
  projectId: "gen-lang-client-0041828420",
  appId: "1:255362773399:web:ea3b630f0639c0b40d94d2",
  apiKey: "AIzaSyDuhKILRmJzOWfkegK3DCQZPAuXgpGZBM4",
  authDomain: "gen-lang-client-0041828420.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-3ac2bfa3-0515-4125-9b01-d88f5c9a3612",
  storageBucket: "gen-lang-client-0041828420.firebasestorage.app",
  messagingSenderId: "255362773399",
  measurementId: ""
};

/* =========================
   INITIALIZE FIREBASE
========================= */

export const app = initializeApp(firebaseConfig);

export const db = getFirestore(
  app,
  firebaseConfig.firestoreDatabaseId
);

export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();

/* =========================
   AUTH HELPERS
========================= */

export async function signInWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}

export async function logOut() {
  return signOut(auth);
}

/* =========================
   FIRESTORE TEST
========================= */

export async function testConnection() {
  try {
    await getDocFromServer(
      doc(db, 'test', 'connection')
    );

    console.log(
      'Firebase connection established successfully.'
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('offline')
    ) {
      console.warn(
        'Firebase warning: Client offline.',
        error
      );
    } else {
      console.log(
        'Firebase initialized.',
        error
      );
    }
  }
}

testConnection();

/* =========================
   TYPES
========================= */

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;

  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;

    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export interface UserProfile {
  name: string;
  selectedIdolId: string | null;
  affection: number;
}

/* =========================
   ERROR HANDLER
========================= */

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
) {
  const errInfo: FirestoreErrorInfo = {
    error:
      error instanceof Error
        ? error.message
        : String(error),

    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified:
        auth.currentUser?.emailVerified,

      isAnonymous:
        auth.currentUser?.isAnonymous,

      tenantId:
        auth.currentUser?.tenantId,

      providerInfo:
        auth.currentUser?.providerData?.map(
          (provider) => ({
            providerId: provider.providerId,
            email: provider.email,
          })
        ) || []
    },

    operationType,
    path
  };

  console.error(
    'Firestore Error:',
    JSON.stringify(errInfo)
  );

  throw new Error(JSON.stringify(errInfo));
}

/* =========================
   REALTIME USER PROFILE
========================= */

export function subscribeUserProfile(
  uid: string,
  callback: (profile: UserProfile) => void
) {
  const userRef = doc(db, 'users', uid);

  return onSnapshot(
    userRef,

    async (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as UserProfile);
      } else {
        const starterProfile: UserProfile = {
          name: auth.currentUser?.displayName || 'Player',
          selectedIdolId: null,
          affection: 12
        };

        try {
          await setDoc(userRef, starterProfile);
          callback(starterProfile);
        } catch (error) {
          handleFirestoreError(
            error,
            OperationType.WRITE,
            `users/${uid}`
          );
        }
      }
    },

    (error) => {
      handleFirestoreError(
        error,
        OperationType.GET,
        `users/${uid}`
      );
    }
  );
}

/* =========================
   UPDATE PROFILE
========================= */

export async function updateUserProfile(
  profile: UserProfile
) {
  if (!auth.currentUser) return;

  const userRef = doc(
    db,
    'users',
    auth.currentUser.uid
  );

  try {
    await setDoc(userRef, profile);
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.WRITE,
      `users/${auth.currentUser.uid}`
    );
  }
}

/* =========================
   AUTH STATE LISTENER
========================= */

export function listenAuthState(
  callback: (user: User | null) => void
) {
  return onAuthStateChanged(auth, callback);
}
