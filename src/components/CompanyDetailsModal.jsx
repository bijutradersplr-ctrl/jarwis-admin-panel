import React from 'react';
import { X, Target, TrendingUp, Users } from 'lucide-react';

const CompanyDetailsModal = ({ isOpen, onClose, company, reactiveTargets, companyColor, companyGlow, masterPlans }) => {
    if (!isOpen || !company) return null;

    // Filter salesmen belonging to this company using masterPlans
    const relevantSalesmen = reactiveTargets.filter(t => {
        const plan = masterPlans?.[t.salesman_id];
        const comp = plan?.company || plan?.Company || 'Other';
        return comp === company;
    });

    // Calculate totals
    const totalTarget = relevantSalesmen.reduce((sum, s) => sum + Number(s.monthly_target || 0), 0);
    const totalAchieved = relevantSalesmen.reduce((sum, s) => sum + Number(s.achieved || 0), 0);
    const totalPercentage = totalTarget > 0 ? Math.min(Math.round((totalAchieved / totalTarget) * 100), 100) : 0;

    return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4 sm:p-6 overflow-hidden">
            {/* Backdrop with animation lock */}
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" onClick={onClose}></div>

            <div className="bg-slate-900 border border-white/10 w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-300 flex flex-col max-h-[85vh]">
                {/* COMPACTED HEADER */}
                <div className={`p-6 border-b border-white/5 flex justify-between items-center bg-gradient-to-r ${companyColor} opacity-95 relative overflow-hidden`}>
                    {/* Subtle design pattern */}
                    <div className="absolute inset-0 opacity-10 pointer-events-none">
                        <div className="absolute top-0 left-0 w-full h-full" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
                    </div>

                    <div className="flex items-center gap-4 relative z-10">
                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center border border-white/30 backdrop-blur-md shadow-lg">
                            <Users size={20} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white uppercase italic tracking-tighter">{company}</h2>
                            <p className="text-[9px] font-bold text-white/70 uppercase tracking-[0.2em]">Breakdown</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all active:scale-95 border border-white/10 shadow-sm relative z-10">
                        <X size={18} />
                    </button>
                </div>

                {/* OVERALL SUMMARY SECTION - RE-INSTATED & COMPACTED */}
                <div className="mx-6 mt-6 p-5 rounded-3xl bg-slate-950/40 border border-white/5 relative overflow-hidden group shadow-inner">
                    <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${companyColor}`}></div>

                    <div className="flex justify-between items-end mb-4">
                        <div>
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1 opacity-80">Collective Achievement</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-black text-white italic tracking-tighter tabular-nums drop-shadow-lg">
                                    ₹{totalAchieved.toLocaleString('en-IN')}
                                </span>
                                <span className="text-slate-600 text-xs font-bold opacity-40">/</span>
                                <span className="text-xs font-bold text-slate-500 tracking-tight">
                                    ₹{totalTarget.toLocaleString('en-IN')}
                                </span>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className={`px-2.5 py-1 rounded-lg border flex items-center gap-2 ${totalPercentage >= 100
                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                : 'bg-blue-500/10 text-blue-500 border-blue-500/20'}`}>
                                <span className="text-[10px] font-black tracking-widest">{totalPercentage}%</span>
                            </div>
                        </div>
                    </div>

                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 relative">
                        <div
                            className={`h-full bg-gradient-to-r ${companyColor} transition-all duration-1000 relative overflow-hidden`}
                            style={{
                                width: `${totalPercentage}%`,
                                boxShadow: `0 0 15px ${companyGlow}`
                            }}
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-5 overscroll-contain">
                    {relevantSalesmen.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-500 opacity-60">
                            <Target size={40} className="mb-4 animate-pulse" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-center">No target data found for<br />{company}</p>
                        </div>
                    ) : (
                        relevantSalesmen.sort((a, b) => (b.achieved || 0) - (a.achieved || 0)).map((s, idx) => {
                            const target = Number(s.monthly_target || 0);
                            const achieved = Number(s.achieved || 0);
                            const percentage = target > 0 ? Math.min(Math.round((achieved / target) * 100), 100) : 0;

                            return (
                                <div key={idx} className="space-y-2.5 group/item bg-white/5 p-4 rounded-3xl border border-white/5 hover:border-white/10 transition-all duration-300">
                                    <div className="flex justify-between items-end">
                                        <div className="flex flex-col">
                                            <span className="text-[11px] font-black text-slate-100 uppercase tracking-widest group-hover/item:text-white transition-colors">{s.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[11px] font-black italic ${percentage >= 100 ? 'text-emerald-400' : 'text-white'}`}>₹{achieved.toLocaleString('en-IN')}</span>
                                            <span className="text-slate-600 text-[10px] opacity-40">/</span>
                                            <span className="text-[10px] font-bold text-slate-500 tracking-tighter">₹{target.toLocaleString('en-IN')}</span>
                                        </div>
                                    </div>
                                    <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden border border-white/5 relative">
                                        <div
                                            className={`h-full bg-gradient-to-r ${companyColor} transition-all duration-1000 relative overflow-hidden`}
                                            style={{
                                                width: `${percentage}%`,
                                                boxShadow: `0 0 15px ${companyGlow}`
                                            }}
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className={`text-[8px] font-black uppercase tracking-widest ${percentage >= 100 ? 'text-emerald-500' : 'text-slate-500'} opacity-80`}>
                                            {percentage >= 100 ? 'TARGET COMPLETE' : 'Current Progress'}
                                        </span>
                                        <div className={`px-2 py-0.5 rounded-full border flex items-center gap-1.5 ${percentage >= 100
                                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                            : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                                            <div className={`w-1 h-1 rounded-full ${percentage >= 100 ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></div>
                                            <span className="text-[9px] font-black">{percentage}%</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="p-6 bg-slate-950/40 border-t border-white/5 backdrop-blur-md">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                        <span className="flex items-center gap-2">
                            <TrendingUp size={12} className="opacity-50" />
                            {company} TEAM
                        </span>
                        <span>{relevantSalesmen.length} ACTIVE</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CompanyDetailsModal;
