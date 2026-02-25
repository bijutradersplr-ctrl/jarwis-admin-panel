import React, { useState, useMemo } from 'react';
import {
    Trophy,
    Medal,
    Star,
    Target,
    TrendingUp,
    Award,
    ChevronRight,
    Search,
    User,
    Crown,
    CheckCircle2,
    X
} from 'lucide-react';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase';

const BADGE_OPTIONS = [
    { id: 'star_week', label: 'Star of the Week', icon: <Star size={16} className="text-amber-400" />, color: 'bg-amber-400/10 text-amber-500' },
    { id: 'best_collector', label: 'Best Collector', icon: <Trophy size={16} className="text-emerald-400" />, color: 'bg-emerald-400/10 text-emerald-500' },
    { id: 'top_closer', label: 'Top Closer', icon: <Target size={16} className="text-blue-400" />, color: 'bg-blue-400/10 text-blue-500' },
    { id: 'speedster', label: 'Fastest Sync', icon: <TrendingUp size={16} className="text-indigo-400" />, color: 'bg-indigo-400/10 text-indigo-500' }
];

const LeaderboardView = ({ topPerformers }) => {
    const [selectedSalesman, setSelectedSalesman] = useState(null);
    const [isUpdating, setIsUpdating] = useState(false);

    // Filtered rankings (just returning the original list since search is removed)
    const rankings = topPerformers;

    const first = topPerformers[0];
    const second = topPerformers[1];
    const third = topPerformers[2];

    const handleToggleBadge = async (salesman, badge) => {
        if (isUpdating) return;
        setIsUpdating(true);
        try {
            const userRef = doc(db, "users", salesman.id);
            const currentAwards = salesman.awards || [];
            const hasBadge = currentAwards.some(a => a.id === badge.id);

            if (hasBadge) {
                const existingBadge = currentAwards.find(a => a.id === badge.id);
                await updateDoc(userRef, {
                    awards: arrayRemove(existingBadge)
                });
            } else {
                await updateDoc(userRef, {
                    awards: arrayUnion({
                        id: badge.id,
                        label: badge.label,
                        assigned_at: new Date().toISOString()
                    }),
                    new_badge_notification: {
                        id: badge.id,
                        label: badge.label,
                        timestamp: new Date().toISOString(),
                        isRead: false
                    }
                });
            }
        } catch (err) {
            console.error("Badge Update Error:", err);
            alert("Failed to update badge: " + err.message);
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            {/* TOP 3 PODIUM */}
            <div className="flex justify-center items-end gap-2 md:gap-4 mt-8 h-48">
                {/* 2nd Place */}
                {second && (
                    <div className="flex flex-col items-center flex-1 max-w-[120px]">
                        <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-slate-400 flex items-center justify-center text-slate-400 relative mb-2">
                            <span className="text-xl font-black">{second.name.charAt(0)}</span>
                            <div className="absolute -top-2 -right-2 w-7 h-7 bg-slate-500 rounded-full flex items-center justify-center text-white border-2 border-slate-900 shadow-lg">
                                <Medal size={14} />
                            </div>
                        </div>
                        <div className="bg-slate-800/80 backdrop-blur-md w-full h-24 rounded-t-2xl border border-white/5 p-2 text-center flex flex-col justify-end pb-4">
                            <span className="text-[10px] font-black text-white uppercase truncate px-1">{second.name}</span>
                            <span className="text-xs font-black text-slate-400">{Math.round(second.score)} Score</span>
                            <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest mt-1">RANK #{second.rank}</span>
                        </div>
                    </div>
                )}

                {/* 1st Place */}
                {first && (
                    <div className="flex flex-col items-center flex-1 max-w-[140px] z-10">
                        <div className="w-20 h-20 rounded-full bg-slate-800 border-4 border-amber-500 flex items-center justify-center text-amber-500 relative mb-2 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                            <span className="text-2xl font-black">{first.name.charAt(0)}</span>
                            <div className="absolute -top-3 -right-3 w-9 h-9 bg-amber-500 rounded-full flex items-center justify-center text-white border-2 border-slate-900 shadow-lg animate-bounce">
                                <Crown size={18} />
                            </div>
                        </div>
                        <div className="bg-gradient-to-t from-amber-600/20 to-amber-500/40 backdrop-blur-md w-full h-32 rounded-t-2xl border border-amber-500/30 p-2 text-center flex flex-col justify-end pb-4 shadow-xl">
                            <span className="text-xs font-black text-white uppercase truncate px-1">{first.name}</span>
                            <span className="text-sm font-black text-amber-400">{Math.round(first.score)} Score</span>
                            <span className="text-[9px] font-black text-amber-600 uppercase tracking-[0.2em] mt-1">PERFORMER</span>
                        </div>
                    </div>
                )}

                {/* 3rd Place */}
                {third && (
                    <div className="flex flex-col items-center flex-1 max-w-[120px]">
                        <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-orange-700/50 flex items-center justify-center text-orange-700 relative mb-2">
                            <span className="text-xl font-black">{third.name.charAt(0)}</span>
                            <div className="absolute -top-2 -right-2 w-7 h-7 bg-orange-700 rounded-full flex items-center justify-center text-white border-2 border-slate-900 shadow-lg">
                                <Award size={14} />
                            </div>
                        </div>
                        <div className="bg-slate-800/80 backdrop-blur-md w-full h-20 rounded-t-2xl border border-white/5 p-2 text-center flex flex-col justify-end pb-4">
                            <span className="text-[10px] font-black text-white uppercase truncate px-1">{third.name}</span>
                            <span className="text-xs font-black text-orange-700">{Math.round(third.score)} Score</span>
                            <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest mt-1">RANK #{third.rank}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* RANKING LIST */}
            <div className="bg-slate-900/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-6 shadow-2xl relative overflow-hidden">
                <div className="flex items-center justify-between mb-6 px-4">
                    <h3 className="text-lg font-black text-white uppercase italic tracking-tight flex items-center gap-2">
                        <TrendingUp size={20} className="text-blue-400" />
                        Rankings & Badges
                    </h3>
                </div>

                <div className="space-y-4">
                    {rankings.map((s, idx) => (
                        <div
                            key={s.id}
                            className={`group bg-white/5 p-4 rounded-3xl border border-white/5 flex items-center justify-between hover:border-white/10 transition-all ${selectedSalesman?.id === s.id ? 'ring-2 ring-blue-500/30 bg-blue-500/5' : ''}`}
                            onClick={() => setSelectedSalesman(selectedSalesman?.id === s.id ? null : s)}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${idx === 0 ? 'bg-amber-500 text-white' : idx === 1 ? 'bg-slate-400 text-white' : idx === 2 ? 'bg-orange-700 text-white' : 'bg-slate-800 text-slate-500'}`}>
                                    {idx + 1}
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-white uppercase tracking-tight">
                                        {s.name}: {Math.round(s.score)} Score - Rank {s.rank}
                                    </h4>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest italic">{s.percentage}% Sales | {Math.round(s.score)} Balanced</span>
                                        {s.awards && s.awards.length > 0 && (
                                            <div className="flex gap-1">
                                                {s.awards.map(a => (
                                                    <div key={a.id} className="w-4 h-4 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px]" title={a.label}>
                                                        {BADGE_OPTIONS.find(b => b.id === a.id)?.icon || '🏆'}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <button className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                <Award size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* BADGE ASSIGNMENT DRAWER (Conditional) */}
            {selectedSalesman && (
                <div className="fixed inset-x-0 bottom-20 z-50 p-4 animate-in slide-in-from-bottom-full duration-500">
                    <div className="max-w-xl mx-auto bg-slate-900 border border-white/20 rounded-[2.5rem] shadow-2xl p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl pointer-events-none"></div>

                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                                    <Award size={20} />
                                </div>
                                <div>
                                    <h4 className="text-base font-black text-white uppercase tracking-tight italic">Assign Badges</h4>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{selectedSalesman.name}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedSalesman(null)}
                                className="p-2 hover:bg-white/5 rounded-xl text-slate-500 transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {BADGE_OPTIONS.map(b => {
                                const hasBadge = selectedSalesman.awards?.some(a => a.id === b.id);
                                return (
                                    <button
                                        key={b.id}
                                        onClick={() => handleToggleBadge(selectedSalesman, b)}
                                        disabled={isUpdating}
                                        className={`flex items-center gap-3 p-4 rounded-2xl border transition-all text-left ${hasBadge ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'}`}
                                    >
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${hasBadge ? 'bg-white/20' : b.color}`}>
                                            {b.icon}
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-tight">{b.label}</p>
                                            {hasBadge && <CheckCircle2 size={12} className="mt-1" />}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        <p className="text-center text-[9px] font-black text-slate-500 uppercase tracking-widest mt-6 italic opacity-50">
                            Updates sync instantly with the mobile app
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LeaderboardView;
