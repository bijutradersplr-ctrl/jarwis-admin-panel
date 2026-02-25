import React, { useMemo } from 'react';
import {
    LogOut, Wallet, FileText, RefreshCw, TrendingUp, Compass, ArrowRight, Check, MapPin, Zap, AlertCircle, Smartphone,
    ShieldCheck, Clock, Settings, Users, BarChart3, Bell, Trophy, LayoutDashboard, Banknote, Landmark
} from 'lucide-react';

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
        allPayments.filter(p => (p.status || '').toLowerCase() !== 'approved').length
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

    const companyConfigs = {
        'Cadbury': { color: 'from-purple-600 via-indigo-500 to-blue-500', glow: 'rgba(79,70,229,0.4)', text: 'text-purple-400' },
        'Britannia': { color: 'from-red-600 via-rose-500 to-orange-500', glow: 'rgba(225,29,72,0.4)', text: 'text-red-500' },
        'Colgate': { color: 'from-emerald-600 via-teal-500 to-cyan-500', glow: 'rgba(20,184,166,0.4)', text: 'text-emerald-400' }
    };

    const sidebarLinks = [
        { label: 'Dashboard', icon: LayoutDashboard, view: 'DASHBOARD', menu: 'MAIN' },
        { label: 'Pending Approvals', icon: Clock, view: 'PENDING_APPROVALS', menu: 'MAIN', badge: pendingCount, color: 'orange' },
        { label: 'Sales History', icon: FileText, view: 'SUMMARY_LIST', menu: 'MAIN' },
        { label: 'Master Settings', icon: Settings, view: 'DASHBOARD', menu: 'MASTER' },
        { label: 'Leaderboard', icon: Trophy, view: 'LEADERBOARD', menu: 'MAIN' },
        { label: 'Performance', icon: BarChart3, view: 'PERFORMANCE', menu: 'MAIN' },
        { label: 'Route Explorer', icon: Compass, action: 'ROUTE_EXPLORER' },
        { label: 'Reminders', icon: Bell, view: 'REMINDERS', menu: 'MAIN' },
    ];

    return (
        <div className="pl-64 min-h-screen overflow-y-auto bg-[#020617] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#020617] to-[#020617] text-slate-200">
            {/* Fixed Sidebar */}
            <div className="w-72 bg-[#020617]/80 backdrop-blur-3xl border-r border-white/5 flex flex-col h-screen fixed left-0 top-0 z-40 transition-all duration-300 shadow-[10px_0_30px_rgba(0,0,0,0.5)]">
                {/* Decorative glow in sidebar */}
                <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-blue-500/10 to-transparent pointer-events-none"></div>

                <div className="p-8 pb-6 shrink-0 flex items-center justify-center relative z-10">
                    <div className="flex flex-col items-center">
                        <div className="flex items-center gap-3 mb-2 relative group cursor-default">
                            <div className="absolute -inset-2 bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-600 rounded-lg blur opacity-40 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-gradient-x"></div>
                            <div className="relative bg-slate-900 p-2 rounded-xl border border-white/10 shadow-2xl">
                                <ShieldCheck size={24} className="text-blue-400 drop-shadow-[0_0_10px_rgba(96,165,250,0.8)]" />
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
                                    ${isActive ? 'bg-slate-900/90' : 'bg-slate-900/40 group-hover:bg-slate-800/60'}
                                `}>
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300
                                        ${isActive
                                            ? 'bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.5)] transform scale-110'
                                            : 'bg-slate-800/80 border border-white/5 group-hover:bg-slate-700 group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-lg'
                                        }`}>
                                        <link.icon size={20} className={`transition-colors duration-300 ${isActive ? 'text-white drop-shadow-md' : 'text-slate-400 group-hover:text-blue-300'}`} />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <h3 className={`text-sm font-black tracking-tight uppercase transition-colors duration-300 ${isActive ? 'text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-indigo-200' : 'text-slate-300 group-hover:text-white'}`}>{link.label}</h3>
                                        {link.badge > 0 && (
                                            <span className="inline-flex mt-1.5 px-2.5 py-0.5 bg-orange-500/10 text-orange-400 text-[9px] font-black rounded-full border border-orange-500/30 shadow-[0_0_10px_rgba(249,115,22,0.2)] animate-pulse">
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

                    <div className="pt-4 pb-2">
                        <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                    </div>

                    <button
                        onClick={() => { playSound('click'); setIsDataManagerOpen(true); }}
                        className="w-full relative overflow-hidden bg-white/5 p-[1px] rounded-[1.25rem] shadow-lg text-left group hover:bg-white/10 transition-all duration-300 active:scale-95"
                    >
                        <div className="p-4 relative z-10 flex items-center gap-4 rounded-[1.2rem] bg-slate-900/40 group-hover:bg-slate-800/60 transition-colors duration-300">
                            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.4)] shrink-0 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300">
                                <Users size={20} className="text-white drop-shadow-md" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-slate-300 tracking-tight group-hover:text-white transition-colors uppercase">Data Manager</h3>
                            </div>
                        </div>
                    </button>
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
            {view === 'DASHBOARD' && dashboardMenu === 'MAIN' ? (
                <div className="p-6 max-w-7xl mx-auto space-y-6">
                    {/* Header Area */}
                    <div className="bg-gradient-to-br from-slate-900/80 to-[#020617]/90 p-5 lg:p-6 rounded-[2rem] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden backdrop-blur-3xl group transition-all duration-500 hover:border-blue-500/20">
                        {/* Dynamic Background Glows */}
                        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 blur-[100px] -mr-32 -mt-32 rounded-full pointer-events-none group-hover:bg-blue-500/15 transition-colors duration-700"></div>
                        <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 blur-[80px] -ml-20 -mb-20 rounded-full pointer-events-none group-hover:bg-indigo-500/15 transition-colors duration-700"></div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
                            {/* Amount and Pending Info (Full width) */}
                            <div className="lg:col-span-12 flex flex-col items-center text-center">
                                <div className="inline-flex items-center gap-2 bg-slate-800/50 border border-white/5 px-2.5 py-1 rounded-full mb-3 shadow-inner">
                                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>
                                    <p className="text-slate-300 text-[10px] uppercase tracking-[0.2em] font-black">Live Total Intake</p>
                                </div>
                                <p className="text-4xl lg:text-5xl xl:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-slate-400 tracking-tighter drop-shadow-xl select-all mb-1">
                                    ₹{(stats.totalCollectedToday || 0).toLocaleString('en-IN')}
                                </p>
                                <p className="text-[10px] font-bold text-slate-500 tracking-wide mb-4">Collected Today Across All Brands</p>

                                {/* Payment Breakdown Cards */}
                                <div className="flex flex-wrap justify-center gap-3 mb-6 w-full max-w-2xl">
                                    <button
                                        onClick={() => playSound('click')}
                                        className="flex-1 min-w-[120px] bg-white/5 backdrop-blur-md border border-white/5 p-3 rounded-xl flex flex-col items-center group/mini hover:bg-white/[0.08] hover:border-emerald-500/20 transition-all duration-300 active:scale-95"
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            <Banknote size={14} className="text-emerald-400 group-hover/mini:scale-110 transition-transform" />
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Cash</span>
                                        </div>
                                        <p className="text-lg font-black text-white italic">₹{(stats.cashToday || 0).toLocaleString('en-IN')}</p>
                                    </button>
                                    <button
                                        onClick={() => playSound('click')}
                                        className="flex-1 min-w-[120px] bg-white/5 backdrop-blur-md border border-white/5 p-3 rounded-xl flex flex-col items-center group/mini hover:bg-white/[0.08] hover:border-sky-500/20 transition-all duration-300 active:scale-95"
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            <Smartphone size={14} className="text-sky-400 group-hover/mini:scale-110 transition-transform" />
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">UPI</span>
                                        </div>
                                        <p className="text-lg font-black text-white italic">₹{(stats.upiToday || 0).toLocaleString('en-IN')}</p>
                                    </button>
                                    <button
                                        onClick={() => { playSound('click'); setIsChequeModalOpen(true); }}
                                        className="flex-1 min-w-[120px] bg-white/5 backdrop-blur-md border border-white/5 p-3 rounded-xl flex flex-col items-center group/mini hover:bg-white/[0.08] hover:border-purple-500/20 transition-all duration-300 active:scale-95 shadow-lg hover:shadow-purple-500/10"
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            <Landmark size={14} className="text-purple-400 group-hover/mini:scale-110 transition-transform" />
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Cheque</span>
                                        </div>
                                        <p className="text-lg font-black text-white italic">₹{(stats.chequeToday || 0).toLocaleString('en-IN')}</p>
                                    </button>
                                </div>

                                <div className="relative inline-block group/btn">
                                    <div className="absolute -inset-1 bg-gradient-to-r from-orange-600 via-amber-500 to-orange-600 rounded-3xl blur opacity-30 group-hover/btn:opacity-60 transition duration-500 animate-pulse"></div>
                                    <button
                                        onClick={() => { playSound('click'); setView('PENDING_APPROVALS'); }}
                                        className="relative bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-3 rounded-2xl border border-orange-500/30 shadow-[0_10px_30px_rgba(249,115,22,0.15)] flex items-center gap-4 hover:scale-105 active:scale-95 transition-all duration-300"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl font-black text-orange-400 drop-shadow-[0_0_10px_rgba(249,115,22,0.5)]">{pendingCount}</span>
                                            {pendingCount > 0 && <Clock className="text-orange-400/50 animate-bounce" size={20} />}
                                        </div>
                                        <span className="text-[10px] font-black text-orange-200/80 uppercase tracking-[0.2em] relative z-10">Pending Verifications</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 2-Column Content Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
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
                                        const percentage = t === 0 ? 0 : Math.min(Math.round((a / t) * 100), 100);

                                        if (t === 0) return null;

                                        return (
                                            <div
                                                key={company}
                                                onClick={() => {
                                                    playSound('click');
                                                    setSelectedCompanyData({ name: company, color: config.color, glow: config.glow });
                                                    setIsCompanyModalOpen(true);
                                                }}
                                                className="bg-slate-900/40 backdrop-blur-3xl border border-white/5 rounded-3xl p-5 shadow-lg relative overflow-hidden group cursor-pointer hover:bg-slate-800/80 hover:border-white/10 active:scale-[0.98] transition-all duration-300 transform hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]"
                                            >
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-[30px] -mr-16 -mt-16 pointer-events-none group-hover:bg-white/10 transition-colors duration-500"></div>
                                                <div className={`absolute bottom-0 right-0 w-32 h-32 opacity-0 group-hover:opacity-20 blur-[40px] rounded-full transition-opacity duration-700 bg-gradient-to-r ${config.color}`}></div>

                                                <div className="flex items-center justify-between xl:justify-start xl:gap-6 mb-3">
                                                    <span className={`text-[12px] font-black uppercase tracking-[0.2em] ${config.text} drop-shadow-sm flex items-center gap-2`}>
                                                        {company} <span className="opacity-50 tracking-[0.1em]">OVERALL</span>
                                                    </span>

                                                    <div className="px-3 py-1 rounded-full border border-white/10 bg-slate-950/80 flex items-center gap-2 shadow-inner group-hover:bg-slate-900 transition-colors ml-auto">
                                                        <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${config.color} animate-pulse`} style={{ boxShadow: `0 0 10px ${config.glow}` }}></div>
                                                        <span className="text-[10px] font-black tracking-widest text-white">{percentage}%</span>
                                                    </div>
                                                </div>

                                                <div className="flex items-end justify-between mb-3 relative z-10">
                                                    <div>
                                                        <span className="text-2xl lg:text-3xl font-black text-white tracking-tighter drop-shadow-lg block group-hover:text-slate-100 transition-colors">
                                                            ₹{a.toLocaleString('en-IN')}
                                                        </span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-slate-500 text-[9px] font-black tracking-[0.2em] uppercase opacity-80 block mb-1">Target Limit</span>
                                                        <span className="text-base font-black text-slate-300 drop-shadow-sm group-hover:text-white transition-colors">₹{t.toLocaleString('en-IN')}</span>
                                                    </div>
                                                </div>

                                                <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-white/5 relative shadow-inner">
                                                    <div
                                                        className={`h-full bg-gradient-to-r ${config.color} transition-all duration-1000 relative overflow-hidden`}
                                                        style={{ width: `${percentage}%`, boxShadow: `0 0 15px ${config.glow}` }}
                                                    >
                                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }}></div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="bg-slate-900/40 p-12 rounded-[2.5rem] border border-white/5 text-center flex flex-col items-center shadow-xl">
                                        <AlertCircle size={48} className="text-slate-600 mb-4" />
                                        <h3 className="text-slate-400 font-bold uppercase tracking-widest text-base">No Active Brand Performance Data</h3>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Outstanding (40% width) */}
                        <div className="lg:col-span-5 flex flex-col gap-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-500/30">
                                    <Wallet size={24} className="text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                                </div>
                                <h2 className="text-2xl font-black text-white tracking-tight uppercase">Flow Summary</h2>
                            </div>

                            {/* Total Outstanding Card */}
                            <button
                                onClick={() => { playSound('click'); setIsOutstandingModalOpen(true); }}
                                className="group bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 p-5 rounded-3xl relative overflow-hidden text-left hover:bg-slate-800 transition-all duration-300 shadow-2xl active:scale-[0.98] hover:border-rose-500/30 hover:shadow-[0_10px_30px_rgba(225,29,72,0.15)]"
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-[40px] pointer-events-none group-hover:bg-rose-500/20 transition-all duration-500"></div>
                                <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-500/10 rounded-full blur-[30px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

                                <div className="flex items-center gap-2 mb-4 relative z-10">
                                    <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(225,29,72,0.8)]"></div>
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Market Exposure</p>
                                </div>

                                <p className="text-2xl lg:text-3xl font-black text-white tracking-tighter drop-shadow-lg group-hover:text-rose-100 transition-colors relative z-10">
                                    ₹{(stats.totalPending - stats.totalCollectedToday).toLocaleString('en-IN')}
                                </p>

                                <div className="absolute bottom-6 right-6 w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 group-hover:bg-rose-500 group-hover:text-white group-hover:border-rose-500 transition-all duration-300 shadow-lg transform group-hover:-translate-y-1">
                                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                renderSubView()
            )}
        </div>
    );
}
