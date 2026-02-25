import React, { useState, useEffect } from 'react';
import { ArrowLeft, Target, Save, Users, AlertCircle, Check, ShieldAlert, Trash2, Plus, X } from 'lucide-react';
import { collection, updateDoc, doc, getDocs, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

export default function TargetSettingsView({ salesmenData, onBack, allPayments = [], masterPlans = {} }) {
    const [targets, setTargets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(null);
    const [saving, setSaving] = useState(null);
    const [removing, setRemoving] = useState(null);

    // Add Salesman State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [adding, setAdding] = useState(false);
    const [newSalesman, setNewSalesman] = useState({
        name: '',
        company: 'Cadbury',
        monthly_target: '',
        working_days: 26
    });

    useEffect(() => {
        fetchTargets();
    }, [allPayments, masterPlans]); // Re-run if payments or masterPlans update

    const fetchTargets = async () => {
        try {
            console.log("Fetching targets from 'users' collection...");
            const snap = await getDocs(collection(db, "users"));
            const data = [];

            // Current Month ID for filtering payments (e.g. "2023-10")
            const currentMonth = new Date().toISOString().slice(0, 7);

            snap.forEach(d => {
                const u = d.data();
                // FIX: Removed "|| true" which was causing deleted users to show
                if (u.role === 'salesman' || u.salesman_name || u.role === 'admin') {
                    // FIX: Explicitly exclude removed users
                    if (u.role === 'removed') return;

                    const name = u.salesman_name || u.name;
                    if (name && name !== 'Admin') {
                        const sId = name.trim().toUpperCase();
                        const monthlyPayments = allPayments.filter(p => {
                            if (p.status !== 'Approved') return false;
                            const pSid = (p.salesman_id || '').trim().toUpperCase();
                            const pSName = (p.salesman || '').trim().toUpperCase();
                            if (pSid !== sId && pSName !== sId) return false;
                            try {
                                return p.timestamp?.toDate().toISOString().slice(0, 7) === currentMonth;
                            } catch (e) { return false; }
                        });

                        const achieved = monthlyPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

                        const todayStr = new Date().toLocaleDateString('en-CA');
                        const achievedToday = monthlyPayments
                            .filter(p => {
                                try {
                                    return p.timestamp?.toDate().toLocaleDateString('en-CA') === todayStr;
                                } catch (e) { return false; }
                            })
                            .reduce((sum, p) => sum + Number(p.amount || 0), 0);

                        // Get Company from Master Plans
                        // Try exact ID match first, then normalize
                        let company = 'Others';
                        if (masterPlans && masterPlans[d.id]) {
                            company = masterPlans[d.id].company || 'Others';
                        } else {
                            // Try finding by normalized key if ID doesn't match directly
                            const normKey = Object.keys(masterPlans).find(k => k.replace(/[^A-Z0-9]/g, '') === d.id.replace(/[^A-Z0-9]/g, ''));
                            if (normKey) company = masterPlans[normKey].company || 'Others';
                        }

                        data.push({
                            id: d.id,
                            name: name,
                            company: company,
                            monthly_target: Number(u.monthly_target || 0),
                            working_days: Number(u.working_days || 26),
                            total_achieved: Number(u.total_achieved || 0),
                            achieved: achieved,
                            achievedToday: achievedToday,
                            role: u.role,
                            isLinked: true
                        });
                    }
                }
            });

            // Check for unlinked salesmen (present in salesmenData but not in users)
            if (salesmenData && salesmenData.length > 0) {
                const linkedNames = new Set(data.map(d => d.name.toUpperCase()));
                salesmenData.forEach(s => {
                    const sName = (s.salesman_name || s.id).toUpperCase();
                    if (!linkedNames.has(sName)) {
                        const hasUid = !!s.uid;

                        const monthlyPayments = allPayments.filter(p => {
                            if (p.status !== 'Approved') return false;
                            if ((p.salesman_id || '').trim().toUpperCase() !== sName) return false;
                            try {
                                return p.timestamp?.toDate().toISOString().slice(0, 7) === currentMonth;
                            } catch (e) { return false; }
                        });

                        const achieved = monthlyPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

                        const todayStr = new Date().toLocaleDateString('en-CA');
                        const achievedToday = monthlyPayments
                            .filter(p => {
                                try {
                                    return p.timestamp?.toDate().toLocaleDateString('en-CA') === todayStr;
                                } catch (e) { return false; }
                            })
                            .reduce((sum, p) => sum + Number(p.amount || 0), 0);

                        // Try to find company for unlinked
                        let company = 'Others';
                        // Searching by ID or Name in masterPlans
                        const planId = Object.keys(masterPlans).find(k => k === s.id || k === s.salesman_name);
                        if (planId) company = masterPlans[planId].company || 'Others';

                        data.push({
                            id: hasUid ? s.uid : s.id,
                            name: s.salesman_name || s.id,
                            company: company,
                            monthly_target: 0,
                            working_days: 26,
                            achieved: achieved,
                            achievedToday: achievedToday,
                            role: hasUid ? 'salesman (via sync)' : 'salesman (unlinked)',
                            isLinked: hasUid
                        });
                    }
                });
            }

            // Sort by Company then Name
            data.sort((a, b) => {
                if (a.company < b.company) return -1;
                if (a.company > b.company) return 1;
                return a.name.localeCompare(b.name);
            });

            setTargets(data);
            setFetchError(null);
        } catch (e) {
            console.error("Fetch Targets Error:", e);
            setFetchError(e.message);

            // Fallback ONLY to salesmenData if permission denied
            if (salesmenData && salesmenData.length > 0) {
                const fallbackData = salesmenData.map(s => {
                    // Start Calc Achieved (Copy-paste logic from main block)
                    const sName = (s.salesman_name || s.id).trim().toUpperCase();
                    const currentMonth = new Date().toISOString().slice(0, 7);

                    const achieved = allPayments
                        .filter(p => {
                            if (p.status !== 'Approved') return false;
                            if ((p.salesman_id || '').trim().toUpperCase() !== sName) return false;
                            try {
                                return p.timestamp?.toDate().toISOString().slice(0, 7) === currentMonth;
                            } catch (e) { return false; }
                        })
                        .reduce((sum, p) => sum + Number(p.amount || 0), 0);

                    return {
                        id: s.id,
                        name: s.salesman_name || s.id,
                        company: 'Others', // Fallback
                        monthly_target: 0,
                        working_days: 26,
                        achieved: achieved,
                        role: 'salesman (unlinked)',
                        isLinked: false
                    };
                });
                setTargets(fallbackData.sort((a, b) => a.name.localeCompare(b.name)));
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (user) => {
        setSaving(user.id);
        try {
            const userRef = doc(db, "users", user.id);
            const updateData = {
                monthly_target: Number(user.monthly_target),
                working_days: Number(user.working_days),
                total_achieved: Number(user.total_achieved),
                achieved_month: new Date().toISOString().slice(0, 7)
            };

            if (!user.isLinked) {
                // Create preset account
                await setDoc(userRef, {
                    ...updateData,
                    name: user.name,
                    role: 'salesman',
                    salesman_name: user.name,
                    is_preset: true
                });
            } else {
                await updateDoc(userRef, updateData);
            }
            setTimeout(() => setSaving(null), 1000);
        } catch (e) {
            console.error("Save Error:", e);
            alert("Failed to save target: " + e.message);
            setSaving(null);
        }
    };

    const handleRemove = async (user) => {
        if (!window.confirm(`Are you sure you want to REMOVE "${user.name}"?\n\nThis will hide them from the list but keep historical data.`)) return;

        setRemoving(user.id);
        try {
            await updateDoc(doc(db, "users", user.id), { role: 'removed' });
            // Optimistic update
            setTargets(prev => prev.filter(t => t.id !== user.id));
        } catch (e) {
            console.error("Remove Error:", e);
            alert("Failed to remove: " + e.message);
        } finally {
            setRemoving(null);
        }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newSalesman.name || !newSalesman.monthly_target) {
            alert("Please fill in Name and Target.");
            return;
        }

        setAdding(true);
        try {
            const id = newSalesman.name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
            const name = newSalesman.name.trim();

            // 1. Create User Document
            await setDoc(doc(db, "users", id), {
                name: name,
                salesman_name: name,
                role: 'salesman',
                monthly_target: Number(newSalesman.monthly_target),
                working_days: Number(newSalesman.working_days),
                total_achieved: 0,
                current_rank: null,
                current_score: 0,
                created_at: serverTimestamp()
            }, { merge: true });

            // 2. Create Master Plan Document
            await setDoc(doc(db, "salesman_master_plan", id), {
                salesman: name,
                company: newSalesman.company,
                routes: {},
                last_updated: serverTimestamp()
            }, { merge: true });

            // 3. Refresh List (or optimistic add)
            // For simplicity, we'll just reload the list by calling fetchTargets or adding to state
            alert("Salesman Added Successfully!");
            setIsAddModalOpen(false);
            setNewSalesman({ name: '', company: 'Cadbury', monthly_target: '', working_days: 26 });
            fetchTargets(); // Reload to be safe

        } catch (e) {
            console.error("Add Error:", e);
            alert("Failed to add salesman: " + e.message);
        } finally {
            setAdding(false);
        }
    };

    const updateField = (id, field, value) => {
        setTargets(prev => prev.map(t =>
            t.id === id ? { ...t, [field]: value } : t
        ));
    };

    return (
        <>
            <div className="space-y-6 animate-fade-in pb-20">
                <div className="flex items-center gap-4 mb-2">
                    <button onClick={onBack} className="p-3 bg-white/5 rounded-2xl border border-white/10 text-slate-300 hover:bg-white/10 active:scale-90 transition-all shadow-xl backdrop-blur-md">
                        <ArrowLeft size={24} />
                    </button>
                    <div className="flex-1">
                        <h3 className="text-sm font-black text-amber-400 uppercase tracking-[0.3em]">Salesman Targets</h3>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Set Goals for {targets.length} Salesmen</p>
                    </div>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="p-3 bg-amber-500 rounded-2xl text-slate-900 border border-amber-400 shadow-lg hover:bg-amber-400 active:scale-95 transition-all flex items-center gap-2"
                    >
                        <Plus size={20} />
                        <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Add Salesman</span>
                    </button>
                </div>

                {loading ? (
                    <div className="py-20 text-center animate-pulse">
                        <Target size={48} className="mx-auto mb-4 text-slate-700" />
                        <p className="text-xs font-black uppercase tracking-widest text-slate-500">Loading Configuration...</p>
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {targets.map(user => {
                            const dailyGoal = user.working_days > 0
                                ? (user.monthly_target / user.working_days).toFixed(0)
                                : 0;
                            const isSaved = saving === user.id;

                            return (
                                <div key={user.id} className="bg-slate-900/40 border border-white/5 rounded-[2.5rem] p-8 hover:bg-white/[0.02] transition-colors group relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-[50px] rounded-full group-hover:bg-amber-500/10 transition-all"></div>

                                    <div className="relative z-10">
                                        <div className="flex items-start justify-between mb-8">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 text-amber-500">
                                                    <Users size={20} />
                                                </div>
                                                <div>
                                                    <h4 className="text-lg font-black text-white uppercase tracking-tight">{user.name}</h4>
                                                    {!user.isLinked ? (
                                                        <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest flex items-center gap-1.5 mt-1">
                                                            <ShieldAlert size={10} /> Preset Account (Not Registered)
                                                        </p>
                                                    ) : (
                                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">UID: {user.id.substring(0, 8)}...</p>
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleRemove(user)}
                                                disabled={removing === user.id}
                                                className="p-2 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all active:scale-90"
                                                title="Remove Salesman"
                                            >
                                                {removing === user.id ? <div className="animate-spin w-4 h-4 border-2 border-red-500/30 border-t-red-500 rounded-full"></div> : <Trash2 size={18} />}
                                            </button>
                                        </div>

                                        <div className="grid md:grid-cols-3 gap-6 mb-8">
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Monthly Target (₹)</label>
                                                <input
                                                    type="number"
                                                    disabled={false}
                                                    value={user.monthly_target}
                                                    onChange={(e) => updateField(user.id, 'monthly_target', e.target.value)}
                                                    className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-4 px-6 text-xl font-black text-white outline-none focus:border-amber-500/50 transition-all placeholder-slate-800"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-emerald-500 uppercase tracking-widest ml-1">Total Sales (This Month)</label>
                                                <input
                                                    type="number"
                                                    disabled={false}
                                                    value={user.total_achieved}
                                                    onChange={(e) => updateField(user.id, 'total_achieved', e.target.value)}
                                                    className="w-full bg-slate-950/50 border border-emerald-500/10 rounded-2xl py-4 px-6 text-xl font-black text-emerald-400 outline-none focus:border-emerald-500/50 transition-all placeholder-slate-800"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Working Days</label>
                                                <input
                                                    type="number"
                                                    disabled={false}
                                                    value={user.working_days}
                                                    onChange={(e) => updateField(user.id, 'working_days', e.target.value)}
                                                    className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-4 px-6 text-xl font-black text-white outline-none focus:border-amber-500/50 transition-all placeholder-slate-800"
                                                />
                                            </div>
                                        </div>

                                        {/* Stats Row */}
                                        <div className="grid grid-cols-3 gap-3 mb-6">
                                            <div className="bg-white/5 rounded-2xl p-4 border border-white/5 flex flex-col justify-center">
                                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Achieved (Month)</p>
                                                <p className="text-sm font-black text-emerald-400">₹{user.achieved.toLocaleString('en-IN')}</p>
                                            </div>
                                            <div className="bg-white/5 rounded-2xl p-4 border border-emerald-500/20 flex flex-col justify-center shadow-[0_4px_20px_-5px_rgba(16,185,129,0.1)]">
                                                <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mb-1">Achieved Today</p>
                                                <p className="text-sm font-black text-emerald-400">₹{user.achievedToday.toLocaleString('en-IN')}</p>
                                            </div>
                                            <div className="bg-white/5 rounded-2xl p-4 border border-white/5 flex flex-col justify-center">
                                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Req. Daily</p>
                                                <p className="text-sm font-black text-amber-400">₹{Number(dailyGoal).toLocaleString('en-IN')}</p>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleSave(user)}
                                            disabled={saving === user.id}
                                            className={`w-full py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-amber-500/20 ${saving === user.id ? 'bg-amber-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-amber-500 hover:text-white border border-white/5'}`}
                                        >
                                            {saving === user.id ? (
                                                <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></div>
                                            ) : !user.isLinked ? (
                                                <><ShieldAlert size={14} /> PRESET GOAL</>
                                            ) : (
                                                <><Save size={14} /> Save Changes</>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ADD SALESMAN MODAL */}
            {
                isAddModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" onClick={() => setIsAddModalOpen(false)}></div>
                        <div className="bg-slate-900 border border-white/10 w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-300">
                            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-amber-500/10">
                                <h2 className="text-2xl font-black text-white uppercase italic">Add New Salesman</h2>
                                <button onClick={() => setIsAddModalOpen(false)} className="p-3 bg-white/5 rounded-2xl text-slate-500 hover:text-white transition-all">
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleAdd} className="p-8 space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Salesman Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={newSalesman.name}
                                        onChange={(e) => setNewSalesman({ ...newSalesman, name: e.target.value })}
                                        className="w-full bg-slate-950 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold text-white outline-none focus:border-amber-500/50 transition-all placeholder-slate-700"
                                        placeholder="e.g. Rahul K"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Assigned Company</label>
                                    <div className="relative">
                                        <select
                                            value={newSalesman.company}
                                            onChange={(e) => setNewSalesman({ ...newSalesman, company: e.target.value })}
                                            className="w-full bg-slate-950 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold text-white outline-none focus:border-amber-500/50 appearance-none cursor-pointer transition-all hover:bg-white/[0.02]"
                                        >
                                            <option value="Cadbury">Cadbury</option>
                                            <option value="Britannia">Britannia</option>
                                            <option value="Colgate">Colgate</option>
                                            <option value="Other">Other</option>
                                        </select>
                                        <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">▼</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Monthly Target (₹)</label>
                                        <input
                                            type="number"
                                            required
                                            value={newSalesman.monthly_target}
                                            onChange={(e) => setNewSalesman({ ...newSalesman, monthly_target: e.target.value })}
                                            className="w-full bg-slate-950 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold text-white outline-none focus:border-amber-500/50 transition-all placeholder-slate-700"
                                            placeholder="0"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Working Days</label>
                                        <input
                                            type="number"
                                            required
                                            value={newSalesman.working_days}
                                            onChange={(e) => setNewSalesman({ ...newSalesman, working_days: e.target.value })}
                                            className="w-full bg-slate-950 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold text-white outline-none focus:border-amber-500/50 transition-all placeholder-slate-700"
                                        />
                                    </div>
                                </div>

                                <div className="pt-6">
                                    <button
                                        type="submit"
                                        disabled={adding}
                                        className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-slate-900 font-black uppercase tracking-widest rounded-2xl transition-all active:scale-95 shadow-[0_10px_30px_rgba(245,158,11,0.3)] flex items-center justify-center gap-2"
                                    >
                                        {adding ? (
                                            <>
                                                <div className="animate-spin w-4 h-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full"></div>
                                                Creating Profile...
                                            </>
                                        ) : (
                                            <>
                                                <Plus size={18} />
                                                Create Salesman Profile
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </>
    );
}
