import React, { useMemo } from 'react';
import {
    LogOut, Wallet, FileText, RefreshCw, TrendingUp, Compass, ArrowRight, Check, MapPin, Zap, AlertCircle, Smartphone,
    ShieldCheck, Clock, Settings, Users, BarChart3, Bell, Trophy, LayoutDashboard
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
        { label: 'Reminders', icon: Bell, view: 'REMINDERS', menu: 'MAIN' },
    ];

    return (
        <div className="pl-64 min-h-screen overflow-y-auto bg-[#020617] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#020617] to-[#020617] text-slate-200">
            {/* Fixed Sidebar */}
            <div className="w-64 bg-slate-900/80 backdrop-blur-3xl border-r border-white/5 flex flex-col h-screen fixed left-0 top-0 z-40">
                <div className="p-8 pb-4 shrink-0 flex items-center justify-center">
                    <div className="flex flex-col items-center">
                        <div className="flex items-center gap-2 mb-1">
                            <ShieldCheck size={20} className="text-blue-500" />
                            <h1 className="text-2xl font-black text-white italic tracking-tighter uppercase drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                                JARWIS <span className="text-blue-500">PRO</span>
                            </h1>
                        </div>
                        <p className="text-[9px] font-black text-blue-400 uppercase tracking-[0.4em] relative">
                            Admin Command
                        </p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-8 space-y-3 no-scrollbar mt-4 border-t border-white/5">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 pl-4">Admin Controls</p>

                    {sidebarLinks.map((link) => {
                        const isActive = link.view === view && (link.menu ? link.menu === dashboardMenu : true);
                        return (
                            <button
                                key={link.label}
                                onClick={() => {
                                    playSound('click');
                                    setView(link.view);
                                    if (link.menu) setDashboardMenu(link.menu);
                                }}
                                className={`w-full relative overflow-hidden p-0.5 rounded-2xl shadow-lg border transition-all ${isActive ? 'bg-blue-600/20 border-blue-500/50' : 'bg-slate-950/40 border-white/5 hover:bg-slate-900 hover:border-blue-500/30'}`}
                            >
                                <div className="p-4 relative z-10 flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.3)] shrink-0 group-hover:scale-110 transition-transform ${isActive ? 'bg-blue-500' : 'bg-slate-900'}`}>
                                        <link.icon size={20} className="text-white drop-shadow-md" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className={`text-sm font-black tracking-tight uppercase transition-colors ${isActive ? 'text-blue-400' : 'text-slate-300 group-hover:text-blue-300'}`}>{link.label}</h3>
                                        {link.badge > 0 && (
                                            <span className="inline-block mt-1 px-2 py-0.5 bg-red-500/20 text-red-500 text-[8px] font-black rounded-full border border-red-500/20">
                                                {link.badge} ACTION REQUIRED
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </button>
                        );
                    })}

                    <button
                        onClick={() => { playSound('click'); setIsDataManagerOpen(true); }}
                        className="w-full relative overflow-hidden bg-slate-950/40 p-0.5 rounded-2xl shadow-lg border border-white/5 text-left group hover:bg-slate-900 transition-all hover:border-indigo-500/50"
                    >
                        <div className="p-4 relative z-10 flex items-center gap-4">
                            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(79,70,229,0.4)] shrink-0 group-hover:scale-110 transition-transform">
                                <Users size={20} className="text-white drop-shadow-md" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-white tracking-tight group-hover:text-indigo-400 transition-colors uppercase">Data Manager</h3>
                            </div>
                        </div>
                    </button>
                </div>

                <div className="p-6 mt-auto border-t border-white/5 shrink-0">
                    <div className="flex flex-col items-center">
                        <p className="text-[10px] font-bold text-slate-500 mb-4 tracking-widest uppercase">System Admin</p>
                        <div className="flex gap-4">
                            <button
                                onClick={() => {
                                    playSound('click');
                                    const newMode = viewMode === 'web' ? 'mobile' : 'web';
                                    setViewMode(newMode);
                                    localStorage.setItem('admin_view_pref', newMode);
                                }}
                                className="w-12 h-12 flex items-center justify-center bg-blue-500/10 hover:bg-blue-500/20 rounded-full transition-colors text-blue-400 hover:text-blue-300"
                                title="Switch to Mobile View"
                            >
                                <Smartphone size={20} />
                            </button>
                            <button
                                onClick={() => { playSound('click'); fetchData(); }}
                                disabled={isRefreshing}
                                className={`w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-full transition-colors text-slate-300 hover:text-white ${isRefreshing ? 'animate-spin text-blue-400' : ''}`}
                                title="Refresh Data"
                            >
                                <RefreshCw size={20} />
                            </button>
                            <button
                                onClick={() => { playSound('click'); handleLogout(); }}
                                className="w-12 h-12 flex items-center justify-center bg-red-500/10 hover:bg-red-500/20 rounded-full transition-colors text-red-500 hover:text-red-400"
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
                <div className="p-8 max-w-7xl mx-auto space-y-8">
                    {/* Header Area */}
                    <div className="flex flex-col lg:flex-row items-center justify-between bg-slate-900/60 p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden backdrop-blur-3xl">
                        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 blur-[80px] -mr-32 -mt-32 rounded-full pointer-events-none"></div>

                        <div className="flex-1 w-full text-center lg:text-left">
                            <p className="text-slate-400 text-[12px] uppercase tracking-[0.3em] font-black opacity-80 mb-2">Total Intake</p>
                            <p className="text-6xl font-black text-white tracking-tighter drop-shadow-xl select-all">
                                ₹{(stats.totalCollectedToday || 0).toLocaleString('en-IN')}
                            </p>
                        </div>

                        <div className="mt-6 lg:mt-0">
                            <button
                                onClick={() => { playSound('click'); setView('PENDING_APPROVALS'); }}
                                className="bg-gradient-to-r from-orange-600 to-orange-500 px-5 py-3 rounded-2xl border border-orange-400/30 shadow-[0_10px_25px_rgba(249,115,22,0.3)] flex flex-col items-center lg:items-end justify-center min-w-[180px] hover:scale-105 active:scale-95 transition-all"
                            >
                                <span className="text-2xl font-black text-white drop-shadow-md">{pendingCount}</span>
                                <span className="text-[8px] font-black text-orange-100 uppercase tracking-widest mt-0.5 opacity-90">Pending Verification</span>
                            </button>
                        </div>
                    </div>

                    {/* 2-Column Content Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* LEFT COLUMN: Brand Targets (60% width = cols-7) */}
                        <div className="lg:col-span-7 flex flex-col gap-6">
                            <div className="flex items-center gap-2 mb-2">
                                <Zap size={24} className="text-blue-500" />
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
                                                className="bg-slate-900/40 backdrop-blur-3xl border border-white/5 rounded-2xl p-4 shadow-xl relative overflow-hidden group cursor-pointer hover:bg-slate-800/60 active:scale-[0.98] transition-all"
                                            >
                                                <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-[25px] -mr-12 -mt-12 pointer-events-none group-hover:bg-white/10 transition-colors"></div>

                                                <div className="flex items-center justify-between mb-3">
                                                    <span className={`text-[11px] font-black uppercase tracking-[0.2em] ${config.text} drop-shadow-sm`}>
                                                        {company} OVERALL
                                                    </span>
                                                    <div className="px-2 py-0.5 rounded-full border border-white/10 bg-slate-950/50 flex items-center gap-1.5 shadow-inner">
                                                        <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${config.color} animate-pulse`} style={{ boxShadow: `0 0 8px ${config.glow}` }}></div>
                                                        <span className="text-[9px] font-black tracking-widest text-slate-300">{percentage}%</span>
                                                    </div>
                                                </div>

                                                <div className="flex items-end justify-between mb-3 relative z-10">
                                                    <div>
                                                        <span className="text-2xl font-black text-white italic tracking-tighter drop-shadow-lg block">
                                                            ₹{a.toLocaleString('en-IN')}
                                                        </span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-slate-500 text-[8px] font-black tracking-[0.1em] uppercase opacity-80 block mb-0.5">Target</span>
                                                        <span className="text-base font-black text-slate-300">₹{t.toLocaleString('en-IN')}</span>
                                                    </div>
                                                </div>

                                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 relative shadow-inner">
                                                    <div
                                                        className={`h-full bg-gradient-to-r ${config.color} transition-all duration-1000 relative overflow-hidden`}
                                                        style={{ width: `${percentage}%`, boxShadow: `0 0 12px ${config.glow}` }}
                                                    >
                                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
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

                        {/* RIGHT COLUMN: Outstanding & Breakdown (40% width = cols-5) */}
                        <div className="lg:col-span-5 flex flex-col gap-6">
                            <div className="flex items-center gap-2 mb-2">
                                <Wallet size={24} className="text-emerald-500" />
                                <h2 className="text-2xl font-black text-white tracking-tight uppercase">Flow Summary</h2>
                            </div>

                            {/* Total Outstanding Card */}
                            <button
                                onClick={() => { playSound('click'); setIsOutstandingModalOpen(true); }}
                                className="group bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 p-4 rounded-2xl relative overflow-hidden text-left hover:bg-slate-800 transition-colors shadow-2xl active:scale-[0.98]"
                            >
                                <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-full blur-[30px] pointer-events-none group-hover:bg-rose-500/20 transition-all"></div>
                                <div className="flex items-center gap-2 mb-3 relative z-10">
                                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Market Exposure</p>
                                </div>
                                <p className="text-2xl font-black text-white tracking-tighter drop-shadow-md group-hover:text-rose-100 transition-colors relative z-10">
                                    ₹{(stats.totalPending - stats.totalCollectedToday).toLocaleString('en-IN')}
                                </p>
                                <div className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-500 group-hover:bg-rose-500 group-hover:text-white transition-all shadow-lg">
                                    <ArrowRight size={16} />
                                </div>
                            </button>

                            {/* Breakdown Grid */}
                            <div className="grid grid-cols-2 gap-4 mt-1">
                                <button
                                    onClick={() => { playSound('click'); setIsDataManagerOpen(true); }}
                                    className="bg-emerald-500/10 p-5 rounded-2xl border border-emerald-500/20 flex flex-col justify-center shadow-inner hover:bg-emerald-500/15 transition-colors text-left active:scale-95"
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                        <p className="text-emerald-500 text-[10px] font-black uppercase tracking-widest">Active Users</p>
                                    </div>
                                    <p className="text-2xl font-black text-emerald-400 tracking-tight">{salesmenData.length}</p>
                                </button>

                                <button
                                    onClick={() => { playSound('click'); setIsTodayOutstandingModalOpen(true); }}
                                    className="bg-blue-500/10 p-5 rounded-2xl border border-blue-500/20 flex flex-col justify-center shadow-inner hover:bg-blue-500/15 transition-colors text-left active:scale-95"
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                                        <p className="text-blue-500 text-[10px] font-black uppercase tracking-widest">Routes Today</p>
                                    </div>
                                    <p className="text-2xl font-black text-blue-400 tracking-tight">Active</p>
                                </button>

                                <button
                                    onClick={() => { playSound('click'); setIsChequeModalOpen(true); }}
                                    className="bg-purple-500/10 p-5 rounded-2xl border border-purple-500/20 flex flex-col justify-center shadow-inner hover:bg-purple-500/15 transition-colors text-left active:scale-95"
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]"></div>
                                        <p className="text-purple-500 text-[10px] font-black uppercase tracking-widest">Cheques</p>
                                    </div>
                                    <p className="text-2xl font-black text-purple-400 tracking-tight">View All</p>
                                </button>

                                <div className="bg-slate-800/50 p-5 rounded-2xl border border-white/5 flex flex-col justify-center shadow-inner transition-colors">
                                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-2 leading-none">
                                        <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span> System Status
                                    </p>
                                    <p className="text-2xl font-black text-white tracking-tight uppercase">Live</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                renderSubView()
            )}
        </div>
    );
}
