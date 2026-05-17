import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, GithubAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
	throw new Error("NEXT_PUBLIC_FIREBASE_API_KEY is not set");
}
if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
	throw new Error("NEXT_PUBLIC_FIREBASE_PROJECT_ID is not set");
}

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

const firebaseConfig = {
	apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
	authDomain: `${projectId}.firebaseapp.com`,
	projectId,
	storageBucket: `${projectId}.firebasestorage.app`,
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
export const githubProvider = new GithubAuthProvider();
