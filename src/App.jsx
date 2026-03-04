import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import Login from './Login';
import NewSplash from './NewSplash';
import useSyncManager from './components/useSyncManager';

// Lazy Load Heavy Components
const Dashboard = React.lazy(() => import('./Dashboard'));
const AdminDashboard = React.lazy(() => import('./AdminDashboard'));
const SplashScreen = React.lazy(() => import('./components/SplashScreen'));

const APP_VERSION = '1.1.1';

function App() {
  const [user, setUser] = useState(() => localStorage.getItem('jarwis_user'));
  const [authUID, setAuthUID] = useState(null);
  const [role, setRole] = useState(() => localStorage.getItem('jarwis_role'));
  const [loading, setLoading] = useState(true);
  const [authResolved, setAuthResolved] = useState(false);
  const [splashFinished, setSplashFinished] = useState(false);
  const [isOutdated, setIsOutdated] = useState(false);
  const [error, setError] = useState(null);

  // Initialize Background Offline Sync Manager
  useSyncManager();

  // Catch local errors
  useEffect(() => {
    const handleError = (e) => {
      console.error("🔥 [Global Error]:", e);
      setError(e.message || "Unknown Application Error");
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  // VERSION ENFORCEMENT
  useEffect(() => {
    if (!user) return; // Wait for auth to resolve to avoid permission errors
    const checkVersion = async () => {
      try {
        const configSnap = await getDoc(doc(db, "system_config", "config"));
        if (configSnap.exists()) {
          const { min_version } = configSnap.data();
          if (min_version && min_version > APP_VERSION) {
            console.warn(`🚨 VERSION OUTDATED: App (${APP_VERSION}) < Min (${min_version})`);
            setIsOutdated(true);
          }
        } else {
          // Initialize config if missing (Auto-set to 1.1.1)
          await setDoc(doc(db, "system_config", "config"), { min_version: "1.1.1" });
        }
      } catch (e) {
        if (e.code !== 'permission-denied') {
          console.error("❌ Version check failed:", e);
        }
      }
    };
    checkVersion();
  }, [user]);

  useEffect(() => {
    const auth = getAuth();
    console.log("🏁 [App] Initializing Auth Lifecycle");

    // FALLBACK TIMEOUT: If auth doesn't resolve in 10s, force clear loading
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn("⚠️ [Auth] Connection Timeout reached. Forcing UI reveal.");
        setAuthResolved(true); // Set authResolved even on timeout
      }
    }, 10000);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("🔄 [Auth State Change] User:", firebaseUser ? firebaseUser.email : "None");

      if (firebaseUser) {
        clearTimeout(timeout);
        console.log("📌 [Auth UID]:", firebaseUser.uid);
        let currentRole = 'salesman';

        try {
          console.log("🔍 [Firestore] Fetching role for UID:", firebaseUser.uid);
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));

          if (userDoc.exists()) {
            currentRole = userDoc.data().role || 'salesman';
            console.log("✅ [Firestore] Role Found:", currentRole);
          } else {
            console.warn("⚠️ [Firestore] No user document found for UID.");
          }

          localStorage.setItem('jarwis_role', currentRole);
        } catch (e) {
          console.error("❌ [Firestore] Role fetch error:", e);
        }

        const savedUser = localStorage.getItem('jarwis_user');
        const displayName = savedUser
          ? savedUser.trim().toUpperCase().replace(/\s+/g, ' ')
          : (currentRole === 'admin' ? "ADMIN USER" : "UNKNOWN");

        setUser(displayName);
        setAuthUID(firebaseUser.uid);
        setRole(currentRole);
        console.log("🚀 [App State] Rendering for Role:", currentRole);
      } else {
        setUser(null);
        setAuthUID(null);
        setRole(null);
        localStorage.removeItem('jarwis_user');
        localStorage.removeItem('jarwis_role');
      }
      setAuthResolved(true);
    });

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  // Sync Splash exit with Auth resolution
  useEffect(() => {
    const isOptimisticallyLoggedOut = !localStorage.getItem('jarwis_user');

    // If we have no cached user, show Login immediately after splash
    // If we DO have a cached user, wait for Auth to resolve to prevent flicker
    if ((authResolved || isOptimisticallyLoggedOut) && splashFinished) {
      console.log("🔥 [App] Ready to reveal UI. Optimization applied.");
      setLoading(false);
    }
  }, [authResolved, splashFinished]);

  const handleLoginSuccess = (salesmanName, userRole) => {
    localStorage.setItem('jarwis_user', salesmanName);
    localStorage.setItem('jarwis_role', userRole);
    setUser(salesmanName);
    setRole(userRole);
  };



  if (error) {
    return (
      <div className="min-h-screen bg-red-950 flex flex-col items-center justify-center p-8 text-center">
        <div className="p-6 bg-red-500/20 rounded-full mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
        </div>
        <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">System Collision</h2>
        <p className="text-red-400 text-sm font-bold opacity-80 mb-8">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-8 py-3 bg-red-600 text-white font-black rounded-full uppercase tracking-widest text-[10px] shadow-lg active:scale-95"
        >
          Reboot System
        </button>
      </div>
    );
  }

  if (loading) {
    return <NewSplash onFinish={() => setSplashFinished(true)} />;
  }

  if (isOutdated) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-24 h-24 bg-blue-500/10 rounded-full flex items-center justify-center mb-8 border border-blue-500/20 relative">
          <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping"></div>
          <RefreshCw size={40} className="text-blue-400 rotate-180" />
        </div>
        <h1 className="text-3xl font-black text-white uppercase tracking-tighter mb-4 italic">
          Update Required
        </h1>
        <p className="text-slate-400 text-sm font-bold leading-relaxed max-w-xs mb-10">
          A critical system update (v{APP_VERSION}) is mandatory to continue using JARWIS PRO.
        </p>
        <div className="bg-white/5 p-4 rounded-2xl border border-white/10 mb-8 w-full max-w-xs">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Current Version</p>
          <p className="text-lg font-black text-white">v{APP_VERSION}</p>
        </div>
        <p className="text-blue-400 text-[10px] font-black uppercase tracking-widest animate-pulse">
          Please download the latest APK
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F172A] relative overflow-x-hidden">
      {/* GLOBAL BACKUP BACKGROUND FOR ALL VIEWS */}
      <div className="fixed inset-0 bg-[#0F172A] -z-10"></div>

      {user ? (
        <React.Suspense fallback={
          <div className="fixed inset-0 bg-slate-950 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        }>
          {role === 'admin' ? (
            <AdminDashboard adminName={user} />
          ) : (
            <Dashboard salesmanID={user} authUID={authUID} />
          )}
        </React.Suspense>
      ) : (
        <Login onLoginSuccess={handleLoginSuccess} />
      )}
    </div>
  );
}

export default App;
