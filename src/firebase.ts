import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  getAuth,
} from 'firebase/auth';
import {
  doc,
  getDocFromServer,
  getFirestore,
} from 'firebase/firestore';
/**
 * Firebase configuration loaded from firebase-applet-config.json.
 * To set up manually on a fresh project, replace firebase-applet-config.json
 * with your Firebase Web App credentials:
 * {
 *   "projectId": "YOUR_PROJECT_ID",
 *   "appId": "YOUR_APP_ID",
 *   "apiKey": "YOUR_API_KEY",
 *   "authDomain": "YOUR_PROJECT_ID.firebaseapp.com",
 *   "firestoreDatabaseId": "(default)",
 *   "storageBucket": "YOUR_PROJECT_ID.firebasestorage.app",
 *   "messagingSenderId": "YOUR_SENDER_ID"
 * }
 */
import firebaseConfig from '../firebase-applet-config.json';
import { OperationType } from './types';

export const ADMIN_EMAIL = 'mohantysovit@gmail.com';

const app = initializeApp(firebaseConfig);

// CRITICAL: Pass firestoreDatabaseId so named Enterprise Firestore databases resolve properly.
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

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

/**
 * Structured Firestore error wrapper required for diagnostics and ErrorBoundary surfacing.
 */
export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Startup connectivity validation check.
 */
export async function testConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration — client appears offline.');
    }
  }
}

testConnection();
