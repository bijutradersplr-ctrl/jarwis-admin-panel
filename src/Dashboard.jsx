import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { Virtuoso } from 'react-virtuoso';
import { LogOut, Wallet, FileText, AlertCircle, RefreshCw, User, TrendingUp, ChevronLeft, ChevronRight, MapPin, Search, ArrowRight, Smartphone, Edit2, Check, X, Loader2, Compass, Trophy, Medal, Star, Target, Zap } from 'lucide-react';
import { getAuth } from "firebase/auth";
import { doc, onSnapshot, collection, query, where, updateDoc, getDoc, getDocFromServer, setDoc, getDocs, increment, deleteDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { db as dexieDB } from './db';

import CollectPaymentModal from './CollectPaymentModal';
import RouteExplorerModal from './components/RouteExplorerModal';
import CompanyDetailsModal from './components/CompanyDetailsModal';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

// --- NEW GAMIFICATION COMPONENTS ---

const PointFloater = React.memo(({ points, isOverdue, onComplete }) => {
    useEffect(() => {
        const timer = setTimeout(onComplete, 1200);
        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <div className={`fixed left-1/2 -translate-x-1/2 z-[150] pointer-events-none animate-float-up-fade text-2xl font-black italic tracking-tighter drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)] ${isOverdue ? 'text-amber-400 shadow-amber-500/50' : 'text-emerald-400 shadow-emerald-500/50'}`}
            style={{ top: '45%' }}>
            +{points} POINTS
            {isOverdue && <Star size={18} className="inline ml-1 mb-1 fill-amber-400" />}
        </div>
    );
});

const CashCoinAnimation = React.memo(({ startPos, targetPos, onComplete }) => {
    const [coins, setCoins] = useState([]);

    useEffect(() => {
        // Generate 12 coins for the "Kaching" effect
        const newCoins = Array.from({ length: 12 }).map((_, i) => ({
            id: i,
            delay: i * 50,
            tx: (targetPos.x - startPos.x) + (Math.random() * 40 - 20),
            ty: (targetPos.y - startPos.y) + (Math.random() * 40 - 20),
        }));
        setCoins(newCoins);
        const timer = setTimeout(onComplete, 1500);
        return () => clearTimeout(timer);
    }, [startPos, targetPos, onComplete]);

    return (ReactDOM.createPortal(
        <div className="fixed inset-0 pointer-events-none z-[160]">
            {coins.map(coin => (
                <div
                    key={coin.id}
                    className="absolute w-5 h-5 bg-amber-500 rounded-full border-2 border-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.8)] animate-coin-fly"
                    style={{
                        left: startPos.x,
                        top: startPos.y,
                        '--tx': `${coin.tx}px`,
                        '--ty': `${coin.ty}px`,
                        animationDelay: `${coin.delay}ms`
                    }}
                >
                    <div className="w-full h-full flex items-center justify-center text-[8px] font-black text-amber-900">$</div>
                </div>
            ))}
        </div>,
        document.body
    ));
});

const SuccessTick = React.memo(({ onComplete }) => {
    useEffect(() => {
        const timer = setTimeout(onComplete, 1200);
        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <div className="fixed inset-0 z-[170] flex items-center justify-center pointer-events-none bg-slate-950/20 backdrop-blur-[2px]">
            <div className="bg-emerald-500 rounded-full p-8 shadow-[0_0_50px_rgba(16,185,129,0.5)] animate-pop-in">
                <Check size={80} strokeWidth={4} className="text-white" />
            </div>
        </div>
    );
});

const Confetti = React.memo(() => {
    return (
        <div className="fixed inset-0 pointer-events-none z-[110] overflow-hidden">
            {[...Array(50)].map((_, i) => (
                <div
                    key={i}
                    className="absolute w-2 h-2 rounded-full animate-confetti"
                    style={{
                        left: `${Math.random() * 100}%`,
                        top: `-10px`,
                        backgroundColor: ['#fbbf24', '#34d399', '#60a5fa', '#f87171', '#c084fc'][Math.floor(Math.random() * 5)],
                        animationDelay: `${Math.random() * 3}s`,
                        animationDuration: `${2 + Math.random() * 2}s`
                    }}
                />
            ))}
        </div>
    );
});

const MiniLeaderboard = React.memo(({ performers, salesmanName }) => {
    // Logic: If NO performers, or ALL performers have 0% achievement, show motivation
    const allZero = performers && performers.length > 0 && performers.every(p => (p.pct || 0) < 1);

    if (!performers || performers.length === 0 || allZero) {
        return (
            <div className="bg-slate-900/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl animate-fade-in text-center group overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-[40px] -mr-16 -mt-16 group-hover:bg-blue-500/20 transition-all duration-700"></div>

                {/* JARWIS Circuit Pattern Overlay (Subtle) */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h40v40H0V0zm2 2h36v36H2V2zm2 2h32v32H4V4zm2 2h28v28H6V6zm2 2h24v24H8V8zm2 2h20v20H10V10zm2 2h16v16H12V12zm2 2h12v12H14V14zm2 2h8v8H16v-8zm2 2h4v4h-4v-4z' fill='%23ffffff' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E")` }}></div>

                <div className="relative z-10 flex flex-col items-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center shadow-lg shadow-blue-500/20 mb-6 group-hover:scale-110 transition-transform duration-500">
                        <Zap size={28} className="text-white animate-pulse" />
                    </div>
                    <h3 className="text-xl font-black text-white tracking-tight leading-tight">
                        Ready for your first sale, {salesmanName || 'Champ'}?
                    </h3>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-3 opacity-70">
                        The leaderboard is fresh. Start collecting to be #1!
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-900/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-6 shadow-2xl animate-fade-in group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-[40px] -mr-16 -mt-16 pointer-events-none"></div>
            <div className="flex items-center justify-center gap-2 mb-6">
                <Trophy size={18} className="text-amber-500" />
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest italic">Top Performers</h3>
            </div>

            <div className="space-y-4">
                {performers.slice(0, 3).map((p, i) => (
                    <div key={i} className="flex items-center gap-4 group/item">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-[10px] ${i === 0 ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' :
                            i === 1 ? 'bg-slate-300/20 text-slate-300 border border-slate-300/30' :
                                'bg-orange-500/20 text-orange-500 border border-orange-500/30'
                            }`}>
                            #{i + 1}
                        </div>
                        <div className="flex-1">
                            <p className="text-[11px] font-black text-white uppercase tracking-tight truncate group-hover/item:text-blue-400 transition-colors">
                                {p.name}
                            </p>
                            <div className="h-1.5 w-full bg-white/5 rounded-full mt-1.5 overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-1000 ${i === 0 ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]' :
                                        i === 1 ? 'bg-slate-300 shadow-[0_0_10px_rgba(203,213,225,0.3)]' :
                                            'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.3)]'
                                        }`}
                                    style={{ width: `${p.pct}%` }}
                                />
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-[10px] font-black text-white italic">{Math.round(p.pct)}%</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
});

const BadgeNotification = React.memo(({ badge, onClose }) => {
    if (!badge) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-500">
            <div className="relative max-w-sm w-full bg-gradient-to-br from-slate-900 to-slate-950 border border-amber-500/30 rounded-[3rem] p-10 text-center shadow-[0_0_100px_rgba(245,158,11,0.2)] animate-in zoom-in-95 duration-500">
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-24 h-24 bg-amber-500 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(245,158,11,0.5)] animate-bounce-slow">
                    <Trophy size={48} className="text-white" />
                </div>
                <Confetti />

                <h2 className="mt-8 text-3xl font-black text-white uppercase tracking-tight italic">
                    Congratulations!
                </h2>
                <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-amber-400/10 border border-amber-400/20 rounded-full">
                    <Star size={16} className="text-amber-400 fill-amber-400" />
                    <span className="text-xs font-black text-amber-400 uppercase tracking-widest">{badge.label}</span>
                </div>

                <p className="mt-6 text-slate-400 text-sm font-medium leading-relaxed">
                    The Admin has awarded you the <span className="text-white font-bold">"{badge.label}"</span> badge for your outstanding performance!
                </p>

                <button
                    onClick={onClose}
                    className="mt-10 w-full py-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black uppercase tracking-widest rounded-2xl transition-all active:scale-95 shadow-[0_10px_30px_rgba(245,158,11,0.3)]"
                >
                    Claim Badge
                </button>
            </div>
        </div>
    );
});

const BADGE_CONFIG = {
    star_week: { icon: <Star size={14} fill="currentColor" />, color: 'bg-amber-400/10 text-amber-500 border-amber-500/20', shadow: 'shadow-[0_0_15px_rgba(245,158,11,0.3)]' },
    best_collector: { icon: <Trophy size={14} fill="currentColor" />, color: 'bg-emerald-400/10 text-emerald-500 border-emerald-500/20', shadow: 'shadow-[0_0_15px_rgba(16,185,129,0.3)]' },
    top_closer: { icon: <Target size={14} fill="currentColor" />, color: 'bg-blue-400/10 text-blue-500 border-blue-500/20', shadow: 'shadow-[0_0_15px_rgba(59,130,246,0.3)]' },
    speedster: { icon: <TrendingUp size={14} />, color: 'bg-indigo-400/10 text-indigo-500 border-indigo-500/20', shadow: 'shadow-[0_0_15px_rgba(129,140,248,0.3)]' }
};

const SOUNDS = {
    kaching: 'https://notificationsounds.com/storage/sounds/file-sounds-1148-juntos.mp3', // GPay Style Success
    fanfare: 'https://notificationsounds.com/storage/sounds/file-sounds-1148-juntos.mp3', // Consistent Professional Sound
    click: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3' // Click
};

export default function Dashboard({ salesmanID, authUID }) {
    // Helper to prevent path errors (e.g. "M/S")
    const sanitizeKey = (key) => {
        return String(key || "").trim().toUpperCase().replace(/[\/\\#\?]/g, "_");
    };

    const normalizeID = (name) => {
        if (!name) return "";
        // Preserve spaces as they might be part of the Firestore ID, as well as . and -
        return name.trim().toUpperCase().replace(/[^A-Z0-9 .\-]/g, '');
    };

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('HOME');
    const [selectedRoute, setSelectedRoute] = useState(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [selectedBill, setSelectedBill] = useState(null);
    const [pendingRequests, setPendingRequests] = useState([]);
    const [pendingShopIds, setPendingShopIds] = useState([]);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isRouteExplorerOpen, setIsRouteExplorerOpen] = useState(false);
    const [isTotalOutstandingModalOpen, setIsTotalOutstandingModalOpen] = useState(false);
    const [prefilledAmount, setPrefilledAmount] = useState(null);
    const [routeFilterMode, setRouteFilterMode] = useState('TODAY'); // 'TODAY' | 'ALL'

    // Phone Number Mgmt
    const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
    // ... existing ...

    // ... (lines 272)
    const [billingParty, setBillingParty] = useState(null);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [updatingPhone, setUpdatingPhone] = useState(false);
    const [todayStats, setTodayStats] = useState({ Cash: 0, UPI: 0, Cheque: 0, Total: 0, count: 0 });
    const [masterPlan, setMasterPlan] = useState(null);
    const [topPerformers, setTopPerformers] = useState([]);

    // --- GAMIFICATION STATE ---
    const [pointsAnimation, setPointsAnimation] = useState(null); // { points, isOverdue }
    const [coinAnimation, setCoinAnimation] = useState(null); // { startPos, targetPos }
    const [showSuccessTick, setShowSuccessTick] = useState(false);
    const [targetData, setTargetData] = useState(null);
    const [tLoading, setTLoading] = useState(true);
    const [showBadgeNotif, setShowBadgeNotif] = useState(false);
    const [isMuted, setIsMuted] = useState(localStorage.getItem('jarwis_muted') === 'true');
    const [todayPoints, setTodayPoints] = useState(0);
    const [pendingUpdates, setPendingUpdates] = useState([]);
    const [showQuickActions, setShowQuickActions] = useState(false);
    const [allMasterPlans, setAllMasterPlans] = useState({});
    const [allSalesmenTargets, setAllSalesmenTargets] = useState([]);

    // Company Breakdown Modal State
    const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
    const [selectedCompanyData, setSelectedCompanyData] = useState({ name: '', color: '', glow: '' });

    // Audio Helpers - OPTIMIZED FOR LOW LATENCY
    const audioRefs = React.useRef({});

    useEffect(() => {
        // Preload all sounds only once
        Object.keys(SOUNDS).forEach(key => {
            if (!audioRefs.current[key]) {
                const audio = new Audio(SOUNDS[key]);
                audio.preload = 'auto'; // Force browser to buffer
                audioRefs.current[key] = audio;
            }
        });
    }, []);

    const playSound = React.useCallback((type) => {
        if (isMuted) return;
        const audio = audioRefs.current[type];
        if (audio) {
            audio.currentTime = 0; // Reset to start for rapid clicks
            audio.play().catch(e => console.log("Audio play blocked", e));
        }
    }, [isMuted]);

    const triggerHaptic = () => {
        if (isMuted) return;
        if (window.navigator.vibrate) {
            window.navigator.vibrate(20);
        }
    };


    // Lock body scroll when modals are open
    useEffect(() => {
        if (isPhoneModalOpen || isPaymentModalOpen || isCompanyModalOpen || isRouteExplorerOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isPhoneModalOpen, isPaymentModalOpen, isCompanyModalOpen, isRouteExplorerOpen]);

    useEffect(() => {
        const calculateStats = () => {
            const todayStr = new Date().toLocaleDateString('en-CA');
            const stats = { Cash: 0, UPI: 0, Cheque: 0, Total: 0, count: 0 };

            pendingRequests.forEach(req => {
                let isToday = false;
                if (req.date === todayStr) isToday = true;
                if (!isToday && req.timestamp && typeof req.timestamp.toDate === 'function') {
                    if (req.timestamp.toDate().toLocaleDateString('en-CA') === todayStr) isToday = true;
                }
                if (!isToday && !req.timestamp && !req.date) isToday = true;

                if (isToday) {
                    const type = req.payment_type || 'Cash';
                    stats[type] = (stats[type] || 0) + Number(req.amount || 0);
                    stats.Total += Number(req.amount || 0);
                    stats.count += 1;
                }
            });
            setTodayStats(stats);
        };
        calculateStats();
    }, [pendingRequests]);

    const [activeAccountID, setActiveAccountID] = useState(null);
    const loginNormalized = normalizeID(salesmanID);

    useEffect(() => {
        const discoverAccount = async () => {
            let baseID = loginNormalized;

            // 1. UID RESOLUTION
            if (authUID) {
                try {
                    const userSnap = await getDoc(doc(db, "users", authUID));
                    if (userSnap.exists()) {
                        const uData = userSnap.data();
                        const officialName = uData.salesman_name || uData.name;
                        if (officialName) baseID = normalizeID(officialName);
                    }
                } catch (e) {
                    console.error("[Dashboard] Profile Fetch Error:", e);
                }
            }

            const tryFetch = async (id) => {
                const docSnap = await getDoc(doc(db, "outstanding_data", id));
                return docSnap.exists() ? id : null;
            };

            try {
                // 2. DISCOVERY SEQUENCE (Ordered by Reliability)
                // A. Spaced/Official ID
                let foundID = await tryFetch(baseID);

                // B. Squashed Fallback
                if (!foundID && baseID.includes(' ')) {
                    foundID = await tryFetch(baseID.replace(/\s+/g, ''));
                }

                // C. First-Name Fallback
                if (!foundID && baseID.includes(' ')) {
                    foundID = await tryFetch(baseID.split(' ')[0]);
                }

                // D. Legacy Short ID (6 chars)
                if (!foundID && baseID.length > 6) {
                    foundID = await tryFetch(baseID.replace(/\s+/g, '').substring(0, 6));
                }

                if (foundID) {
                    console.log(`[Dashboard] DISCOVERY SUCCESS: ${foundID}`);
                    setActiveAccountID(foundID);
                } else {
                    console.warn(`[Dashboard] DISCOVERY FAILED for ${baseID}. Falling back to base.`);
                    setActiveAccountID(baseID);
                }
            } catch (err) {
                console.error("[Dashboard] Discovery Error:", err);
                setActiveAccountID(baseID);
            }
        };
        discoverAccount();
    }, [authUID, loginNormalized]);

    useEffect(() => {
        if (!activeAccountID) return;
        setLoading(true);
        console.log(`[Firestore/Dexie] Syncing Dashboard for: ${activeAccountID}`);

        let isSubscribed = true;

        // 1. OFFLINE FIRST: Load from Dexie immediately
        const loadLocalData = async () => {
            try {
                const localBills = await dexieDB.bills.where('salesman_id').equals(activeAccountID).toArray();
                if (localBills.length > 0 && isSubscribed) {
                    console.log("[Dexie] Loaded offline data instantly:", localBills.length, "bills");
                    // Reconstruct data object structure expected by UI
                    setData({ bills: localBills, routes: [...new Set(localBills.map(b => b.Route).filter(Boolean))], total_outstanding: localBills.reduce((acc, b) => acc + Number(b.Amount || 0), 0) });
                    setLoading(false);
                }
            } catch (err) {
                console.error("[Dexie] Error loading local data:", err);
            }
        };

        loadLocalData();

        // 2. Persistent Real-time listener to Firestore
        const unsub = onSnapshot(doc(db, "outstanding_data", activeAccountID), async (snap) => {
            if (snap.exists()) {
                console.log("[Firestore] Real-time data sync success.");
                const cloudData = snap.data();

                if (isSubscribed) {
                    setData(cloudData);
                    setLoading(false);
                    setIsRefreshing(false);
                }

                // 3. Save incoming data to Dexie for next offline session
                if (cloudData.bills && Array.isArray(cloudData.bills)) {
                    try {
                        const billsToSave = cloudData.bills.map(b => ({
                            ...b,
                            id: b.id || b.bill_no || Math.random().toString(),
                            salesman_id: activeAccountID
                        }));

                        await dexieDB.transaction('rw', dexieDB.bills, async () => {
                            // Clear old cache for this salesman to prevent stale data buildup
                            await dexieDB.bills.where('salesman_id').equals(activeAccountID).delete();
                            await dexieDB.bills.bulkAdd(billsToSave);
                        });
                        console.log("[Dexie] Cached fresh bills to local DB");
                    } catch (err) {
                        console.error("[Dexie] Failed to cache bills:", err);
                    }
                }
            } else if (!snap.metadata.fromCache) {
                console.warn("[Firestore] No doc at", activeAccountID);
            }
        }, (err) => {
            console.error("[Firestore] Sync Error:", err);
            setLoading(false);
            setIsRefreshing(false);
        });

        // 4. My Master Plan Listener (Targeted Doc for Efficiency)
        const plansUnsub = onSnapshot(doc(db, "salesman_master_plan", activeAccountID), (snap) => {
            if (snap.exists()) {
                const plan = snap.data();
                setMasterPlan(plan);
                // Also update the local cached version used by other components
                setAllMasterPlans(prev => ({ ...prev, [activeAccountID]: plan }));
                console.log("[Firestore] Personal Master Plan Synced.");
            }
        });

        // 5. Global Users Listener (Used for both Leaderboard and Company Totals)
        const usersQuery = query(collection(db, "users"), where("role", "==", "salesman"));
        const usersUnsub = onSnapshot(usersQuery, (snap) => {
            const allTargets = [];
            snap.forEach(d => {
                const u = d.data();
                const target = Number(u.monthly_target || 0);
                const achieved = Number(u.total_achieved || 0);
                allTargets.push({
                    id: d.id,
                    uid: u.uid || d.id,
                    name: u.salesman_name || u.name,
                    monthly_target: target,
                    salesman_id: (u.salesman_name || u.name)?.toUpperCase().replace(/[^A-Z0-9]/g, ''),
                    achieved: achieved,
                    pct: target > 0 ? (achieved / target) * 100 : 0,
                    rank: Number(u.current_rank || 100),
                    score: Number(u.current_score || 0)
                });
            });

            console.log("[Firestore] All Salesmen Synced:", allTargets.length);
            setAllSalesmenTargets(allTargets);

            // Update topPerformers by filtering the full list (Top 3 with > 1% achievement)
            const top = allTargets
                .filter(p => p.rank > 0 && p.pct >= 1)
                .sort((a, b) => a.rank - b.rank)
                .slice(0, 3);
            setTopPerformers(top);
        });

        return () => {
            isSubscribed = false;
            unsub();
            plansUnsub();
            usersUnsub();
        };
    }, [activeAccountID, refreshTrigger]);

    // 6. One-time Global Plans Fetch (For Company Grouping)
    useEffect(() => {
        const fetchAllPlans = async () => {
            try {
                const snap = await getDocs(collection(db, "salesman_master_plan"));
                const pPlans = {};
                snap.forEach(doc => {
                    pPlans[doc.id.toUpperCase().replace(/[^A-Z0-9]/g, '')] = doc.data();
                });
                setAllMasterPlans(prev => ({ ...prev, ...pPlans }));
                console.log("[Firestore] All Master Plans Loaded (One-time Fetch)");
            } catch (err) {
                console.error("Failed to fetch all master plans:", err);
            }
        };
        fetchAllPlans();
    }, []);

    const handleHardRefresh = async () => {
        setIsRefreshing(true);
        setRefreshTrigger(prev => prev + 1);

        try {
            const snap = await getDocFromServer(doc(db, "outstanding_data", activeAccountID));
            console.log(`[Firestore Refresh] Forced server status: ${snap.exists() ? 'FOUND' : 'MISSING'}`);
            if (snap.exists()) setData(snap.data());
        } catch (e) {
            console.error("[Firestore Refresh] Failed:", e);
        } finally {
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        if (!activeAccountID) return;
        const q = query(collection(db, "pending_collections"), where("salesman", "==", activeAccountID));
        const unsub = onSnapshot(q, (querySnapshot) => {
            const requests = [];
            const pIds = [];
            const todayStr = new Date().toLocaleDateString('en-CA');

            querySnapshot.forEach((doc) => {
                const d = doc.data();
                requests.push({ id: doc.id, ...d });

                // STRICT FILTER: Today's Pending Collections
                let isToday = false;

                // 1. Check Explicit Date Field
                if (d.date === todayStr) isToday = true;

                // 2. Check Timestamp (Server Time)
                if (!isToday && d.timestamp && typeof d.timestamp.toDate === 'function') {
                    if (d.timestamp.toDate().toLocaleDateString('en-CA') === todayStr) isToday = true;
                }

                // 3. Fallback: If no date/timestamp (local write), assume Today
                if (!isToday && !d.timestamp && !d.date) isToday = true;

                if (isToday && d.status === 'Pending') {
                    // PRIORITIZE SHOP ID -> BILL NO -> PARTY
                    if (d.shop_id) pIds.push(String(d.shop_id));
                    if (d.bill_no) pIds.push(String(d.bill_no));
                    if (d.party) pIds.push(d.party); // Last resort
                }
            });
            setPendingRequests(requests);

            setPendingShopIds(pIds);
        });
        return () => unsub();
    }, [activeAccountID]);

    useEffect(() => {
        if (!activeAccountID) return;
        const q = query(
            collection(db, "pending_updates"),
            where("salesman_id", "==", activeAccountID),
            where("status", "==", "Pending")
        );
        const unsub = onSnapshot(q, (snap) => {
            const updates = [];
            snap.forEach(doc => {
                updates.push({ id: doc.id, ...doc.data() });
            });
            setPendingUpdates(updates);
        });
        return () => unsub();
    }, [activeAccountID]);


    useEffect(() => {
        if (!activeAccountID) return;

        const fetchMasterPlan = async () => {
            // 0. IMMEDIATE RESTORE: Check specific route cache first (User Request Option A)
            try {
                const persistedRouteJson = localStorage.getItem('current_salesman_route');
                if (persistedRouteJson) {
                    const { route, salesmanId, date } = JSON.parse(persistedRouteJson);
                    // Verify it's for the same user and TODAY
                    if (salesmanId === activeAccountID && date === new Date().toDateString()) {
                        console.log(`[Dashboard] Restored Persisted Route: ${route}`);
                        setSelectedRoute(route);
                    }
                }
            } catch (e) {
                console.error("Error reading persisted route", e);
            }

            // 1. FAST LOAD: Try Master Plan Cache
            const cachedPlan = localStorage.getItem(`master_plan_${activeAccountID}`);
            if (cachedPlan) {
                try {
                    const parsedPlan = JSON.parse(cachedPlan);
                    setMasterPlan(parsedPlan);

                    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
                    const todayName = days[new Date().getDay()];
                    const routes = parsedPlan.routes || parsedPlan.Routes || {};
                    const cachedRoute = routes[todayName] || routes[todayName.toLowerCase()] || routes[todayName.charAt(0).toUpperCase() + todayName.slice(1)];

                    if (cachedRoute && cachedRoute !== "Select Route" && cachedRoute !== "No Routes Loaded") {
                        setSelectedRoute(cachedRoute);
                        // Ensure persistence match
                        localStorage.setItem('current_salesman_route', JSON.stringify({
                            route: cachedRoute,
                            salesmanId: activeAccountID,
                            date: new Date().toDateString()
                        }));
                    }
                } catch (e) {
                    console.error("Error parsing cached plan", e);
                }
            }

            // 2. BACKGROUND SYNC: Fetch Fresh Data
            try {
                const planSnap = await getDoc(doc(db, "salesman_master_plan", activeAccountID));
                if (planSnap.exists()) {
                    const plan = planSnap.data();
                    setMasterPlan(plan);
                    localStorage.setItem(`master_plan_${activeAccountID}`, JSON.stringify(plan));

                    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
                    const todayName = days[new Date().getDay()];

                    const routes = plan.routes || plan.Routes || {};
                    const scheduledRoute = routes[todayName] || routes[todayName.toLowerCase()] || routes[todayName.charAt(0).toUpperCase() + todayName.slice(1)];

                    console.log(`[Dashboard] Today is ${todayName}, Assigned Route: ${scheduledRoute}`);

                    if (scheduledRoute && scheduledRoute !== "Select Route" && scheduledRoute !== "No Routes Loaded") {
                        console.log(`[Dashboard] SETTING SELECTED ROUTE: ${scheduledRoute}`);
                        setSelectedRoute(scheduledRoute);

                        // PERSIST REQUESTED BY USER
                        localStorage.setItem('current_salesman_route', JSON.stringify({
                            route: scheduledRoute,
                            salesmanId: activeAccountID,
                            date: new Date().toDateString()
                        }));

                    } else {
                        console.warn(`[Dashboard] Invalid Route Value: '${scheduledRoute}'`);
                        // Only clear if we don't have a persisted valid route for today
                        const persisted = localStorage.getItem('current_salesman_route');
                        if (persisted) {
                            const p = JSON.parse(persisted);
                            if (p.date !== new Date().toDateString()) {
                                setSelectedRoute(null);
                            }
                        } else {
                            setSelectedRoute(null);
                        }
                    }
                } else {
                    console.error("[Dashboard] No Master Plan found for this user.");
                    if (!cachedPlan) setSelectedRoute(null);
                }
            } catch (err) {
                console.error("Error fetching master plan:", err);
                // Only clear if cache also failed
                if (!cachedPlan) setSelectedRoute(null);
            }
        };
        fetchMasterPlan();
    }, [activeAccountID]);


    useEffect(() => {
        // Target Data & Badge Listener
        // FIX: If data.uid is missing (unlinked preset account), fallback to activeAccountID
        const targetId = data?.uid || activeAccountID;
        if (!targetId || loading) return;

        const unsub = onSnapshot(doc(db, "users", targetId), (snap) => {
            if (snap.exists()) {
                const uData = snap.data();
                setTargetData(uData);

                // Persistence: Sync local todayPoints with Firestore daily_points
                if (uData.daily_points !== undefined) {
                    setTodayPoints(uData.daily_points);
                }

                // Check for new badge notification
                if (uData.new_badge_notification && !uData.new_badge_notification.isRead) {
                    setShowBadgeNotif(true);
                }
            } else {
                setTargetData(null);
            }
            setTLoading(false);
        }, (err) => {
            console.error("Target Listener Error:", err);
            setTLoading(false);
        });
        return () => unsub();
    }, [data?.uid, activeAccountID, loading]);

    const handleCloseNotif = async () => {
        setShowBadgeNotif(false);
        if (data?.uid) {
            const userRef = doc(db, "users", data.uid);
            await updateDoc(userRef, {
                "new_badge_notification.isRead": true
            });
        }
    };

    const handleLogout = () => {
        // ... (existing handleLogout)
        getAuth().signOut().then(() => {
            localStorage.removeItem('jarwis_user');
            window.location.reload();
        });
    };

    // Optimized Route Statistics
    const routeStats = React.useMemo(() => {
        if (!data?.bills) return { currentRouteTotal: 0, allRoutes: {} };

        // 1. Group all routes
        const allRoutes = data.bills.reduce((acc, bill) => {
            const r = (bill.Route || 'Unassigned').trim().toUpperCase();
            const amt = Number(bill.Balance) || Number(bill.Amount) || 0;
            acc[r] = (acc[r] || 0) + amt;
            return acc;
        }, {});

        // 2. Current Route Total
        const currentRouteNormalized = selectedRoute ? selectedRoute.trim().toUpperCase() : null;
        const currentRouteTotal = currentRouteNormalized ? (allRoutes[currentRouteNormalized] || 0) : 0;

        return { currentRouteTotal, allRoutes };
    }, [data, selectedRoute]);


    const filteredBills = React.useMemo(() => {
        if (!data || !data.bills) return [];

        const bills = data.bills.map(bill => ({
            ...bill,
            shop_id: bill.shop_id || bill.ShopID || bill.id // Ensure shop_id is on every bill
        }));

        if (routeFilterMode === 'ALL') return bills;
        if (!selectedRoute) return [];

        const targetRoute = selectedRoute.trim().toUpperCase();
        return bills.filter(b => (b.Route || "").trim().toUpperCase() === targetRoute);
    }, [data, routeFilterMode, selectedRoute]);

    const openPaymentModal = (bill) => {
        setSelectedBill(bill);
        setIsPaymentModalOpen(true);
    };

    const handlePaymentSuccess = (paymentDetail) => {
        const { amount, type, isOverdue, points_awarded } = paymentDetail;

        // 1. Calculate Points (1pt per 1k)
        const points = points_awarded || 0;

        // 2. Trigger Sensory Feedback (Kaching + Haptic)
        playSound('kaching');
        triggerHaptic();

        // 3. Trigger Points Animation
        setPointsAnimation({ points, isOverdue });
        setTodayPoints(prev => prev + points);

        // 4. Trigger Coin Animation (Cash Only)
        if (type === 'Cash') {
            // Find the "Total Collection" target position (top right area usually)
            setCoinAnimation({
                startPos: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
                targetPos: { x: window.innerWidth - 60, y: 40 }
            });
        }

        // 5. Show Success Tick
        setShowSuccessTick(true);

        // 6. Update user total points in Firestore (Optimistic)
        if (data?.uid) {
            updateDoc(doc(db, "users", data.uid), {
                total_points: increment(points),
                daily_points: increment(points)
            }).catch(e => console.error("Points update failed", e));
        }
    };

    const openPhoneModal = (bill) => {
        console.log('🔵 openPhoneModal CALLED with bill:', bill);
        if (!bill) {
            console.log('❌ Bill is null/undefined, returning');
            return;
        }
        const partyKey = sanitizeKey(bill.Party || 'Unknown');
        const latestPhone = bill.Phone || '';

        console.log('✅ Setting billingParty:', String(bill.Party || 'Unknown'));
        console.log('✅ Setting phoneNumber:', String(latestPhone));
        setBillingParty(String(bill.Party || 'Unknown'));
        setPhoneNumber(String(latestPhone));
        setIsPhoneModalOpen(true);
        console.log('✅ Modal state set to TRUE');
    };

    const handleUpdatePhone = async () => {
        if (!phoneNumber || phoneNumber.length !== 10) {
            alert("Please enter a valid 10-digit number");
            return;
        }

        const auth = getAuth();
        if (!auth.currentUser) {
            alert("Security Error: Session expired. Please log out and log in again.");
            return;
        }

        if (!activeAccountID) {
            alert("Session Error: Please log out and log in again.");
            return;
        }

        setUpdatingPhone(true);
        try {
            // REDIRECT TO PENDING APPROVALS
            await addDoc(collection(db, "pending_updates"), {
                type: 'phone_update',
                party: billingParty,
                old_value: '', // Admin can see it in current records
                new_value: phoneNumber,
                salesman_id: activeAccountID,
                salesman_name: data.salesman_name || activeAccountID,
                status: 'Pending',
                timestamp: serverTimestamp()
            });

            setIsPhoneModalOpen(false);
            alert("Verification request sent to Admin. Phone number will be updated once approved.");

        } catch (err) {
            console.error("Error updating phone:", err);
            if (err.code === 'permission-denied') {
                alert("Permission Denied: Your session may have expired. Please refresh the page and try again.");
            } else {
                alert("Connection Error: " + err.message);
            }
        } finally {
            setUpdatingPhone(false);
        }
    };

    // 1. New Header Design (Premium Gradient & Glow)
    const Header = () => (
        <div className="bg-premium-gradient px-5 py-5 pt-8 rounded-b-[2.2rem] mb-4 shadow-xl transition-all duration-500 relative z-30 border-b border-white/5 overflow-hidden">
            <div className="absolute top-0 right-0 w-72 h-72 bg-blue-500/10 blur-[120px] rounded-full -mr-24 -mt-24 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/5 blur-[80px] rounded-full -ml-16 -mb-16 pointer-events-none"></div>

            {/* JARWIS CIRCUIT PATTERN BACKGROUND - Disabled on Mobile for LCP Performance */}
            <div className="hidden sm:block absolute inset-0 opacity-[0.07] pointer-events-none mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M10 10h10v10H10V10zm20 0h10v10H30V10zM10 30h10v10H10V30zm20 0h10v10H30V30zm20-20h10v10H50V10zm20 0h10v10H70V10zM50 30h10v10H50V30zm20 0h10v10H70V30zM10 50h10v10H10V50zm20 0h10v10H30V50zm20 0h10v10H50V50zm20 0h10v10H70V50zM10 70h10v10H10V70zm20 0h10v10H30V70zm20 0h10v10H50V70zm20 0h10v10H70V70zM10 90h10v10H10V90zm20 0h10v10H30V90zm20 0h10v10H50V90zm20 0h10v10H70V90z' fill='%23ffffff' fill-opacity='1'/%3E%3C/svg%3E")` }}></div>

            <div className="relative z-10 flex items-center justify-between gap-2">
                {/* LEFT AREA: Initial Logo / Back */}
                <div className="flex z-20 items-center justify-start w-1/3">
                    <div className="flex items-center gap-2 max-w-full">
                        {view !== 'HOME' ? (
                            <button onClick={() => { playSound('click'); setView('HOME'); }} className="w-11 h-11 flex items-center justify-center bg-white/10 backdrop-blur-md rounded-2xl hover:bg-white/20 transition-all active:scale-95 border border-white/10 shadow-lg group shrink-0">
                                <ChevronLeft size={20} className="text-white group-hover:-translate-x-0.5 transition-transform" />
                            </button>
                        ) : (
                            <div className="w-11 h-11 shrink-0 flex items-center justify-center bg-white/5 rounded-2xl border border-white/5 opacity-50">
                                <Compass size={20} className="text-white/40" />
                            </div>
                        )}
                        <p className="hidden sm:block text-blue-100/50 text-[10px] uppercase tracking-[0.4em] font-black italic truncate">
                            {masterPlan?.company || masterPlan?.Company || "CENTRAL NODE"}
                        </p>
                    </div>
                </div>

                {/* CENTER AREA: Absolutely centered pending pill */}
                <div className="absolute left-1/2 -translate-x-1/2 z-20 flex justify-center w-1/3">
                    {pendingRequests.length > 0 && (
                        <button
                            onClick={() => { playSound('click'); setView('REPORTS'); }}
                            className="bg-gradient-to-r from-orange-600 to-orange-500 h-9 px-3.5 rounded-full border border-orange-400/30 shadow-[0_4px_15px_rgba(249,115,22,0.3)] flex items-center justify-center gap-2 active:scale-95 transition-all group shrink-0"
                        >
                            <div className="w-1.5 h-1.5 bg-white rounded-full shrink-0 group-hover:scale-125 transition-transform shadow-[0_0_5px_rgba(255,255,255,0.8)]"></div>
                            <span className="text-[10px] font-black text-white uppercase tracking-widest whitespace-nowrap">{pendingRequests.length} PENDING</span>
                        </button>
                    )}
                </div>

                {/* RIGHT AREA: Refresh & Logout */}
                <div className="flex z-20 items-center justify-end w-1/3">
                    <div className="flex items-center bg-slate-800/80 backdrop-blur-xl rounded-full p-1 border border-white/5 shadow-inner shrink-0">
                        <button
                            onClick={() => { playSound('click'); handleHardRefresh(); }}
                            disabled={isRefreshing}
                            className={`w-8 h-8 flex items-center justify-center rounded-full transition-all active:scale-90 ${isRefreshing ? 'animate-spin text-blue-400' : 'text-slate-300 hover:text-white hover:bg-white/10'}`}
                        >
                            <RefreshCw size={14} strokeWidth={2.5} />
                        </button>
                        <div className="w-[1px] h-5 bg-white/10 mx-0.5"></div>
                        <button
                            onClick={() => { playSound('click'); handleLogout(); }}
                            className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all active:scale-90"
                        >
                            <LogOut size={14} strokeWidth={2.5} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    // Home Menu View
    const HomeView = () => {
        const scrollContainerRef = React.useRef(null);
        const defaultSlideRef = React.useRef(null);

        React.useEffect(() => {
            if (scrollContainerRef.current && defaultSlideRef.current) {
                // Scroll to the second slide exactly in the center instantly on load
                const container = scrollContainerRef.current;
                const slide = defaultSlideRef.current;
                const scrollPos = slide.offsetLeft - container.offsetLeft - (container.clientWidth / 2) + (slide.clientWidth / 2);
                container.scrollLeft = scrollPos;
            }
        }, []);

        return (
            <div className="pt-2 animate-fade-in flex-1 flex flex-col overflow-hidden min-h-0">
                {/* CAROUSEL WRAPPER WITH PAGINATION DOTS LOGIC */}
                <div
                    ref={scrollContainerRef}
                    className="flex-1 flex overflow-x-auto overflow-y-hidden snap-x snap-mandatory no-scrollbar h-full"
                    style={{ WebkitOverflowScrolling: 'touch' }}
                >

                    {/* ----------------- SLIDE 1: QUICK ACTIONS (New Left Slide) ----------------- */}
                    <div className="min-w-full w-full h-full shrink-0 snap-center snap-always px-6 flex flex-col justify-center gap-4 py-8">
                        <div className="flex flex-col gap-4 w-full h-full justify-center">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
                                    <h3 className="text-slate-300 text-[10px] font-black uppercase tracking-[0.3em]">Quick Hub</h3>
                                </div>
                                <span className="text-slate-500 text-[9px] uppercase tracking-widest font-black animate-pulse flex items-center gap-1">
                                    Swipe Right <ArrowRight size={10} />
                                </span>
                            </div>

                            {/* 1. Outstandings Button (Red/Orange Glow) */}
                            <button
                                onClick={() => { playSound('click'); setView('OUTSTANDING_ROUTE_SELECT'); }}
                                className="group relative overflow-hidden bg-slate-900/40 backdrop-blur-xl p-0.5 rounded-[2rem] shadow-2xl active:scale-[0.98] hover:translate-y-[-4px] transition-all duration-300 border border-white/10"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-red-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                <div className="bg-slate-950/40 rounded-[1.9rem] p-4 sm:p-5 relative z-10 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.4)] group-hover:scale-110 transition-transform duration-300 shrink-0">
                                            <Wallet size={24} className="text-white drop-shadow-md" />
                                        </div>
                                        <div className="text-left">
                                            <h3 className="text-base font-black text-white tracking-tight group-hover:text-orange-400 transition-colors">Pending Collections</h3>
                                            <p className="text-slate-500 text-[9px] font-bold uppercase tracking-[0.2em] mt-0.5">View Route Balances</p>
                                        </div>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-orange-500 text-slate-500 group-hover:text-white transition-all shrink-0 ml-2">
                                        <ArrowRight size={16} />
                                    </div>
                                </div>
                            </button>

                            {/* 2. My Sales Button (Neon Blue Glow) */}
                            <button
                                onClick={() => { playSound('click'); setView('SALES'); }}
                                className="group relative overflow-hidden bg-slate-900/40 backdrop-blur-xl p-0.5 rounded-[2rem] shadow-2xl active:scale-[0.98] hover:translate-y-[-4px] transition-all duration-300 border border-white/10"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                <div className="bg-slate-950/40 rounded-[1.9rem] p-4 sm:p-5 relative z-10 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.4)] group-hover:scale-110 transition-transform duration-300 shrink-0">
                                            <TrendingUp size={24} className="text-white drop-shadow-md" />
                                        </div>
                                        <div className="text-left">
                                            <h3 className="text-base font-black text-white tracking-tight group-hover:text-blue-400 transition-colors">Target Analysis</h3>
                                            <p className="text-slate-500 text-[9px] font-bold uppercase tracking-[0.2em] mt-0.5">Daily Sales & Growth</p>
                                        </div>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-blue-500 text-slate-500 group-hover:text-white transition-all shrink-0 ml-2">
                                        <ArrowRight size={16} />
                                    </div>
                                </div>
                            </button>

                            {/* 3. Collection Report Button (Teal/Emerald Glow) */}
                            <button
                                onClick={() => { playSound('click'); setView('REPORTS'); }}
                                className="group relative overflow-hidden bg-slate-900/40 backdrop-blur-xl p-0.5 rounded-[2rem] shadow-2xl active:scale-[0.98] hover:translate-y-[-4px] transition-all duration-300 border border-white/10"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                <div className="bg-slate-950/40 rounded-[1.9rem] p-4 sm:p-5 relative z-10 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.4)] group-hover:scale-110 transition-transform duration-300 shrink-0">
                                            <FileText size={24} className="text-white drop-shadow-md" />
                                        </div>
                                        <div className="text-left">
                                            <h3 className="text-base font-black text-white tracking-tight group-hover:text-emerald-400 transition-colors">Collection Report</h3>
                                            <p className="text-slate-400 text-[9px] font-bold uppercase tracking-wider mt-0.5">Daily summary & history</p>
                                        </div>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-emerald-500 text-slate-500 group-hover:text-white transition-all shrink-0 ml-2">
                                        <ArrowRight size={16} />
                                    </div>
                                </div>
                            </button>

                            {/* 4. Route Portfolio Button (Premium Indigo Glow) */}
                            <button
                                onClick={() => { playSound('click'); setView('PORTFOLIO'); }}
                                className="group relative overflow-hidden bg-slate-900/40 backdrop-blur-xl p-0.5 rounded-[2rem] shadow-2xl active:scale-[0.98] hover:translate-y-[-4px] transition-all duration-300 border border-white/10"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                <div className="bg-slate-950/40 rounded-[1.9rem] p-4 sm:p-5 relative z-10 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(79,70,229,0.4)] group-hover:scale-110 transition-transform duration-300 shrink-0">
                                            <Compass size={24} className="text-white drop-shadow-md" />
                                        </div>
                                        <div className="text-left">
                                            <h3 className="text-base font-black text-white tracking-tight group-hover:text-indigo-400 transition-colors">Route Portfolio</h3>
                                            <p className="text-slate-400 text-[9px] font-bold uppercase tracking-wider mt-0.5">Market Analysis & Reach</p>
                                        </div>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-indigo-500 text-slate-500 group-hover:text-white transition-all shrink-0 ml-2">
                                        <ArrowRight size={16} />
                                    </div>
                                </div>
                            </button>
                        </div>
                        <div className="mt-auto"></div>
                    </div>

                    {/* ----------------- SLIDE 2: HOME/INTAKE OVERVIEW ----------------- */}
                    <div ref={defaultSlideRef} className="min-w-full w-full h-full shrink-0 snap-center snap-always px-6 flex flex-col justify-center gap-6 pt-2 pb-6">
                        {/* User Profile (Moved from Header) */}
                        <div className="flex flex-col items-center justify-center text-center gap-2 mt-auto">
                            <div className="relative inline-block mt-1 max-w-full">
                                <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tighter drop-shadow-2xl px-6 leading-tight uppercase truncate max-w-[80vw] sm:max-w-none block">
                                    {targetData?.salesman_name || targetData?.name || salesmanID}
                                </h2>
                                <div className="absolute -right-1 top-1.5 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)] animate-pulse"></div>
                            </div>

                            {/* RANK BADGE - Centered below name */}
                            {(() => {
                                const myID = activeAccountID?.replace(/\s+/g, '');
                                const myEntry = topPerformers.find(p =>
                                    p.salesman_id === myID ||
                                    p.name?.trim().toUpperCase() === (salesmanID || "").trim().toUpperCase()
                                );

                                if (myEntry && myEntry.rank <= 3 && myEntry.pct >= 1) {
                                    const rank = myEntry.rank;
                                    return (
                                        <div className={`px-5 py-2 rounded-full border font-black text-[10px] uppercase tracking-[0.25em] shadow-xl animate-in fade-in zoom-in duration-700 backdrop-blur-md ${rank === 1 ? 'bg-amber-500/20 border-amber-500/30 text-amber-500 shadow-amber-500/20' :
                                            rank === 2 ? 'bg-slate-300/20 border-slate-300/30 text-slate-300 shadow-slate-300/20' :
                                                'bg-orange-500/20 border-orange-500/30 text-orange-500 shadow-orange-500/20'
                                            }`}>
                                            🏆 Rank #{rank} Performer
                                        </div>
                                    );
                                }
                                return null;
                            })()}

                            <div className="mt-2 flex justify-center">
                                {selectedRoute ? (
                                    <div className="bg-slate-800/80 backdrop-blur-xl px-4 py-1.5 rounded-full border border-white/10 shadow-lg inline-flex items-center gap-2 group active:scale-95 transition-all">
                                        <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                                            <MapPin size={12} className="text-blue-400" />
                                        </div>
                                        <div className="flex flex-col text-left overflow-hidden">
                                            <span className="text-[8px] font-black text-blue-300/70 uppercase tracking-[0.2em] leading-none mb-0.5">Sector</span>
                                            <span className="text-[11px] font-black text-white uppercase tracking-tight leading-none truncate max-w-[30vw]">{selectedRoute}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-red-500/10 backdrop-blur-md px-4 py-1.5 rounded-full border border-red-500/20 shadow-inner inline-flex items-center gap-2 relative overflow-hidden group hover:bg-red-500/15 transition-colors">
                                        <div className="absolute inset-0 bg-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                        <div className="w-4 h-4 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                                            <AlertCircle size={10} className="text-red-400" />
                                        </div>
                                        <span className="text-[10px] font-black text-red-300 uppercase tracking-widest relative z-10">No Sector Locked</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {data ? (
                            <>
                                {/* Animated Stats Summary - SUPER PREMIUM DESIGN */}
                                <div className="p-8 pb-10 rounded-[2.5rem] relative overflow-hidden group border border-white/5 bg-gradient-to-br from-slate-900 via-[#0a0f1d] to-[#040814] shadow-[0_20px_50px_rgba(0,0,0,0.5)] mt-4">
                                    {/* VIBRANT GLOW BEHIND CARD CONTENT */}
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[30%] bg-blue-500/10 blur-[50px] rounded-[100%] pointer-events-none group-hover:bg-blue-400/20 group-hover:h-[40%] transition-all duration-1000"></div>

                                    <div className="relative mb-6 flex flex-col items-center text-center">
                                        <p className="text-slate-400 text-[10px] uppercase tracking-[0.3em] font-black opacity-70">Today's Collection</p>
                                        <button
                                            onClick={handleHardRefresh}
                                            disabled={isRefreshing}
                                            className={`absolute top-0 right-0 p-2 bg-white/5 rounded-xl hover:bg-white/10 transition-all active:scale-95 ${isRefreshing ? 'animate-spin opacity-50' : ''}`}
                                        >
                                            <RefreshCw size={14} className="text-blue-400" />
                                        </button>
                                    </div>

                                    <div className="flex flex-col gap-1.5 items-center text-center mt-2 relative z-10">
                                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-1 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]">
                                            COMBINED INTAKE
                                        </span>
                                        <div className="flex items-center justify-center w-full">
                                            <span className="text-4xl min-[380px]:text-5xl sm:text-6xl font-black text-white tracking-tighter drop-shadow-[0_0_20px_rgba(255,255,255,0.3)] my-1 truncate max-w-[90vw]">
                                                ₹{(selectedRoute ? routeStats.currentRouteTotal : (data?.total_outstanding || 0)).toLocaleString('en-IN')}
                                            </span>
                                        </div>

                                        {/* TOTAL OUTSTANDING PILL */}
                                        <button
                                            onClick={() => { playSound('click'); setIsTotalOutstandingModalOpen(true); }}
                                            className="mt-3 group flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 px-5 py-2 rounded-full transition-all active:scale-95"
                                        >
                                            <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0"></div>
                                            <div className="flex flex-col items-center justify-center leading-none">
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total Outstanding</span>
                                                <span className="text-sm font-black text-white tracking-tight">₹{(data?.total_outstanding || 0).toLocaleString('en-IN')}</span>
                                            </div>
                                            <ChevronRight size={14} className="text-slate-400 group-hover:text-white transition-colors shrink-0" />
                                        </button>
                                    </div>
                                </div>

                                {!selectedRoute && (
                                    <div className="flex items-center justify-center gap-3">
                                        <div className="bg-emerald-500/10 text-emerald-400 px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                                            {data?.bill_count || 0} BILLS
                                        </div>
                                        <div className="bg-blue-500/10 text-blue-400 px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
                                            {data?.routes?.length || 0} ROUTES
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="py-4 space-y-3">
                                {!selectedRoute && !loading && (
                                    <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-[2rem] text-center animate-fade-in mb-4">
                                        <AlertCircle size={32} className="text-red-400 mx-auto mb-3" />
                                        <h3 className="text-lg font-black text-red-200 uppercase tracking-tight">No Route Assigned for Today</h3>
                                        <p className="text-red-400/80 text-xs font-bold mt-1 uppercase tracking-wider mb-2">Please contact Admin to set up your schedule.</p>

                                        <div className="mt-4 p-3 bg-red-950/40 rounded-xl text-left border border-red-500/10 text-[10px] font-mono text-red-300">
                                            <p><strong>Date Check:</strong> {new Date().toLocaleDateString('en-IN', { weekday: 'long' })}</p>
                                            <p><strong>ID Check:</strong> {activeAccountID}</p>
                                            <p><strong>Plan Found:</strong> {masterPlan ? "YES" : "NO"}</p>
                                            <p><strong>Keys:</strong> {masterPlan ? Object.keys(masterPlan.routes || masterPlan.Routes || {}).join(', ') : 'N/A'}</p>
                                        </div>
                                    </div>
                                )}
                                <div className="flex items-center gap-3 text-red-400 bg-red-500/5 p-4 rounded-2xl border border-red-500/10">
                                    <AlertCircle size={20} className="shrink-0" />
                                    <p className="text-sm font-black uppercase tracking-widest leading-tight">
                                        NO CLOUD DATA MAPPED TO "{salesmanID}"
                                    </p>
                                </div>
                                <div className="bg-white/[0.02] p-5 rounded-[1.5rem] border border-white/5 shadow-inner">
                                    <p className="text-slate-500 text-[10px] font-bold leading-relaxed uppercase tracking-wider">
                                        1. Open the JARWIS PRO Python App.<br />
                                        2. "Load Sales Data" and check the pop-up summary.<br />
                                        3. If "{salesmanID}" is NOT in the "Salesmen Identified" list, your shops need matching in the Master DB.
                                    </p>
                                </div>
                            </div>
                        )}
                        <div className="mt-auto"></div>
                    </div>

                    {/* ----------------- SLIDE 2: COMPANY TARGETS ----------------- */}
                    {(() => {
                        const plan = allMasterPlans[activeAccountID];
                        const company = plan?.company || plan?.Company;
                        if (!company || company === 'Other' || !data) return null;

                        const companyConfigs = {
                            'Cadbury': { color: 'from-purple-600 via-indigo-500 to-blue-500', glow: 'rgba(79,70,229,0.4)', text: 'text-purple-400' },
                            'Britannia': { color: 'from-red-600 via-rose-500 to-orange-500', glow: 'rgba(225,29,72,0.4)', text: 'text-red-500' },
                            'Colgate': { color: 'from-emerald-600 via-teal-500 to-cyan-500', glow: 'rgba(20,184,166,0.4)', text: 'text-emerald-400' }
                        };

                        const config = companyConfigs[company] || { color: 'from-blue-600 via-blue-500 to-indigo-500', glow: 'rgba(59,130,246,0.4)', text: 'text-blue-400' };

                        // Memoize Company-wise Totals to fix INP bottleneck
                        const { companyTarget, companyAchieved, percentage } = useMemo(() => {
                            let t = 0;
                            let a = 0;

                            allSalesmenTargets.forEach(targetRow => {
                                const sPlan = allMasterPlans[targetRow.salesman_id];
                                const sComp = sPlan?.company || sPlan?.Company;
                                if (sComp === company) {
                                    t += Number(targetRow.monthly_target || 0);
                                    a += Number(targetRow.achieved || 0);
                                }
                            });
                            const p = t === 0 ? 0 : Math.min(Math.round((a / t) * 100), 100);
                            return { companyTarget: t, companyAchieved: a, percentage: p };
                        }, [allSalesmenTargets, allMasterPlans, company]);

                        if (companyTarget === 0) return null;

                        return (
                            <div className="min-w-full w-full h-full shrink-0 snap-center snap-always px-6 flex flex-col justify-center pb-6">
                                <div
                                    className="bg-slate-900/40 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-8 mt-4 shadow-2xl relative overflow-hidden group cursor-pointer active:scale-[0.98] transition-all flex flex-col items-center h-full justify-center min-h-[350px]"
                                    onClick={() => {
                                        playSound('click');
                                        setSelectedCompanyData({ name: company, color: config.color, glow: config.glow });
                                        setIsCompanyModalOpen(true);
                                    }}
                                >
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-[40px] -mr-16 -mt-16 pointer-events-none"></div>

                                    <div className="flex flex-col items-center text-center gap-2 w-full">
                                        <span className={`text-[12px] font-black uppercase tracking-[0.4em] ${config.text} drop-shadow-sm`}>
                                            {company.toUpperCase()} OVERALL TARGET
                                        </span>

                                        <div className="flex flex-col items-center mt-3">
                                            <span className="text-5xl font-black text-white italic tracking-tighter drop-shadow-2xl mb-1">
                                                ₹{companyAchieved.toLocaleString('en-IN')}
                                            </span>
                                            <span className="text-slate-500 text-[11px] font-black tracking-[0.2em] uppercase opacity-60">TARGET: ₹{companyTarget.toLocaleString('en-IN')}</span>
                                        </div>

                                        <div className={`mt-8 px-8 py-3 rounded-full border border-white/10 bg-[#121828] shadow-[0_4px_20px_rgba(0,0,0,0.5)] flex items-center gap-3 backdrop-blur-xl group-hover:bg-[#1a2336] group-hover:border-white/20 transition-all`}>
                                            <div
                                                className={`w-2 h-2 rounded-full bg-gradient-to-r ${config.color} animate-pulse`}
                                                style={{ boxShadow: `0 0 12px ${config.glow}` }}
                                            ></div>
                                            <span className="text-xs font-black text-slate-100 tracking-[0.2em]">{percentage}% COMPLETED</span>
                                        </div>
                                    </div>

                                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 relative mt-8 shadow-inner">
                                        <div
                                            className={`h-full bg-gradient-to-r ${config.color} transition-all duration-1000 relative overflow-hidden`}
                                            style={{
                                                width: `${percentage}%`,
                                                boxShadow: `0 0 15px ${config.glow}`
                                            }}
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                                        </div>
                                    </div>
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] text-center opacity-70 mt-6 leading-relaxed">
                                        Collective performance of all {company}<br />Salesmen • Click to View
                                    </p>
                                </div>
                            </div>
                        );
                    })()}

                    {/* ----------------- SLIDE 3: LEADERBOARD ----------------- */}
                    {data && topPerformers.length > 0 && (
                        <div className="min-w-full w-full shrink-0 snap-center snap-always px-6 flex flex-col justify-center pb-6">
                            <MiniLeaderboard performers={topPerformers.slice(0, 3)} salesmanName={salesmanID} />
                        </div>
                    )}

                </div>
            </div >
        );
    };

    // Route Selection View
    const RouteSelectView = () => {
        const availableRoutes = React.useMemo(() => {
            const rawRoutes = data?.routes && data.routes.length > 0
                ? data.routes
                : (data?.bills?.map(b => b.Route).filter(Boolean) || []);

            // Normalize and Deduplicate
            const normalized = rawRoutes.map(r => r.trim().toUpperCase());
            return [...new Set(normalized)].sort();
        }, [data]);

        return (
            <div className="px-6 pb-20 min-h-[80vh]">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <MapPin className="text-blue-500" /> Select Route
                </h2>

                <div className="grid gap-4">
                    <button
                        onClick={() => { React.startTransition(() => { setSelectedRoute(null); setRouteFilterMode('ALL'); setView('OUTSTANDING_LIST'); }); }}
                        className="p-6 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl shadow-[0_20px_40px_-10px_rgba(59,130,246,0.4)] text-left group transition-all active:scale-[0.98]"
                    >
                        <div className="flex justify-between items-center">
                            <div>
                                <span className="font-black text-white text-lg tracking-tight">Full Portfolio</span>
                                <p className="text-blue-100/60 text-[10px] font-black uppercase tracking-widest mt-0.5">Show All Regions</p>
                            </div>
                            <ArrowRight size={24} className="text-white/70 group-hover:translate-x-2 transition-transform" />
                        </div>
                    </button>

                    {availableRoutes.map((route, idx) => (
                        <button
                            key={idx}
                            onClick={() => { React.startTransition(() => { setSelectedRoute(route); setRouteFilterMode('TODAY'); setView('OUTSTANDING_LIST'); }); }}
                            className="p-6 bg-slate-900/40 backdrop-blur-3xl rounded-3xl border border-white/10 hover:border-blue-500/40 hover:bg-slate-900 transition-all active:scale-[0.98] text-left group shadow-xl"
                        >
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)] group-hover:scale-125 transition-transform"></div>
                                    <span className="font-black text-slate-100 text-base tracking-tight group-hover:text-blue-400 transition-colors uppercase">{route}</span>
                                </div>
                                <span className="bg-slate-950/50 px-3 py-1.5 rounded-xl text-[10px] text-slate-400 font-black tracking-widest border border-white/5">
                                    {data?.bills?.filter(b => (b.Route || "").trim().toUpperCase() === route).length} UNITS
                                </span>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Developer / Version Signature */}
                <div className="mt-auto pt-6 pb-2 flex justify-center w-full">
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.4em] flex items-center gap-2">
                        <Zap size={10} className="text-blue-500" />
                        Jarwis Pro Version
                    </p>
                </div>
            </div>
        );
    };

    // Outstanding List View (Using User's Card Style)
    const OutstandingListView = () => {
        // Pre-calculate grouped shops once instead of inside rendering
        const groupedShops = useMemo(() => {
            const grouped = [];
            const groups = {};

            filteredBills.forEach(bill => {
                const key = bill.Party || 'Unknown Shop';
                if (!groups[key]) {
                    groups[key] = {
                        name: key,
                        bills: [],
                        totalAmount: 0,
                        maxOverdue: 0,
                        phone: bill.Phone || null,
                        shop_id: bill.shop_id || bill.ShopID || bill.id
                    };
                    grouped.push(groups[key]);
                }
                groups[key].bills.push(bill);
                groups[key].totalAmount += Number(bill.Amount || 0);
                groups[key].maxOverdue = Math.max(groups[key].maxOverdue, Number(bill.Overdue || 0));
                if (!groups[key].phone && bill.Phone) groups[key].phone = bill.Phone;

                // Pre-calculate date string and timestamp
                let bDateStr = 'N/A';
                let dt = 0;
                try {
                    if (bill.Date) {
                        const dStr = String(bill.Date);
                        let dateObj;
                        if (dStr.includes('/')) {
                            const [d, m, y] = dStr.split('/');
                            dateObj = new Date(y, m - 1, d);
                        } else if (dStr.includes('-')) {
                            const parts = dStr.split('-');
                            if (parts[0].length === 4) dateObj = new Date(dStr);
                            else {
                                const [d, m, y] = parts;
                                dateObj = new Date(y, m - 1, d);
                            }
                        } else {
                            dateObj = new Date(dStr);
                        }
                        if (!isNaN(dateObj)) {
                            dt = dateObj.getTime();
                            const day = String(dateObj.getDate()).padStart(2, '0');
                            const month = dateObj.toLocaleString('en-US', { month: 'short' });
                            bDateStr = `${day} ${month}`;
                        }
                    }
                } catch (e) { }

                bill._precal_date_str = bDateStr;
                bill._precal_date_ms = dt;
            });

            grouped.sort((a, b) => b.maxOverdue - a.maxOverdue);
            grouped.forEach(shop => shop.bills.sort((a, b) => a._precal_date_ms - b._precal_date_ms));
            return grouped;
        }, [filteredBills]);

        return (
            <div className="px-5 pb-20 space-y-4">
                {/* Route Header with Toggle */}
                <div className="flex flex-col gap-4 mb-6">
                    <div className="flex bg-slate-800/50 p-1.5 rounded-full border border-white/5 relative">
                        {/* Sliding Background */}
                        <div className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-blue-600 rounded-full shadow-lg transition-all duration-300 ease-out ${routeFilterMode === 'TODAY' ? 'left-1.5' : 'left-[calc(50%+3px)]'}`}></div>

                        <button
                            onClick={() => React.startTransition(() => { setRouteFilterMode('TODAY'); })}
                            className={`flex-1 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest relative z-10 transition-colors ${routeFilterMode === 'TODAY' ? 'text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                            Today's Route
                        </button>
                        <button
                            onClick={() => React.startTransition(() => { setRouteFilterMode('ALL'); })}
                            className={`flex-1 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest relative z-10 transition-colors ${routeFilterMode === 'ALL' ? 'text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                            All My Routes
                        </button>
                    </div>

                    <div className="flex items-center justify-between px-2">
                        <h2 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                            {routeFilterMode === 'TODAY' ? (
                                <>
                                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.8)]"></span>
                                    {selectedRoute || 'No Route Assigned'}
                                </>
                            ) : (
                                <>
                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                                    Full Portfolio
                                </>
                            )}
                        </h2>
                        <span className="text-[10px] text-slate-500 font-bold bg-slate-900/50 px-2.5 py-1 rounded-lg border border-white/5">
                            {filteredBills.length} BILLS
                        </span>
                    </div>
                </div>

                {/* Bill List grouped by Shop - USING VIRTUOSO FOR PERFORMANCE */}
                <div className="space-y-6">
                    <Virtuoso
                        useWindowScroll
                        data={groupedShops}
                        itemContent={(index, shop) => {
                            // Dynamic Background Logic based on max overdue
                            let themeClass = "border-white/10";
                            let accentColor = "bg-slate-500 text-slate-500";
                            let glowColor = "bg-blue-600/5";
                            const maxDays = shop.maxOverdue;

                            if (maxDays >= 15) {
                                themeClass = "bg-gradient-to-br from-red-500/15 via-red-950/40 to-slate-950/60 border-red-500/30 shadow-red-900/40";
                                accentColor = "bg-gradient-to-b from-red-500 to-rose-700 shadow-[0_0_15px_rgba(239,68,68,0.5)] text-red-500";
                                glowColor = "bg-red-500/10";
                            } else if (maxDays >= 8) {
                                themeClass = "bg-gradient-to-br from-orange-500/15 via-orange-950/40 to-slate-950/60 border-orange-500/30 shadow-orange-900/40";
                                accentColor = "bg-gradient-to-b from-orange-500 to-amber-700 shadow-[0_0_15px_rgba(249,115,22,0.5)] text-orange-500";
                                glowColor = "bg-orange-500/10";
                            } else if (maxDays >= 1) {
                                themeClass = "bg-gradient-to-br from-emerald-500/15 via-emerald-950/40 to-slate-950/60 border-emerald-500/30 shadow-emerald-900/40";
                                accentColor = "bg-gradient-to-b from-emerald-500 to-teal-700 shadow-[0_0_15px_rgba(16,185,129,0.5)] text-emerald-500";
                                glowColor = "bg-emerald-500/10";
                            }

                            return (
                                <div key={shop.shop_id || index} className={`mb-6 group relative p-3 sm:p-4 pl-4 sm:pl-5 rounded-[1.5rem] sm:rounded-[2rem] overflow-hidden sm:transition-all sm:duration-500 min-h-fit shadow-lg sm:shadow-2xl border bg-slate-900/40 sm:backdrop-blur-3xl ${themeClass}`}>
                                    {/* VERTICAL ACCENT BAR */}
                                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${accentColor.split(' ')[0]}`}></div>

                                    {/* Sophisticated Glow Effect - Disabled on mobile for performance */}
                                    <div className={`hidden sm:block absolute top-0 right-0 w-64 h-64 blur-[80px] rounded-full pointer-events-none transition-all duration-700 ${glowColor} group-hover:opacity-100 opacity-60`}></div>

                                    {/* --- TOP SECTION: NAME & TOTAL AMOUNT --- */}
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 relative z-20 gap-3 sm:gap-0">
                                        <div className="flex-1 pr-0 sm:pr-4 w-full min-w-0">
                                            <h3 className="font-black text-xl sm:text-3xl text-white leading-tight tracking-tight uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-slate-300 transition-all break-words block">
                                                {shop.name}
                                            </h3>
                                            <div className="flex flex-wrap items-center gap-2 mt-3 relative">
                                                {/* GRADE BADGE */}
                                                {(() => {
                                                    const histGrade = shop.bills[0]?.historical_grade;
                                                    const activeMaxDays = shop.bills[0]?.max_overdue_days || maxDays;

                                                    let grade = histGrade || 'A';

                                                    if (!histGrade) {
                                                        if (maxDays >= 30) grade = 'F';
                                                        else if (maxDays >= 15) grade = 'C';
                                                        else if (maxDays >= 8) grade = 'B';
                                                    }

                                                    let gClass = 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10 shadow-[0_0_10px_rgba(16,185,129,0.2)]';
                                                    let explanation = 'Excellent history. Pays on time.';

                                                    if (grade === 'F') {
                                                        gClass = 'text-red-500 border-red-500/50 bg-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse';
                                                        explanation = 'Chronic Defaulter! History of 30+ Days Overdue.';
                                                    } else if (grade === 'C') {
                                                        gClass = 'text-orange-400 border-orange-500/30 bg-orange-500/10 shadow-[0_0_10px_rgba(249,115,22,0.2)]';
                                                        explanation = 'Warning. History of 15-29 Days Overdue.';
                                                    } else if (grade === 'B') {
                                                        gClass = 'text-blue-400 border-blue-500/30 bg-blue-500/10 shadow-[0_0_10px_rgba(59,130,246,0.2)]';
                                                        explanation = 'Good standing. Minor delays (8-14 Days).';
                                                    }

                                                    return (
                                                        <div className="relative group/grade">
                                                            <div
                                                                className={`flex items-center justify-center w-7 h-7 rounded-lg border backdrop-blur-md cursor-pointer hover:scale-110 active:scale-95 transition-all ${gClass}`}
                                                            >
                                                                <span className="text-sm font-black drop-shadow-md">{grade}</span>
                                                            </div>

                                                            {/* HOVER/CLICK POPUP */}
                                                            <div className="absolute left-0 top-full mt-2 w-max max-w-[200px] p-3 rounded-xl bg-slate-900 border border-white/10 shadow-2xl opacity-0 invisible group-hover/grade:opacity-100 group-hover/grade:visible sm:transition-all z-50 pointer-events-none transform translate-y-2 group-hover/grade:translate-y-0 text-left">
                                                                <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-1">Historical Grade {grade}</p>
                                                                <p className="text-[11px] font-bold text-white whitespace-normal mb-2">{explanation}</p>

                                                                {(grade === 'C' || grade === 'F') && (
                                                                    <div className="bg-red-500/10 border border-red-500/20 rounded p-1.5 mb-2">
                                                                        <p className="text-[9px] text-red-300 leading-tight">Takes 3 consecutive weeks of on-time payments to restore grade.</p>
                                                                    </div>
                                                                )}

                                                                <p className="text-[10px] text-white/70 italic border-t border-white/10 pt-1">Current Max Overdue: {activeMaxDays} Days</p>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}

                                                <div className="flex items-center gap-1.5 px-3 py-1 bg-black/20 rounded-lg border border-white/10 backdrop-blur-md shadow-sm">
                                                    <TrendingUp size={12} className="text-white/70" />
                                                    <span className="text-[10px] font-black text-white/90 tracking-widest">{shop.bills.length} BILLS</span>
                                                </div>
                                                {shop.phone ? (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            openPhoneModal(shop.bills[0]);
                                                        }}
                                                        className="flex items-center gap-1.5 px-3 py-1 bg-indigo-500/20 rounded-full border border-indigo-500/30 hover:bg-indigo-500/30 transition-all active:scale-95 group/phone shadow-[0_0_10px_rgba(99,102,241,0.2)]"
                                                    >
                                                        <Smartphone size={12} className="text-indigo-300" />
                                                        <span className="text-[10px] font-black text-indigo-200 tracking-tight">{shop.phone}</span>
                                                        <Edit2 size={8} className="text-indigo-400/50 group-hover/phone:text-indigo-300 transition-colors" />
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            openPhoneModal(shop.bills[0]);
                                                        }}
                                                        className="flex items-center gap-1.5 px-3 py-1 bg-slate-700/30 rounded-full border border-slate-600/30 hover:bg-slate-600/40 transition-all active:scale-95 text-slate-300 hover:text-white shadow-sm"
                                                    >
                                                        <Smartphone size={12} />
                                                        <span className="text-[10px] font-black uppercase tracking-widest">Add Phone</span>
                                                    </button>
                                                )}
                                                {pendingRequests.some(u => u.party === shop.name) && (
                                                    <div className="flex items-center gap-1 px-3 py-1 bg-amber-500/20 rounded-full border border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                                                        <RefreshCw size={10} className="text-amber-400 animate-spin" />
                                                        <span className="text-[9px] font-black text-amber-200 uppercase tracking-tighter">Verifying</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="text-left sm:text-right w-full sm:w-auto bg-slate-950/80 sm:bg-transparent p-3 sm:p-4 rounded-xl sm:rounded-none border border-white/10 sm:border-none backdrop-blur-xl shadow-2xl sm:shadow-none sm:backdrop-blur-none transition-all hover:bg-black/90 group/total">
                                            <p className="text-[8px] sm:text-[9px] font-black text-white/50 uppercase tracking-[0.2em] mb-1 sm:mb-0 group-hover/total:text-white/70 transition-colors">Total Outstanding</p>
                                            <p className="text-2xl sm:text-5xl font-black text-white tracking-tighter drop-shadow-[0_2px_15px_rgba(0,0,0,0.8)] bg-gradient-to-tr from-white via-slate-200 to-slate-400 bg-clip-text text-transparent break-words">
                                                ₹{shop.totalAmount.toLocaleString('en-IN')}
                                            </p>
                                        </div>
                                    </div>

                                    {/* --- MIDDLE SECTION: DETAILED BILLS LIST --- */}
                                    <div className="mt-4 mb-5 relative z-10 space-y-2">
                                        <p className="text-[9px] font-black text-slate-400/80 uppercase tracking-[0.3em] mb-3 px-2 flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                                            Bill Breakdown (Oldest First)
                                        </p>
                                        {shop.bills.map((b, idx) => {
                                            const bOverdue = Number(b.Overdue || 0);
                                            const bDate = b._precal_date_str || 'N/A';

                                            const dateColorClass = bOverdue >= 15 ? 'text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]' :
                                                bOverdue >= 8 ? 'text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]' :
                                                    'text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]';

                                            return (
                                                <div key={idx} className="flex items-center justify-between p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-950/80 border border-white/10 group/bill hover:bg-black sm:transition-all sm:duration-300 shadow-md sm:shadow-xl hover:shadow-lg sm:hover:shadow-2xl sm:backdrop-blur-xl sm:hover:scale-[1.02] hover:border-white/20">
                                                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                                        <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center font-black text-xs shadow-lg transition-transform group-hover/bill:scale-110 shrink-0 ${bOverdue >= 15 ? 'bg-red-500/20 text-red-500 border border-red-500/30 shadow-red-500/10' :
                                                            bOverdue >= 8 ? 'bg-orange-500/20 text-orange-500 border border-orange-500/30 shadow-orange-500/10' :
                                                                'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 shadow-emerald-500/10'
                                                            }`}>
                                                            {idx + 1}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-xs sm:text-sm font-black text-slate-200 tracking-tight uppercase group-hover/bill:text-white transition-colors truncate">#{b.bill_no || 'NO_ID'}</p>
                                                            <div className={`flex items-center gap-1.5 sm:gap-2 mt-0.5 ${dateColorClass} font-black uppercase tracking-widest text-[9px] sm:text-[10px]`}>
                                                                <p>{bDate}</p>
                                                                <span>•</span>
                                                                <p className="whitespace-nowrap">{bOverdue} Days</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right pl-3 shrink-0">
                                                        <p className="text-base sm:text-lg font-black text-white tracking-tight drop-shadow-md group-hover/bill:text-blue-200 transition-colors">₹{Number(b.Amount).toLocaleString('en-IN')}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* --- BOTTOM SECTION: ACTIONS --- */}
                                    <div className="flex items-center justify-between relative z-10 pt-4 border-t border-white/5">
                                        <div className="flex gap-2">
                                            {shop.phone && (
                                                <a
                                                    href={`tel:${shop.phone}`}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/5 transition-all active:scale-95 shadow-lg backdrop-blur-md"
                                                >
                                                    <Smartphone size={18} />
                                                </a>
                                            )}
                                        </div>

                                        {(() => {
                                            const pendingForShop = pendingRequests
                                                .filter(req =>
                                                    (req.shop_id && String(req.shop_id) === String(shop.shop_id)) ||
                                                    shop.bills.some(b => String(b.bill_no) === String(req.bill_no)) ||
                                                    (req.party === shop.name && req.status === 'Pending')
                                                );

                                            const shopPendingAmount = pendingForShop.reduce((sum, req) => sum + (Number(req.amount) || 0), 0);
                                            const remainingBalance = Math.max(0, shop.totalAmount - shopPendingAmount);
                                            const isFullyPending = remainingBalance < 1;

                                            return isFullyPending ? (
                                                <button
                                                    disabled={true}
                                                    className="ml-4 flex-1 bg-gradient-to-r from-orange-500/20 to-amber-500/20 border border-orange-500/30 text-orange-400 font-black text-[10px] uppercase tracking-[0.2em] py-3 rounded-xl flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(249,115,22,0.1)] cursor-not-allowed"
                                                >
                                                    <div className="animate-spin-slow">⏳</div>
                                                    {shopPendingAmount > 0 ? 'VERIFYING...' : 'GROUP PENDING'}
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        playSound('cash');
                                                        setSelectedBill(shop.bills[0]);
                                                        setPrefilledAmount(remainingBalance.toString());
                                                        setIsPaymentModalOpen(true);
                                                    }}
                                                    className="ml-4 flex-1 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-xs uppercase tracking-[0.1em] py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg sm:shadow-[0_10px_25px_rgba(16,185,129,0.4)] active:scale-95 sm:transition-all sm:animate-pulse-subtle border border-emerald-500/20"
                                                >
                                                    <div className="w-8 h-8 rounded-full bg-yellow-400 border-2 border-yellow-200 shadow-[0_0_15px_rgba(250,204,21,0.6)] flex items-center justify-center text-yellow-900">
                                                        <span className="text-lg font-black">₹</span>
                                                    </div>
                                                    <span className="text-lg sm:text-xl font-black drop-shadow-md">₹{remainingBalance.toLocaleString('en-IN')}</span>
                                                </button>
                                            );
                                        })()}
                                    </div>

                                    {/* LIST OF PENDING REQUESTS FOR THIS SHOP */}
                                    {(() => {
                                        const pendingForShop = pendingRequests.filter(req =>
                                            (req.shop_id && String(req.shop_id) === String(shop.shop_id)) ||
                                            shop.bills.some(b => String(b.bill_no) === String(req.bill_no)) ||
                                            (req.party === shop.name && req.status === 'Pending')
                                        );

                                        if (pendingForShop.length === 0) return null;

                                        return (
                                            <div className="mt-6 pt-4 border-t border-white/5">
                                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center justify-between">
                                                    <span>Pending Verifications</span>
                                                    <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded text-[8px]">{pendingForShop.length}</span>
                                                </p>
                                                <div className="space-y-3">
                                                    {pendingForShop.map((req, idx) => (
                                                        <div key={req.id || idx} className="bg-slate-900/40 p-3 rounded-xl border border-white/5 flex justify-between items-center group hover:bg-slate-800/60 transition-colors">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                                                                    <Zap size={14} />
                                                                </div>
                                                                <div>
                                                                    <p className="text-white font-black text-sm tracking-tight">₹{Number(req.amount).toLocaleString('en-IN')}</p>
                                                                    <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">
                                                                        {req.payment_type} • {req.bill_no || 'N/A'}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            <button
                                                                onClick={async (e) => {
                                                                    e.stopPropagation();
                                                                    if (window.confirm(`Delete pending payment of ₹${req.amount}?`)) {
                                                                        try {
                                                                            const ptsToDeduct = req.points_awarded || 0;
                                                                            setPendingRequests(prev => prev.filter(p => p.id !== req.id));
                                                                            await deleteDoc(doc(db, "pending_collections", req.id));
                                                                            if (ptsToDeduct > 0 && data?.uid) {
                                                                                updateDoc(doc(db, "users", data.uid), {
                                                                                    total_points: increment(-ptsToDeduct),
                                                                                    daily_points: increment(-ptsToDeduct)
                                                                                }).catch(err => console.error(err));
                                                                                setTodayPoints(prev => Math.max(0, prev - ptsToDeduct));
                                                                            }
                                                                        } catch (err) {
                                                                            alert("Error deleting request. Refresh and try again.");
                                                                        }
                                                                    }
                                                                }}
                                                                className="p-2 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all active:scale-95"
                                                            >
                                                                <X size={16} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            );
                        }}
                    />
                </div>
            </div>
        );
    };

    // New Portfolio View
    const PortfolioView = () => (
        <div className="px-6 pb-20">
            <h2 className="text-xl font-black text-white mb-8 flex items-center gap-3">
                <div className="w-1.5 h-6 bg-indigo-500 rounded-full"></div>
                ROUTE PORTFOLIO
            </h2>

            <div className="grid gap-4">
                {Object.entries(routeStats.allRoutes).sort((a, b) => b[1] - a[1]).map(([rName, rTotal], idx) => {
                    // Calculate Progress: Today's Collected vs Total (Remaining + Collected)
                    const collectedThisRoute = pendingRequests
                        .filter(req => (req.route || req.Route || "").trim().toUpperCase() === rName.trim().toUpperCase() && req.status !== 'Rejected')
                        .reduce((sum, req) => sum + (Number(req.amount) || 0), 0);

                    const totalInitial = rTotal + collectedThisRoute;
                    const progressPct = totalInitial > 0 ? (collectedThisRoute / totalInitial) * 100 : 0;

                    return (
                        <div key={idx} className="bg-slate-900/60 backdrop-blur-3xl border border-white/5 p-6 rounded-[2rem] flex flex-col gap-4 group hover:bg-slate-900 transition-all shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-1">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <div className={`w-1.5 h-10 rounded-full ${rName === selectedRoute ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'bg-slate-700'}`}></div>
                                    <div>
                                        <span className={`text-base font-black uppercase tracking-tight ${rName === selectedRoute ? 'text-white' : 'text-slate-200'}`}>
                                            {rName}
                                        </span>
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-0.5">
                                            {data?.bills?.filter(b => b.Route === rName).length} Active Units
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-xl font-black text-white tracking-tighter block">
                                        ₹{rTotal.toLocaleString('en-IN')}
                                    </span>
                                    <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest opacity-60">Remaining</span>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden relative">
                                <div
                                    className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 shadow-[0_0_10px_rgba(79,70,229,0.4)] transition-all duration-1000 ease-out"
                                    style={{ width: `${progressPct}%` }}
                                ></div>
                                {progressPct > 0 && (
                                    <div className="absolute top-0 right-0 h-full bg-white/20 w-8 blur-md transform skew-x-12 translate-x-full group-hover:animate-shimmer"></div>
                                )}
                            </div>
                            <div className="flex justify-between items-center">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                    Collection Progress
                                </p>
                                <p className="text-[10px] font-black text-white tracking-widest italic">
                                    {Math.round(progressPct)}%
                                </p>
                            </div>
                        </div>
                    );
                })}

                <div className="mt-8 p-8 bg-gradient-to-br from-indigo-900/40 to-blue-900/40 border border-white/5 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-600/10 rounded-full blur-[60px] group-hover:bg-indigo-600/20 transition-all duration-700"></div>
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-2">Portfolio Total Exposure</p>
                    <p className="text-4xl font-black text-white tracking-tighter drop-shadow-xl">
                        ₹{(data?.total_outstanding || 0).toLocaleString('en-IN')}
                    </p>
                    <div className="mt-6 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Audited & Verified</p>
                    </div>
                </div>
            </div>
        </div>
    );

    const generatePDF = async (todayPayments) => {
        const doc = new jsPDF();
        const dateStr = new Date().toLocaleDateString('en-IN').replace(/\//g, '-');
        const fileName = `Collection_Report_${salesmanID}_${dateStr}.pdf`;

        // Brand Header
        doc.setFontSize(22);
        doc.setTextColor(40);
        doc.text("BIJU TRADERS", 105, 20, { align: "center" });

        doc.setFontSize(14);
        doc.text("Daily Collection Report", 105, 30, { align: "center" });

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Salesman: ${salesmanID.toUpperCase()}`, 14, 45);
        doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, 14, 50);
        doc.line(14, 55, 196, 55);

        // Summary Section
        doc.setFontSize(12);
        doc.setTextColor(59, 130, 246); // Blue-500
        doc.text("COLLECTION SUMMARY", 14, 65);

        autoTable(doc, {
            startY: 70,
            head: [['Payment Mode', 'Total Amount']],
            body: [
                ['Cash Payment', `Rs. ${todayStats.Cash.toLocaleString('en-IN')}`],
                ['UPI Transfer', `Rs. ${todayStats.UPI.toLocaleString('en-IN')}`],
                ['Cheque Deposit', `Rs. ${todayStats.Cheque.toLocaleString('en-IN')}`],
                ['TOTAL DAY COLLECTION', `Rs. ${todayStats.Total.toLocaleString('en-IN')}`],
            ],
            theme: 'striped',
            headStyles: { fillColor: [59, 130, 246], fontStyle: 'bold' },
            styles: { fontSize: 10, cellPadding: 5 }
        });

        // Detailed List
        doc.setTextColor(59, 130, 246);
        doc.text("DETAILED TRANSACTION HISTORY", 14, doc.lastAutoTable.finalY + 15);

        const tableData = todayPayments.map(p => [
            p.party.toUpperCase(),
            `Rs. ${p.amount.toLocaleString('en-IN')}`,
            p.payment_type.toUpperCase(),
            p.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        ]);

        autoTable(doc, {
            startY: doc.lastAutoTable.finalY + 20,
            head: [['PARTY NAME', 'AMOUNT', 'MODE', 'TIME']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [15, 23, 42], fontStyle: 'bold' }, // Slate-900
            styles: { fontSize: 9, cellPadding: 4 }
        });

        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.text(`Generated by JARWIS PRO - Page ${i} of ${pageCount}`, 105, 285, { align: "center" });
        }

        // MOBILE / WEB CONDITIONAL EXPORT
        if (Capacitor.isNativePlatform()) {
            try {
                // 1. Generate Base64 Data
                const pdfBase64 = doc.output('datauristring').split(',')[1];

                // 2. Save file to temporary directory
                await Filesystem.writeFile({
                    path: fileName,
                    data: pdfBase64,
                    directory: Directory.Cache,
                });

                // 3. Get URI of the saved file
                const fileUri = await Filesystem.getUri({
                    directory: Directory.Cache,
                    path: fileName
                });

                // 4. Trigger Native Share
                await Share.share({
                    title: 'Collection Report',
                    text: `Sales Report for ${salesmanID}`,
                    url: fileUri.uri,
                    dialogTitle: 'Save Collection Report',
                });
            } catch (err) {
                console.error("PDF Native Export Error:", err);
                alert("Failed to export PDF on mobile: " + err.message);
                // Fallback to standard save (might still fail but worth the attempt as last resort)
                doc.save(fileName);
            }
        } else {
            doc.save(fileName);
        }
    };

    // Reports View
    const ReportsView = () => {
        const today = new Date().setHours(0, 0, 0, 0);
        const todayPayments = pendingRequests
            .filter(req => req.timestamp?.toDate().setHours(0, 0, 0, 0) === today)
            .sort((a, b) => b.timestamp?.toMillis() - a.timestamp?.toMillis());

        return (
            <div className="px-6 pb-20 space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">Daily Summary</h2>
                    <button
                        onClick={() => generatePDF(todayPayments)}
                        className="text-[10px] bg-emerald-600/20 text-emerald-400 px-3 py-1.5 rounded-xl font-bold uppercase tracking-widest border border-emerald-500/20 flex items-center gap-2 hover:bg-emerald-600/30 transition-colors"
                    >
                        <FileText size={12} /> Download PDF
                    </button>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-800/40 p-5 rounded-3xl border border-white/5 col-span-2">
                        <p className="text-slate-500 text-[10px] font-bold uppercase mb-1">Total Collected</p>
                        <p className="text-3xl font-black text-white">₹{todayStats.Total.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="bg-emerald-500/10 p-4 rounded-3xl border border-emerald-500/20 flex flex-col items-center justify-center">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                            <p className="text-emerald-500 text-[10px] font-black uppercase">Cash</p>
                        </div>
                        <p className="text-xl font-black text-emerald-400">₹{todayStats.Cash.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="bg-blue-500/10 p-4 rounded-3xl border border-blue-500/20 flex flex-col items-center justify-center">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                            <p className="text-blue-500 text-[10px] font-black uppercase">UPI</p>
                        </div>
                        <p className="text-xl font-black text-blue-400">₹{todayStats.UPI.toLocaleString('en-IN')}</p>

                    </div>
                    <div className="bg-purple-500/10 p-4 rounded-3xl border border-purple-500/20 flex flex-col items-center justify-center">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                            <p className="text-purple-500 text-[10px] font-black uppercase">Cheque</p>
                        </div>
                        <p className="text-xl font-black text-purple-400">₹{todayStats.Cheque.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="bg-slate-800/40 p-4 rounded-3xl border border-white/5">
                        <p className="text-slate-500 text-[10px] font-bold uppercase mb-1">Total Bills</p>
                        <p className="text-xl font-bold text-white">{todayStats.count}</p>
                    </div>
                </div>

                <h3 className="text-slate-400 text-sm font-bold uppercase tracking-wider ml-2 pt-2">Today's History</h3>

                <div className="space-y-3">
                    {todayPayments.length === 0 ? (
                        <div className="bg-slate-800/20 rounded-3xl p-8 text-center border border-dashed border-slate-700">
                            <p className="text-slate-500 text-sm">No collections submitted today.</p>
                        </div>
                    ) : (
                        todayPayments.map((p, i) => (
                            <div key={i} className="bg-slate-900/40 backdrop-blur-3xl p-5 rounded-3xl border border-white/10 flex justify-between items-center group shadow-xl">
                                <div className="min-w-0 flex-1">
                                    <p className="text-slate-100 font-black text-sm tracking-tight leading-tight uppercase">{p.party}</p>
                                    <div className="flex flex-wrap items-center gap-2.5 mt-2">
                                        <span className="text-[9px] text-slate-400 bg-slate-950/50 px-2 py-1 rounded-lg border border-white/5 font-black tracking-widest uppercase">
                                            {p.payment_type}
                                        </span>
                                        <div className="w-1 h-1 rounded-full bg-slate-700"></div>
                                        <span className="text-[9px] text-slate-500 font-black tracking-tighter opacity-60">
                                            {p.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        {p.cheque_date && (
                                            <>
                                                <div className="w-1 h-1 rounded-full bg-slate-700"></div>
                                                <span className="text-[9px] text-amber-500 font-black tracking-tighter">
                                                    DUE: {new Date(p.cheque_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-base font-black text-emerald-400 tracking-tighter">₹{p.amount.toLocaleString('en-IN')}</p>
                                    <div className="mt-1 flex items-center justify-end gap-1.5">
                                        <div className={`w-1.5 h-1.5 rounded-full ${p.status === 'Approved' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'}`}></div>
                                        <span className="text-[8px] text-slate-500 uppercase font-black tracking-widest">{p.status}</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        );
    };

    // New Sales Target View
    const SalesTargetView = () => {
        if (tLoading) return <div className="p-10 text-center flex justify-center"><Loader2 className="animate-spin text-blue-500" /></div>;

        if (!targetData) {
            return (
                <div className="px-6 pb-20 pt-10 text-center mb-20">
                    <div className="bg-slate-800/40 p-8 rounded-[3rem] border border-white/5 animate-fade-in">
                        <TrendingUp size={48} className="mx-auto text-slate-600 mb-4" />
                        <h3 className="text-xl font-black text-slate-400 uppercase tracking-widest">No Target Set</h3>
                        <p className="text-slate-500 text-xs font-bold mt-2 uppercase">Please contact Admin to set your monthly goals.</p>
                        <button onClick={() => setView('HOME')} className="mt-8 px-8 py-3 bg-slate-800 rounded-full text-white font-bold hover:bg-slate-700 transition">Go Back</button>
                    </div>
                </div>
            );
        }

        const { monthly_target = 0, total_achieved = 0, working_days = 26 } = targetData;
        const daily_target = working_days > 0 ? (monthly_target / working_days) : 0;
        const percentage = monthly_target > 0 ? Math.min(100, (total_achieved / monthly_target) * 100) : 0;
        const remaining_amount = Math.max(0, monthly_target - total_achieved);

        return (
            <div className="px-6 pb-20 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-2xl font-black text-white uppercase tracking-tight italic">
                        <span className="text-blue-500">My</span> Performance
                    </h2>
                    <div className="px-4 py-1.5 bg-blue-900/30 border border-blue-500/30 rounded-full flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></div>
                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Live Sync</span>
                    </div>
                </div>

                {/* MAIN CARD - MIDNIGHT BLUE */}
                <div className="relative group overflow-hidden rounded-[3rem] p-8 bg-gradient-to-br from-[#0f172a] to-[#1e3a8a] border border-blue-500/20 shadow-[0_20px_50px_-10px_rgba(30,58,138,0.5)]">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] -mr-16 -mt-16 pointer-events-none"></div>

                    <div className="relative z-10">
                        <div className="flex flex-col items-center justify-center mb-6 text-center">
                            <p className="text-blue-200/60 text-[10px] font-black uppercase tracking-[0.3em] mb-4">Monthly Progress</p>
                            {/* NEW CONDITIONAL RANK: Only show here if NOT shown in header (i.e. rank > 3) */}
                            {targetData.current_rank > 3 && (
                                <div className="px-4 py-1.5 bg-slate-800/60 border border-white/10 rounded-full flex items-center gap-2 shadow-xl animate-in fade-in zoom-in duration-700">
                                    <Trophy size={14} className="text-blue-400" />
                                    <span className="text-[11px] font-black text-slate-300 uppercase tracking-widest">Rank #{targetData.current_rank} Performer</span>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col items-center justify-center mb-4">
                            <div className="flex items-baseline gap-2 mb-2">
                                <h3 className="text-6xl font-black text-white tracking-tighter drop-shadow-2xl">
                                    {Math.round(percentage)}%
                                </h3>
                                <span className="text-sm font-bold text-blue-200/50 uppercase tracking-widest">Achieved</span>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="h-4 w-full bg-slate-900/50 rounded-full overflow-hidden border border-white/5 mb-6 backdrop-blur-sm">
                            <div
                                className="h-full bg-gradient-to-r from-blue-500 via-indigo-400 to-cyan-400 shadow-[0_0_20px_rgba(59,130,246,0.6)] transition-all duration-1000 ease-out relative"
                                style={{ width: `${percentage}%` }}
                            >
                                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-900/40 p-4 rounded-2xl border border-white/5 backdrop-blur-md">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Monthly Goal</p>
                                <p className="text-lg font-black text-white">₹{Number(monthly_target).toLocaleString('en-IN')}</p>
                            </div>
                            <div className="bg-slate-900/40 p-4 rounded-2xl border border-white/5 backdrop-blur-md">
                                <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1">Done</p>
                                <p className="text-lg font-black text-emerald-300">₹{Number(total_achieved).toLocaleString('en-IN')}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* BADGE / ACHIEVEMENTS SECTION */}
                {targetData?.awards?.length > 0 && (
                    <div className="animate-fade-in-up mt-6">
                        <div className="flex items-center justify-between mb-4 px-1">
                            <div className="flex items-center gap-2">
                                <Trophy size={16} className="text-amber-500" />
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">My Achievements</h3>
                            </div>
                            <span className="text-[10px] font-black text-slate-500 bg-white/5 px-2 py-0.5 rounded-lg border border-white/5">
                                {targetData.awards.length} Award{targetData.awards.length > 1 ? 's' : ''}
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-3 justify-center">
                            {targetData.awards.map((award, i) => {
                                const cfg = BADGE_CONFIG[award.id] || BADGE_CONFIG.star_week;
                                return (
                                    <div key={i} className={`flex items-center gap-2 px-4 py-3 rounded-2xl border ${cfg.color} ${cfg.shadow} animate-in slide-in-from-left-4 duration-500`} style={{ animationDelay: `${i * 150}ms` }}>
                                        {cfg.icon}
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black uppercase tracking-widest">{award.label}</span>
                                            <span className="text-[8px] font-bold opacity-60 uppercase tracking-tighter">Awarded Recently</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* SECONDARY STATS - DAILY PERFORMANCE */}
                <div className="grid grid-cols-2 gap-4">
                    {/* TODAY'S POINTS CARD - NEW PRIMARY METRIC */}
                    <div className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 p-6 rounded-[2.5rem] border border-amber-500/30 flex flex-col items-center justify-center text-center group hover:scale-[1.02] transition-all shadow-[0_15px_35px_-5px_rgba(245,158,11,0.2)] col-span-2">
                        <div className="w-12 h-12 bg-amber-500 rounded-2xl grid place-items-center mb-3 text-white shadow-[0_0_20px_rgba(245,158,11,0.5)] pb-[2px]">
                            <Star size={24} fill="currentColor" strokeWidth={2} />
                        </div>
                        <p className="text-5xl font-black text-white tracking-tighter drop-shadow-lg">{todayPoints}</p>
                        <p className="text-[10px] text-amber-500 font-black uppercase tracking-[0.2em] mt-2">Points Earned Today</p>
                    </div>

                    <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 p-6 rounded-[2.5rem] border border-emerald-500/20 flex flex-col items-center justify-center text-center group hover:bg-emerald-500/5 transition-colors shadow-[0_10px_30px_-5px_rgba(16,185,129,0.1)]">
                        <div className="w-10 h-10 bg-emerald-500/20 rounded-2xl flex items-center justify-center mb-3 text-emerald-400 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                            <Check size={20} />
                        </div>
                        <p className="text-xl font-black text-emerald-400 tracking-tighter">₹{todayStats.Total.toLocaleString('en-IN')}</p>
                        <p className="text-[9px] text-emerald-500/60 font-black uppercase tracking-widest mt-1">Today's Revenue</p>
                    </div>

                    <div className="bg-slate-800/40 p-6 rounded-[2.5rem] border border-white/5 flex flex-col items-center justify-center text-center group hover:bg-slate-800 transition-colors">
                        <div className="w-10 h-10 bg-indigo-500/20 rounded-2xl flex items-center justify-center mb-3 text-indigo-400 group-hover:scale-110 transition-transform">
                            <TrendingUp size={20} />
                        </div>
                        <p className="text-xl font-black text-white tracking-tighter">₹{Number(daily_target).toLocaleString('en-IN')}</p>
                        <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-1">Daily Target</p>
                    </div>

                    <div className="bg-slate-800/40 p-6 rounded-[2.5rem] border border-white/5 flex flex-col items-center justify-center text-center group hover:bg-slate-800 transition-colors col-span-2">
                        <div className="w-10 h-10 bg-pink-500/20 rounded-2xl flex items-center justify-center mb-3 text-pink-400 group-hover:scale-110 transition-transform">
                            <Wallet size={20} />
                        </div>
                        <p className="text-2xl font-black text-white tracking-tighter">₹{Number(remaining_amount).toLocaleString('en-IN')}</p>
                        <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-1">Balance to Achieve (Monthly)</p>
                    </div>

                    <div className="bg-slate-800/40 p-6 rounded-[2.5rem] border border-white/5 flex flex-col items-center justify-center text-center group hover:bg-slate-800 transition-colors col-span-2">
                        <div className="w-10 h-10 bg-emerald-500/20 rounded-2xl flex items-center justify-center mb-3 text-emerald-400 group-hover:scale-110 transition-transform">
                            <Compass size={20} />
                        </div>
                        <p className="text-2xl font-black text-white tracking-tighter">
                            {(() => {
                                const today = new Date();
                                const year = today.getFullYear();
                                const month = today.getMonth();
                                const daysInMonth = new Date(year, month + 1, 0).getDate();
                                let count = 0;
                                // Loop from today to end of month
                                for (let d = today.getDate(); d <= daysInMonth; d++) {
                                    const date = new Date(year, month, d);
                                    const day = date.getDay();
                                    const isSunday = day === 0;
                                    const isSecondSaturday = day === 6 && d >= 8 && d <= 14;

                                    if (!isSunday && !isSecondSaturday) {
                                        count++;
                                    }
                                }
                                return count;
                            })()} Days
                        </p>
                        <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-1">Time Left (Excl. Sun & 2nd Sat)</p>
                    </div>                </div>

            </div>
        );
    };

    return (
        <div className={`bg-[#020617] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#020617] to-[#020617] text-slate-200 font-sans selection:bg-blue-500 selection:text-white overflow-x-hidden relative ${view === 'HOME' ? 'h-screen overflow-hidden flex flex-col' : 'min-h-screen'}`}>
            {/* Vivid Background Elements (Optimized: Removed battery-draining animations on large blurred zones) */}
            <div className="fixed top-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none z-0"></div>
            <div className="fixed bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none z-0"></div>
            <div className="fixed top-[30%] left-[10%] w-[300px] h-[300px] bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none z-0"></div>

            <div className={`animate-fade-in relative z-10 ${view === 'HOME' ? 'flex-1 flex flex-col overflow-hidden min-h-0' : ''}`}>
                <Header />
                {view === 'HOME' && <HomeView />}
                {view === 'OUTSTANDING_ROUTE_SELECT' && <RouteSelectView />}
                {view === 'OUTSTANDING_LIST' && <OutstandingListView />}
                {view === 'REPORTS' && <ReportsView />}
                {view === 'SALES' && <SalesTargetView />}
                {view === 'PORTFOLIO' && <PortfolioView />}
                {view === 'BOUNCE' && (
                    <div className="h-[60vh] flex flex-col items-center justify-center text-center p-6">
                        <div className="p-6 bg-slate-800 rounded-full mb-6 animate-pulse">
                            <AlertCircle size={40} className="text-orange-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-white">Cheque Bounce</h2>
                        <p className="text-slate-500 mt-2">Coming Soon.</p>
                        <button onClick={() => setView('HOME')} className="mt-8 px-8 py-3 bg-slate-800 rounded-full text-white font-bold hover:bg-slate-700 transition">Go Back</button>
                    </div>
                )}
            </div>

            {/* TOTAL OUTSTANDING MODAL (Beat-wise breakdown) */}
            {isTotalOutstandingModalOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setIsTotalOutstandingModalOpen(false)}></div>
                    <div className="bg-[#0b1121] border border-white/10 w-full sm:max-w-md rounded-t-[2.5rem] sm:rounded-3xl p-6 pb-12 sm:p-6 relative animate-slide-up shadow-2xl max-h-[85vh] flex flex-col">
                        <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-6 shrink-0 sm:hidden"></div>

                        <div className="flex items-start justify-between mb-6 shrink-0">
                            <div>
                                <h3 className="text-xl font-black text-white uppercase tracking-tight">Beat-Wise Outstanding</h3>
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Total: ₹{(data?.total_outstanding || 0).toLocaleString('en-IN')}</p>
                            </div>
                            <button onClick={() => setIsTotalOutstandingModalOpen(false)} className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="overflow-y-auto overflow-x-hidden no-scrollbar flex-1 -mx-2 px-2 pb-10 sm:pb-4">
                            <div className="space-y-2">
                                {Object.entries(routeStats.allRoutes)
                                    .filter(([route, amt]) => amt > 0)
                                    .sort(([, a], [, b]) => b - a)
                                    .map(([route, amt]) => (
                                        <div key={route} className="bg-slate-900/50 hover:bg-slate-800/80 transition-colors border border-white/5 p-4 rounded-2xl flex items-center justify-between group">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shadow-inner group-hover:bg-blue-500/20 transition-colors">
                                                    <MapPin size={16} className="text-blue-400" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-black text-slate-300 uppercase tracking-widest">{route === 'UNASSIGNED' ? 'Miscellaneous' : route}</span>
                                                </div>
                                            </div>
                                            <div className="text-right flex flex-col items-end">
                                                <span className="text-sm font-black text-white">₹{amt.toLocaleString('en-IN')}</span>
                                            </div>
                                        </div>
                                    ))}
                                {Object.keys(routeStats.allRoutes).length === 0 && (
                                    <div className="text-center py-8">
                                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">No outstanding data available.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <CollectPaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                bill={selectedBill}
                salesmanID={salesmanID}
                initialAmount={prefilledAmount}
                onPaymentSuccess={(detail) => {
                    console.log("[Dashboard] Optimistic Update for Detail:", detail);
                    // Optimistically update pendingRequests to reflect change immediately
                    setPendingRequests(prev => {
                        // Avoid duplicates if firestore is fast
                        if (prev.some(r => r.id === detail.id)) return prev;
                        return [...prev, { ...detail, status: 'Pending' }];
                    });

                    // Trigger success animation/sound if needed via handlePaymentSuccess
                    handlePaymentSuccess(detail);
                }}
            />

            <RouteExplorerModal
                isOpen={isRouteExplorerOpen}
                onClose={() => setIsRouteExplorerOpen(false)}
                salesmenData={[{ id: activeAccountID, bills: data?.bills || [] }]}
                allPayments={pendingRequests}
                isAdmin={false}
                forceSalesmanId={activeAccountID}
            />

            {/* Phone Edit Modal - Professional Design */}
            {isPhoneModalOpen && (() => {
                console.log('🟢 MODAL RENDERING');
                return (
                    <div
                        onClick={() => setIsPhoneModalOpen(false)}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(0, 0, 0, 0.85)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 9999
                        }}
                    >
                        <div
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
                                width: '90%',
                                maxWidth: '400px',
                                padding: '32px',
                                borderRadius: '24px',
                                border: '2px solid rgba(255, 255, 255, 0.2)',
                                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '20px'
                            }}
                        >
                            <h2 style={{ color: 'white', fontSize: '24px', fontWeight: 'bold', textAlign: 'center', margin: 0 }}>
                                📱 Update Phone Number
                            </h2>
                            <p style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '14px', textAlign: 'center', fontWeight: '600', margin: 0 }}>
                                {String(billingParty || 'Unknown')}
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <label style={{ color: 'rgba(255, 255, 255, 0.95)', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Phone Number
                                </label>
                                <input
                                    type="tel"
                                    maxLength={10}
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                                    placeholder="Enter 10-digit number"
                                    autoFocus
                                    style={{
                                        width: '100%',
                                        background: '#f8fafc',
                                        color: '#1e293b',
                                        padding: '16px',
                                        borderRadius: '12px',
                                        border: '2px solid #e2e8f0',
                                        outline: 'none',
                                        fontSize: '18px',
                                        fontWeight: '600',
                                        textAlign: 'center',
                                        letterSpacing: '2px',
                                        transition: 'all 0.2s'
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                                />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
                                <button
                                    onClick={handleUpdatePhone}
                                    disabled={updatingPhone || phoneNumber.length !== 10}
                                    style={{
                                        width: '100%',
                                        background: phoneNumber.length === 10 ? 'white' : 'rgba(255, 255, 255, 0.3)',
                                        color: phoneNumber.length === 10 ? '#1e40af' : 'rgba(255, 255, 255, 0.7)',
                                        padding: '14px',
                                        borderRadius: '12px',
                                        border: 'none',
                                        fontSize: '15px',
                                        fontWeight: '700',
                                        textTransform: 'uppercase',
                                        letterSpacing: '1px',
                                        cursor: (updatingPhone || phoneNumber.length !== 10) ? 'not-allowed' : 'pointer',
                                        opacity: (updatingPhone || phoneNumber.length !== 10) ? 0.6 : 1,
                                        transition: 'all 0.2s',
                                        boxShadow: phoneNumber.length === 10 ? '0 4px 12px rgba(0, 0, 0, 0.2)' : 'none'
                                    }}
                                >
                                    {updatingPhone ? '⏳ Saving...' : '✓ Save Number'}
                                </button>
                                <button
                                    onClick={() => setIsPhoneModalOpen(false)}
                                    style={{
                                        width: '100%',
                                        background: 'rgba(255, 255, 255, 0.15)',
                                        color: 'white',
                                        padding: '12px',
                                        borderRadius: '12px',
                                        border: '1px solid rgba(255, 255, 255, 0.3)',
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {showBadgeNotif && targetData?.new_badge_notification && (
                <BadgeNotification
                    badge={targetData.new_badge_notification}
                    onClose={handleCloseNotif}
                />
            )}

            <CompanyDetailsModal
                isOpen={isCompanyModalOpen}
                onClose={() => setIsCompanyModalOpen(false)}
                company={selectedCompanyData.name}
                reactiveTargets={allSalesmenTargets}
                companyColor={selectedCompanyData.color}
                companyGlow={selectedCompanyData.glow}
                masterPlans={allMasterPlans}
            />

            {/* --- GAMIFICATION RENDER --- */}
            {pointsAnimation && (
                <PointFloater
                    points={pointsAnimation.points}
                    isOverdue={pointsAnimation.isOverdue}
                    onComplete={() => setPointsAnimation(null)}
                />
            )}
            {coinAnimation && (
                <CashCoinAnimation
                    startPos={coinAnimation.startPos}
                    targetPos={coinAnimation.targetPos}
                    onComplete={() => setCoinAnimation(null)}
                />
            )}
            {showSuccessTick && (
                <SuccessTick onComplete={() => setShowSuccessTick(false)} />
            )}
        </div>
    );
};
