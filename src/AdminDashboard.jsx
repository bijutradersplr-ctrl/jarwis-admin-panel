import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Users,
    TrendingUp,
    Wallet,
    RefreshCw,
    LogOut,
    Monitor,
    Smartphone,
    ChevronDown,
    ChevronUp,
    ChevronLeft,
    MapPin,
    CheckCircle2,
    Clock,
    Search,
    FileText,
    Compass,
    Check,
    X,
    Landmark,
    BarChart3,
    ArrowLeft,
    ShieldCheck,
    Calendar,
    Trash2,
    MessageSquare,
    Target,
    Settings,
    LayoutDashboard,
    Trophy,
    Volume2,
    VolumeX,
    Download,
    FileSpreadsheet,
    History,
    PieChart,
    Banknote,
    ArrowRight
} from 'lucide-react';

import { getAuth } from "firebase/auth";
import { collection, onSnapshot, getDocs, doc, updateDoc, addDoc, serverTimestamp, getDoc, deleteDoc, increment, setDoc, query, where } from "firebase/firestore";
import { db } from "./firebase";
import { App } from '@capacitor/app';
import RouteExplorerModal from './components/RouteExplorerModal';
import RemindersView from './components/RemindersView';
import TargetSettingsView from './components/TargetSettingsView';
import RouteMasterPlanView from './components/RouteMasterPlanView';
import LeaderboardView from './components/LeaderboardView';
import CompanyDetailsModal from './components/CompanyDetailsModal';
import AdminWebViewDashboard from './components/AdminWebViewDashboard';
import FrontOfficeUpload from './components/FrontOfficeUpload';

// Lazy loaded heavy components
const CollectionAnalytics = React.lazy(() => import('./components/CollectionAnalytics'));
const DataManagerModal = React.lazy(() => import('./components/DataManagerModal'));

const ADMIN_SOUNDS = {
    success: '/sounds/success.mp3', // Kaching
    error: '/sounds/error.mp3', // Error/Reject
    click: '/sounds/click.mp3', // Click
    pop: '/sounds/pop.mp3' // Transition/Pop
};

