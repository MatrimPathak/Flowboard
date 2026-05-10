import * as admin from "firebase-admin";

const getApp = () => {
  if (!admin.apps.length) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (projectId && clientEmail && privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      });
    } else {
      return null;
    }
  }
  return admin.apps[0];
};

export const getAdminAuth = () => {
  const app = getApp();
  if (!app) throw new Error("Firebase Admin SDK not initialized. Check your environment variables.");
  return admin.auth();
};

export const getAdminDb = () => {
  const app = getApp();
  if (!app) throw new Error("Firebase Admin SDK not initialized. Check your environment variables.");
  return admin.firestore();
};

export const getAdminStorage = () => {
  const app = getApp();
  if (!app) throw new Error("Firebase Admin SDK not initialized. Check your environment variables.");
  return admin.storage();
};

/**
 * COMPATIBILITY PROXIES
 * These allow existing code that uses `adminDb.collection(...)` to work 
 * while ensuring initialization happens lazily.
 */

export const adminDb = new Proxy({} as admin.firestore.Firestore, {
  get(_, prop) {
    const db = getAdminDb();
    return (db as any)[prop];
  }
});

export const adminAuth = new Proxy({} as admin.auth.Auth, {
  get(_, prop) {
    const auth = getAdminAuth();
    return (auth as any)[prop];
  }
});

export const adminStorage = new Proxy({} as admin.storage.Storage, {
  get(_, prop) {
    const storage = getAdminStorage();
    return (storage as any)[prop];
  }
});
