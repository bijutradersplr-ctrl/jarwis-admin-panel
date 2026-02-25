import React, { useState } from 'react';
import {
    Compass,
    ChevronDown,
    MapPin,
    Clock,
    ArrowRight
} from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

const calculateDaysOld = (dateStr) => {
    if (!dateStr) return 0;
    try {
        const parts = dateStr.split('-');
        const billDate = new Date(parts[2], parts[1] - 1, parts[0]);
        const today = new Date();
        const diffTime = Math.abs(today - billDate);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } catch (e) {
        return 0;
    }
};

export default function RouteExplorerModal({ isOpen, onClose, salesmenData, allPayments, isAdmin = false, onApprove, forceSalesmanId }) {
    const [selectedSalesman, setSelectedSalesman] = useState(forceSalesmanId || '');
    const [selectedRoute, setSelectedRoute] = useState('');
    const [isSalesmanOpen, setIsSalesmanOpen] = useState(false);
    const [isRouteOpen, setIsRouteOpen] = useState(false);
    const [isCollecting, setIsCollecting] = useState(false);
    const [collShop, setCollShop] = useState(null);
    const [collAmount, setCollAmount] = useState('');
    const [displayedShopsLimit, setDisplayedShopsLimit] = useState(3);

    if (!isOpen) return null;

    // Get selected salesman data
    const activeSalesmanId = (forceSalesmanId || selectedSalesman || '').trim().toUpperCase();
    const salesman = salesmenData.find(s => s.id.trim().toUpperCase() === activeSalesmanId);

    // Filter payments for this salesman today
    const todayStr = new Date().toLocaleDateString('en-CA');
    const salesmanPayments = allPayments.filter(p =>
        (p.salesman || '').trim().toUpperCase() === activeSalesmanId &&
        p.timestamp && typeof p.timestamp.toDate === 'function' &&
        p.timestamp.toDate().toLocaleDateString('en-CA') === todayStr
    );

    // Extract unique routes for the selected salesman
    const routes = salesman ? [...new Set(salesman.bills?.map(b => (b.Route || "").trim().toUpperCase()).filter(Boolean))] : [];

    // Filter bills based on route
    const filteredBills = salesman?.bills?.filter(b => (b.Route || "").trim().toUpperCase() === selectedRoute) || [];

    // Calculate total for the route
    const routeTotal = filteredBills.reduce((acc, b) => acc + (Number(b.Amount) || 0), 0);

    const handleQuickCollect = async (e) => {
        e.preventDefault();
        if (!collAmount || isNaN(collAmount) || Number(collAmount) <= 0) return;

        setIsCollecting(true);
        try {
            await addDoc(collection(db, "pending_collections"), {
                salesman: activeSalesmanId,
                party: collShop.name,
                bill_no: collShop.bills[0]?.['Bill No'] || collShop.bills[0]?.bill_no || "N/A",
                route: selectedRoute,
                amount: Number(collAmount),
                payment_type: "Cash",
                status: "Pending",
                timestamp: serverTimestamp(),
                bill_date: collShop.bills[0]?.['Bill Date'] || collShop.bills[0]?.Date || null,
                total_bill_amount: collShop.total
            });
            setCollShop(null);
            setCollAmount('');
            alert("Collection logged! Awaiting approval.");
        } catch (err) {
            console.error("Quick Collect Error:", err);
            alert("Failed to log collection.");
        } finally {
            setIsCollecting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2">
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" onClick={onClose}></div>
            <div className="bg-slate-900 border border-white/10 w-full max-w-lg rounded-[2rem] overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-300 flex flex-col h-[95vh]">

                {/* Header */}
                <div className="px-4 py-2 border-b border-white/5 bg-indigo-900/10 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-indigo-500/20 rounded-md flex items-center justify-center border border-indigo-500/30">
                            <Compass size={14} className="text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-white uppercase italic tracking-tight">Route Explorer <span className="text-[9px] text-indigo-400 ml-1">V3.1</span></h2>
                            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest leading-none">{isAdmin ? "Admin View" : "Collection Mode"}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 bg-white/5 rounded-lg text-slate-500 hover:text-white transition-all text-[10px]">✕</button>
                </div>

                {/* Controls */}
                <div className="px-4 py-2 space-y-2 border-b border-white/5 shrink-0 bg-slate-950/40 relative z-50">
                    {/* Step 1: Salesman Selector */}
                    {!forceSalesmanId && (
                        <div className="relative">
                            <label className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1 block ml-1">Salesman</label>
                            <button
                                onClick={() => {
                                    setIsSalesmanOpen(!isSalesmanOpen);
                                    setIsRouteOpen(false);
                                }}
                                className={`w-full bg-slate-950 border ${isSalesmanOpen ? 'border-indigo-500 ring-1 ring-indigo-500/50' : 'border-white/10 hover:border-white/20'} rounded-lg px-3 py-2 text-left flex items-center justify-between transition-all group active:scale-[0.99]`}
                            >
                                <span className={`text-[10px] font-bold ${selectedSalesman ? 'text-white' : 'text-slate-500 uppercase tracking-wider'}`}>
                                    {selectedSalesman || '-- Choose Salesman --'}
                                </span>
                                <ChevronDown size={14} className={`text-slate-500 transition-transform duration-300 ${isSalesmanOpen ? 'rotate-180 text-indigo-400' : ''}`} />
                            </button>

                            {isSalesmanOpen && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[60] max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200">
                                    <div className="p-1">
                                        {salesmenData.length > 0 ? (
                                            salesmenData.map(s => (
                                                <button
                                                    key={s.id}
                                                    onClick={() => {
                                                        setSelectedSalesman(s.id);
                                                        setSelectedRoute('');
                                                        setIsSalesmanOpen(false);
                                                    }}
                                                    className="w-full text-left px-4 py-3 rounded-lg hover:bg-white/5 flex items-center justify-between group transition-colors"
                                                >
                                                    <span className={`text-xs font-bold ${selectedSalesman === s.id ? 'text-indigo-400' : 'text-slate-300'} group-hover:text-white`}>{s.id}</span>
                                                    {selectedSalesman === s.id && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>}
                                                </button>
                                            ))
                                        ) : (
                                            <div className="p-4 text-center text-[10px] text-slate-500 uppercase font-bold">No Salesmen Found</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 2: Route Selector */}
                    <div className={`relative transition-all duration-300 ${!activeSalesmanId ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                        <label className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1 block ml-1">Route</label>
                        <button
                            onClick={() => {
                                setIsRouteOpen(!isRouteOpen);
                                setIsSalesmanOpen(false);
                            }}
                            className={`w-full bg-slate-950 border ${isRouteOpen ? 'border-indigo-500 ring-1 ring-indigo-500/50' : 'border-white/10 hover:border-white/20'} rounded-lg px-3 py-2 text-left flex items-center justify-between transition-all group active:scale-[0.99]`}
                            disabled={!activeSalesmanId}
                        >
                            <span className={`text-[10px] font-bold ${selectedRoute ? 'text-white' : 'text-slate-500 uppercase tracking-wider'}`}>
                                {selectedRoute || '-- Choose Route --'}
                            </span>
                            <ChevronDown size={14} className={`text-slate-500 transition-transform duration-300 ${isRouteOpen ? 'rotate-180 text-indigo-400' : ''}`} />
                        </button>

                        {isRouteOpen && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[60] max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200">
                                <div className="p-1">
                                    {routes.length > 0 ? (
                                        routes.sort().map(r => (
                                            <button
                                                key={r}
                                                onClick={() => {
                                                    setSelectedRoute(r);
                                                    setIsRouteOpen(false);
                                                    setDisplayedShopsLimit(3); // Reset limit
                                                }}
                                                className="w-full text-left px-4 py-3 rounded-lg hover:bg-white/5 flex items-center justify-between group transition-colors"
                                            >
                                                <span className={`text-xs font-bold ${selectedRoute === r ? 'text-indigo-400' : 'text-slate-300'} group-hover:text-white`}>{r}</span>
                                                {selectedRoute === r && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>}
                                            </button>
                                        ))
                                    ) : (
                                        <div className="p-4 text-center text-[10px] text-slate-500 uppercase font-bold">No Routes Found</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Route Total - Sticky at top */}
                    {selectedRoute && (
                        <div className="bg-gradient-to-r from-indigo-600/20 to-blue-600/10 border border-indigo-500/30 rounded-xl px-4 py-2 flex justify-between items-center shadow-lg shadow-indigo-500/10">
                            <div>
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{selectedRoute}</p>
                                <p className="text-[9px] font-bold text-slate-500 mt-0.5">{filteredBills.length} Bills • {Object.keys(filteredBills.reduce((a, b) => { a[b.Party || '?'] = 1; return a; }, {})).length} Shops</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xl font-black text-white tabular-nums tracking-tight drop-shadow-[0_0_20px_rgba(99,102,241,0.4)]">₹{routeTotal.toLocaleString('en-IN')}</p>
                                <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Route Total</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Results List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2.5 bg-slate-950/50">
                    {!selectedRoute ? (
                        <div className="text-center py-6 opacity-30">
                            <MapPin size={28} className="mx-auto mb-2" />
                            <p className="text-[8px] font-black uppercase tracking-widest">Select {forceSalesmanId ? '' : 'salesman & '}route</p>
                        </div>
                    ) : (
                        <>

                            {Object.entries(filteredBills.reduce((acc, bill) => {
                                const shop = bill.Party || 'Unknown';
                                if (!acc[shop]) acc[shop] = { total: 0, bills: [] };
                                acc[shop].total += (Number(bill.Amount) || 0);
                                acc[shop].bills.push(bill);
                                return acc;
                            }, {})).sort((a, b) => b[1].total - a[1].total).slice(0, displayedShopsLimit).map(([shopName, shopData], shopIdx) => (
                                <div key={shopIdx} className="bg-gradient-to-br from-white/[0.05] to-transparent border border-white/10 rounded-[1.5rem] overflow-hidden shadow-xl shadow-blue-500/5 mb-3 backdrop-blur-sm min-h-fit group">
                                    {/* Shop Header */}
                                    <div className="px-5 py-4 bg-white/[0.02] border-b border-white/5 flex justify-between items-center overflow-visible">
                                        <div className="min-w-0 pr-4">
                                            <h4 className="text-white text-sm font-bold whitespace-normal break-words line-clamp-2 uppercase tracking-tight leading-tight group-hover:text-indigo-400 transition-colors">{shopName}</h4>
                                            <div className="flex items-center gap-2 mt-2">
                                                {/* GRADE BADGE */}
                                                {(() => {
                                                    const maxDays = Math.max(0, ...shopData.bills.map(b => calculateDaysOld(b['Bill Date'] || b.Date)));
                                                    const histGrade = shopData.bills[0]?.historical_grade;
                                                    const activeMaxDays = shopData.bills[0]?.max_overdue_days || maxDays;

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
                                                                className={`flex items-center justify-center w-6 h-6 rounded-md border backdrop-blur-md cursor-pointer hover:scale-110 active:scale-95 transition-all ${gClass}`}
                                                            >
                                                                <span className="text-[11px] font-black drop-shadow-md">{grade}</span>
                                                            </div>

                                                            {/* HOVER/CLICK POPUP */}
                                                            <div className="absolute left-0 top-full mt-2 w-max max-w-[200px] p-3 rounded-xl bg-slate-900 border border-white/10 shadow-2xl opacity-0 invisible group-hover/grade:opacity-100 group-hover/grade:visible transition-all z-50 pointer-events-none transform translate-y-2 group-hover/grade:translate-y-0 text-left">
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
                                                <p className="text-[9px] text-slate-500 uppercase tracking-[0.2em] font-bold opacity-60">{shopData.bills.length} Outstanding Bills</p>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-lg font-black text-white tracking-tighter tabular-nums leading-none drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]">₹{shopData.total.toLocaleString('en-IN')}</p>
                                            <p className="text-[8px] text-blue-400 uppercase tracking-[0.2em] mt-1 font-black italic">Total Due</p>
                                        </div>
                                    </div>

                                    {/* Bills Inner List */}
                                    <div className="divide-y divide-white/[0.04]">
                                        {shopData.bills.sort((a, b) => {
                                            const dA = calculateDaysOld(a['Bill Date'] || a.Date);
                                            const dB = calculateDaysOld(b['Bill Date'] || b.Date);
                                            return dB - dA;
                                        }).map((bill, billIdx) => {
                                            const dateStr = bill['Bill Date'] || bill.Date;
                                            const daysPending = calculateDaysOld(dateStr);
                                            const isCritical = daysPending > 45;

                                            return (
                                                <div key={billIdx} className="px-5 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors border-l-2" style={{ borderColor: daysPending > 14 ? '#ef4444' : (daysPending > 7 ? '#f59e0b' : '#10b981') }}>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-1 h-8 rounded-full shadow-inner" style={{ backgroundColor: daysPending > 14 ? '#ef4444' : (daysPending > 7 ? '#f59e0b' : '#10b981'), boxShadow: daysPending > 14 ? '0 0 10px rgba(239,68,68,0.7)' : (daysPending > 7 ? '0 0 10px rgba(245,158,11,0.7)' : '0 0 10px rgba(16,185,129,0.7)') }}></div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] font-bold text-slate-400 opacity-60 uppercase tracking-wider">#{bill['Bill No'] || 'N/A'}</span>
                                                                <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest italic opacity-90">{dateStr}</span>
                                                            </div>
                                                            <div className="mt-0.5 text-right">
                                                                <span className="text-[9px] font-black uppercase tracking-[0.15em]" style={{ color: daysPending > 14 ? '#ef4444' : (daysPending > 7 ? '#f59e0b' : '#10b981') }}>
                                                                    {daysPending} Days {isCritical && '!'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm font-black text-white tracking-tighter tabular-nums">₹{Number(bill.Amount).toLocaleString('en-IN')}</p>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>

                                    {/* Action Row */}
                                    <div className="px-5 py-3 bg-white/[0.03] border-t border-white/5">
                                        {salesmanPayments.some(p => String(p.party) === String(shopName)) ? (
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                                                    <Clock size={12} className="text-amber-500" />
                                                    <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">
                                                        ₹{salesmanPayments.find(p => String(p.party) === String(shopName)).amount.toLocaleString('en-IN')} Pending Approval
                                                    </span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between">
                                                {!isAdmin ? (
                                                    <>
                                                        {collShop?.name === shopName ? (
                                                            <form onSubmit={handleQuickCollect} className="flex-1 flex gap-2">
                                                                <input
                                                                    type="number"
                                                                    placeholder="Amount"
                                                                    value={collAmount}
                                                                    onChange={(e) => setCollAmount(e.target.value)}
                                                                    className="flex-1 bg-slate-950 border border-indigo-500/30 rounded-lg px-3 py-1.5 text-xs font-bold text-white focus:outline-none"
                                                                    autoFocus
                                                                />
                                                                <button
                                                                    type="submit"
                                                                    disabled={isCollecting}
                                                                    className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-[10px] font-black uppercase hover:bg-indigo-500 transition-all flex items-center gap-2"
                                                                >
                                                                    {isCollecting ? '...' : 'Log'} <ArrowRight size={12} />
                                                                </button>
                                                                <button
                                                                    onClick={() => setCollShop(null)}
                                                                    className="bg-white/5 text-slate-500 px-3 py-1.5 rounded-lg text-[10px] uppercase font-black hover:text-white"
                                                                >
                                                                    ✕
                                                                </button>
                                                            </form>
                                                        ) : (
                                                            <>
                                                                <button
                                                                    onClick={() => setCollShop({ name: shopName, total: shopData.total, bills: shopData.bills })}
                                                                    className="text-[10px] font-black text-indigo-400 uppercase tracking-widest border border-indigo-500/30 px-5 py-2 rounded-xl hover:bg-indigo-500 hover:text-white transition-all shadow-lg active:scale-95"
                                                                >
                                                                    Collect Cash
                                                                </button>
                                                                <span className="text-[8px] text-slate-600 font-bold uppercase tracking-widest">No collection today</span>
                                                            </>
                                                        )}
                                                    </>
                                                ) : (
                                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/10 border border-white/5 rounded-xl opacity-40">
                                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">No Collection Recorded</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {Object.values(filteredBills.reduce((acc, bill) => {
                                const shop = bill.Party || 'Unknown';
                                if (!acc[shop]) acc[shop] = { total: 0 };
                                else acc[shop].total += (Number(bill.Amount) || 0); // Just for counting, logic reused
                                return acc;
                            }, {})).length > displayedShopsLimit && (
                                    <button
                                        onClick={() => setDisplayedShopsLimit(1000)}
                                        className="w-full py-4 bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white font-black text-xs uppercase tracking-widest rounded-2xl border border-white/10 transition-all shadow-lg"
                                    >
                                        Show All {Object.keys(filteredBills.reduce((acc, bill) => { const s = bill.Party || 'Unknown'; acc[s] = 1; return acc; }, {})).length - displayedShopsLimit} More Shops
                                    </button>
                                )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