export default function AdminDashboard({ adminName }) {
    const sanitizeKey = (key) => {
        return String(key || "").trim().toUpperCase().replace(/[\/\\#\?]/g, "_");
    };
    const [salesmenData, setSalesmenData] = useState([]);
    const [allPayments, setAllPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [expandedSalesman, setExpandedSalesman] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
    const [isDataManagerOpen, setIsDataManagerOpen] = useState(false);
    const [isOutstandingModalOpen, setIsOutstandingModalOpen] = useState(false);
    const [selectedSalesmanForOut, setSelectedSalesmanForOut] = useState(null);
    const [selectedRouteForOut, setSelectedRouteForOut] = useState(null);
    const [viewMode, setViewMode] = useState(() => {
        const saved = localStorage.getItem('admin_view_pref');
        if (saved) return saved;
        return window.innerWidth >= 1024 ? 'web' : 'mobile';
    });
    const [view, setView] = useState('DASHBOARD'); // 'DASHBOARD' or 'SUMMARY_LIST'
    const [dashboardMenu, setDashboardMenu] = useState('MAIN'); // 'MAIN', 'MASTER', 'REPORTS'

    // Route Explorer State
    const [isRouteExplorerOpen, setIsRouteExplorerOpen] = useState(false);

    // Company Breakdown Modal State
    const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
    const [isTodayOutstandingModalOpen, setIsTodayOutstandingModalOpen] = useState(false);
    const [pendingUpdates, setPendingUpdates] = useState([]);
    const [selectedCompanyData, setSelectedCompanyData] = useState({ name: '', color: '', glow: '' });
    const [approvingId, setApprovingId] = useState(null);
    const [isChequeModalOpen, setIsChequeModalOpen] = useState(false);

    const [fetchError, setFetchError] = useState(null);
    const [stats, setStats] = useState({ totalCollectedToday: 0, totalPending: 0, activeSalesmen: 0 });
    const [masterPlans, setMasterPlans] = useState({});
    const [salesmenTargets, setSalesmenTargets] = useState([]);
    const [isMuted, setIsMuted] = useState(localStorage.getItem('jarwis_admin_muted') === 'true');

    // Audio Helpers
    // Audio Helpers
    const audioRefs = React.useRef({});

    useEffect(() => {
        Object.keys(ADMIN_SOUNDS).forEach(key => {
            if (!audioRefs.current[key]) {
                const audio = new Audio(ADMIN_SOUNDS[key]);
                audio.preload = 'auto';
                audioRefs.current[key] = audio;
            }
        });
    }, []);

    const playSound = useCallback((type) => {
        if (isMuted) return;
        const audio = audioRefs.current[type];
        if (audio) {
            audio.currentTime = 0;
            audio.play().catch(() => { });
        }
    }, [isMuted]);

    // --- HELPER WRAPPERS ---
    const todayCollections = useMemo(() => getTodayCollections(allPayments), [allPayments]);
    const reactiveTargets = useMemo(() => getReactiveTargets(salesmenTargets, allPayments), [salesmenTargets, allPayments]);
    const groupedCollections = useMemo(() =>
        getCompanyGroupedCollections(masterPlans, salesmenData, todayCollections, reactiveTargets, searchTerm),
        [masterPlans, salesmenData, todayCollections, reactiveTargets, searchTerm]);


    const fetchData = async () => {
        setIsRefreshing(true);
        try {
            // Manual trigger often not needed with onSnapshot, but kept for UI Refresh button
            // We can add a small delay to show visual feedback
            await new Promise(resolve => setTimeout(resolve, 1000));
        } finally {
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        setLoading(true);


        // 1. Listen to Outstanding Data
        const unsubOutstanding = onSnapshot(collection(db, "outstanding_data"), (snap) => {
            const sData = [];
            let totalPending = 0;
            snap.forEach(doc => {
                const data = doc.data();
                sData.push({ id: doc.id, ...data });
                totalPending += Number(data.total_outstanding || 0);
            });
            setSalesmenData(sData);
            setStats(prev => ({ ...prev, totalPending, activeSalesmen: sData.length }));
        }, (error) => {
            console.error("Error fetching outstanding data:", error);
            setFetchError("Failed to load outstanding data. Please check your connection or permissions.");
        });

        // 2. Listen to Active Payments (Optimized Query)
        const paymentsQuery = query(
            collection(db, "pending_collections"),
            where("status", "in", ["Pending", "Approved"]) // Only fetch what needs admin attention
        );
        const unsubPayments = onSnapshot(paymentsQuery, (snap) => {
            const pData = [];
            const todayStr = new Date().toLocaleDateString('en-CA');
            let collectedToday = 0;
            let cashToday = 0;
            let upiToday = 0;
            let chequeToday = 0;

            snap.forEach(doc => {
                const data = doc.data();
                pData.push({ id: doc.id, ...data });

                // Company Intake = Total collections today
                if (data.timestamp && typeof data.timestamp.toDate === 'function') {
                    const reqDateStr = data.timestamp.toDate().toLocaleDateString('en-CA');
                    if (reqDateStr === todayStr) {
                        const amount = Number(data.amount || 0);
                        collectedToday += amount;

                        const type = (data.payment_type || 'Cash').toLowerCase();
                        if (type === 'cash') cashToday += amount;
                        else if (type === 'upi') upiToday += amount;
                        else if (type === 'cheque') chequeToday += amount;
                    }
                }
            });
            setAllPayments(pData);
            setStats(prev => ({
                ...prev,
                totalCollectedToday: collectedToday,
                cashToday,
                upiToday,
                chequeToday
            }));
            setLoading(false);
        }, (error) => {
            console.error("Error fetching payments:", error);
            setFetchError("Failed to load payment data. You might be missing a Firestore index.");
            setLoading(false);
        });

        // 3. Listen to Master Plans
        const unsubPlans = onSnapshot(collection(db, "salesman_master_plan"), (snap) => {
            const pPlans = {};
            snap.forEach(doc => {
                pPlans[doc.id.toUpperCase().replace(/[^A-Z0-9]/g, '')] = doc.data();
            });
            setMasterPlans(pPlans);
        }, (error) => {
            console.error("Error fetching master plans:", error);
        });

        // 4. Listen to Users/Targets
        const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
            const currentMonth = new Date().toISOString().slice(0, 7);
            const rawTargets = [];

            snap.forEach(d => {
                const u = d.data();
                if (u.role === 'salesman' || u.salesman_name) {
                    const name = u.salesman_name || u.name;
                    // Aggressive normalization: Remove all non-alphanumeric characters to merge "KANNAN A", "KANNAN.A", etc.
                    const sId = name?.toUpperCase().replace(/[^A-Z0-9]/g, '');

                    rawTargets.push({
                        id: d.id,
                        name: name,
                        monthly_target: Number(u.monthly_target || 0),
                        salesman_id: sId,
                        awards: u.awards || [],
                        current_rank: u.current_rank,
                        current_score: u.current_score,
                        total_achieved: u.total_achieved,
                        achieved_month: u.achieved_month
                    });
                }
            });

            // Deduplicate: Keep entry with highest activity (target + achieved)
            const uniqueTargets = Object.values(rawTargets.reduce((acc, curr) => {
                if (!curr.salesman_id) return acc;

                const existing = acc[curr.salesman_id];
                if (!existing) {
                    acc[curr.salesman_id] = curr;
                } else {
                    // If duplicate found, keep the one with more data (target + achieved)
                    const currScore = (curr.monthly_target || 0) + (curr.total_achieved || 0);
                    const existScore = (existing.monthly_target || 0) + (existing.total_achieved || 0);
                    if (currScore > existScore) {
                        acc[curr.salesman_id] = curr;
                    }
                }
                return acc;
            }, {}));

            // 2nd Pass: Deduplicate by Display Name (Fail-safe for "KANNAN A" issue)
            const finalTargets = [];
            const seenNames = new Set();

            // Sort by "quality" (target + achieved + latest update) descending to keep the best entry
            uniqueTargets.sort((a, b) => {
                const scoreA = (a.monthly_target || 0) + (a.total_achieved || 0);
                const scoreB = (b.monthly_target || 0) + (b.total_achieved || 0);
                return scoreB - scoreA;
            });

            for (const t of uniqueTargets) {
                // Normalize name for display comparison
                const normName = t.name.toUpperCase().replace(/[^A-Z0-9]/g, '');

                if (!seenNames.has(normName)) {
                    seenNames.add(normName);
                    finalTargets.push(t);
                }
            }

            setSalesmenTargets(finalTargets);
        }, (error) => {
            console.error("Error fetching users/targets:", error);
        });

        setSalesmenData([]); // Clear previous if needed

        // 6. Listen to Pending Updates (Mobile Number Changes)
        const unsubUpdates = onSnapshot(collection(db, "pending_updates"), (snap) => {
            const upd = [];
            snap.forEach(doc => {
                upd.push({ id: doc.id, ...doc.data() });
            });
            setPendingUpdates(upd);
        }, (error) => {
            console.error("Error fetching updates:", error);
        });

        return () => {
            unsubOutstanding();
            unsubPayments();
            unsubPlans();
            unsubUsers();
            unsubUpdates();
        };
    }, []);

    // --- AUTOMATED 3-FACTOR RANKING LOGIC ---
    const topPerformers = React.useMemo(() => {
        const currentMonth = new Date().toISOString().slice(0, 7);

        // 1. Calculate base stats for each salesman
        const rawStats = salesmenTargets.map(t => {
            const sid = t.salesman_id;
            const target = Number(t.monthly_target || 0);

            // Sales Achievement (All payments this month for real-time tracking)
            const bankAchieved = allPayments
                .filter(p => {
                    const pSid = (p.salesman_id || '').trim().toUpperCase();
                    const pSName = (p.salesman || '').trim().toUpperCase();
                    if (pSid !== sid && pSName !== sid) return false;
                    try {
                        return p.timestamp?.toDate().toISOString().slice(0, 7) === currentMonth;
                    } catch (e) { return false; }
                })
                .reduce((sum, p) => sum + Number(p.amount || 0), 0);

            // Best-of-Two: Use current collections OR manually entered total (if for same month)
            const existingTotal = t.total_achieved || 0;
            const isSameMonth = t.achieved_month === currentMonth;
            const achieved = isSameMonth ? Math.max(bankAchieved, existingTotal) : bankAchieved;

            // Collection % (How much of total outstanding they collected)
            const smOutstanding = salesmenData.find(s => s.id.trim().toUpperCase() === sid);
            const initialOutstanding = Number(smOutstanding?.total_outstanding || 0);
            const collectionRatio = initialOutstanding > 0 ? (achieved / initialOutstanding) : 0;

            // Overdue Status (Penalty for high overdue age)
            const bills = smOutstanding?.bills || [];
            const highOverdueCount = bills.filter(b => Number(b.Overdue || 0) > 15).length;
            const overdueFactor = bills.length > 0 ? (1 - (highOverdueCount / bills.length)) : 1;

            // --- 3-FACTOR SCORE CALCULATION ---
            // Factor 1: Sales Target Achievement (40% weight)
            const salesScore = target > 0 ? Math.min((achieved / target) * 100, 120) : 0;

            // Factor 2: Collection Efficiency (40% weight)
            const collScore = Math.min(collectionRatio * 100, 100);

            // Factor 3: Overdue Management (20% weight)
            const overdueScore = overdueFactor * 100;

            // GUARD: If achievement is less than 1%, the score is 0.
            const achievementPct = target > 0 ? (achieved / target) : 0;

            let finalScore = (salesScore * 0.4) + (collScore * 0.4) + (overdueScore * 0.2);
            // Relaxed: No longer forcing score to 0 for < 1% achievement to prevent blank leaderboard
            // if (achievementPct < 0.01) finalScore = 0; 

            return {
                id: t.id,
                name: t.name,
                salesman_id: sid,
                score: finalScore,
                achieved,
                target,
                percentage: Math.round(achievementPct * 100),
                bankAchieved // Carry this for sync logic
            };
        });

        // 2. Sort by score and assign ranks
        return rawStats
            // Relaxed: Include everyone in the leaderboard, even if score is 0
            .sort((a, b) => b.score - a.score)
            .map((s, idx) => ({ ...s, rank: idx + 1 }));
    }, [salesmenTargets, allPayments, salesmenData]);

    // Persist Ranks to Firebase (to show on Salesman Dashboard)
    useEffect(() => {
        if (topPerformers.length === 0 && salesmenTargets.length === 0) return;
        const updateRanks = async () => {
            const currentMonth = new Date().toISOString().slice(0, 7);

            // OPTIMIZATION: Only push updates for salesmen whose rank or score actually changed
            const activeUpdates = topPerformers.filter(p => {
                const existing = salesmenTargets.find(t => t.id === p.id);
                const hasRankChanged = !existing || existing.current_rank !== p.rank;
                const hasScoreChanged = !existing || Math.round(existing.current_score || 0) !== Math.round(p.score);
                const isNewMonth = !existing || existing.achieved_month !== currentMonth;
                const hasAchievedIncreased = !existing || (p.achieved > (existing.total_achieved || 0));

                return hasRankChanged || hasScoreChanged || isNewMonth || hasAchievedIncreased;
            });

            // CLEANUP: If someone WAS ranked but is NO LONGER in topPerformers, clear their rank
            const cleanupUpdates = salesmenTargets.filter(t => {
                const isStillRanked = topPerformers.find(p => p.id === t.id);
                return !isStillRanked && t.current_rank !== null;
            });

            if (activeUpdates.length === 0 && cleanupUpdates.length === 0) {
                console.log("🏅 [AdminDashboard] Ranks are already up to date. Skipping sync.");
                return;
            }

            console.log(`🏆 [AdminDashboard] Syncing ${activeUpdates.length} updates and ${cleanupUpdates.length} cleanups...`);

            const batch = [
                ...activeUpdates.map(p => {
                    const existing = salesmenTargets.find(t => t.id === p.id);
                    const isNewMonth = !existing || existing.achieved_month !== currentMonth;
                    const userRef = doc(db, "users", p.id);

                    const updateObj = {
                        current_rank: p.rank,
                        current_score: Math.round(p.score)
                    };

                    if (isNewMonth) {
                        updateObj.total_achieved = p.bankAchieved;
                        updateObj.achieved_month = currentMonth;
                    } else if (p.achieved > (existing?.total_achieved || 0)) {
                        updateObj.total_achieved = p.achieved;
                    }

                    return updateDoc(userRef, updateObj);
                }),
                ...cleanupUpdates.map(t => {
                    const userRef = doc(db, "users", t.id);
                    return updateDoc(userRef, {
                        current_rank: null,
                        current_score: 0
                    });
                })
            ];

            try {
                await Promise.all(batch);
                console.log("✅ Rank sync/cleanup complete.");
            } catch (err) {
                console.error("❌ Rank Update Error:", err);
            }
        };

        const timer = setTimeout(updateRanks, 5000); // 5s debounce
        return () => clearTimeout(timer);
    }, [topPerformers, salesmenTargets]); // Added salesmenTargets to deps to ensure accurate comparison

    // --- REFACTORED: NO-OP ---


    const handleApprovePayment = async (pId, amount, salesmanId) => {
        if (!window.confirm(`Verify payment of ₹${amount}? This will update the salesman's outstanding balance.`)) return;

        setApprovingId(pId); // Start animation

        try {
            // Wait for animation to finish
            await new Promise(resolve => setTimeout(resolve, 800));

            // 1. Update Payment Status (ONLY)
            const payRef = doc(db, "pending_collections", pId);
            await updateDoc(payRef, {
                status: 'Approved',
                approved_at: serverTimestamp(),
                approved_by: adminName || 'Admin'
            });

            playSound('success');
            console.log(`✅ Payment ${pId} approved for ${salesmanId}.`);
        } catch (err) {
            console.error("❌ Approval Error:", err);
            playSound('error');
            alert("Failed to approve: " + err.message);
        } finally {
            setApprovingId(null);
        }
    };

    const handleRejectPayment = async (pId) => {
        if (!window.confirm("Reject this payment? It will be removed from pending collections.")) return;

        try {
            const payRef = doc(db, "pending_collections", pId);
            await updateDoc(payRef, {
                status: 'Rejected',
                rejected_at: serverTimestamp()
            });
            playSound('pop');
            console.log(`❌ Payment ${pId} rejected.`);
        } catch (err) {
            console.error("❌ Reject Error:", err);
            playSound('error');
            alert("Failed to reject: " + err.message);
        }
    };

    const handleApprovePhoneUpdate = async (update) => {

        playSound('success');
        setApprovingId(update.id);

        try {
            await new Promise(resolve => setTimeout(resolve, 800));

            // 1. Update party_directory
            const partyKey = sanitizeKey(update.party);
            await setDoc(doc(db, "party_directory", partyKey), {
                Party: update.party, // Needed by python sync script
                Phone: update.new_value, // Capital P needed by python script
                phone: update.new_value, // Keep lowercase for backwards compatibility just in case
                updatedBy: update.salesman_id || update.salesman_name || 'Admin',
                updatedAt: serverTimestamp()
            }, { merge: true });

            // 2. Update outstanding_data (all bills for this party)
            // Use salesman_id, fallback to salesman_name formatted
            let sId = update.salesman_id;
            if (!sId && update.salesman_name) {
                sId = update.salesman_name.toUpperCase().replace(/[^A-Z0-9]/g, '');
            }

            if (sId) {
                const docRef = doc(db, "outstanding_data", sId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const bills = docSnap.data().bills || [];
                    let isModified = false;
                    const updatedBills = bills.map(b => {
                        if (String(b.Party) === String(update.party)) {
                            isModified = true;
                            return { ...b, Phone: update.new_value };
                        }
                        return b;
                    });
                    if (isModified) {
                        await updateDoc(docRef, { bills: updatedBills });
                    }
                } else {
                    console.warn(`[AdminDashboard] No outstanding_data found for salesman ${sId}`);
                }
            } else {
                console.warn(`[AdminDashboard] Missing salesman_id for update ${update.id}`);
            }

            // 3. Delete the request
            await deleteDoc(doc(db, "pending_updates", update.id));

            playSound('success');
            console.log(`✅ Phone update for ${update.party} approved.`);
        } catch (err) {
            console.error("❌ Phone Approval Error:", err);
            playSound('error');
            alert("Failed to approve phone update: " + err.message);
        } finally {
            setApprovingId(null);
        }
    };

    const handleRejectPhoneUpdate = async (updateId) => {
        try {
            playSound('pop');
            await deleteDoc(doc(db, "pending_updates", updateId));
            console.log(`✅ Phone update ${updateId} rejected and deleted.`);
        } catch (err) {
            console.error("❌ Phone Reject Error:", err);
            playSound('error');
            alert("Failed to reject phone update: " + err.message);
        }
    };

    const handleMarkReflected = async (pId, amount) => {
        if (!window.confirm(`Has this payment of ₹${amount} been entered into Tally? This will remove it from the cloud.`)) return;
        try {
            await deleteDoc(doc(db, "pending_collections", pId));
            playSound('success');
            console.log(`✅ Payment ${pId} marked as reflected and removed from cloud.`);
        } catch (err) {
            console.error("❌ Reflection Error:", err);
            playSound('error');
            alert("Failed to mark reflected: " + err.message);
        }
    };

    useEffect(() => {
        // No-op for old useEffect as logic is now in the main real-time block above
    }, []);


    const handleLogout = () => {
        playSound('pop');
        // ... rest of logic
        getAuth().signOut().then(() => {
            localStorage.removeItem('jarwis_user');
            localStorage.removeItem('jarwis_role');
            window.location.reload();
        });
    };

    const handleSendWhatsAppSummary = () => {
        const todayStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        const totals = getGlobalTotals(allPayments);
        const dailyColls = getTodayCollections(allPayments);

        let message = `*JARWIS PRO COLLECTION SUMMARY*\n`;
        message += `📅 Date: ${todayStr}\n\n`;
        message += `💰 *TOTAL: ₹${stats.totalCollectedToday.toLocaleString('en-IN')}*\n`;
        message += `───────────────────\n`;
        message += `💵 Cash: ₹${totals.cash.toLocaleString('en-IN')}\n`;
        message += `📱 UPI: ₹${totals.upi.toLocaleString('en-IN')}\n`;
        message += `🏦 Cheque: ₹${totals.cheque.toLocaleString('en-IN')}\n`;
        message += `───────────────────\n\n`;
        message += `*SALESMAN BREAKDOWN:*\n`;

        dailyColls.forEach(s => {
            message += `• ${s.name}: ₹${s.total.toLocaleString('en-IN')}\n`;
        });

        const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };

    const toggleExpand = (id) => {
        setExpandedSalesman(expandedSalesman === id ? null : id);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#020617] flex items-center justify-center">
                <RefreshCw className="w-12 h-12 text-blue-500 animate-spin" />
            </div>
        );
    }

    const filteredSalesmen = salesmenData.filter(s =>
        s.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
    // --- MOVED HELPERS OUTSIDE ---


    // --- MOVED DASHBOARDVIEW OUTSIDE ---


    // --- MOVED PENDINGAPPROVALSVIEW OUTSIDE ---


    // --- MOVED SALESMANSUMMARYVIEW OUTSIDE ---


    return (
        <>
            {/* --- ADMIN WEB VIEW DASHBOARD --- */}
            {viewMode === 'web' && (
                <AdminWebViewDashboard
                    allPayments={allPayments}
                    salesmenData={salesmenData}
                    stats={stats}
                    reactiveTargets={reactiveTargets}
                    masterPlans={masterPlans}
                    topPerformers={topPerformers}
                    view={view}
                    setView={setView}
                    dashboardMenu={dashboardMenu}
                    setDashboardMenu={setDashboardMenu}
                    handleLogout={handleLogout}
                    fetchData={fetchData}
                    playSound={playSound}
                    isRefreshing={isRefreshing}
                    viewMode={viewMode}
                    setViewMode={setViewMode}
                    fetchError={fetchError}
                    setSelectedCompanyData={setSelectedCompanyData}
                    setIsCompanyModalOpen={setIsCompanyModalOpen}
                    setIsOutstandingModalOpen={setIsOutstandingModalOpen}
                    setIsChequeModalOpen={setIsChequeModalOpen}
                    setIsRouteExplorerOpen={setIsRouteExplorerOpen}
                    setIsDataManagerOpen={setIsDataManagerOpen}
                    setIsTodayOutstandingModalOpen={setIsTodayOutstandingModalOpen}
                    // Prop injection for sub-views
                    renderSubView={() => (
                        <div className="max-w-7xl mx-auto px-4 py-8">
                            {view === 'DASHBOARD' && <DashboardView
                                salesmenData={salesmenData}
                                allPayments={allPayments}
                                reactiveTargets={reactiveTargets}
                                dashboardMenu={dashboardMenu}
                                setDashboardMenu={(m) => { playSound('click'); setDashboardMenu(m); }}
                                setView={(v) => { playSound('pop'); setView(v); }}
                                stats={stats}
                                setIsRouteExplorerOpen={setIsRouteExplorerOpen}
                                setIsDataManagerOpen={setIsDataManagerOpen}
                                setIsOutstandingModalOpen={setIsOutstandingModalOpen}
                                setIsChequeModalOpen={setIsChequeModalOpen}
                                masterPlans={masterPlans}
                                onCompanyClick={(name, color, glow) => {
                                    setSelectedCompanyData({ name, color, glow });
                                    setIsCompanyModalOpen(true);
                                }}
                                playSound={playSound}
                                isTodayOutstandingModalOpen={isTodayOutstandingModalOpen}
                                setIsTodayOutstandingModalOpen={setIsTodayOutstandingModalOpen}
                            />}
                            {view === 'SUMMARY_LIST' && <SalesmanSummaryView
                                groupedCollections={groupedCollections}
                                searchTerm={searchTerm}
                                setSearchTerm={setSearchTerm}
                                setView={setView}
                                handleApprovePayment={handleApprovePayment}
                                handleRejectPayment={handleRejectPayment}
                                playSound={playSound}
                            />}
                            {view === 'FRONT_OFFICE_UPLOAD' && <FrontOfficeUpload
                                setView={setView}
                                playSound={playSound}
                            />}
                            {view === 'TARGETS' && <TargetSettingsView onBack={() => setView('DASHBOARD')} salesmenData={salesmenData} allPayments={allPayments} masterPlans={masterPlans} />}
                            {view === 'ROUTE_PLAN' && <RouteMasterPlanView onBack={() => setView('DASHBOARD')} salesmenData={salesmenData} />}
                            {view === 'PENDING_APPROVALS' && <PendingApprovalsView
                                allPayments={allPayments}
                                pendingUpdates={pendingUpdates}
                                handleMarkReflected={handleMarkReflected}
                                handleApprovePayment={handleApprovePayment}
                                handleRejectPayment={handleRejectPayment}
                                handleApprovePhoneUpdate={handleApprovePhoneUpdate}
                                handleRejectPhoneUpdate={handleRejectPhoneUpdate}
                                setView={(v) => { playSound('pop'); setView(v); }}
                                approvingId={approvingId}
                                playSound={playSound}
                            />}
                            {view === 'LEADERBOARD' && (
                                <div className="space-y-6 animate-fade-in pb-20">
                                    <div className="flex items-center gap-4 mb-8">
                                        <button
                                            onClick={() => setView('DASHBOARD')}
                                            className="p-3 bg-white/5 rounded-2xl border border-white/10 text-slate-300 hover:bg-white/10 active:scale-90 transition-all shadow-xl backdrop-blur-md"
                                        >
                                            <ArrowLeft size={24} />
                                        </button>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Gamification & Ranking</p>
                                            <h3 className="text-xl font-black text-white uppercase tracking-tight">Salesman Leaderboard</h3>
                                        </div>
                                    </div>
                                    <LeaderboardView topPerformers={topPerformers} />
                                </div>
                            )}
                            {view === 'PERFORMANCE' && (
                                <div className="space-y-6 animate-fade-in pb-20">
                                    <div className="flex items-center gap-4 mb-8">
                                        <button
                                            onClick={() => setView('DASHBOARD')}
                                            className="p-3 bg-white/5 rounded-2xl border border-white/10 text-slate-300 hover:bg-white/10 active:scale-90 transition-all shadow-xl backdrop-blur-md"
                                        >
                                            <ArrowLeft size={24} />
                                        </button>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Reports & Insights</p>
                                            <h3 className="text-xl font-black text-white uppercase tracking-tight">Performance Analysis</h3>
                                        </div>
                                    </div>
                                    <React.Suspense fallback={
                                        <div className="flex items-center justify-center p-12">
                                            <div className="flex flex-col items-center gap-4">
                                                <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Loading Analytics Engine...</p>
                                            </div>
                                        </div>
                                    }>
                                        <CollectionAnalytics allPayments={allPayments} salesmenTargets={reactiveTargets} />
                                    </React.Suspense>
                                </div>
                            )}
                            {view === 'REMINDERS' && (
                                <div className="h-full w-full">
                                    <RemindersView
                                        onBack={() => setView('DASHBOARD')}
                                        salesmenData={salesmenData}
                                    />
                                </div>
                            )}
                        </div>
                    )}
                />
            )}

            {/* --- ADMIN MOBILE VIEW DASHBOARD --- */}
            {viewMode === 'mobile' && (
                <div className="h-screen w-screen bg-[#020617] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#020617] to-[#020617] text-slate-200 font-sans selection:bg-indigo-500/30 overflow-hidden relative flex flex-col">
                    {/* Background Glows */}
                    <div className="fixed top-[-20%] right-[-20%] w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
                    <div className="fixed bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none"></div>
                    <div className="fixed top-[20%] left-[20%] w-[300px] h-[300px] bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none"></div>

                    {/* HEADER - ONLY ON DASHBOARD */}
                    {view === 'DASHBOARD' && (
                        <header className="shrink-0 px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between bg-white/[0.02] backdrop-blur-2xl border-b border-white/[0.05] z-50">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-blue-600/20 to-indigo-500/10 flex items-center justify-center border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.15)] relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-gradient-to-tr from-blue-400/0 via-blue-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                    <ShieldCheck size={18} className="text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]" />
                                </div>
                                <div className="flex flex-col justify-center">
                                    <div className="flex items-baseline gap-1.5 mb-0.5">
                                        <h1 className="text-xs sm:text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70 uppercase tracking-[0.2em] leading-none">Jarwis Pro</h1>
                                        <span className="text-[8px] sm:text-[9px] font-black text-white/30 uppercase tracking-widest">v1.1.1</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_5px_rgba(59,130,246,0.8)]"></span>
                                        <span className="text-[7px] sm:text-[8px] font-black text-blue-400 uppercase tracking-widest opacity-90">Admin Command</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 sm:gap-4">
                                <button
                                    onClick={() => {
                                        playSound('click');
                                        const newMode = viewMode === 'web' ? 'mobile' : 'web';
                                        setViewMode(newMode);
                                        localStorage.setItem('admin_view_pref', newMode);
                                    }}
                                    className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-white/[0.03] backdrop-blur-md rounded-xl border border-white/5 text-slate-300 hover:bg-white/10 hover:text-white transition-all active:scale-95"
                                >
                                    {viewMode === 'web' ? <Smartphone size={16} className="text-blue-400" /> : <Monitor size={16} className="text-blue-400" />}
                                </button>
                                <button
                                    onClick={() => {
                                        const newState = !isMuted;
                                        setIsMuted(newState);
                                        localStorage.setItem('jarwis_admin_muted', newState);
                                        playSound('click');
                                    }}
                                    className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-white/[0.03] backdrop-blur-md rounded-xl border border-white/5 text-slate-300 hover:bg-white/10 hover:text-white transition-all active:scale-95"
                                >
                                    {isMuted ? <VolumeX size={16} className="text-slate-500" /> : <Volume2 size={16} className="text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]" />}
                                </button>
                                <button
                                    onClick={() => { playSound('click'); fetchData(); }}
                                    disabled={isRefreshing}
                                    className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-white/[0.03] backdrop-blur-md rounded-xl border border-white/5 text-slate-300 hover:bg-white/10 hover:text-white transition-all active:scale-95"
                                >
                                    <RefreshCw size={16} className={isRefreshing ? 'animate-spin text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]' : ''} />
                                </button>
                                <button
                                    onClick={() => { playSound('pop'); handleLogout(); }}
                                    className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl hover:bg-red-500 hover:text-white transition-all active:scale-95 shadow-[0_0_15px_rgba(239,68,68,0.15)]"
                                >
                                    <LogOut size={16} />
                                </button>
                            </div>
                        </header>
                    )}


                    {fetchError && (
                        <div className="mx-6 mt-6 p-6 bg-red-500/10 border border-red-500/20 rounded-[2rem] text-red-500 text-center animate-in fade-in slide-in-from-top-4 shrink-0">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 opacity-60">Database Link Failure</p>
                            <p className="text-sm font-black italic">{fetchError}</p>
                            <button onClick={fetchData} className="mt-4 px-6 py-2 bg-red-500/10 hover:bg-red-500 hover:text-white rounded-full text-[9px] font-black uppercase tracking-widest transition-all">Retry Secure Sync</button>
                        </div>
                    )}

                    <main className="flex-1 relative min-h-0 flex flex-col">
                        {/* SCROLLABLE VIEWS WRAPPER */}
                        {view !== 'REMINDERS' && (
                            <div className={`flex-1 overflow-y-auto px-4 mt-4 sm:mt-6 custom-scrollbar ${view === 'DASHBOARD' && dashboardMenu === 'MAIN' ? 'pb-4' : 'pb-32'}`}>
                                <div className={`max-w-xl mx-auto ${view === 'DASHBOARD' && dashboardMenu === 'MAIN' ? 'h-full flex flex-col justify-center min-h-[500px]' : 'space-y-6'}`}>
                                    {view === 'DASHBOARD' && <DashboardView
                                        salesmenData={salesmenData}
                                        allPayments={allPayments}
                                        reactiveTargets={reactiveTargets}
                                        dashboardMenu={dashboardMenu}
                                        setDashboardMenu={(m) => { playSound('click'); setDashboardMenu(m); }}
                                        setView={(v) => { playSound('pop'); setView(v); }}
                                        stats={stats}
                                        setIsRouteExplorerOpen={setIsRouteExplorerOpen}
                                        setIsDataManagerOpen={setIsDataManagerOpen}
                                        setIsOutstandingModalOpen={setIsOutstandingModalOpen}
                                        setIsChequeModalOpen={setIsChequeModalOpen}
                                        masterPlans={masterPlans}
                                        onCompanyClick={(name, color, glow) => {
                                            setSelectedCompanyData({ name, color, glow });
                                            setIsCompanyModalOpen(true);
                                        }}
                                        playSound={playSound}
                                        isTodayOutstandingModalOpen={isTodayOutstandingModalOpen}
                                        setIsTodayOutstandingModalOpen={setIsTodayOutstandingModalOpen}
                                    />}
                                    {view === 'SUMMARY_LIST' && <SalesmanSummaryView
                                        groupedCollections={groupedCollections}
                                        searchTerm={searchTerm}
                                        setSearchTerm={setSearchTerm}
                                        setView={setView}
                                        handleApprovePayment={handleApprovePayment}
                                        handleRejectPayment={handleRejectPayment}
                                        playSound={playSound}
                                    />}
                                    {view === 'TARGETS' && <TargetSettingsView onBack={() => setView('DASHBOARD')} salesmenData={salesmenData} allPayments={allPayments} masterPlans={masterPlans} />}
                                    {view === 'ROUTE_PLAN' && <RouteMasterPlanView onBack={() => setView('DASHBOARD')} salesmenData={salesmenData} />}
                                    {view === 'PENDING_APPROVALS' && <PendingApprovalsView
                                        allPayments={allPayments}
                                        pendingUpdates={pendingUpdates}
                                        handleMarkReflected={handleMarkReflected}
                                        handleApprovePayment={handleApprovePayment}
                                        handleRejectPayment={handleRejectPayment}
                                        handleApprovePhoneUpdate={handleApprovePhoneUpdate}
                                        handleRejectPhoneUpdate={handleRejectPhoneUpdate}
                                        setView={(v) => { playSound('pop'); setView(v); }}
                                        approvingId={approvingId}
                                        playSound={playSound}
                                    />}
                                    {view === 'REMINDERS' && <RemindersView salesmenData={salesmenData} onBack={() => setView('DASHBOARD')} masterPlans={masterPlans} allPayments={allPayments} />}
                                    {view === 'LEADERBOARD' && (
                                        <div className="space-y-6 animate-fade-in pb-20">
                                            <div className="flex items-center gap-4 mb-8">
                                                <button
                                                    onClick={() => setView('DASHBOARD')}
                                                    className="p-3 bg-white/5 rounded-2xl border border-white/10 text-slate-300 hover:bg-white/10 active:scale-90 transition-all shadow-xl backdrop-blur-md"
                                                >
                                                    <ArrowLeft size={24} />
                                                </button>
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Gamification & Ranking</p>
                                                    <h3 className="text-xl font-black text-white uppercase tracking-tight">Salesman Leaderboard</h3>
                                                </div>
                                            </div>
                                            <LeaderboardView topPerformers={topPerformers} />
                                        </div>
                                    )}

                                    {view === 'PERFORMANCE' && (
                                        <div className="space-y-6 animate-fade-in pb-20">
                                            <div className="flex items-center gap-4 mb-8">
                                                <button
                                                    onClick={() => setView('DASHBOARD')}
                                                    className="p-3 bg-white/5 rounded-2xl border border-white/10 text-slate-300 hover:bg-white/10 active:scale-90 transition-all shadow-xl backdrop-blur-md"
                                                >
                                                    <ArrowLeft size={24} />
                                                </button>
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Reports & Insights</p>
                                                    <h3 className="text-xl font-black text-white uppercase tracking-tight">Performance Analysis</h3>
                                                </div>
                                            </div>
                                            <CollectionAnalytics allPayments={allPayments} salesmenTargets={reactiveTargets} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* FULL HEIGHT VIEWS (Reminders) */}
                        {view === 'REMINDERS' && (
                            <div className="flex-1 h-full max-w-xl mx-auto w-full px-4 mt-2">
                                <RemindersView
                                    onBack={() => setView('DASHBOARD')}
                                    salesmenData={salesmenData}
                                    masterPlans={masterPlans}
                                    allPayments={allPayments}
                                />
                            </div>
                        )}
                    </main>

                    {/* STICKY FOOTER SUMMARY */}
                    <div className="fixed bottom-0 inset-x-0 bg-[#0F172A]/90 backdrop-blur-3xl border-t border-white/10 p-2 pb-6 md:p-4 flex items-center justify-between md:justify-center gap-2 md:gap-14 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-[60]">
                        <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto no-scrollbar py-1">
                            <GlobalStatMinimal label="Cash" amount={getGlobalTotals(allPayments).cash} icon={<Banknote size={14} className="text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />} />
                            <GlobalStatMinimal label="UPI" amount={getGlobalTotals(allPayments).upi} icon={<Smartphone size={14} className="text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]" />} />
                            <GlobalStatMinimal label="Cheq" amount={getGlobalTotals(allPayments).cheque} icon={<FileText size={14} className="text-purple-400 drop-shadow-[0_0_8px_rgba(192,132,252,0.5)]" />} />
                        </div>
                        <div className="text-right pl-2 sm:pl-4 pr-2 sm:pr-4 border-l border-white/10 shrink-0 flex flex-col items-end">
                            <span className="text-[7px] sm:text-[8px] font-black text-blue-400 uppercase tracking-[0.2em] block mb-0.5 opacity-80">TOTAL INTAKE</span>
                            <span className="text-base sm:text-lg font-black text-white italic tracking-tighter tabular-nums drop-shadow-lg">₹{stats.totalCollectedToday.toLocaleString('en-IN')}</span>
                        </div>
                    </div>

                </div>
            )}

            <CollectionModal
                isOpen={isCollectionModalOpen}
                onClose={() => setIsCollectionModalOpen(false)}
                allPayments={allPayments}
                total={stats.totalCollectedToday}
            />
            <OutstandingModal
                isOpen={isOutstandingModalOpen}
                onClose={() => setIsOutstandingModalOpen(false)}
                salesmenData={salesmenData}
                total={stats.totalPending}
                todayCollections={todayCollections}
                stats={stats}
                masterPlans={masterPlans}
            />
            <TodayOutstandingModal
                isOpen={isTodayOutstandingModalOpen}
                onClose={() => setIsTodayOutstandingModalOpen(false)}
                salesmenData={salesmenData}
                todayCollections={todayCollections}
                masterPlans={masterPlans}
            />
            <RouteExplorerModal
                isOpen={isRouteExplorerOpen}
                onClose={() => setIsRouteExplorerOpen(false)}
                salesmenData={salesmenData}
                allPayments={allPayments}
                isAdmin={true}
            />
            <CompanyDetailsModal
                isOpen={isCompanyModalOpen}
                onClose={() => setIsCompanyModalOpen(false)}
                company={selectedCompanyData.name}
                reactiveTargets={reactiveTargets}
                companyColor={selectedCompanyData.color}
                companyGlow={selectedCompanyData.glow}
                masterPlans={masterPlans}
            />
            {isDataManagerOpen && (
                <React.Suspense fallback={
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
                        <div className="bg-slate-900 border border-white/10 p-8 rounded-3xl flex flex-col items-center gap-4 shadow-2xl">
                            <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
                            <p className="text-white font-black uppercase tracking-widest text-xs">Loading Data Engine...</p>
                        </div>
                    </div>
                }>
                    <DataManagerModal isOpen={isDataManagerOpen} onClose={() => setIsDataManagerOpen(false)} />
                </React.Suspense>
            )}
            <ChequeDetailsModal isOpen={isChequeModalOpen} onClose={() => setIsChequeModalOpen(false)} allPayments={allPayments} viewMode={viewMode} />
        </>
    );
}

function getGlobalTotals(payments) {
    const todayStr = new Date().toLocaleDateString('en-CA');
    return payments.filter(p => p.timestamp?.toDate().toLocaleDateString('en-CA') === todayStr)
        .reduce((acc, p) => {
            const type = (p.payment_type || 'Cash').toLowerCase();
            acc[type] = (acc[type] || 0) + Number(p.amount || 0);
            return acc;
        }, { cash: 0, upi: 0, cheque: 0 });
}

// Simplified Modals for this view
function CollectionModal({ isOpen, onClose, allPayments, total }) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" onClick={onClose}></div>
            <div className="bg-slate-900 border border-white/10 w-full max-w-2xl rounded-[3rem] overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-300">
                <div className="p-8 border-b border-white/5 flex justify-between items-center bg-indigo-900/10">
                    <h2 className="text-2xl font-black text-white uppercase italic">Session Log</h2>
                    <button onClick={onClose} className="p-3 bg-white/5 rounded-2xl text-slate-500 hover:text-white transition-all">✕</button>
                </div>
                <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar italic text-slate-500 text-center py-20">
                    Use the main dashboard's Master-Detail view for real-time history browsing.
                </div>
            </div>
        </div>
    );
}

