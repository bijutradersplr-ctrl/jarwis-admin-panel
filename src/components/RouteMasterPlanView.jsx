import React, { useState, useEffect } from 'react';
import { ArrowLeft, Map, Save, Check, AlertCircle, Truck } from 'lucide-react';
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

export default function RouteMasterPlanView({ salesmenData, onBack }) {
    const [selectedSalesman, setSelectedSalesman] = useState('');
    const [selectedCompany, setSelectedCompany] = useState('Cadbury');
    const [routes, setRoutes] = useState({
        monday: '', tuesday: '', wednesday: '', thursday: '', friday: '', saturday: ''
    });
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState('');

    // Derived list of routes: Scan both s.routes and s.bills for maximum reliability
    const availableRoutes = React.useMemo(() => {
        const allUnique = new Set();
        const salesmanRoutes = new Set();

        const selectedSid = selectedSalesman?.trim().toUpperCase();

        salesmenData.forEach(s => {
            const currentSid = s.id.trim().toUpperCase();

            // 1. From routes array
            if (s.routes && Array.isArray(s.routes)) {
                s.routes.forEach(r => {
                    if (r && typeof r === 'string') {
                        const trimmed = r.trim().toUpperCase();
                        allUnique.add(trimmed);
                        if (currentSid === selectedSid) salesmanRoutes.add(trimmed);
                    }
                });
            }

            // 2. From bills (Directly from bill data)
            if (s.bills && Array.isArray(s.bills)) {
                s.bills.forEach(b => {
                    const r = b.Route || b.route;
                    if (r && typeof r === 'string') {
                        const trimmed = r.trim().toUpperCase();
                        allUnique.add(trimmed);
                        if (currentSid === selectedSid) salesmanRoutes.add(trimmed);
                    }
                });
            }
        });

        return Array.from(allUnique).map(name => ({
            name,
            isHis: salesmanRoutes.has(name)
        })).sort((a, b) => a.name.localeCompare(b.name));
    }, [salesmenData, selectedSalesman]);

    // Derived list of salesmen
    const salesmenList = React.useMemo(() => {
        return salesmenData.map(s => ({
            id: s.id, // Salesman Name (Document ID)
            name: s.salesman_name || s.id,
            uid: s.uid
        })).sort((a, b) => a.name.localeCompare(b.name));
    }, [salesmenData]);

    useEffect(() => {
        if (selectedSalesman) {
            fetchPlan(selectedSalesman);
        } else {
            setRoutes({ monday: '', tuesday: '', wednesday: '', thursday: '', friday: '', saturday: '' });
            setStatus('');
        }
    }, [selectedSalesman]);

    const fetchPlan = async (salesmanId) => {
        setLoading(true);
        try {
            // Document ID in 'salesman_master_plan' is the Salesman Name (uppercase)
            const docRef = doc(db, "salesman_master_plan", salesmanId);
            const snap = await getDoc(docRef);

            if (snap.exists()) {
                const data = snap.data();
                if (data.company) setSelectedCompany(data.company);
                if (data.routes) {
                    // Start with empty then merge
                    const newRoutes = { monday: '', tuesday: '', wednesday: '', thursday: '', friday: '', saturday: '' };
                    // Normalize keys to lowercase just in case
                    Object.keys(data.routes).forEach(k => {
                        if (newRoutes.hasOwnProperty(k.toLowerCase())) {
                            newRoutes[k.toLowerCase()] = data.routes[k];
                        }
                    });
                    setRoutes(newRoutes);
                }
                setStatus('Plan Loaded');
            } else {
                setRoutes({ monday: '', tuesday: '', wednesday: '', thursday: '', friday: '', saturday: '' });
                setStatus('No existing plan found. Create one below.');
            }
        } catch (e) {
            console.error("Fetch Plan Error:", e);
            setStatus('Error loading plan: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!selectedSalesman) return;
        setSaving(true);
        setStatus('Saving...');

        try {
            const salesmanObj = salesmenList.find(s => s.id === selectedSalesman);
            const uid = salesmanObj?.uid || null;

            const data = {
                salesman: selectedSalesman,
                company: selectedCompany,
                routes: routes,
                last_updated: serverTimestamp()
            };

            if (uid) data.uid = uid; // Save UID for security rules

            await setDoc(doc(db, "salesman_master_plan", selectedSalesman), data);
            setStatus('Plan Saved Successfully!');
            setTimeout(() => setStatus(''), 3000);
        } catch (e) {
            console.error("Save Error:", e);
            if (e.code === 'permission-denied') {
                setStatus('Save Failed: Permission Denied');
                alert("PERMISSION DENIED\n\nYou must update the Firebase Database Rules in the Firebase Console to allow writing to 'salesman_master_plan'.\n\nSee `walkthrough.md` for the exact rules.");
            } else {
                setStatus('Error saving: ' + e.message);
                alert("Save Failed!\n" + e.message);
            }
        } finally {
            setSaving(false);
        }
    };

    const updateRoute = (day, value) => {
        setRoutes(prev => ({ ...prev, [day]: value }));
    };

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            <div className="flex items-center gap-4 mb-2">
                <button onClick={onBack} className="p-3 bg-white/5 rounded-2xl border border-white/10 text-slate-300 hover:bg-white/10 active:scale-90 transition-all shadow-xl backdrop-blur-md">
                    <ArrowLeft size={24} />
                </button>
                <div className="flex-1">
                    <h3 className="text-sm font-black text-indigo-400 uppercase tracking-[0.3em]">Route Master Plan</h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Assign Weekly Routes & Companies</p>
                </div>
            </div>

            <div className="bg-slate-900/40 border border-white/5 rounded-[2rem] p-6 md:p-8 space-y-8 relative overflow-hidden">
                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[80px] rounded-full pointer-events-none"></div>

                {/* SELECTORS */}
                <div className="grid md:grid-cols-2 gap-6 relative z-10">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Select Salesman</label>
                        <div className="relative group">
                            <Truck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
                            <select
                                value={selectedSalesman}
                                onChange={(e) => setSelectedSalesman(e.target.value)}
                                className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-xs font-bold text-white outline-none focus:border-indigo-500/50 appearance-none cursor-pointer transition-all hover:bg-white/[0.02]"
                            >
                                <option value="" className="bg-slate-950 text-white">-- Choose Salesman --</option>
                                {salesmenList.map(s => (
                                    <option key={s.id} value={s.id} className="bg-slate-950 text-white">{s.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Assign Company</label>
                        <div className="relative group">
                            <Map className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
                            <select
                                value={selectedCompany}
                                onChange={(e) => setSelectedCompany(e.target.value)}
                                className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-xs font-bold text-white outline-none focus:border-indigo-500/50 appearance-none cursor-pointer transition-all hover:bg-white/[0.02]"
                            >
                                <option value="Cadbury" className="bg-slate-950 text-white">Cadbury</option>
                                <option value="Britannia" className="bg-slate-950 text-white">Britannia</option>
                                <option value="Colgate" className="bg-slate-950 text-white">Colgate</option>
                                <option value="Other" className="bg-slate-950 text-white">Other</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* WEEKLY SCHEDULE */}
                {selectedSalesman && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center justify-between border-b border-white/5 pb-4">
                            <h4 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                Weekly Route Schedule
                            </h4>
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${status.includes('Error') ? 'text-red-400' : 'text-emerald-400'}`}>
                                {loading ? 'Loading...' : status}
                            </span>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].map((day) => (
                                <div key={day} className="space-y-1.5">
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">{day}</label>
                                    <div className="relative">
                                        <select
                                            value={routes[day]}
                                            onChange={(e) => updateRoute(day, e.target.value)}
                                            disabled={loading}
                                            className="w-full bg-white/5 border border-white/5 rounded-xl py-3 px-4 text-xs font-medium text-slate-300 outline-none focus:border-indigo-500/50 focus:text-white focus:bg-slate-900/50 appearance-none cursor-pointer transition-all"
                                        >
                                            <option value="" className="bg-slate-950 text-white">-- No Route --</option>

                                            {/* His Specific Routes */}
                                            {selectedSalesman && (
                                                <optgroup label="ASSIGNED IN BILLS" className="bg-slate-950 text-indigo-400 font-black text-[10px]">
                                                    {availableRoutes.filter(r => r.isHis).map(r => (
                                                        <option key={r.name} value={r.name} className="bg-slate-950 text-white font-bold">{r.name}</option>
                                                    ))}
                                                </optgroup>
                                            )}

                                            {/* All Other Routes */}
                                            <optgroup label="ALL SYSTEM ROUTES" className="bg-slate-950 text-slate-500 font-black text-[10px]">
                                                {availableRoutes.filter(r => !r.isHis).map(r => (
                                                    <option key={r.name} value={r.name} className="bg-slate-950 text-white font-medium">{r.name}</option>
                                                ))}
                                            </optgroup>
                                        </select>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* SAVE ACTION */}
                        <div className="pt-4 flex justify-end">
                            <button
                                onClick={handleSave}
                                disabled={saving || loading}
                                className={`px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3 transition-all shadow-lg hover:shadow-indigo-500/20 ${saving ? 'bg-indigo-600 text-white cursor-wait' : 'bg-white text-indigo-950 hover:bg-indigo-50 active:scale-95'}`}
                            >
                                {saving ? <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></div> : <Save size={16} />}
                                {saving ? 'Saving Plan...' : 'Save Master Plan'}
                            </button>
                        </div>
                    </div>
                )}

                {/* EMPTY STATE */}
                {!selectedSalesman && (
                    <div className="py-12 text-center opacity-30 flex flex-col items-center">
                        <Map size={48} className="mb-4" />
                        <p className="text-xs font-black uppercase tracking-widest">Select a Salesman to Manage Routes</p>
                    </div>
                )}
            </div>
        </div>
    );
}
