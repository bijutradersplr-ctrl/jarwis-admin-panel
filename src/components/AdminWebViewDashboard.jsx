import React, { useMemo } from 'react';
import {
    LogOut, Wallet, FileText, RefreshCw, TrendingUp, Compass, ArrowRight, Check, MapPin, Zap, AlertCircle, Smartphone,
    ShieldCheck, Clock, Settings, Users, BarChart3, Bell, Trophy, LayoutDashboard, Banknote, Landmark, UploadCloud
} from 'lucide-react';

import RemindersView from './RemindersView';

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
    (salesmenData || []).forEach(salesman => {
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
    (allPayments || []).forEach(p => {
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
                const paymentRoute = normalizeRoute(p.route || p.Route);

                // Only count collections made on the route assigned for today
                if (targetRoute && paymentRoute === targetRoute) {
                    collectedValue += Number(p.amount || 0);
                }
            }
        }
    });

    return { collectedValue, remainingValue: Math.max(0, totalLiability - collectedValue), totalLiability };
};

export default function AdminWebViewDashboard({
    allPayments,
    salesmenData,
    stats,
    reactiveTargets,
    masterPlans,
    topPerformers,
    view,
    setView,
    dashboardMenu,
    setDashboardMenu,
    handleLogout,
    fetchData,
    playSound,
    isRefreshing,
    viewMode,
    setViewMode,
    fetchError,
    setSelectedCompanyData,
    setIsCompanyModalOpen,
    setIsOutstandingModalOpen,
    setIsChequeModalOpen,
    setIsRouteExplorerOpen,
    setIsDataManagerOpen,
    setIsTodayOutstandingModalOpen,
    renderSubView
}) {

    const pendingCount = useMemo(() =>
        allPayments.filter(p => (p.status || '').toLowerCase() !== 'approved' && !p.is_delivery).length
        , [allPayments]);

    const deliveryPendingCount = useMemo(() =>
        allPayments.filter(p => (p.status || '').toLowerCase() === 'pending' && p.is_delivery).length
        , [allPayments]);

    // Calculate all unique active companies
    const activeCompanies = useMemo(() => {
        const companies = new Set();
        Object.values(masterPlans).forEach((plan) => {
            const company = plan?.company || plan?.Company;
            if (company && company !== 'Other') {
                companies.add(company);
            }
        });
        return Array.from(companies);
    }, [masterPlans]);

    // OPTIMIZED: Memoize route stats to fix 4s INP
    const routeStats = useMemo(() =>
        getTodayRouteStats(salesmenData, masterPlans, allPayments),
        [salesmenData, masterPlans, allPayments]);

    const companyConfigs = {
        'Cadbury': { color: 'from-purple-600 via-indigo-500 to-blue-500', glow: 'rgba(79,70,229,0.4)', text: 'text-purple-400' },
        'Britannia': { color: 'from-red-600 via-rose-500 to-orange-500', glow: 'rgba(225,29,72,0.4)', text: 'text-red-500' },
        'Colgate': { color: 'from-emerald-600 via-teal-500 to-cyan-500', glow: 'rgba(20,184,166,0.4)', text: 'text-emerald-400' }
    };

    const sidebarLinks = [
        { label: 'Dashboard', icon: LayoutDashboard, view: 'DASHBOARD', menu: 'MAIN' },
        { label: 'Pending Approvals', icon: Clock, view: 'PENDING_APPROVALS', menu: 'MAIN', badge: pendingCount, color: 'orange' },
        { label: 'Delivery Hub', icon: Smartphone, view: 'DELIVERY_HUB', menu: 'MAIN', badge: deliveryPendingCount, color: 'emerald' },
        { label: 'Reports', icon: TrendingUp, view: 'DASHBOARD', menu: 'REPORTS' },
        { label: 'Master Settings', icon: Settings, view: 'DASHBOARD', menu: 'MASTER' }
    ];

    return (
        <div className="pl-64 min-h-screen overflow-y-auto bg-[#020617] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#020617] to-[#020617] text-slate-200">
            {fetchError && (
                <div className="fixed top-6 right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="bg-rose-500/10 backdrop-blur-xl border border-rose-500/20 px-6 py-4 rounded-3xl flex items-center gap-4 shadow-[0_20px_40px_rgba(225,29,72,0.2)]">
                        <div className="w-10 h-10 bg-rose-500 rounded-full flex items-center justify-center shadow-lg shadow-rose-500/20">
                            <AlertCircle size={20} className="text-white" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-0.5">System Alert</p>
                            <p className="text-sm font-bold text-rose-200">{fetchError}</p>
                        </div>
                    </div>
                </div>
            )}
            {/* Fixed Sidebar */}
            <div className="w-72 bg-[#020617]/80 backdrop-blur-3xl border-r border-white/5 flex flex-col h-screen fixed left-0 top-0 z-40 transition-all duration-300 shadow-[10px_0_30px_rgba(0,0,0,0.5)]">
                {/* Decorative glow in sidebar */}
                <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-blue-500/10 to-transparent pointer-events-none"></div>

                <div className="p-8 pb-6 shrink-0 flex items-center justify-center relative z-10">
                    <div className="flex flex-col items-center">
                        <div className="flex items-center gap-3 mb-3 relative group cursor-default">
                            <div className="relative bg-slate-900 p-2 rounded-xl border border-white/10 shadow-2xl">
                                <ShieldCheck size={24} className="text-blue-400" />
                            </div>
                            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400 italic tracking-tighter uppercase drop-shadow-lg">
                                JARWIS <span className="text-blue-500">PRO</span>
                            </h1>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
                            <p className="text-[10px] font-black text-blue-400/90 uppercase tracking-[0.4em]">
                                Admin Command
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-6 space-y-3 no-scrollbar mt-2 border-t border-white/5 relative z-10 w-full">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-5 pl-4 flex items-center gap-2">
                        <span className="w-4 h-[1px] bg-slate-700"></span>
                        Admin Controls
                    </p>

                    {sidebarLinks.map((link) => {
                        const isActive = link.view === view && (link.menu ? link.menu === dashboardMenu : true);
                        return (
                            <button
                                key={link.label}
                                onClick={() => {
                                    playSound('click');
                                    if (link.action === 'ROUTE_EXPLORER') {
                                        setIsRouteExplorerOpen(true);
                                        return;
                                    }
                                    setView(link.view);
                                    if (link.menu) setDashboardMenu(link.menu);
                                }}
                                className={`w-full relative overflow-hidden p-[1px] rounded-[1.25rem] shadow-lg transition-all duration-300 group
                                    ${isActive
                                        ? 'bg-gradient-to-r from-blue-500 via-blue-400 to-indigo-500 transform scale-[1.02]'
                                        : 'bg-white/5 hover:bg-white/10 active:scale-95'
                                    }`}
                            >
                                <div className={`p-4 relative z-10 flex items-center gap-4 rounded-[1.2rem] transition-colors duration-300
                                    ${isActive ? 'bg-slate-900/90' : 'bg-slate-800/40'}
                                `}>
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300
                                        ${isActive
                                            ? 'bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]'
                                            : 'bg-slate-800/80 border border-white/5'
                                        }`}>
                                        <link.icon size={20} className={`transition-colors duration-300 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-300'}`} />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <h3 className={`text-sm font-black tracking-tight uppercase transition-colors duration-300 ${isActive ? 'text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-indigo-200' : 'text-slate-300 group-hover:text-white'}`}>{link.label}</h3>
                                        {link.badge > 0 && (
                                            <span className={`inline-flex mt-1.5 px-2.5 py-0.5 text-[9px] font-black rounded-full border animate-pulse
                                                ${link.color === 'emerald'
                                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                                                    : 'bg-orange-500/10 text-orange-400 border-orange-500/30 shadow-[0_0_10px_rgba(249,115,22,0.2)]'
                                                }`}>
                                                {link.badge} ACTION{link.badge !== 1 ? 'S' : ''}
                                            </span>
                                        )}
                                    </div>

                                    {/* Active indicator dot */}
                                    {isActive && (
                                        <div className="absolute right-4 w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
                                    )}
                                </div>
                            </button>
                        );
                    })}

                </div>

                <div className="p-6 mt-auto border-t border-white/5 shrink-0 bg-slate-900/50 backdrop-blur-md relative z-10">
                    <div className="flex flex-col items-center">
                        <p className="text-[10px] font-black text-slate-500 mb-5 tracking-[0.3em] uppercase flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full border border-slate-500"></span>
                            System Admin
                            <span className="w-2 h-2 rounded-full border border-slate-500"></span>
                        </p>
                        <div className="flex gap-4 w-full justify-center">
                            <button
                                onClick={() => {
                                    playSound('click');
                                    const newMode = viewMode === 'web' ? 'mobile' : 'web';
                                    setViewMode(newMode);
                                    localStorage.setItem('admin_view_pref', newMode);
                                }}
                                className="w-12 h-12 flex items-center justify-center bg-blue-500/10 hover:bg-blue-500 rounded-2xl transition-all duration-300 text-blue-400 hover:text-white shadow-lg hover:shadow-[0_0_15px_rgba(59,130,246,0.5)] hover:-translate-y-1"
                                title="Switch to Mobile View"
                            >
                                <Smartphone size={20} />
                            </button>
                            <button
                                onClick={() => { playSound('click'); fetchData(); }}
                                disabled={isRefreshing}
                                className={`w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-emerald-500 rounded-2xl transition-all duration-300 text-slate-300 hover:text-white shadow-lg hover:-translate-y-1 ${isRefreshing ? 'animate-spin bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'hover:shadow-[0_0_15px_rgba(16,185,129,0.5)]'}`}
                                title="Refresh Data"
                            >
                                <RefreshCw size={20} />
                            </button>
                            <button
                                onClick={() => { playSound('click'); handleLogout(); }}
                                className="w-12 h-12 flex items-center justify-center bg-rose-500/10 hover:bg-rose-500 rounded-2xl transition-all duration-300 text-rose-500 hover:text-white shadow-lg hover:shadow-[0_0_15px_rgba(225,29,72,0.5)] hover:-translate-y-1"
                                title="Logout"
                            >
                                <LogOut size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            {view === 'REMINDERS' ? (
                <div className="p-6 max-w-[90rem] mx-auto h-full">
                    <RemindersView
                        salesmenData={salesmenData}
                        onBack={() => setView('DASHBOARD')}
                        masterPlans={masterPlans}
                        allPayments={allPayments}
                    />
                </div>
            ) : view === 'DASHBOARD' && dashboardMenu === 'MAIN' ? (
                <div className="p-6 max-w-[90rem] mx-auto space-y-8">
                    {/* Header Area */}
                    <div className="bg-slate-900/40 backdrop-blur-3xl p-8 lg:p-12 rounded-[2.5rem] lg:rounded-[3.5rem] border border-white/10 hover:border-white/20 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.7)] ring-1 ring-inset ring-white/10 relative overflow-hidden backdrop-blur-3xl group transition-all duration-500 hover:border-blue-500/20">
                        {/* Dynamic Background Glows */}
                        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 blur-[40px] -mr-32 -mt-32 rounded-full pointer-events-none group-hover:bg-blue-500/15 transition-colors duration-700"></div>
                        <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 blur-[30px] -ml-20 -mb-30 rounded-full pointer-events-none group-hover:bg-indigo-500/15 transition-colors duration-700"></div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center relative z-10">
                            {/* Amount and Pending Info (Full width) */}
                            <div className="lg:col-span-12 flex flex-col items-center text-center">
                                <div className="inline-flex items-center gap-2 bg-slate-800/50 border border-white/5 px-2.5 py-1 rounded-full mb-3 shadow-inner">
                                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>
                                    <p className="text-slate-300 text-[10px] uppercase tracking-[0.2em] font-black">Live Total Intake</p>
                                </div>
                                <p className="text-6xl lg:text-[5rem] xl:text-[6.5rem] leading-none font-black drop-shadow-2xl text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-slate-400 tracking-tighter drop-shadow-xl select-all mb-1">
                                    ₹{(stats.totalCollectedToday || 0).toLocaleString('en-IN')}
                                </p>
                                <p className="text-[10px] font-bold text-slate-500 tracking-wide mb-4">Collected Today Across All Brands</p>

                                {/* Payment Breakdown Cards */}
                                <div className="flex flex-wrap justify-center gap-3 mb-6 w-full max-w-2xl">
                                    <button
                                        onClick={() => playSound('click')}
                                        className="flex-1 min-w-[140px] bg-slate-800/50 backdrop-blur-2xl border border-white/10 p-5 lg:p-6 rounded-3xl flex flex-col items-center group/mini shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_10px_20px_rgba(0,0,0,0.2)] hover:bg-white/[0.08] hover:border-emerald-500/20 transition-all duration-300 active:scale-95"
                                    >
                                        <div className="flex items-center gap-2 mb-3">
                                            <Banknote size={14} className="text-emerald-400 group-hover/mini:scale-110 transition-transform" />
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Cash</span>
                                        </div>
                                        <p className="text-2xl lg:text-3xl font-black text-white italic drop-shadow-md">₹{(stats.cashToday || 0).toLocaleString('en-IN')}</p>
                                    </button>
                                    <button
                                        onClick={() => playSound('click')}
                                        className="flex-1 min-w-[140px] bg-slate-800/50 backdrop-blur-2xl border border-white/10 p-5 lg:p-6 rounded-3xl flex flex-col items-center group/mini shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_10px_20px_rgba(0,0,0,0.2)] hover:bg-white/[0.08] hover:border-sky-500/20 transition-all duration-300 active:scale-95"
                                    >
                                        <div className="flex items-center gap-2 mb-3">
                                            <Smartphone size={14} className="text-sky-400 group-hover/mini:scale-110 transition-transform" />
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">UPI</span>
                                        </div>
                                        <p className="text-2xl lg:text-3xl font-black text-white italic drop-shadow-md">₹{(stats.upiToday || 0).toLocaleString('en-IN')}</p>
                                    </button>
                                    <button
                                        onClick={() => { playSound('click'); setIsChequeModalOpen(true); }}
                                        className="flex-1 min-w-[140px] bg-slate-800/50 backdrop-blur-2xl border border-white/10 p-5 lg:p-6 rounded-3xl flex flex-col items-center group/mini shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_10px_20px_rgba(0,0,0,0.2)] hover:bg-white/[0.08] hover:border-purple-500/20 transition-all duration-300 active:scale-95 shadow-lg hover:shadow-purple-500/10"
                                    >
                                        <div className="flex items-center gap-2 mb-3">
                                            <Landmark size={14} className="text-purple-400 group-hover/mini:scale-110 transition-transform" />
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Cheque</span>
                                        </div>
                                        <p className="text-2xl lg:text-3xl font-black text-white italic drop-shadow-md">₹{(stats.chequeToday || 0).toLocaleString('en-IN')}</p>
                                    </button>
                                </div>

                                <div className="relative inline-block group/btn">
                                    <div className="absolute -inset-1 bg-gradient-to-r from-orange-600 via-amber-500 to-orange-600 rounded-3xl blur opacity-30 group-hover/btn:opacity-60 transition duration-500 animate-pulse"></div>
                                    <button
                                        onClick={() => { playSound('click'); setView('PENDING_APPROVALS'); }}
                                        className="relative bg-slate-900/80 backdrop-blur-xl px-8 py-4 lg:px-10 lg:py-5 rounded-[2rem] border border-orange-500/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_15px_40px_rgba(249,115,22,0.2)] flex items-center gap-4 hover:scale-105 active:scale-95 transition-all duration-300"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-3xl lg:text-4xl font-black text-orange-400 drop-shadow-[0_0_15px_rgba(249,115,22,0.6)]">{pendingCount}</span>
                                            {pendingCount > 0 && <Clock className="text-orange-400/50 animate-bounce" size={20} />}
                                        </div>
                                        <span className="text-xs lg:text-sm font-black text-orange-200 uppercase tracking-[0.25em] relative z-10 drop-shadow-md">Pending Verifications</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 2-Column Content Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                        {/* LEFT COLUMN: Brand Targets (60% width = cols-7) */}
                        <div className="lg:col-span-7 flex flex-col gap-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-blue-500/20 rounded-xl border border-blue-500/30">
                                    <Zap size={24} className="text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]" />
                                </div>
                                <h2 className="text-2xl font-black text-white tracking-tight uppercase">Brand Performance</h2>
                            </div>

                            <div className="flex flex-col gap-4">
                                {activeCompanies.length > 0 ? (
                                    activeCompanies.map((company) => {
                                        const config = companyConfigs[company] || { color: 'from-blue-600 via-blue-500 to-indigo-500', glow: 'rgba(59,130,246,0.4)', text: 'text-blue-400' };

                                        let t = 0;
                                        let a = 0;
                                        reactiveTargets.forEach((targetRow) => {
                                            const sPlan = masterPlans[targetRow.salesman_id];
                                            const sComp = sPlan?.company || sPlan?.Company;
                                            if (sComp === company) {
                                                t += Number(targetRow.monthly_target || 0);
                                                a += Number(targetRow.achieved || 0);
                                            }
                                        });
                                        const displayPercentage = t === 0 ? 0 : Math.round((a / t) * 100);
                                        const percentage = Math.min(displayPercentage, 100);

                                        if (t === 0) return null;

                                        return (
                                            <div
                                                key={company}
                                                onClick={() => {
                                                    playSound('click');
                                                    setSelectedCompanyData({ name: company, color: config.color, glow: config.glow });
                                                    setIsCompanyModalOpen(true);
                                                }}
                                                className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-5 relative overflow-hidden group cursor-pointer hover:bg-slate-800/80 hover:border-white/10 active:scale-[0.99] transition-all duration-300 transform hover:-translate-y-0.5 shadow-lg"
                                            >
                                                {/* Sleek left-border accent */}
                                                <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${config.color} opacity-70 group-hover:opacity-100 transition-opacity`} style={{ boxShadow: `0 0 12px ${config.glow}` }}></div>

                                                {/* Subtle ambient glow */}
                                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-48 h-48 bg-white/5 rounded-full blur-[50px] pointer-events-none group-hover:bg-white/10 transition-colors duration-500"></div>

                                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 mb-4 relative z-10 pl-2">
                                                    <div>
                                                        <span className={`text-[11px] sm:text-[12px] font-black uppercase tracking-[0.2em] ${config.text} drop-shadow-sm flex items-center gap-1.5 mb-1`}>
                                                            {company} <span className="opacity-60 text-slate-400">TARGET</span>
                                                        </span>
                                                        <div className="flex items-baseline gap-2">
                                                            <span className="text-3xl sm:text-4xl font-black text-white tracking-tighter drop-shadow-md group-hover:text-slate-50 transition-colors leading-none">
                                                                ₹{Math.round(a).toLocaleString('en-IN')}
                                                            </span>
                                                            <span className="text-xs sm:text-sm font-bold text-slate-500 tracking-wider">
                                                                / ₹{Math.round(t).toLocaleString('en-IN')}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
                                                        <div className={`px-2.5 py-1 rounded-md border border-white/5 bg-slate-950/50 flex items-center gap-1.5 shadow-inner`}>
                                                            <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${config.color} animate-pulse`} style={{ boxShadow: `0 0 8px ${config.glow}` }}></div>
                                                            <span className="text-[11px] font-black tracking-widest text-white">{displayPercentage}%</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="pl-2 relative z-10">
                                                    <div className="h-1 w-full bg-slate-950/80 rounded-full overflow-hidden border border-white/5 shadow-inner relative">
                                                        <div
                                                            className={`absolute top-0 bottom-0 left-0 bg-gradient-to-r ${config.color} transition-all duration-1000`}
                                                            style={{ width: `${percentage}%`, boxShadow: `0 0 10px ${config.glow}` }}
                                                        >
                                                            <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="bg-slate-900/40 p-10 rounded-2xl border border-white/5 text-center flex flex-col items-center shadow-xl">
                                        <AlertCircle size={40} className="text-slate-600 mb-3" />
                                        <h3 className="text-slate-400 font-bold uppercase tracking-widest text-sm">No Active Brand Performance Data</h3>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Outstanding (40% width) */}
                        <div className="lg:col-span-5 flex flex-col gap-5">
                            <div className="flex items-center gap-3 mb-2 lg:mb-4">
                                <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-500/30">
                                    <Wallet size={20} className="text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                                </div>
                                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase">Flow Summary</h2>
                            </div>

                            {/* Market Exposure Wrapper */}
                            <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-6 relative overflow-hidden group cursor-pointer hover:bg-slate-800/80 hover:border-white/10 active:scale-[0.99] transition-all duration-300 transform hover:-translate-y-0.5 shadow-lg flex flex-col justify-center min-h-[140px]" onClick={() => { playSound('click'); setIsOutstandingModalOpen(true); }}>
                                {/* Sleek left-border accent */}
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-orange-400 to-red-500 opacity-70 group-hover:opacity-100 transition-opacity" style={{ boxShadow: `0 0 12px rgba(249,115,22,0.5)` }}></div>

                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-48 h-48 bg-white/5 rounded-full blur-[50px] pointer-events-none group-hover:bg-white/10 transition-colors duration-500"></div>
                                <div className="absolute bottom-0 right-0 w-32 h-32 bg-orange-500/10 blur-[40px] rounded-full group-hover:bg-orange-500/20 transition-colors duration-700 pointer-events-none"></div>

                                <div className="flex items-end justify-between relative z-10 pl-2">
                                    <div className="flex flex-col gap-1.5">
                                        <span className="text-[11px] sm:text-[12px] font-black uppercase tracking-[0.2em] text-orange-400 drop-shadow-sm flex items-center gap-1.5 mb-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse shadow-[0_0_8px_#f97316]"></div> Market Exposure
                                        </span>
                                        <span className="text-3xl sm:text-4xl font-black text-white tracking-tighter drop-shadow-md group-hover:text-slate-50 transition-colors whitespace-nowrap leading-none">
                                            ₹{(stats.totalPending - Math.round(stats.totalCollectedToday)).toLocaleString('en-IN')}
                                        </span>
                                    </div>
                                    <div className="p-2.5 rounded-xl border border-white/5 bg-slate-950/50 text-slate-400 group-hover:text-white group-hover:bg-slate-900 group-hover:border-white/20 transition-all shadow-inner">
                                        <ArrowRight size={16} />
                                    </div>
                                </div>
                            </div>

                            {/* --- NEW: TODAY'S TOTAL OUTSTANDING (Sleek Desktop Version) --- */}
                            {(() => {
                                const { collectedValue, remainingValue, totalLiability } = routeStats;
                                const percentage = totalLiability > 0 ? Math.min(Math.round((collectedValue / totalLiability) * 100), 100) : 0;

                                return (
                                    <div
                                        onClick={() => { playSound('click'); setIsTodayOutstandingModalOpen(true); }}
                                        className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-6 relative overflow-hidden group cursor-pointer hover:bg-slate-800/80 hover:border-white/10 active:scale-[0.99] transition-all duration-300 transform hover:-translate-y-0.5 shadow-lg flex flex-col justify-center min-h-[140px]"
                                    >
                                        {/* Sleek left-border accent */}
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-500 to-pink-500 opacity-70 group-hover:opacity-100 transition-opacity" style={{ boxShadow: `0 0 12px rgba(168,85,247,0.5)` }}></div>

                                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-48 h-48 bg-white/5 rounded-full blur-[50px] pointer-events-none group-hover:bg-white/10 transition-colors duration-500"></div>
                                        <div className="absolute bottom-0 right-0 w-32 h-32 bg-purple-500/10 blur-[40px] rounded-full group-hover:bg-purple-500/20 transition-colors duration-700 pointer-events-none"></div>

                                        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 sm:gap-6 relative z-10 pl-2 w-full">
                                            <div className="flex flex-col gap-1.5 flex-1 w-full justify-center">
                                                <div className="flex items-center justify-between mb-1.5 w-full">
                                                    <span className="text-[11px] sm:text-[12px] font-black uppercase tracking-[0.2em] text-purple-400 drop-shadow-sm flex items-center gap-1.5 flex-1 truncate">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse shadow-[0_0_8px_#a855f7] shrink-0"></div> <span className="truncate w-full">TODAY'S OUTSTANDING</span>
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        <div className="px-2.5 py-1 rounded-md border border-white/5 bg-slate-950/50 flex items-center gap-1.5 shadow-inner shrink-0 hidden sm:flex">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 animate-pulse" style={{ boxShadow: '0 0 8px rgba(168,85,247,0.5)' }}></div>
                                                            <span className="text-[10px] font-black tracking-widest text-white">{percentage}% COLLECTED</span>
                                                        </div>
                                                        <div className="p-2 rounded-xl border border-white/5 bg-slate-950/50 text-slate-400 group-hover:text-white group-hover:bg-slate-900 group-hover:border-white/20 transition-all shadow-inner shrink-0">
                                                            <ArrowRight size={16} />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-baseline gap-2 mb-2">
                                                    <span className="text-3xl sm:text-4xl font-black text-white tracking-tighter drop-shadow-md group-hover:text-slate-50 transition-colors whitespace-nowrap leading-none flex-1 truncate">
                                                        ₹{remainingValue.toLocaleString('en-IN')}
                                                    </span>
                                                </div>

                                                <div className="h-1 w-full bg-slate-950/80 rounded-full overflow-hidden border border-white/5 shadow-inner relative max-w-[95%] mt-1 mb-2">
                                                    <div
                                                        className={`absolute top-0 bottom-0 left-0 bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-1000`}
                                                        style={{ width: `${percentage}%`, boxShadow: `0 0 10px rgba(168,85,247,0.5)` }}
                                                    >
                                                        <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            ) : (
                renderSubView()
            )}
        </div>
    );
}