function ChequeDetailsModal({ isOpen, onClose, allPayments, viewMode }) {
    if (!isOpen) return null;

    const isWeb = viewMode === 'web';
    const cheques = allPayments.filter(p => (p.payment_type || '').toLowerCase() === 'cheque');
    const totalChequeAmount = cheques.reduce((sum, p) => sum + Number(p.amount || 0), 0);

    // Group by Salesman -> Route
    const grouped = cheques.reduce((acc, p) => {
        const salesman = (p.salesman || 'Unknown').toUpperCase();
        const route = (p.route || 'Other').toUpperCase();

        if (!acc[salesman]) acc[salesman] = {};
        if (!acc[salesman][route]) acc[salesman][route] = [];

        acc[salesman][route].push(p);
        return acc;
    }, {});

    const sortedSalesmen = Object.keys(grouped).sort();

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" onClick={onClose}></div>
            <div className={`bg-slate-900 border border-white/10 w-full rounded-[2.5rem] overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-300 ${isWeb ? 'max-w-6xl h-[85vh] flex flex-col' : 'max-w-4xl'}`}>
                {/* Header */}
                <div className={`p-6 sm:p-8 border-b border-white/5 flex justify-between items-center ${isWeb ? 'bg-gradient-to-r from-purple-900/20 via-slate-900 to-slate-900' : 'bg-purple-900/10'}`}>
                    <div>
                        <h2 className={`${isWeb ? 'text-3xl lg:text-4xl' : 'text-xl sm:text-2xl'} font-black text-white uppercase italic tracking-wider`}>Cheque Inventory</h2>
                        <p className={`${isWeb ? 'text-xs lg:text-sm' : 'text-[10px]'} font-bold text-purple-400 mt-1 uppercase tracking-[0.2em]`}>Total Value: ₹{totalChequeAmount.toLocaleString('en-IN')}</p>
                    </div>
                    <button onClick={onClose} className="p-3 bg-white/5 rounded-2xl text-slate-500 hover:text-white transition-all active:scale-95 border border-white/5 hover:bg-white/10">
                        <X size={isWeb ? 24 : 20} />
                    </button>
                </div>

                {/* Content */}
                <div className={`p-4 sm:p-8 overflow-y-auto custom-scrollbar ${isWeb ? 'flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start' : 'max-h-[70vh] space-y-8'}`}>
                    {sortedSalesmen.length === 0 ? (
                        <div className={`py-20 text-center ${isWeb ? 'col-span-3' : ''}`}>
                            <p className="text-slate-500 font-bold uppercase tracking-widest italic">No cheques recorded today</p>
                        </div>
                    ) : (
                        sortedSalesmen.map((salesman) => (
                            <div key={salesman} className={`${isWeb ? 'space-y-6 lg:border-r lg:border-white/5 lg:pr-8 last:border-0' : 'space-y-4'}`}>
                                <div className="flex items-center gap-3 px-2">
                                    <div className="h-px flex-1 bg-white/5 lg:hidden"></div>
                                    <h3 className={`${isWeb ? 'text-sm' : 'text-xs'} font-black text-purple-500 uppercase tracking-[0.3em] flex items-center gap-2`}>
                                        <Users size={14} className="opacity-50" />
                                        {salesman}
                                    </h3>
                                    <div className="h-px flex-1 bg-white/5"></div>
                                </div>

                                <div className="space-y-6">
                                    {Object.entries(grouped[salesman]).map(([route, payments]) => (
                                        <div key={route} className={`bg-slate-950/40 border border-white/5 rounded-3xl p-5 hover:border-purple-500/20 transition-all group ${isWeb ? 'shadow-lg hover:shadow-purple-500/5' : ''}`}>
                                            <div className="flex justify-between items-center mb-4">
                                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                    <MapPin size={10} className="text-purple-500/50" />
                                                    {route}
                                                </h4>
                                                <span className="text-[10px] font-black text-white px-2 py-0.5 bg-purple-500/20 rounded-full border border-purple-500/30">
                                                    {payments.length}
                                                </span>
                                            </div>

                                            <div className="space-y-3">
                                                {payments.map((p, idx) => (
                                                    <div key={idx} className="flex justify-between items-start gap-4 p-3 bg-white/5 rounded-2xl group-hover:bg-white/[0.07] transition-all border border-transparent hover:border-white/5">
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-[11px] font-black text-slate-100 truncate uppercase tracking-tight">{p.party || 'Unknown Shop'}</p>
                                                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                                                                <p className="text-[9px] font-bold text-slate-500">
                                                                    Bill: <span className="text-slate-300">{p.bill_no || 'N/A'}</span>
                                                                </p>
                                                                <span className="text-slate-700 text-[8px]">●</span>
                                                                <p className="text-[9px] font-bold text-slate-500">
                                                                    Date: <span className="text-slate-300">{p.bill_date || 'N/A'}</span>
                                                                </p>
                                                            </div>
                                                            {p.cheque_date && (
                                                                <div className="flex items-center gap-1.5 mt-1.5 p-1 px-2 bg-amber-500/5 rounded-lg border border-amber-500/10 w-fit">
                                                                    <Clock size={8} className="text-amber-500" />
                                                                    <p className="text-[8px] font-black text-amber-500 uppercase tracking-tighter">
                                                                        DUE: {new Date(p.cheque_date).toLocaleDateString('en-IN')}
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-sm font-black text-white tracking-tight">₹{Number(p.amount || 0).toLocaleString('en-IN')}</p>
                                                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase border ${p.status === 'Approved' ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' : 'text-amber-400 bg-amber-400/10 border-amber-400/20'}`}>
                                                                {p.status}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="mt-4 pt-3 border-t border-white/5 flex justify-between items-center">
                                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Route Total</span>
                                                <span className="text-sm font-black text-purple-400 tracking-wider font-mono">
                                                    ₹{payments.reduce((sum, p) => sum + Number(p.amount || 0), 0).toLocaleString('en-IN')}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

function OutstandingModal({ isOpen, onClose, salesmenData, total, todayCollections, stats, masterPlans }) {
    if (!isOpen) return null;

    // Local State for Drill-down
    const [selectedCompany, setSelectedCompany] = React.useState(null);

    // Calculate Company-wise Totals
    const companyTotals = {};
    const processedIds = new Set(); // To avoid double counting if any

    salesmenData.forEach(s => {
        const sid = (s.id || "").trim().toUpperCase();
        // Skip if processed (though salesmenData should be unique)
        if (processedIds.has(sid)) return;
        processedIds.add(sid);

        const sidNorm = sid.replace(/[^A-Z0-9]/g, '');
        const plan = masterPlans?.[sidNorm] || masterPlans?.[sid] || {};
        const comp = plan.company || plan.Company || 'Unassigned';

        const collToday = todayCollections.find(c => c.name.trim().toUpperCase() === sid)?.total || 0;
        const liveBal = (s.total_outstanding || 0) + collToday; // Total liability before today's collections
        const actualPending = (s.total_outstanding || 0) - collToday;

        if (!companyTotals[comp]) {
            companyTotals[comp] = {
                name: comp,
                total: 0,
                salesmenCount: 0,
                salesmen: []
            };
        }

        companyTotals[comp].total += actualPending;
        companyTotals[comp].salesmenCount += 1;
        companyTotals[comp].salesmen.push({
            name: s.id,
            amount: actualPending,
            collected: collToday,
            liability: liveBal
        });
    });

    const sortedCompanies = Object.values(companyTotals).sort((a, b) => b.total - a.total);

    // Reset selection when closing
    React.useEffect(() => {
        if (!isOpen) setSelectedCompany(null);
    }, [isOpen]);

    // Company Color Mapping
    const companyColors = {
        'Cadbury': { bg: 'bg-indigo-600/20', border: 'border-indigo-500/20', text: 'text-indigo-400', glow: 'shadow-[0_0_30px_rgba(79,70,229,0.1)]', gradient: 'from-indigo-600/10 to-transparent' },
        'Britannia': { bg: 'bg-red-600/20', border: 'border-red-500/20', text: 'text-red-400', glow: 'shadow-[0_0_30px_rgba(220,38,38,0.1)]', gradient: 'from-red-600/10 to-transparent' },
        'Colgate': { bg: 'bg-emerald-600/20', border: 'border-emerald-500/20', text: 'text-emerald-400', glow: 'shadow-[0_0_30px_rgba(16,185,129,0.1)]', gradient: 'from-emerald-600/10 to-transparent' },
        'Unknown': { bg: 'bg-slate-800/50', border: 'border-white/10', text: 'text-slate-400', glow: 'shadow-none', gradient: 'from-white/5 to-transparent' }
    };

    const activeColor = companyColors[selectedCompany] || companyColors['Unknown'];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" onClick={onClose}></div>
            <div className={`bg-slate-900 border ${selectedCompany ? activeColor.border : 'border-white/10'} w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-300 transition-colors duration-500`}>

                {/* Dynamic Background Glow */}
                {selectedCompany && (
                    <div className={`absolute inset-0 bg-gradient-to-b ${activeColor.gradient} opacity-20 pointer-events-none`}></div>
                )}

                <div className={`px-5 py-4 border-b ${selectedCompany ? activeColor.border : 'border-white/5'} flex justify-between items-center bg-indigo-900/10 relative z-10`}>
                    <div className="flex items-center gap-4">
                        {selectedCompany && (
                            <button
                                onClick={() => setSelectedCompany(null)}
                                className={`p-2 rounded-xl hover:bg-white/10 transition-colors ${activeColor.text}`}
                            >
                                <ArrowLeft size={20} />
                            </button>
                        )}
                        <h2 className={`text-xl sm:text-2xl font-black uppercase italic ${selectedCompany ? activeColor.text : 'text-white'}`}>
                            {selectedCompany ? selectedCompany : 'Liability Breakdown'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2.5 bg-white/5 rounded-xl text-slate-500 hover:text-white transition-all border border-white/5 active:scale-95">✕</button>
                </div>

                <div className="p-5 sm:p-6 max-h-[75vh] overflow-y-auto custom-scrollbar italic text-center">

                    {!selectedCompany ? (
                        /* COMPANY VIEW */
                        <>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-8 opacity-60">Company-wise Outstanding</p>
                            <div className="flex flex-col gap-4">
                                {sortedCompanies.map((c, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => setSelectedCompany(c.name)}
                                        className="flex items-center justify-between p-4 bg-white/[0.02] rounded-2xl border border-white/5 hover:bg-white/[0.04] hover:border-blue-500/30 cursor-pointer transition-all group active:scale-[0.98]"
                                    >
                                        <div className="flex items-center gap-5 text-left">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg border border-white/10 shadow-inner
                                                ${c.name === 'Cadbury' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                                    c.name === 'Britannia' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                        c.name === 'Colgate' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                            'bg-slate-800 text-slate-400'}`}>
                                                {c.name.charAt(0)}
                                            </div>
                                            <div>
                                                <h4 className="text-lg font-black text-white uppercase tracking-tight leading-none mb-1 group-hover:text-blue-400 transition-colors">{c.name}</h4>
                                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{c.salesmenCount} Salesmen Active</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xl sm:text-2xl font-black text-white tracking-tighter italic">₹{c.total.toLocaleString('en-IN')}</p>
                                            <div className="flex items-center justify-end gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <span className="text-[8px] font-bold text-blue-400 uppercase tracking-widest">View Details</span>
                                                <ArrowRight size={10} className="text-blue-400" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        /* SALESMAN VIEW */
                        <>
                            <p className={`text-[10px] font-black uppercase tracking-[0.3em] mb-8 opacity-80 ${activeColor.text}`}>Salesman Breakdown</p>
                            <div className="flex flex-col gap-3">
                                {companyTotals[selectedCompany]?.salesmen
                                    .sort((a, b) => b.amount - a.amount)
                                    .map((s, idx) => {
                                        const percentage = s.liability > 0 ? Math.min(Math.round((s.collected / s.liability) * 100), 100) : 0;
                                        return (
                                            <div
                                                key={idx}
                                                className={`flex flex-col p-4 rounded-2xl border transition-all hover:scale-[1.01] ${activeColor.bg} ${activeColor.border} ${activeColor.glow} gap-3`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-xl bg-black/20 flex items-center justify-center text-xs font-black text-white/50 border border-white/5 shadow-inner">
                                                            {idx + 1}
                                                        </div>
                                                        <h4 className="text-sm font-black text-white uppercase tracking-wide">{s.name}</h4>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className={`text-xl font-black tracking-tighter drop-shadow-lg italic ${activeColor.text}`}>₹{s.amount.toLocaleString('en-IN')}</span>
                                                        <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest leading-none mt-1">Pending Balance</p>
                                                    </div>
                                                </div>

                                                <div className="h-1.5 w-full bg-slate-950/50 rounded-full overflow-hidden border border-white/5 relative mt-1">
                                                    <div
                                                        className={`h-full bg-gradient-to-r ${activeColor.gradient.replace('to-transparent', 'to-white/50')} transition-all duration-1000 relative`}
                                                        style={{ width: `${percentage}%` }}
                                                    >
                                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer"></div>
                                                    </div>
                                                </div>

                                                <div className="flex justify-between items-center px-1">
                                                    <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                                                        ₹{s.collected.toLocaleString('en-IN')} COLLECTED
                                                    </span>
                                                    <span className={`text-[9px] font-black uppercase tracking-widest ${activeColor.text} bg-white/5 px-2 py-0.5 rounded-md`}>
                                                        {percentage}% COMPLETED
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                            <div className={`mt-6 flex justify-between items-center px-4 py-3 rounded-2xl border ${activeColor.border} ${activeColor.bg}`}>
                                <span className={`text-[10px] font-black uppercase tracking-widest ${activeColor.text}`}>Company Total</span>
                                <span className="text-xl font-black text-white tracking-tighter">₹{companyTotals[selectedCompany]?.total.toLocaleString('en-IN')}</span>
                            </div>
                        </>
                    )}

                    {!selectedCompany && (
                        <div className="mt-8 pt-8 border-t border-white/5 flex justify-between items-center">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Total Market Exposure</span>
                            <span className="text-3xl font-black text-red-500 tracking-tighter">₹{(stats.totalPending - stats.totalCollectedToday).toLocaleString('en-IN')}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function TodayOutstandingModal({ isOpen, onClose, salesmenData, todayCollections, masterPlans }) {
    if (!isOpen) return null;

    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const todayName = days[new Date().getDay()];

    const normalizeRoute = (r) => {
        if (!r) return "";
        return String(r).trim().replace(/\s+/g, ' ').toUpperCase();
    };

    // Process all salesmen to show their route, collected today, and pending today
    const activeSalesmen = salesmenData
        .map(s => {
            const sid = (s.id || "").trim().toUpperCase();
            const sidNorm = sid.replace(/[^A-Z0-9]/g, '');
            const plan = masterPlans?.[sidNorm] || masterPlans?.[sid] || {};

            const routes = plan.routes || plan.Routes || {};
            const assignedRoute = routes[todayName] ||
                routes[todayName.toLowerCase()] ||
                routes[todayName.charAt(0).toUpperCase() + todayName.slice(1)] || 'Unassigned';

            const targetRoute = normalizeRoute(assignedRoute);
            let routeLiability = 0;

            if (targetRoute && targetRoute !== "SELECT ROUTE" && targetRoute !== "NO ROUTES LOADED" && targetRoute !== "UNASSIGNED") {
                const routeBills = (s.bills || []).filter(b => normalizeRoute(b.Route || b.route) === targetRoute);
                routeLiability = routeBills.reduce((sum, b) => sum + (Number(b.Balance) || Number(b.balance) || Number(b.Amount) || Number(b.amount) || 0), 0);
            }

            const cData = todayCollections.find(c => c.name.trim().toUpperCase() === sid);
            let routeCollected = 0;

            if (cData && cData.payments) {
                routeCollected = cData.payments
                    .filter(p => normalizeRoute(p.route) === targetRoute)
                    .reduce((sum, p) => sum + Number(p.amount || 0), 0);
            }

            // In some edge cases if they collected without a route matching, but the overarching dashboard counts it, we might want to just take cData.total if route is unknown. But exact matching is preferred.
            if (targetRoute === "UNASSIGNED") {
                routeCollected = cData?.total || 0;
            }

            const pending = Math.max(0, routeLiability - routeCollected);

            return {
                name: s.id,
                route: assignedRoute,
                collected: routeCollected,
                liability: routeLiability,
                pending: pending
            };
        })
        .filter(s => s.liability > 0)
        .sort((a, b) => b.liability - a.liability); // Sort by highest liability

    const totalCollected = activeSalesmen.reduce((sum, s) => sum + s.collected, 0);
    const totalPending = activeSalesmen.reduce((sum, s) => sum + s.pending, 0);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" onClick={onClose}></div>
            <div className="bg-slate-900 border border-purple-500/20 w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-300 transition-colors duration-500">

                <div className="absolute inset-0 bg-gradient-to-b from-purple-600/10 to-transparent opacity-20 pointer-events-none"></div>

                <div className="px-5 py-4 border-b border-purple-500/20 flex justify-between items-center bg-indigo-900/10 relative z-10">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-black uppercase italic text-purple-400">
                            Today's Route Balances
                        </h2>
                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
                            Collected: ₹{totalCollected.toLocaleString('en-IN')} | Pending: ₹{totalPending.toLocaleString('en-IN')}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2.5 bg-white/5 rounded-xl text-slate-500 hover:text-white transition-all border border-white/5 active:scale-95">✕</button>
                </div>

                <div className="p-5 sm:p-6 max-h-[75vh] overflow-y-auto custom-scrollbar flex flex-col gap-4">
                    {activeSalesmen.length === 0 ? (
                        <div className="py-12 text-center text-slate-500 font-bold uppercase tracking-widest text-xs">
                            No Active Balances Today
                        </div>
                    ) : (
                        activeSalesmen.map((s, idx) => {
                            const percentage = s.liability > 0 ? Math.min(Math.round((s.collected / s.liability) * 100), 100) : 0;
                            return (
                                <div key={idx} className="flex flex-col p-4 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-purple-500/30 transition-all gap-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="text-sm font-black text-white uppercase tracking-wide">{s.name}</h4>
                                            <p className="text-[9px] font-black uppercase text-purple-400 tracking-widest leading-none mt-1">{s.route}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xl font-black tracking-tighter drop-shadow-lg italic text-slate-200">₹{s.pending.toLocaleString('en-IN')}</span>
                                            <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest leading-none mt-1">Pending Balance</p>
                                        </div>
                                    </div>

                                    <div className="h-1.5 w-full bg-slate-950/50 rounded-full overflow-hidden border border-white/5 relative mt-1">
                                        <div
                                            className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-400 transition-all duration-1000 relative"
                                            style={{ width: `${percentage}%` }}
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer"></div>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center px-1">
                                        <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                                            ₹{s.collected.toLocaleString('en-IN')} COLLECTED
                                        </span>
                                        <span className="text-[9px] font-black uppercase tracking-widest text-fuchsia-400 bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                                            {percentage}% COMPLETED
                                        </span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}

// --- REFACTORED TOP-LEVEL COMPONENTS & HELPERS ---

const formatDateShort = (ts) => {
    if (!ts || typeof ts.toDate !== 'function') return 'N/A';
    return ts.toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

const getPaymentBadge = (type) => {
    const t = (type || 'Cash').toLowerCase();
    const config = {
        cash: { icon: <Banknote size={10} />, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
        upi: { icon: <Smartphone size={10} />, color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20' },
        cheque: { icon: <Landmark size={10} />, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' }
    };
    const s = config[t] || config.cash;
    return (
        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md border ${s.bg} ${s.border} ${s.color} text-[8px] font-black uppercase tracking-widest`}>
            {s.icon}
            {t}
        </div>
    );
};

const getReactiveTargets = (salesmenTargets, allPayments) => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const results = salesmenTargets.map(t => {
        // 1. Calculate confirmed collections from digital payments
        const bankAchieved = allPayments
            .filter(p => {
                // Aggressive normalization to match the new salesman_id format
                const pSid = (p.salesman_id || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
                const pSName = (p.salesman || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
                if (pSid !== t.salesman_id && pSName !== t.salesman_id) return false;

                try {
                    return p.timestamp?.toDate().toISOString().slice(0, 7) === currentMonth;
                } catch (e) { return false; }
            })
            .reduce((sum, p) => sum + Number(p.amount || 0), 0);

        // 2. Best-of-Two merging: Use current collections OR manually entered total from database
        const existingTotal = Number(t.total_achieved || 0);
        const isSameMonth = t.achieved_month === currentMonth;
        const finalAchieved = isSameMonth ? Math.max(bankAchieved, existingTotal) : bankAchieved;

        return { ...t, achieved: finalAchieved, awards: t.awards || [] };
    });

    // NUCLEAR DEDUPLICATION: Sort by Target and remove duplicates by Name
    // This ensures that even if upstream state has duplicates, the UI receives a clean list.
    const uniqueResults = [];
    const seenNames = new Set();

    results.sort((a, b) => (b.monthly_target || 0) - (a.monthly_target || 0));

    for (const r of results) {
        const key = (r.name || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (!seenNames.has(key)) {
            seenNames.add(key);
            uniqueResults.push(r);
        }
    }

    return uniqueResults;
};

const getTodayRouteStats = (salesmenData, masterPlans, allPayments) => {
    let totalLiability = 0;
    let collectedValue = 0;

    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const todayName = days[new Date().getDay()];
    const todayStr = new Date().toLocaleDateString('en-CA');

    const normalizeRoute = (r) => {
        if (!r) return "";
        return String(r).trim().replace(/\s+/g, ' ').toUpperCase();
    };

    // 1. Identify Today's Active Routes and Calculate Total Liability
    salesmenData.forEach(salesman => {
        const sId = salesman.id.toUpperCase().replace(/[^A-Z0-9]/g, '');
        const plan = masterPlans[sId];

        if (plan) {
            const routes = plan.routes || plan.Routes || {};
            // Try different case variations that might be in the database
            const assignedRoute = routes[todayName] ||
                routes[todayName.toLowerCase()] ||
                routes[todayName.charAt(0).toUpperCase() + todayName.slice(1)];

            if (assignedRoute && assignedRoute !== "Select Route" && assignedRoute !== "No Routes Loaded") {
                const targetRoute = normalizeRoute(assignedRoute);

                // Sum the outstanding balance for this specific route for this salesman
                const routeBills = (salesman.bills || []).filter(b => normalizeRoute(b.Route) === targetRoute);
                totalLiability += routeBills.reduce((sum, b) => sum + (Number(b.Balance) || Number(b.Amount) || 0), 0);
            }
        }
    });

    // 2. Calculate Collected Value for these specific routes today
    allPayments.forEach(p => {
        if (!p.timestamp) return;
        const pDateStr = p.timestamp.toDate().toLocaleDateString('en-CA');

        if (pDateStr === todayStr) {
            const sId = (p.salesman || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
            const plan = masterPlans[sId];

            if (plan) {
                const routes = plan.routes || plan.Routes || {};
                const assignedRoute = routes[todayName] ||
                    routes[todayName.toLowerCase()] ||
                    routes[todayName.charAt(0).toUpperCase() + todayName.slice(1)];

                const targetRoute = normalizeRoute(assignedRoute);
                const paymentRoute = normalizeRoute(p.route);

                // Only count collections made on the route assigned for today
                if (targetRoute && paymentRoute === targetRoute) {
                    collectedValue += Number(p.amount || 0);
                }
            }
        }
    });

    return { collectedValue, remainingValue: Math.max(0, totalLiability - collectedValue), totalLiability };
};

const getTodayCollections = (allPayments) => {
    const todayStr = new Date().toLocaleDateString('en-CA');
    const summary = {};

    allPayments.forEach(p => {
        if (!p.timestamp) return;
        const pDateStr = p.timestamp.toDate().toLocaleDateString('en-CA');

        if (pDateStr === todayStr) {
            const sm = (p.salesman || 'Unknown').trim().toUpperCase();
            if (!summary[sm]) {
                summary[sm] = {
                    name: sm,
                    route: p.route || 'Unknown',
                    total: 0,
                    cash: 0,
                    upi: 0,
                    cheque: 0,
                    payments: []
                };
            }
            summary[sm].total += Number(p.amount || 0);
            const type = (p.payment_type || 'Cash').toLowerCase();
            summary[sm][type] = (summary[sm][type] || 0) + Number(p.amount || 0);
            summary[sm].payments.push(p);

            if (summary[sm].route !== p.route && p.route && summary[sm].route !== "Multiple") {
                summary[sm].route = "Multiple";
            }
        }
    });
    return Object.values(summary).sort((a, b) => b.total - a.total);
};

const getCompanyGroupedCollections = (masterPlans, salesmenData, todayCollections, reactiveTargets, searchTerm) => {
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const todayName = days[new Date().getDay()];

    const companies = {
        'Cadbury': [],
        'Britannia': [],
        'Colgate': [],
        'Unknown': []
    };

    // Calculate Ranking Map
    const rankMap = {};
    [...reactiveTargets]
        .map(t => ({
            id: t.salesman_id,
            pct: t.monthly_target > 0 ? (t.achieved / t.monthly_target) : 0,
            achieved: t.achieved
        }))
        .sort((a, b) => (b.pct - a.pct) || (b.achieved - a.achieved))
        .forEach((item, index) => {
            rankMap[item.id] = index + 1;
        });

    const allSalesmanIds = new Set([
        ...Object.keys(masterPlans),
        ...salesmenData.map(s => s.id.toUpperCase().replace(/[^A-Z0-9]/g, ''))
    ]);

    allSalesmanIds.forEach(sid => {
        const plan = masterPlans[sid];
        const comp = plan?.company || plan?.Company || 'Unassigned';
        if (!companies[comp]) companies[comp] = [];

        const routes = plan?.routes || plan?.Routes || {};
        const sRoute = routes[todayName] || routes[todayName.charAt(0).toUpperCase() + todayName.slice(1)] || 'Not Set';

        const rank = rankMap[sid] || '-';

        // Normalize for lookup
        const cData = todayCollections.find(c => c.name.toUpperCase().replace(/[^A-Z0-9]/g, '') === sid);
        const sStats = salesmenData.find(s => s.id.toUpperCase().replace(/[^A-Z0-9]/g, '') === sid);

        // Calculate Bills with Live Balance
        const calcBills = (sStats?.bills || []).map(bill => {
            const billColls = (cData?.payments || []).filter(p =>
                String(p.bill_no).trim() === String(bill.bill_no || bill.BillNo || "").trim()
            );
            const billToday = billColls.reduce((sum, p) => sum + Number(p.amount || 0), 0);
            return {
                ...bill,
                LiveBalance: Number(bill.Balance || bill.balance || bill.Amount || bill.amount || 0) - billToday
            };
        });

        // Calculate outstanding for SCHEDULED ROUTE only
        const routeOutstanding = calcBills
            .filter(b => (b.Route || '').trim().toUpperCase() === (sRoute || '').trim().toUpperCase())
            .reduce((sum, b) => sum + Number(b.Amount || b.amount || b.Balance || 0), 0);

        companies[comp].push({
            id: sid,
            name: plan?.name || sStats?.salesman_name || sid, // Keep original name for display if available
            total: cData?.total || 0,
            cash: cData?.cash || 0,
            upi: cData?.upi || 0,
            cheque: cData?.cheque || 0,
            route: cData?.route || 'Inactive',
            scheduledRoute: sRoute,
            totalOutstanding: (sStats?.total_outstanding || 0) - (cData?.total || 0),
            routeOutstanding: routeOutstanding, // NEW FIELD
            rank: rank,
            outstandingBills: calcBills,
            routeStatus: !cData?.route ? 'PENDING' : (cData.route.trim().toLowerCase() === sRoute.trim().toLowerCase() ? 'MATCH' : 'MISMATCH'),
            payments: cData?.payments || []
        });
    });

    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        Object.keys(companies).forEach(key => {
            companies[key] = companies[key].filter(c =>
                c.name.toLowerCase().includes(term) ||
                (c.route && c.route.toLowerCase().includes(term)) ||
                (c.scheduledRoute && c.scheduledRoute.toLowerCase().includes(term))
            );
        });
    }

    return companies;
};

const DashboardView = ({ salesmenData, allPayments, reactiveTargets, dashboardMenu, setDashboardMenu, setView, stats, setIsRouteExplorerOpen, setIsDataManagerOpen, setIsOutstandingModalOpen, setIsChequeModalOpen, masterPlans, onCompanyClick, playSound, isTodayOutstandingModalOpen, setIsTodayOutstandingModalOpen }) => {
    const defaultSlideRef = React.useRef(null);
    const scrollContainerRef = React.useRef(null);

    React.useEffect(() => {
        if (dashboardMenu === 'MAIN' && scrollContainerRef.current && defaultSlideRef.current) {
            // Scroll to the second slide exactly in the center without smooth animation to make it instant on load
            const container = scrollContainerRef.current;
            const slide = defaultSlideRef.current;
            const scrollPos = slide.offsetLeft - container.offsetLeft - (container.clientWidth / 2) + (slide.clientWidth / 2);
            container.scrollLeft = scrollPos;
        }
    }, [dashboardMenu]);

    return (
        <div className={`animate-fade-in ${dashboardMenu === 'MAIN' ? 'h-full flex flex-col justify-center pb-10 sm:pb-20' : 'space-y-6 max-w-2xl mx-auto'}`}>
            {dashboardMenu === 'MAIN' && (
                <>
                    {/* PENDING VERIFICATION BADGE */}
                    {allPayments.filter(p => (p.status || '').toLowerCase() !== 'approved').length > 0 && (
                        <div className="flex justify-center mb-6">
                            <div className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-4 py-2 rounded-2xl flex items-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.05)]">
                                <Clock size={14} className="animate-pulse" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                                    {allPayments.filter(p => (p.status || '').toLowerCase() !== 'approved').length} PENDING VERIFICATION
                                </span>
                            </div>
                        </div>
                    )}
                    {/* CAROUSEL CONTAINER */}
                    <div ref={scrollContainerRef} className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar gap-4 pb-4 px-4 sm:px-8 -mx-4 sm:-mx-8">
                        {/* Empty spacer div to allow the first item to center properly on mobile */}
                        <div className="shrink-0 w-1 sm:w-8"></div>

                        {/* SLIDE 1: QUICK ACTIONS */}
                        <div className="min-w-[90%] sm:min-w-[80%] shrink-0 snap-center snap-always relative flex flex-col gap-4 h-[450px]">
                            <div className="flex-1 relative overflow-hidden bg-slate-950/90 backdrop-blur-3xl border border-white/10 p-6 sm:p-8 rounded-[2.5rem] shadow-premium-blue flex flex-col justify-center">
                                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 blur-[120px] rounded-full pointer-events-none"></div>

                                <div className="relative z-10 flex flex-col items-center mb-6">
                                    <div className="flex items-center gap-2 bg-blue-500/10 px-4 py-1.5 rounded-full border border-blue-500/20 shadow-sm">
                                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                                        <span className="text-[10px] sm:text-[11px] font-black text-blue-400 uppercase tracking-[0.3em] opacity-90">QUICK ACTIONS</span>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3 w-full max-w-sm mx-auto">
                                    <button
                                        onClick={() => { playSound('click'); setDashboardMenu('MASTER'); }}
                                        className="w-full relative group overflow-hidden bg-white/[0.03] backdrop-blur-md border border-white/5 p-4 sm:p-5 rounded-3xl hover:bg-white/[0.08] hover:border-blue-500/30 transition-all active:scale-95 flex items-center justify-between"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-inner group-hover:scale-110 transition-transform">
                                                <Settings size={20} className="text-blue-400" />
                                            </div>
                                            <div className="text-left">
                                                <h3 className="text-sm font-black text-white uppercase tracking-tight">Master Settings</h3>
                                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5 group-hover:text-blue-400/70 transition-colors">Routes & Targets</p>
                                            </div>
                                        </div>
                                        <ArrowRight size={16} className="text-slate-600 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                                    </button>

                                    <button
                                        onClick={() => { playSound('click'); setDashboardMenu('REPORTS'); }}
                                        className="w-full relative group overflow-hidden bg-white/[0.03] backdrop-blur-md border border-white/5 p-4 sm:p-5 rounded-3xl hover:bg-white/[0.08] hover:border-emerald-500/30 transition-all active:scale-95 flex items-center justify-between"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-inner group-hover:scale-110 transition-transform">
                                                <LayoutDashboard size={20} className="text-emerald-400" />
                                            </div>
                                            <div className="text-left">
                                                <h3 className="text-sm font-black text-white uppercase tracking-tight">Reports</h3>
                                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5 group-hover:text-emerald-400/70 transition-colors">Insights & Data</p>
                                            </div>
                                        </div>
                                        <ArrowRight size={16} className="text-slate-600 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                                    </button>

                                    <button
                                        onClick={() => { playSound('pop'); App.exitApp(); }}
                                        className="w-full relative group overflow-hidden bg-white/[0.03] backdrop-blur-md border border-white/5 p-4 sm:p-5 rounded-3xl hover:bg-red-500/10 hover:border-red-500/30 transition-all active:scale-95 flex items-center justify-between mt-2"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center border border-red-500/20 shadow-inner group-hover:scale-110 transition-transform">
                                                <LogOut size={20} className="text-red-400" />
                                            </div>
                                            <div className="text-left">
                                                <h3 className="text-sm font-black text-white uppercase tracking-tight">Quit App</h3>
                                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5 group-hover:text-red-400/70 transition-colors">Close System</p>
                                            </div>
                                        </div>
                                        <X size={16} className="text-slate-600 group-hover:text-red-400 transition-colors group-hover:rotate-90" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* SLIDE 2: TODAY'S COLLECTION */}
                        <div ref={defaultSlideRef} className="min-w-[90%] sm:min-w-[80%] shrink-0 snap-center snap-always relative">
                            <div className="bg-slate-950/90 backdrop-blur-3xl rounded-3xl sm:rounded-[3rem] p-6 sm:p-10 relative overflow-hidden shadow-premium-blue border border-white/10 group/intake hover:border-blue-500/30 transition-all duration-700 h-[450px] flex flex-col justify-center">
                                {/* PREMIIUM DECORATIVE BACKGROUND */}
                                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/20 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2 group-hover/intake:bg-blue-600/30 transition-all duration-1000 pointer-events-none"></div>
                                <div className="absolute bottom-0 left-0 w-72 h-72 bg-indigo-500/10 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/4 group-hover/intake:bg-indigo-600/20 transition-all duration-1000 pointer-events-none"></div>
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.03)_0%,transparent_70%)] pointer-events-none"></div>

                                {/* FLOATING DECORATIVE ICONS */}
                                <Banknote size={120} className="absolute -top-10 -left-10 text-white/5 -rotate-12 pointer-events-none" />
                                <TrendingUp size={100} className="absolute -bottom-10 -right-10 text-white/5 rotate-12 pointer-events-none" />

                                <div className="relative z-10 flex flex-col items-center">
                                    <div className="flex items-center gap-2 mb-4 bg-blue-500/10 px-4 py-1.5 rounded-full border border-blue-500/20 shadow-sm">
                                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                                        <span className="text-[10px] sm:text-[11px] font-black text-blue-400 uppercase tracking-[0.3em] opacity-90">TODAY'S COLLECTION</span>
                                    </div>

                                    <h2 className="text-5xl sm:text-7xl md:text-8xl font-black text-white tracking-tighter drop-shadow-[0_15px_30px_rgba(0,0,0,0.5)] italic mb-8 sm:mb-12 flex items-baseline justify-center flex-wrap w-full max-w-full gap-1 sm:gap-3 transition-transform hover:scale-105 duration-500 px-2 overflow-hidden">
                                        <span className="text-3xl sm:text-5xl font-black bg-gradient-to-br from-amber-400 to-orange-600 bg-clip-text text-transparent not-italic shrink-0">₹</span>
                                        <span className="truncate max-w-full pr-3">{stats.totalCollectedToday.toLocaleString('en-IN')}</span>
                                    </h2>

                                    <div className="grid grid-cols-3 gap-2 sm:gap-10 w-full max-w-xl mx-auto">
                                        <div className="bg-white/[0.03] backdrop-blur-md p-3 sm:p-6 rounded-[2rem] border border-white/5 flex flex-col items-center justify-center gap-2 group/icon hover:bg-white/[0.08] hover:border-emerald-500/30 transition-all duration-500 w-full overflow-hidden">
                                            <div className="p-3 bg-emerald-500/10 rounded-2xl mb-1 shadow-inner">
                                                <Banknote size={24} className="sm:size-[36px] text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.6)] transition-transform group-hover/icon:scale-125" />
                                            </div>
                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest group-hover/icon:text-emerald-400">CASH</span>
                                            <span className="text-xs sm:text-xl font-black text-white tabular-nums tracking-tight w-full text-center truncate px-1">₹{getGlobalTotals(allPayments).cash.toLocaleString('en-IN')}</span>
                                        </div>

                                        <div className="bg-white/[0.03] backdrop-blur-md p-3 sm:p-6 rounded-[2rem] border border-white/5 flex flex-col items-center justify-center gap-2 group/icon hover:bg-white/[0.08] hover:border-sky-500/30 transition-all duration-500 w-full overflow-hidden">
                                            <div className="p-3 bg-sky-500/10 rounded-2xl mb-1 shadow-inner">
                                                <Smartphone size={24} className="sm:size-[36px] text-sky-400 drop-shadow-[0_0_15px_rgba(56,189,248,0.6)] transition-transform group-hover/icon:scale-125" />
                                            </div>
                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest group-hover/icon:text-sky-400">UPI</span>
                                            <span className="text-xs sm:text-xl font-black text-white tabular-nums tracking-tight w-full text-center truncate px-1">₹{getGlobalTotals(allPayments).upi.toLocaleString('en-IN')}</span>
                                        </div>

                                        <div className="bg-white/[0.03] backdrop-blur-md p-3 sm:p-6 rounded-[2rem] border border-white/5 flex flex-col items-center justify-center gap-2 group/icon hover:bg-white/[0.08] hover:border-purple-500/30 transition-all duration-500 cursor-pointer w-full overflow-hidden" onClick={() => setIsChequeModalOpen(true)}>
                                            <div className="p-3 bg-purple-500/10 rounded-2xl mb-1 shadow-inner">
                                                <FileText size={24} className="sm:size-[36px] text-purple-400 drop-shadow-[0_0_15px_rgba(192,132,252,0.6)] transition-transform group-hover/icon:scale-125" />
                                            </div>
                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest group-hover/icon:text-purple-400">CHEQUE</span>
                                            <span className="text-xs sm:text-xl font-black text-white tabular-nums tracking-tight w-full text-center truncate px-1">₹{getGlobalTotals(allPayments).cheque.toLocaleString('en-IN')}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* SLIDE 2: BRAND TARGETS */}
                        <div className="min-w-[90%] sm:min-w-[80%] shrink-0 snap-center snap-always relative">
                            <div className="bg-slate-950/90 backdrop-blur-3xl rounded-3xl sm:rounded-[3rem] p-6 sm:p-10 relative overflow-hidden shadow-premium-purple border border-white/10 group/intake hover:border-purple-500/30 transition-all duration-700 h-[450px] flex flex-col justify-center">
                                {/* PREMIIUM DECORATIVE BACKGROUND */}
                                <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/20 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2 group-hover/intake:bg-purple-600/30 transition-all duration-1000 pointer-events-none"></div>
                                <div className="absolute bottom-0 left-0 w-72 h-72 bg-indigo-500/10 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/4 group-hover/intake:bg-indigo-600/20 transition-all duration-1000 pointer-events-none"></div>

                                {/* FLOATING DECORATIVE ICONS */}
                                <Target size={120} className="absolute -top-10 -left-10 text-white/5 -rotate-12 pointer-events-none" />
                                <PieChart size={100} className="absolute -bottom-10 -right-10 text-white/5 rotate-12 pointer-events-none" />

                                {(() => {
                                    const companyGroups = {
                                        'Cadbury': { target: 0, achieved: 0, color: 'from-purple-600 via-indigo-500 to-blue-500', glow: 'rgba(79,70,229,0.4)' },
                                        'Britannia': { target: 0, achieved: 0, color: 'from-red-600 via-rose-500 to-orange-500', glow: 'rgba(225,29,72,0.4)' },
                                        'Colgate': { target: 0, achieved: 0, color: 'from-emerald-600 via-teal-500 to-cyan-500', glow: 'rgba(20,184,166,0.4)' }
                                    };

                                    reactiveTargets.forEach(t => {
                                        const plan = masterPlans[t.salesman_id];
                                        const comp = plan?.company || plan?.Company || 'Other';
                                        if (companyGroups[comp]) {
                                            companyGroups[comp].target += Number(t.monthly_target || 0);
                                            companyGroups[comp].achieved += Number(t.achieved || 0);
                                        }
                                    });

                                    return (
                                        <div className="relative z-10 flex flex-col w-full h-full">
                                            <div className="flex items-center justify-center mb-3 sm:mb-6">
                                                <div className="flex items-center gap-2 bg-purple-500/10 px-4 py-1.5 rounded-full border border-purple-500/20 shadow-sm">
                                                    <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse"></div>
                                                    <span className="text-[10px] sm:text-[11px] font-black text-purple-400 uppercase tracking-[0.3em] opacity-90">BRAND TARGETS</span>
                                                </div>
                                            </div>
                                            <div className="flex-1 flex flex-col justify-center space-y-3 sm:space-y-7">
                                                {Object.entries(companyGroups).filter(([_, data]) => data.target > 0).map(([name, data]) => {
                                                    const displayPercentage = data.target > 0 ? Math.round((data.achieved / data.target) * 100) : 0;
                                                    const percentage = Math.min(displayPercentage, 100);
                                                    return (
                                                        <div
                                                            key={name}
                                                            className="space-y-2 sm:space-y-3 cursor-pointer group/comp active:scale-[0.98] transition-all bg-white/[0.02] p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-white/5 hover:bg-white/[0.05] hover:border-white/10"
                                                            onClick={() => onCompanyClick(name, data.color, data.glow)}
                                                        >
                                                            <div className="flex flex-col items-center px-1 gap-1">
                                                                <span className={`text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] truncate max-w-full text-center bg-gradient-to-r ${data.color} bg-clip-text text-transparent drop-shadow-sm`}>{name}</span>
                                                                <div className="flex items-center gap-2 flex-wrap justify-center mt-1">
                                                                    <span className="text-sm font-black text-white italic truncate pr-1">₹{data.achieved.toLocaleString('en-IN')}</span>
                                                                    <span className="text-slate-600 text-[10px] shrink-0">/</span>
                                                                    <span className="text-slate-500 text-[9px] sm:text-[11px] font-black italic truncate pr-1">₹{data.target.toLocaleString('en-IN')}</span>
                                                                </div>
                                                            </div>
                                                            <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-white/5 relative">
                                                                <div
                                                                    className={`h-full bg-gradient-to-r ${data.color} transition-all duration-1000 relative overflow-hidden`}
                                                                    style={{
                                                                        width: `${percentage}%`,
                                                                        boxShadow: `0 0 15px ${data.glow}`
                                                                    }}
                                                                >
                                                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                                                                </div>
                                                            </div>
                                                            <div className="flex justify-center -mt-0.5">
                                                                <span className="text-[8px] font-black text-amber-500 tracking-[0.2em] bg-amber-500/10 px-3 py-0.5 rounded-full border border-amber-500/20 shadow-lg group-hover/comp:bg-amber-500/20 transition-all">
                                                                    {displayPercentage}% ACHIEVED
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>

                        {/* SLIDE 3: OUTSTANDING DASHBOARD */}
                        <div className="min-w-[90%] sm:min-w-[80%] shrink-0 snap-center snap-always relative flex flex-col gap-4 h-[450px]">
                            <div
                                onClick={() => { playSound('click'); setIsOutstandingModalOpen(true); }}
                                className="flex-[1.2] relative group overflow-hidden bg-slate-950/90 backdrop-blur-3xl border border-white/10 p-6 sm:p-8 rounded-[2.5rem] shadow-premium-red hover:border-red-500/50 transition-all duration-700 cursor-pointer active:scale-95 flex flex-col justify-center"
                            >
                                <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/15 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-red-600/25 transition-all duration-1000"></div>
                                <History size={120} className="absolute -top-10 -left-10 text-white/5 rotate-12 pointer-events-none transition-transform group-hover:scale-110 duration-1000" />

                                <div className="relative z-10 flex flex-col items-center">
                                    <div className="flex items-center gap-2 mb-3 bg-red-500/10 px-4 py-1.5 rounded-full border border-red-500/20 shadow-sm">
                                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
                                        <span className="text-[10px] sm:text-[11px] font-black text-red-400 uppercase tracking-[0.3em] opacity-90">TOTAL OUTSTANDING</span>
                                    </div>
                                    <h2 className="text-4xl sm:text-6xl md:text-7xl font-black text-white tracking-tighter drop-shadow-[0_15px_30px_rgba(0,0,0,0.5)] italic flex items-baseline justify-center flex-wrap w-full max-w-full gap-1 sm:gap-3 px-2 overflow-hidden">
                                        <span className="text-2xl sm:text-4xl font-black text-red-500/80 not-italic mr-1 shrink-0">₹</span>
                                        <span className="truncate max-w-full pr-3">{(stats.totalPending - stats.totalCollectedToday).toLocaleString('en-IN')}</span>
                                    </h2>
                                    <div className="mt-6 flex items-center gap-3 px-5 py-2 bg-red-500 text-white rounded-full shadow-[0_10px_20px_rgba(239,68,68,0.2)] hover:shadow-[0_15px_30px_rgba(239,68,68,0.3)] transition-all">
                                        <span className="text-[10px] font-black uppercase tracking-widest">View Details</span>
                                        <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            </div>

                            {/* --- NEW: TODAY'S TOTAL OUTSTANDING --- */}
                            {(() => {
                                const { collectedValue, remainingValue, totalLiability } = getTodayRouteStats(salesmenData, masterPlans, allPayments);
                                const percentage = totalLiability > 0 ? Math.min(Math.round((collectedValue / totalLiability) * 100), 100) : 0;

                                return (
                                    <div
                                        onClick={() => { playSound('click'); setIsTodayOutstandingModalOpen(true); }}
                                        className="flex-1 relative group overflow-hidden bg-white/[0.03] backdrop-blur-xl border border-white/10 p-5 sm:p-6 rounded-[2.5rem] shadow-premium transition-all duration-700 cursor-pointer active:scale-95 flex flex-col justify-center hover:bg-white/[0.07] hover:border-purple-500/30"
                                    >
                                        <div className="absolute right-0 bottom-0 w-60 h-60 bg-purple-500/10 blur-[80px] rounded-full pointer-events-none transition-all group-hover:bg-purple-500/20"></div>

                                        <div className="relative z-10 flex flex-col">
                                            <div className="flex flex-col items-center justify-center text-center mb-5 gap-1 w-full overflow-hidden">
                                                <span className="text-[10px] font-black text-purple-400/80 uppercase tracking-[0.3em] truncate w-full">TODAY'S OUTSTANDING</span>
                                                <span className="text-3xl sm:text-5xl font-black text-white italic tracking-tighter drop-shadow-xl truncate w-full pl-2 pr-4">₹{remainingValue.toLocaleString('en-IN')}</span>
                                            </div>

                                            <div className="h-2.5 w-full bg-slate-900 rounded-full overflow-hidden border border-white/5 relative mb-4">
                                                <div
                                                    className="h-full bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 transition-all duration-1000 relative"
                                                    style={{ width: `${percentage}%`, boxShadow: `0 0 15px rgba(192,132,252,0.4)` }}
                                                >
                                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                                                </div>
                                            </div>

                                            <div className="flex justify-between items-center px-1">
                                                <div className="flex flex-col">
                                                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">COLLECTED</span>
                                                    <span className="text-xs font-black text-emerald-400">₹{collectedValue.toLocaleString('en-IN')}</span>
                                                </div>
                                                <span className="text-[10px] font-black text-fuchsia-400 uppercase tracking-widest bg-fuchsia-500/10 px-3 py-1 rounded-full border border-fuchsia-500/20 shadow-md">
                                                    {percentage}% DONE
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>


                        {/* Empty spacer div to allow the last item to center properly on mobile */}
                        <div className="shrink-0 w-1 sm:w-8"></div>
                    </div>
                </>
            )}

            {dashboardMenu === 'MASTER' && (
                <div className="max-w-2xl mx-auto space-y-4 animate-in slide-in-from-right-8 duration-300">
                    <button
                        onClick={() => { playSound('pop'); setDashboardMenu('MAIN'); }}
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 border border-blue-500/30 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 hover:text-white hover:from-blue-600/40 hover:to-indigo-600/40 hover:border-blue-400/50 transition-all active:scale-95 mb-4 shadow-[0_0_20px_rgba(37,99,235,0.1)] backdrop-blur-xl group"
                    >
                        <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Back to Menu
                    </button>

                    <button
                        onClick={() => { playSound('click'); setIsDataManagerOpen(true); }}
                        className="w-full relative group overflow-hidden bg-slate-900/40 backdrop-blur-3xl border border-white/10 p-3.5 sm:p-4 rounded-2xl hover:border-violet-500/30 transition-all active:scale-95"
                    >
                        <div className="flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-400 border border-violet-500/20">
                                    <FileSpreadsheet size={20} />
                                </div>
                                <div className="text-left">
                                    <h3 className="text-base font-black text-white uppercase">Data Manager</h3>
                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Import/Export Data</p>
                                </div>
                            </div>
                            <ArrowLeft size={16} className="rotate-180 text-slate-600 group-hover:text-white transition-colors" />
                        </div>
                    </button>

                    <button
                        onClick={() => { playSound('click'); setView('ROUTE_PLAN'); }}
                        className="w-full relative group overflow-hidden bg-slate-900/40 backdrop-blur-3xl border border-white/10 p-4 sm:p-5 rounded-3xl hover:border-blue-500/30 transition-all active:scale-95"
                    >
                        <div className="flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                                    <MapPin size={20} />
                                </div>
                                <div className="text-left">
                                    <h3 className="text-base font-black text-white uppercase">Master Plan</h3>
                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Assign Routes</p>
                                </div>
                            </div>
                            <ArrowLeft size={16} className="rotate-180 text-slate-600 group-hover:text-white transition-colors" />
                        </div>
                    </button>

                    <button
                        onClick={() => { playSound('click'); setView('REMINDERS'); }}
                        className="w-full relative group overflow-hidden bg-slate-900/40 backdrop-blur-3xl border border-white/10 p-4 sm:p-5 rounded-3xl hover:border-emerald-500/30 transition-all active:scale-95"
                    >
                        <div className="flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                                    <MessageSquare size={20} />
                                </div>
                                <div className="text-left">
                                    <h3 className="text-base font-black text-white uppercase">WhatsApp Reminders</h3>
                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Send Alerts</p>
                                </div>
                            </div>
                            <ArrowLeft size={16} className="rotate-180 text-slate-600 group-hover:text-white transition-colors" />
                        </div>
                    </button>

                    <button
                        onClick={() => { playSound('click'); setView('TARGETS'); }}
                        className="w-full relative group overflow-hidden bg-slate-900/40 backdrop-blur-3xl border border-white/10 p-4 sm:p-5 rounded-3xl hover:border-amber-500/30 transition-all active:scale-95"
                    >
                        <div className="flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20">
                                    <Target size={20} />
                                </div>
                                <div className="text-left">
                                    <h3 className="text-base font-black text-white uppercase">Salesman Targets</h3>
                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Set Goals</p>
                                </div>
                            </div>
                            <ArrowLeft size={16} className="rotate-180 text-slate-600 group-hover:text-white transition-colors" />
                        </div>
                    </button>

                    <button
                        onClick={() => { playSound('click'); setView('PENDING_APPROVALS'); }}
                        className="w-full relative group overflow-hidden bg-slate-900/40 backdrop-blur-3xl border border-white/10 p-4 sm:p-5 rounded-3xl hover:border-orange-500/30 transition-all active:scale-95"
                    >
                        <div className="flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-400 border border-orange-500/20">
                                    <Clock size={20} />
                                </div>
                                <div className="text-left">
                                    <h3 className="text-base font-black text-white uppercase">Pending Approvals</h3>
                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Verify Payments</p>
                                </div>
                            </div>
                            <ArrowLeft size={16} className="rotate-180 text-slate-600 group-hover:text-white transition-colors" />
                        </div>
                    </button>
                </div>
            )}

            {dashboardMenu === 'REPORTS' && (
                <div className="max-w-2xl mx-auto space-y-4 animate-in slide-in-from-right-8 duration-300">
                    <button
                        onClick={() => { playSound('pop'); setDashboardMenu('MAIN'); }}
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 border border-blue-500/30 rounded-2xl text-[10px) font-black uppercase tracking-[0.2em] text-blue-400 hover:text-white hover:from-blue-600/40 hover:to-indigo-600/40 hover:border-blue-400/50 transition-all active:scale-95 mb-4 shadow-[0_0_20px_rgba(37,99,235,0.1)] backdrop-blur-xl group"
                    >
                        <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Back to Menu
                    </button>

                    <button
                        onClick={() => { playSound('click'); setIsRouteExplorerOpen(true); }}
                        className="w-full relative group overflow-hidden bg-slate-900/40 backdrop-blur-3xl border border-white/10 p-3.5 sm:p-4 rounded-2xl hover:border-indigo-500/30 transition-all active:scale-95"
                    >
                        <div className="flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                                    <Compass size={20} />
                                </div>
                                <div className="text-left">
                                    <h3 className="text-base font-black text-white uppercase">Route Explorer</h3>
                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Interactive Map</p>
                                </div>
                            </div>
                            <ArrowLeft size={16} className="rotate-180 text-slate-600 group-hover:text-white transition-colors" />
                        </div>
                    </button>

                    <button
                        onClick={() => setView('SUMMARY_LIST')}
                        className="w-full relative group overflow-hidden bg-slate-900/40 backdrop-blur-3xl border border-white/10 p-4 sm:p-5 rounded-3xl hover:border-cyan-500/30 transition-all active:scale-95"
                    >
                        <div className="flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 border border-cyan-500/20">
                                    <BarChart3 size={20} />
                                </div>
                                <div className="text-left">
                                    <h3 className="text-base font-black text-white uppercase">Salesman Summary</h3>
                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Active Collections</p>
                                </div>
                            </div>
                            <ArrowLeft size={16} className="rotate-180 text-slate-600 group-hover:text-white transition-colors" />
                        </div>
                    </button>

                    <button
                        onClick={() => setView('LEADERBOARD')}
                        className="w-full relative group overflow-hidden bg-slate-900/40 backdrop-blur-3xl border border-white/10 p-4 sm:p-5 rounded-3xl hover:border-amber-500/30 transition-all active:scale-95"
                    >
                        <div className="flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
                                    <Trophy size={20} />
                                </div>
                                <div className="text-left">
                                    <h3 className="text-base font-black text-white uppercase tracking-tight">Salesman Rankings</h3>
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Gamification & Badges</p>
                                </div>
                            </div>
                            <ArrowLeft size={16} className="rotate-180 text-slate-600 group-hover:text-white transition-colors" />
                        </div>
                    </button>

                    <button
                        onClick={() => setView('PERFORMANCE')}
                        className="w-full relative group overflow-hidden bg-slate-900/40 backdrop-blur-3xl border border-white/10 p-4 sm:p-5 rounded-3xl hover:border-blue-500/30 transition-all active:scale-95"
                    >
                        <div className="flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                                    <TrendingUp size={20} />
                                </div>
                                <div className="text-left">
                                    <h3 className="text-base font-black text-white uppercase">Performance</h3>
                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Growth & Trends</p>
                                </div>
                            </div>
                            <ArrowLeft size={16} className="rotate-180 text-slate-600 group-hover:text-white transition-colors" />
                        </div>
                    </button>
                </div>
            )}
        </div>
    );
};

const PendingApprovalsView = ({ allPayments, pendingUpdates, handleMarkReflected, handleApprovePayment, handleRejectPayment, handleApprovePhoneUpdate, handleRejectPhoneUpdate, setView, approvingId, playSound }) => {
    const [isResetting, setIsResetting] = useState(false);
    const [selectedSalesmanId, setSelectedSalesmanId] = useState(null);

    const pending = allPayments.filter(p => (p.status || '').toLowerCase() === 'pending');
    const approved = allPayments.filter(p => (p.status || '').toLowerCase() === 'approved');

    const groupPending = pending.reduce((acc, p) => {
        const sid = (p.salesman || 'Unknown').trim().toUpperCase();
        if (!acc[sid]) acc[sid] = { name: sid, total: 0, items: [] };
        acc[sid].total += Number(p.amount || 0);
        acc[sid].items.push(p);
        return acc;
    }, {});

    const groupApproved = approved.reduce((acc, p) => {
        const sid = (p.salesman || 'Unknown').trim().toUpperCase();
        if (!acc[sid]) acc[sid] = { name: sid, total: 0, items: [] };
        acc[sid].total += Number(p.amount || 0);
        acc[sid].items.push(p);
        return acc;
    }, {});

    if (selectedSalesmanId) {
        const isApprovedList = selectedSalesmanId.startsWith('approved_');
        const sid = isApprovedList ? selectedSalesmanId.replace('approved_', '') : selectedSalesmanId;
        const group = isApprovedList ? groupApproved[sid] : groupPending[sid];

        if (!group) {
            setSelectedSalesmanId(null);
            return null;
        }

        return (
            <div className="space-y-6 animate-fade-in pb-20 max-w-2xl mx-auto">
                <div className="flex items-center gap-4 mb-6">
                    <button onClick={() => { playSound('pop'); setSelectedSalesmanId(null); }} className="p-2.5 bg-white/5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/10 active:scale-95 transition-all shadow-lg backdrop-blur-md">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-0.5">Viewing Items for</p>
                        <h3 className="text-lg font-black text-white uppercase tracking-tight">{sid}</h3>
                    </div>
                </div>
                <div className="space-y-2">
                    {group.items.sort((a, b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0)).map(p => (
                        <div key={p.id} className={`bg-slate-900/40 backdrop-blur-3xl p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-white/10 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 group shadow-lg relative overflow-hidden transition-all duration-300 ${approvingId === p.id ? 'animate-approve' : ''}`}>
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2 mb-1.5 text-slate-500 font-bold uppercase tracking-widest text-[8px]">
                                    <span className="bg-white/5 px-1.5 py-0.5 rounded-md">{formatDateShort(p.timestamp)}</span>
                                    <div className="w-1 h-1 rounded-full bg-slate-800"></div>
                                    <span className={isApprovedList ? 'line-through' : ''}>Bill: {p.bill_no || 'N/A'}</span>
                                    {p.route && (
                                        <>
                                            <div className="w-1 h-1 rounded-full bg-slate-800"></div>
                                            <span className="text-blue-400/70">{p.route}</span>
                                        </>
                                    )}
                                </div>
                                <p className={`font-black text-base sm:text-lg tracking-tight leading-tight uppercase mb-2 ${isApprovedList ? 'text-slate-400 line-through' : 'text-slate-100'}`}>
                                    {p.party}
                                </p>
                                <div className="flex items-center gap-3">
                                    {getPaymentBadge(p.payment_type)}
                                </div>
                            </div>

                            <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 border-t sm:border-t-0 border-white/5 pt-3 sm:pt-0 shrink-0">
                                <div className="text-right">
                                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5 sm:hidden">Amount</p>
                                    <p className={`text-xl font-black tracking-tighter italic ${isApprovedList ? 'text-slate-500' : 'text-white'}`}>
                                        ₹{Number(p.amount || 0).toLocaleString('en-IN')}
                                    </p>
                                </div>

                                {isApprovedList ? (
                                    <button onClick={() => handleMarkReflected(p.id, p.amount)} className="bg-white/5 text-slate-400 border border-white/10 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all active:scale-95">Mark in Tally</button>
                                ) : (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleRejectPayment(p.id)}
                                            className="bg-red-500/10 text-red-400 border border-red-500/20 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all active:scale-95"
                                        >
                                            Reject
                                        </button>
                                        <button
                                            onClick={() => handleApprovePayment(p.id, p.amount, group.name)}
                                            className="bg-orange-500 text-white px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 active:scale-95"
                                        >
                                            Approve
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in pb-20 max-w-2xl mx-auto">
            <div className="flex items-center gap-4 mb-2">
                <button onClick={() => setView('DASHBOARD')} className="p-2.5 bg-white/5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/10 transition-all shadow-lg active:scale-95">
                    <ArrowLeft size={20} />
                </button>
                <div className="flex-1 text-center pr-10">
                    <h3 className="text-xs font-black text-orange-500 uppercase tracking-[0.4em]">Approvals & Verification</h3>
                </div>
            </div>

            <div className="space-y-8">
                {/* Profile Verifications Section */}
                {pendingUpdates && pendingUpdates.length > 0 && (
                    <section>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="h-px flex-1 bg-white/5"></div>
                            <h4 className="text-[8px] font-black text-blue-500/60 uppercase tracking-[0.3em]">Mobile Number Verifications</h4>
                            <div className="h-px flex-1 bg-white/5"></div>
                        </div>
                        <div className="space-y-3">
                            {pendingUpdates.map(update => (
                                <div key={update.id} className={`bg-slate-900/40 backdrop-blur-3xl p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-white/10 flex flex-col gap-3 shadow-lg relative overflow-hidden transition-all duration-300 ${approvingId === update.id ? 'animate-approve' : ''}`}>
                                    <div className="flex justify-between items-start">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest truncate">{update.salesman_name || update.salesman_id}</p>
                                                <div className="px-1.5 py-0.5 bg-blue-500/10 rounded border border-blue-500/20 text-[6px] font-black text-blue-400 uppercase tracking-widest">REQ</div>
                                            </div>
                                            <h4 className="font-black text-base text-white uppercase tracking-tight truncate">{update.party}</h4>
                                        </div>
                                        <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shrink-0">
                                            <Smartphone size={18} className="text-blue-400" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
                                            <p className="text-[6px] font-black text-slate-500 uppercase tracking-widest mb-1">Current</p>
                                            <p className="text-xs font-bold text-slate-400 line-through truncate">{update.old_value || '0000000000'}</p>
                                        </div>
                                        <div className="bg-blue-500/5 p-2.5 rounded-xl border border-blue-500/10">
                                            <p className="text-[6px] font-black text-blue-400 uppercase tracking-widest mb-1">Requested</p>
                                            <p className="text-xs font-black text-white italic truncate">{update.new_value}</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleRejectPhoneUpdate(update.id)}
                                            className="flex-1 bg-red-500/10 text-red-400 border border-red-500/20 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all active:scale-95"
                                        >
                                            Reject
                                        </button>
                                        <button
                                            onClick={() => handleApprovePhoneUpdate(update)}
                                            className="flex-1 bg-blue-500 text-white py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                                        >
                                            Approve
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                <section>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="h-px flex-1 bg-white/5"></div>
                        <h4 className="text-[7px] font-black text-orange-500/60 uppercase tracking-[0.3em]">Payment Approvals</h4>
                        <div className="h-px flex-1 bg-white/5"></div>
                    </div>
                    <div className="space-y-2">
                        {Object.values(groupPending).length > 0 ? (
                            Object.values(groupPending).sort((a, b) => b.total - a.total).map(group => (
                                <button key={group.name} onClick={() => { playSound('click'); setSelectedSalesmanId(group.name); }} className="w-full bg-slate-900/40 backdrop-blur-3xl p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-white/10 flex justify-between items-center group shadow-lg hover:border-orange-500/30 hover:bg-white/[0.05] transition-all active:scale-[0.99]">
                                    <div className="flex items-center gap-4 text-left">
                                        <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-400 border border-orange-500/20 group-hover:scale-110 transition-transform"><Users size={18} /></div>
                                        <div>
                                            <p className="text-slate-100 font-black text-sm tracking-tight leading-tight uppercase group-hover:text-orange-400 transition-colors">{group.name}</p>
                                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{group.items.length} Pending Collections</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-black text-white tracking-tighter italic group-hover:scale-110 origin-right transition-transform">₹{group.total.toLocaleString('en-IN')}</p>
                                    </div>
                                </button>
                            ))
                        ) : (
                            <div className="bg-white/5 rounded-[2rem] p-10 text-center border border-white/5">
                                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">No pending payments</p>
                            </div>
                        )}
                    </div>
                </section>

                {Object.values(groupApproved).length > 0 && (
                    <section>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="h-px flex-1 bg-white/5"></div>
                            <h4 className="text-[8px] font-black text-emerald-500/60 uppercase tracking-[0.3em]">Floating Deductions (Approved)</h4>
                            <div className="h-px flex-1 bg-white/5"></div>
                        </div>
                        <div className="space-y-2">
                            {Object.values(groupApproved).sort((a, b) => b.total - a.total).map(group => (
                                <button key={group.name} onClick={() => { playSound('click'); setSelectedSalesmanId('approved_' + group.name); }} className="w-full bg-slate-900/40 backdrop-blur-3xl p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-white/10 flex justify-between items-center group shadow-lg opacity-80 hover:opacity-100 hover:border-emerald-500/30 hover:bg-white/[0.05] transition-all active:scale-[0.99]">
                                    <div className="flex items-center gap-4 text-left">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20 group-hover:scale-110 transition-transform"><ShieldCheck size={18} /></div>
                                        <div>
                                            <p className="text-slate-100 font-black text-sm tracking-tight leading-tight uppercase group-hover:text-emerald-400 transition-colors">{group.name}</p>
                                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{group.items.length} Approved Items</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-black text-white tracking-tighter italic group-hover:scale-110 origin-right transition-transform">₹{group.total.toLocaleString('en-IN')}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
};

const SalesmanSummaryView = ({ groupedCollections, searchTerm, setSearchTerm, setView, handleApprovePayment, handleRejectPayment, playSound }) => (
    <div className="space-y-6 animate-fade-in pb-20 max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-2">
            <button onClick={() => { playSound('pop'); setView('DASHBOARD'); }} className="p-2.5 bg-white/5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/10 transition-all shadow-lg active:scale-95">
                <ArrowLeft size={20} />
            </button>
            <h3 className="text-sm font-black text-[#60A5FA] uppercase tracking-[0.3em]">SALESMAN SUMMARY</h3>
        </div>
        <div className="relative group mx-0">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-[#60A5FA] transition-colors" size={16} />
            <input
                type="text"
                placeholder="Search salesman..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-6 text-sm font-bold text-white placeholder-slate-700 outline-none focus:border-[#60A5FA]/50 transition-all"
            />
        </div>
        <div className="space-y-4">
            {Object.entries(groupedCollections).map(([company, collections]) => (
                collections.map((group) => (
                    <CollectionMasterRow
                        key={group.id}
                        group={group}
                        onApprove={handleApprovePayment}
                        onReject={handleRejectPayment}
                        searchTerm={searchTerm}
                    />
                ))
            ))}
        </div>
    </div>
);

function CollectionMasterRow({ group, onApprove, onReject, searchTerm }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [activeTab, setActiveTab] = useState('portfolio');
    const [logSearch, setLogSearch] = useState('');

    const calculateDaysOld = (dateStr) => {
        if (!dateStr) return 0;
        try {
            let date;
            if (dateStr.includes('-')) {
                const parts = dateStr.split('-');
                if (parts.length === 3) date = new Date(parts[2], parts[1] - 1, parts[0]);
                else date = new Date(dateStr);
            } else if (dateStr.includes('/')) {
                const parts = dateStr.split('/');
                if (parts.length === 3) date = new Date(parts[2], parts[1] - 1, parts[0]);
                else date = new Date(dateStr);
            } else date = new Date(dateStr);
            if (isNaN(date.getTime())) return 0;
            const diff = new Date() - date;
            return Math.floor(diff / (1000 * 60 * 60 * 24));
        } catch (e) { return 0; }
    };

    return (
        <div className={`transition-all duration-500 mb-3 ${isExpanded ? 'scale-[1.01]' : ''}`}>
            <div onClick={() => setIsExpanded(!isExpanded)} className={`w-full p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-900/40 backdrop-blur-3xl border transition-all duration-300 cursor-pointer relative overflow-hidden group ${isExpanded ? 'border-[#60A5FA]/40 ring-1 ring-[#60A5FA]/10' : 'border-white/10 hover:border-white/20 shadow-lg hover:bg-white/5'}`}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#60A5FA]/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="flex items-center gap-4 relative z-10">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20 shadow-lg shrink-0 group-hover:scale-110 transition-transform">
                        <Users size={18} />
                    </div>
                    <div className="flex-1 min-w-0 pr-10">
                        <div className="text-left mb-2">
                            <div className="flex items-center gap-2 mb-1">
                                <h4 className="text-sm font-black text-white uppercase tracking-wider truncate">
                                    {group.name}
                                </h4>
                                <span className="px-2 py-0.5 bg-blue-500/20 border border-blue-500/30 rounded text-[9px] text-blue-400 font-black shrink-0">
                                    #{group.rank}
                                </span>
                            </div>
                            <div className="flex flex-col gap-1.5 pt-1">
                                <span className="flex items-center gap-1.5 text-[9px] text-slate-500 font-bold uppercase tracking-[0.1em]">
                                    <MapPin size={10} className="text-[#60A5FA]" />
                                    Route Plan: <span className="text-slate-300 font-black tracking-widest ml-1">{group.scheduledRoute}</span>
                                </span>
                                {(() => {
                                    const routeDue = group.routeOutstanding || 0;
                                    const routeBills = (group.outstandingBills || [])
                                        .filter(b => (b.Route || '').trim().toUpperCase() === (group.scheduledRoute || '').trim().toUpperCase());
                                    const routeBillNos = routeBills.map(b => String(b['Bill No'] || b.bill_no || b.BillNo || '').trim()).filter(Boolean);
                                    const routeParties = [...new Set(routeBills.map(b => (b.Party || '').trim().toUpperCase()))];

                                    // Payments matching by bill_no
                                    const billMatched = (group.payments || [])
                                        .filter(p => routeBillNos.includes(String(p.bill_no || '').trim()))
                                        .reduce((s, p) => s + Number(p.amount || 0), 0);

                                    // Payments NOT matching any bill_no but fuzzy-matching route party names
                                    const hdrUnmatched = (group.payments || []).filter(p => {
                                        const pBillNo = String(p.bill_no || '').trim();
                                        return !pBillNo || !routeBillNos.includes(pBillNo);
                                    });
                                    const partyMatched = hdrUnmatched
                                        .filter(p => {
                                            const pParty = (p.party || '').trim().toUpperCase();
                                            return routeParties.some(rp => rp.includes(pParty) || pParty.includes(rp));
                                        })
                                        .reduce((s, p) => s + Number(p.amount || 0), 0);

                                    const routeCollected = billMatched + partyMatched;
                                    const routeBalance = routeDue - routeCollected;
                                    return (
                                        <>
                                            <span className="flex items-center gap-1.5 text-[9px] text-slate-500 font-bold uppercase tracking-[0.1em]">
                                                <Wallet size={10} className="text-amber-500" />
                                                Route Due: <span className="text-amber-400 font-black tracking-widest ml-1">₹{routeDue.toLocaleString('en-IN')}</span>
                                                <span className="text-emerald-400 font-black ml-2">Coll: ₹{routeCollected.toLocaleString('en-IN')}</span>
                                                <span className="text-blue-400 font-black ml-2">Bal: ₹{routeBalance.toLocaleString('en-IN')}</span>
                                            </span>
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                    <div className={`absolute top-0 right-0 w-8 h-8 rounded-full flex items-center justify-center transition-all ${isExpanded ? 'rotate-180 bg-[#60A5FA]/20 text-[#60A5FA]' : 'bg-white/5 text-slate-600'}`}>
                        <ChevronDown size={16} />
                    </div>
                </div>
                <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-start gap-4 relative z-10">
                    <SalesmanMiniStat icon={<Banknote size={12} />} label="Cash" amount={group.cash} color="text-emerald-400" />
                    <SalesmanMiniStat icon={<Smartphone size={12} />} label="UPI" amount={group.upi} color="text-sky-400" />
                    <SalesmanMiniStat icon={<Landmark size={12} />} label="Cheq" amount={group.cheque} color="text-purple-400" />
                    <div className="ml-auto text-right">
                        <span className="text-[13px] font-black text-white italic">₹{group.total.toLocaleString('en-IN')}</span>
                    </div>
                </div>
            </div>

            {
                isExpanded && (
                    <div className="px-6 md:px-10 pb-10 animate-in slide-in-from-top-4 duration-500">
                        <div className="bg-slate-900/80 backdrop-blur-3xl border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl">
                            <div className="bg-slate-950/40 p-1.5 flex gap-1 border-b border-white/5">
                                <button onClick={() => React.startTransition(() => setActiveTab('portfolio'))} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'portfolio' ? 'bg-[#60A5FA] text-white' : 'text-slate-500 hover:bg-white/5'}`}>Route Bills</button>
                                <button onClick={() => React.startTransition(() => setActiveTab('log'))} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'log' ? 'bg-[#60A5FA] text-white' : 'text-slate-500 hover:bg-white/5'}`}>Activity Log ({group.payments?.length || 0})</button>
                            </div>

                            {activeTab === 'portfolio' ? (
                                <div className="p-4 space-y-1">
                                    <div className="flex items-center justify-between mb-2 px-1">
                                        <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">{group.scheduledRoute} - Bills</span>
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] font-black text-amber-400 tabular-nums">₹{(group.outstandingBills || []).filter(b => (b.Route || '').trim().toUpperCase() === (group.scheduledRoute || '').trim().toUpperCase()).reduce((sum, b) => sum + Number(b.Amount || b.amount || b.Balance || 0), 0).toLocaleString('en-IN')}</span>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    // Generate JPEG of route bills
                                                    const routeBills = (group.outstandingBills || [])
                                                        .filter(b => (b.Route || '').trim().toUpperCase() === (group.scheduledRoute || '').trim().toUpperCase());
                                                    const todayP = group.payments || [];
                                                    const dlBillNos = routeBills.map(b => String(b['Bill No'] || b.bill_no || b.BillNo || '').trim()).filter(Boolean);
                                                    const dlUnmatched = todayP.filter(p => { const bn = String(p.bill_no || '').trim(); return !bn || !dlBillNos.includes(bn); });
                                                    // Fuzzy match unmatched payments to route parties
                                                    const dlCombParties = {};
                                                    routeBills.forEach(b => {
                                                        const bp = (b.Party || b.party || '').trim().toUpperCase();
                                                        if (!bp || dlCombParties[bp] !== undefined) return;
                                                        const mp = dlUnmatched.filter(p => { const pp = (p.party || '').trim().toUpperCase(); return pp && (pp.includes(bp) || bp.includes(pp)); });
                                                        dlCombParties[bp] = mp.reduce((s, p) => s + Number(p.amount || 0), 0);
                                                    });

                                                    // Calculate party totals for Fully Paid logic
                                                    const dlPartyBillTotals = {};
                                                    routeBills.forEach(b => {
                                                        const p = (b.Party || b.party || '').trim().toUpperCase();
                                                        if (p) dlPartyBillTotals[p] = (dlPartyBillTotals[p] || 0) + Number(b.Amount || b.amount || b.Balance || 0);
                                                    });
                                                    const dlPartyTotalCollected = {};
                                                    Object.keys(dlPartyBillTotals).forEach(party => {
                                                        const payments = todayP.filter(p => {
                                                            const pParty = (p.party || '').trim().toUpperCase();
                                                            return pParty && (pParty.includes(party) || party.includes(pParty));
                                                        });
                                                        dlPartyTotalCollected[party] = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
                                                    });

                                                    const items = routeBills.map(bill => {
                                                        const billNo = bill['Bill No'] || bill.bill_no || bill.BillNo || '';
                                                        const party = bill.Party || bill.party || 'Unknown';
                                                        const dateStr = bill['Bill Date'] || bill.Date || '';
                                                        const amt = Number(bill.Amount || bill.amount || bill.Balance || 0);
                                                        const partyKey = party.trim().toUpperCase();

                                                        const billMatch = billNo ? todayP.find(p => String(p.bill_no).trim() === String(billNo).trim()) : null;

                                                        // Fully Paid Check (Party Level)
                                                        const totalDue = dlPartyBillTotals[partyKey] || 0;
                                                        const totalColl = dlPartyTotalCollected[partyKey] || 0;
                                                        const isPartyFullyPaid = totalDue > 0 && totalColl >= (totalDue - 10);

                                                        // Fully Paid Check (Specific Bill)
                                                        const isSpecificFullyPaid = billMatch && Number(billMatch.amount || 0) >= (amt - 10);

                                                        const paid = isSpecificFullyPaid || isPartyFullyPaid;

                                                        let paidAmt = 0;
                                                        if (billMatch) paidAmt = Number(billMatch.amount || 0);
                                                        else if (isPartyFullyPaid) paidAmt = totalColl;
                                                        else if (dlCombParties[partyKey] > 0) paidAmt = dlCombParties[partyKey];

                                                        return { party, dateStr, billNo, amt, paid, paidAmt };
                                                    }).sort((a, b) => {
                                                        if (a.paid === b.paid) {
                                                            return new Date(b.dateStr || 0) - new Date(a.dateStr || 0);
                                                        }
                                                        return a.paid ? 1 : -1;
                                                    });

                                                    const canvas = document.createElement('canvas');
                                                    const W = 800, rowH = 50, headerH = 100, footerH = 60;
                                                    const H = headerH + items.length * rowH + footerH;
                                                    canvas.width = W; canvas.height = H;
                                                    const ctx = canvas.getContext('2d');

                                                    // Background
                                                    ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, W, H);

                                                    // Header
                                                    ctx.fillStyle = '#1e293b'; ctx.fillRect(0, 0, W, headerH);
                                                    ctx.fillStyle = '#60a5fa'; ctx.font = 'bold 22px Arial';
                                                    ctx.fillText(`${group.name} - ${group.scheduledRoute}`, 20, 35);
                                                    ctx.fillStyle = '#94a3b8'; ctx.font = 'bold 14px Arial';
                                                    const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                                                    ctx.fillText(`Route Bills • ${today}`, 20, 60);
                                                    const total = items.reduce((s, i) => s + i.amt, 0);
                                                    const collected = items.filter(i => i.paid).reduce((s, i) => s + i.paidAmt, 0);
                                                    ctx.fillStyle = '#f59e0b'; ctx.font = 'bold 16px Arial';
                                                    ctx.fillText(`Due: ₹${total.toLocaleString('en-IN')}`, 20, 88);
                                                    ctx.fillStyle = '#10b981';
                                                    ctx.fillText(`Collected: ₹${collected.toLocaleString('en-IN')}`, 250, 88);
                                                    ctx.fillStyle = '#60a5fa';
                                                    ctx.fillText(`Balance: ₹${(total - collected).toLocaleString('en-IN')}`, 520, 88);

                                                    // Rows
                                                    items.forEach((item, i) => {
                                                        const y = headerH + i * rowH;
                                                        ctx.fillStyle = item.paid ? '#064e3b' : (i % 2 === 0 ? '#0f172a' : '#1e293b');
                                                        ctx.fillRect(0, y, W, rowH);
                                                        // Left border
                                                        ctx.fillStyle = item.paid ? '#10b981' : '#334155';
                                                        ctx.fillRect(0, y, 4, rowH);
                                                        // Shop name
                                                        ctx.fillStyle = item.paid ? '#6ee7b7' : '#e2e8f0';
                                                        ctx.font = 'bold 14px Arial';
                                                        ctx.fillText(item.party.substring(0, 40), 16, y + 22);
                                                        // Date & Bill No
                                                        ctx.fillStyle = '#64748b'; ctx.font = '11px Arial';
                                                        ctx.fillText(`${item.dateStr}  #${item.billNo}${item.paid ? '  ✓ ₹' + item.paidAmt.toLocaleString('en-IN') : ''}`, 16, y + 40);
                                                        // Amount
                                                        ctx.fillStyle = item.paid ? '#6ee7b7' : '#ffffff';
                                                        ctx.font = 'bold 16px Arial';
                                                        const amtStr = '₹' + item.amt.toLocaleString('en-IN');
                                                        ctx.fillText(amtStr, W - ctx.measureText(amtStr).width - 20, y + 30);
                                                    });

                                                    // Footer
                                                    const fy = headerH + items.length * rowH;
                                                    ctx.fillStyle = '#1e293b'; ctx.fillRect(0, fy, W, footerH);
                                                    ctx.fillStyle = '#475569'; ctx.font = 'bold 11px Arial';
                                                    ctx.fillText('JARWIS PRO • Route Collection Report', 20, fy + 35);

                                                    canvas.toBlob((blob) => {
                                                        const url = URL.createObjectURL(blob);
                                                        const a = document.createElement('a');
                                                        a.href = url;
                                                        a.download = `${group.name}_${group.scheduledRoute}_${new Date().toLocaleDateString('en-IN').replace(/\//g, '-')}.jpg`;
                                                        a.click();
                                                        URL.revokeObjectURL(url);
                                                    }, 'image/jpeg', 0.95);
                                                }}
                                                className="p-1.5 bg-indigo-500/20 border border-indigo-500/30 rounded-lg text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all active:scale-95"
                                                title="Download as JPEG"
                                            >
                                                <Download size={12} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="divide-y divide-white/[0.04] max-h-[350px] overflow-y-auto rounded-xl border border-white/5">
                                        {(() => {
                                            const routeBills = (group.outstandingBills || [])
                                                .filter(b => (b.Route || '').trim().toUpperCase() === (group.scheduledRoute || '').trim().toUpperCase());
                                            if (routeBills.length === 0) return <p className="text-center text-[10px] font-bold text-slate-600 uppercase py-6">No Bills on This Route</p>;

                                            const todayPayments = group.payments || [];

                                            // Collect ALL bill numbers on this route
                                            const allRouteBillNos = routeBills.map(b =>
                                                String(b['Bill No'] || b.bill_no || b.BillNo || '').trim()
                                            ).filter(Boolean);

                                            // Find payments where bill_no does NOT match any route bill (combined/general payments)
                                            const unmatchedPayments = todayPayments.filter(p => {
                                                const pBillNo = String(p.bill_no || '').trim();
                                                return !pBillNo || !allRouteBillNos.includes(pBillNo);
                                            });

                                            // Group bills by party to calc totals
                                            const partyBillTotals = {};
                                            routeBills.forEach(b => {
                                                const p = (b.Party || b.party || '').trim().toUpperCase();
                                                if (p) partyBillTotals[p] = (partyBillTotals[p] || 0) + Number(b.Amount || b.amount || b.Balance || 0);
                                            });

                                            // Calculate total collected per party (ALL payments)
                                            const partyTotalCollected = {};
                                            Object.keys(partyBillTotals).forEach(party => {
                                                const payments = todayPayments.filter(p => {
                                                    const pParty = (p.party || '').trim().toUpperCase();
                                                    return pParty && (pParty.includes(party) || party.includes(pParty));
                                                });
                                                partyTotalCollected[party] = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
                                            });

                                            // Calculate unmatched/general payments per party for partial credit
                                            const partyCombinedAmounts = {};
                                            routeBills.forEach(b => {
                                                const party = (b.Party || b.party || '').trim().toUpperCase();
                                                if (!party || partyCombinedAmounts[party] !== undefined) return;
                                                const matchingPayments = unmatchedPayments.filter(p => {
                                                    const pParty = (p.party || '').trim().toUpperCase();
                                                    return pParty && (pParty.includes(party) || party.includes(pParty));
                                                });
                                                partyCombinedAmounts[party] = matchingPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
                                            });

                                            // Enrich bills with payment info
                                            const enriched = routeBills.map(bill => {
                                                const billNo = bill['Bill No'] || bill.bill_no || bill.BillNo || '';
                                                const party = bill.Party || bill.party || 'Unknown';
                                                const partyKey = party.trim().toUpperCase();

                                                // 1. Exact bill_no match (targeted payment)
                                                const billMatch = billNo ? todayPayments.find(p =>
                                                    String(p.bill_no).trim() === String(billNo).trim()
                                                ) : null;

                                                // 2. Combined/general payment for this party
                                                // Check if Party is FULLY PAID (Total Collected >= Total Due)
                                                const totalDue = partyBillTotals[partyKey] || 0;
                                                const totalColl = partyTotalCollected[partyKey] || 0;
                                                const isPartyFullyPaid = totalDue > 0 && totalColl >= (totalDue - 10);

                                                // 3. Specific Fully Paid
                                                const amt = Number(bill.Amount || bill.amount || 0);
                                                const isSpecificFullyPaid = billMatch && Number(billMatch.amount || 0) >= (amt - 10);

                                                // 4. Any payment (for badge)
                                                const hasCombinedPayment = partyCombinedAmounts[partyKey] > 0;

                                                // Only Green if FULLY paid
                                                const hasPaid = isSpecificFullyPaid || isPartyFullyPaid;

                                                // Calculate collected amount for display
                                                let collectedAmount = 0;
                                                if (billMatch) collectedAmount = Number(billMatch.amount || 0);
                                                else if (isPartyFullyPaid) collectedAmount = totalColl;
                                                else if (hasCombinedPayment) collectedAmount = partyCombinedAmounts[partyKey];

                                                return { ...bill, billNo, party, hasPaid, collectedAmount };
                                            });

                                            // Sort: unpaid first, then by date desc
                                            enriched.sort((a, b) => {
                                                if (a.hasPaid === b.hasPaid) {
                                                    return new Date(b['Bill Date'] || b.Date || 0) - new Date(a['Bill Date'] || a.Date || 0);
                                                }
                                                return a.hasPaid ? 1 : -1;
                                            });

                                            return enriched.map((bill, idx) => {
                                                const dateStr = bill['Bill Date'] || bill.Date || '';
                                                const amount = Number(bill.Amount || bill.amount || bill.Balance || 0);
                                                return (
                                                    <div key={idx} className={`px-4 py-2.5 flex items-center justify-between transition-colors ${bill.hasPaid ? 'bg-emerald-500/10' : 'hover:bg-white/[0.02]'}`}>
                                                        <div className="flex-1 min-w-0">
                                                            <p className={`text-[10px] font-black uppercase tracking-tight leading-snug truncate ${bill.hasPaid ? 'text-emerald-400' : 'text-white'}`}>{bill.party}</p>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <span className="text-[8px] text-slate-500 font-bold">{dateStr}</span>
                                                                {bill.billNo && <span className="text-[8px] text-slate-600 font-bold">#{bill.billNo}</span>}
                                                                {bill.collectedAmount > 0 && <span className="text-[7px] font-black text-emerald-500 uppercase tracking-widest">✓ ₹{bill.collectedAmount.toLocaleString('en-IN')}</span>}
                                                            </div>
                                                        </div>
                                                        <p className={`text-xs font-black tabular-nums tracking-tight shrink-0 ${bill.hasPaid ? 'text-emerald-400' : 'text-white'}`}>₹{amount.toLocaleString('en-IN')}</p>
                                                    </div>
                                                );
                                            });
                                        })()}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-0">
                                    <div className="bg-slate-950/60 px-8 py-4 border-b border-white/5 flex flex-col md:flex-row gap-4 items-center">
                                        <div className="relative flex-1 group w-full">
                                            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
                                            <input type="text" placeholder="Search Party or Bill No..." value={logSearch} onChange={(e) => setLogSearch(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-11 pr-4 text-[11px] font-bold text-white placeholder-slate-700 outline-none" />
                                        </div>
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Showing {group.payments?.length || 0} Entries</span>
                                    </div>
                                    <div className="divide-y divide-white/[0.04] max-h-[400px] overflow-y-auto">
                                        {(group.payments || []).filter(p => !logSearch || p.party.toLowerCase().includes(logSearch.toLowerCase()) || String(p.bill_no).includes(logSearch)).map((p, idx) => (
                                            <div key={idx} className="px-8 py-6 flex flex-row justify-between items-start hover:bg-white/[0.01] transition-colors gap-6">
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-black text-base text-white uppercase tracking-tight italic leading-snug mb-2">{p.party}</p>
                                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{formatDateShort(p.timestamp)}</span>
                                                        <div className="w-1 h-1 rounded-full bg-slate-800"></div>
                                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">INV: {p.bill_no || 'N/A'}</span>
                                                        {p.cheque_date && (
                                                            <>
                                                                <div className="w-1 h-1 rounded-full bg-amber-500/50"></div>
                                                                <span className="text-[9px] font-black uppercase tracking-widest text-amber-500">
                                                                    DUE: {new Date(p.cheque_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end shrink-0 pt-1">
                                                    <div className="flex items-center gap-3">
                                                        <p className="text-xl font-black text-[#60A5FA] tracking-tighter mb-2">₹{Number(p.amount).toLocaleString('en-IN')}</p>
                                                        <button onClick={(e) => { e.stopPropagation(); onReject(p.id); }} className="text-slate-600 hover:text-red-500 p-2"><Trash2 size={16} /></button>
                                                    </div>
                                                    {getPaymentBadge(p.payment_type)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="bg-slate-900 border-t border-white/5 px-4 sm:px-8 py-5 flex items-center justify-between gap-2">
                                <div className="flex flex-wrap gap-2 sm:gap-4 flex-1">
                                    <DetailTotalMinimal label="Cash" amount={group.cash} icon="💵" />
                                    <DetailTotalMinimal label="UPI" amount={group.upi} icon="📱" />
                                    <DetailTotalMinimal label="Cheq" amount={group.cheque} icon="🏦" />
                                </div>
                                <div className="text-right shrink-0">
                                    <span className="text-[9px] font-black text-[#60A5FA] uppercase tracking-widest mb-1 block opacity-60">Total</span>
                                    <span className="text-lg sm:text-2xl font-black text-white italic truncate">₹{group.total.toLocaleString('en-IN')}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}

function GlobalStatMinimal({ label, amount, icon }) {
    return (
        <div className="flex items-center gap-1.5 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center border border-white/5 shadow-inner">{icon}</div>
            <div className="flex flex-col">
                <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest leading-none mb-0.5">{label}</span>
                <span className="text-xs font-black text-white tracking-tighter">₹{amount.toLocaleString('en-IN')}</span>
            </div>
        </div>
    );
}

function DetailTotalMinimal({ label, amount, icon }) {
    if (amount === 0) return null;
    return (
        <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
            <span className="text-xs">{icon}</span>
            <div className="flex flex-col">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none">{label}</span>
                <span className="text-[11px] font-black text-white">₹{amount.toLocaleString('en-IN')}</span>
            </div>
        </div>
    );
}

function SalesmanMiniStat({ icon, label, amount, color }) {
    if (amount === 0) return null;
    return (
        <div className="flex items-center gap-1.5">
            <span className={color}>{icon}</span>
            <span className={`text-[10px] font-black ${color} tracking-tight`}>₹{amount.toLocaleString('en-IN')}</span>
        </div>
    );
}
