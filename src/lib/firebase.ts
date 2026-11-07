"use client";

import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

// الإعدادات تجي من ملف .env.local (انظروا .env.local.example)
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// إذا الإعدادات ناقصة، الموقع يشتغل بدون أونلاين
export const firebaseReady = Boolean(config.apiKey && config.databaseURL && config.projectId);

const isBrowser = typeof window !== "undefined";
const app = firebaseReady && isBrowser ? (getApps()[0] ?? initializeApp(config)) : null;

export const auth = app ? getAuth(app) : null;
export const db = app ? getDatabase(app) : null;
