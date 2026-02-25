import React, { useState, useMemo } from 'react';
import { ArrowLeft, Search, MessageSquare, Clock, AlertTriangle, Phone, MapPin, Calendar, Layers, Filter, X, User, CheckCircle } from 'lucide-react';

const MESSAGE_TEMPLATES = [
    {
        id: 'standard',
        label: 'Standard Due',
        icon: <Clock size={14} />,
        getMessage: (party, details, total, days, company) => `Dear ${party}, This is a friendly reminder that your ${company} payment ${details} (Total Rs.${total}) is OVERDUE by ${days} days. Please pay to avoid service interruption. - Biju Traders, Punalur`
    },
    {
        id: 'tomorrow',
        label: "Pre-Visit",
        icon: <Calendar size={14} />,
        getMessage: (party, details, total, days, company) => `Dear ${party}, Our salesman will visit your shop tomorrow for the ${company} collection of Rs.${total} (Overdue by ${days} days). Please keep the payment ready. - Biju Traders, Punalur`
    },
    {
        id: 'failed',
        label: 'Visit Failed',
        icon: <AlertTriangle size={14} />,
        getMessage: (party, details, total, days, company) => `Dear ${party}, Our salesman visited but the ${company} payment of Rs.${total} (Overdue by ${days} days) was not received. Please settle it urgently to continue our services. - Biju Traders, Punalur`
    }

];

const getNextVisitDay = (routes, targetRoute) => {
    if (!routes || !targetRoute) return null;
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const today = new Date().getDay();
    const target = targetRoute.trim().toLowerCase();

    // Check next 7 days starting from tomorrow
    for (let i = 1; i <= 7; i++) {
        const checkIndex = (today + i) % 7;
        const dayName = days[checkIndex];
        const routeForDay = (routes[dayName] || '').trim().toLowerCase();

        if (routeForDay === target) {
            if (i === 1) return 'Tomorrow';
            return dayName.toUpperCase();
        }
    }
    return null;
};

export default function RemindersView({ salesmenData, onBack, masterPlans, allPayments = [] }) {
    // ... existing state ...
    const [searchTerm, setSearchTerm] = useState('');
    const [minDays, setMinDays] = useState(1);
    const [maxDays, setMaxDays] = useState(7);
    // 4. Persistent Message History
    const [sentReminders, setSentReminders] = useState(() => {
        try {
            const saved = localStorage.getItem('jarwis_reminder_history');
            return saved ? JSON.parse(saved) : {};
        } catch (e) { return {}; }
    });

    const [activeTemplate, setActiveTemplate] = useState('standard');
    const [selectedSalesman, setSelectedSalesman] = useState('all');
    const [selectedRoute, setSelectedRoute] = useState('all');

    // Modal State
    const [showSalesmanModal, setShowSalesmanModal] = useState(false);
    const [showRouteModal, setShowRouteModal] = useState(false);

    // Persistent WhatsApp Settings
    // Default to 'grouped' unless explicitly set to 'false'
    const [viewMode, setViewMode] = useState(() => localStorage.getItem('wa_grouping') !== 'false' ? 'grouped' : 'individual');
    const [waBranding, setWaBranding] = useState(() => localStorage.getItem('wa_branding') !== 'false'); // Default true

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
            } else {
                date = new Date(dateStr);
            }
            if (isNaN(date.getTime())) return 0;
            const diff = new Date() - date;
            return Math.floor(diff / (1000 * 60 * 60 * 24));
        } catch (e) { return 0; }
    };

    const todayRouteInfo = useMemo(() => {
        const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
        const todayName = days[new Date().getDay()];

        const routeMapping = {};
        Object.entries(masterPlans || {}).forEach(([sid, plan]) => {
            const routes = plan?.routes || plan?.Routes || {};
            const sRoute = routes[todayName] || routes[todayName.charAt(0).toUpperCase() + todayName.slice(1)];
            if (sRoute) {
                routeMapping[sid.trim().toUpperCase()] = sRoute.trim().toLowerCase();
            }
        });
        return routeMapping;
    }, [masterPlans]);

    // Helper to find today's payments
    const getTodayPayment = (salesmanId, partyName) => {
        const todayStr = new Date().toLocaleDateString('en-CA');
        const sIdNorm = (salesmanId || '').trim().toUpperCase();
        const pNameNorm = (partyName || '').trim().toUpperCase();

        return allPayments
            .filter(p => {
                if (!p.timestamp) return false;
                const pDate = p.timestamp.toDate().toLocaleDateString('en-CA');
                if (pDate !== todayStr) return false;

                // Match Salesman ID
                const pSid = (p.salesman || 'Unknown').trim().toUpperCase();
                // Match Party Name (simple contains or equals)
                const pParty = (p.party || '').trim().toUpperCase();

                // Check for match: Same Salesman AND Same Party
                // Note: Ideally match by Bill No if available in payment record, but robust fallback to Name is good.
                // Assuming payment record has 'salesman' field matching the ID in salesmenData or Name logic
                const salesmanMatch = pSid === sIdNorm || (p.salesman_id && p.salesman_id === sIdNorm);
                return salesmanMatch && pParty === pNameNorm;
            })
            .reduce((sum, p) => sum + Number(p.amount || 0), 0);
    };

    // 1. Core Data: Extract all individual bills with metadata
    const allIndividualBills = useMemo(() => {
        const raw = salesmenData.flatMap(s => {
            const sidRaw = s.id.trim().toUpperCase();
            const sidNorm = sidRaw.replace(/[^A-Z0-9]/g, '');

            // Use NORMALIZED key for Matrix/Master Plan lookups
            const todayScheduledRoute = todayRouteInfo[sidNorm] || todayRouteInfo[sidRaw];
            const plan = masterPlans[sidNorm] || masterPlans[sidRaw];

            const company = plan?.company || plan?.Company || 'Other';

            return (s.bills || []).map(b => {
                const billDays = calculateDaysOld(b.Date);
                const billRoute = (b.Route || '').trim().toLowerCase();
                const isInRoute = todayScheduledRoute && billRoute === todayScheduledRoute;

                const collectedAmount = getTodayPayment(s.id, b.Party);

                const rawPhone = b.Phone || '';

                return {
                    ...b,
                    id: `${s.id}_${b.bill_no}`,
                    salesman: s.id,
                    company,
                    days: billDays,
                    isInRoute,
                    collectedAmount,
                    phoneNormalized: String(rawPhone).replace(/\D/g, ''),
                    nextVisit: isInRoute ? 'TODAY' : getNextVisitDay(plan?.routes || plan?.Routes, billRoute)
                };
            });
        });

        // Deduplicate by ID to prevent key warnings
        const seen = new Set();
        return raw.filter(b => {
            if (seen.has(b.id)) return false;
            seen.add(b.id);
            return true;
        });
    }, [salesmenData, todayRouteInfo, allPayments]);


    // Reset Route when Salesman changes
    React.useEffect(() => {
        setSelectedRoute('all');
    }, [selectedSalesman]);

    // Extract Filter Options
    const { uniqueSalesmen, uniqueRoutes } = useMemo(() => {
        const salesmen = new Set();
        const routes = new Set();
        allIndividualBills.forEach(b => {
            if (b.salesman) salesmen.add(b.salesman);

            // Only add routes that belong to the selected salesman (or all if none selected)
            if (selectedSalesman === 'all' || b.salesman === selectedSalesman) {
                if (b.Route) routes.add(b.Route);
            }
        });
        return {
            uniqueSalesmen: Array.from(salesmen).sort(),
            uniqueRoutes: Array.from(routes).sort()
        };
    }, [allIndividualBills, selectedSalesman]);

    // 2. Grouping Logic (Aggregated)
    const phoneGroups = useMemo(() => {
        const groups = {};
        allIndividualBills.forEach(b => {
            let pRaw = b.phoneNormalized;
            // Improved Grouping: Priority -> Phone > (Salesman + Party Name)
            let pKey;
            if (pRaw && pRaw.length >= 10) {
                pKey = pRaw.slice(-10);
            } else {
                // Fallback: Group by Salesman + Party (Normalized)
                const sKey = (b.salesman || 'UNK').toUpperCase();
                const pNameKey = (b.Party || 'UNK').toUpperCase().replace(/[^A-Z0-9]/g, '');
                pKey = `GROUP_${sKey}_${pNameKey}`;
            }

            if (!groups[pKey]) {
                groups[pKey] = {
                    id: pKey,
                    party: b.Party,
                    phone: pRaw.length >= 10 ? pRaw.slice(-10) : '',
                    totalAmount: 0,
                    oldestDays: 0,
                    bills: [],
                    isInRoute: false,
                    collectedAmount: 0,
                    routes: new Set(),
                    companies: new Set(),
                    companyNames: new Set(),
                    nextVisit: null
                };
            }

            const group = groups[pKey];
            group.totalAmount += Number(b.Amount || 0);
            if (b.days > group.oldestDays) group.oldestDays = b.days;
            if (b.isInRoute) group.isInRoute = true;
            if (b.collectedAmount > 0) group.collectedAmount += b.collectedAmount; // Accumulate payments
            if (b.Route) group.routes.add(b.Route);
            if (b.nextVisit) group.nextVisit = b.nextVisit; // Capture next visit
            group.companies.add(b.salesman);
            group.companyNames.add(b.company);
            group.bills.push(b);

            if (Number(b.Amount || 0) > 1000) group.party = b.Party;
        });
        return Object.values(groups);
    }, [allIndividualBills]);

    // 3. Final Filtering & Sorting
    const displayData = useMemo(() => {
        const term = searchTerm.toLowerCase();
        const isSearchingInRoute = term === 'in route' || term === 'inroute';

        if (viewMode === 'individual') {
            return allIndividualBills.filter(b => {
                if (b.days < minDays || b.days > maxDays) return false;
                if (selectedSalesman !== 'all' && b.salesman !== selectedSalesman) return false;
                if (selectedRoute !== 'all' && b.Route !== selectedRoute) return false;
                if (isSearchingInRoute && b.isInRoute) return true;
                return (
                    (b.Party || '').toLowerCase().includes(term) ||
                    (b.bill_no || '').toString().includes(term) ||
                    (b.Phone || '').includes(term) ||
                    (b.Route || '').toLowerCase().includes(term) ||
                    (b.company || '').toLowerCase().includes(term) || // Added company search
                    (b.salesman || '').toLowerCase().includes(term)
                );
            }).sort((a, b) => {
                // Priority: In Route > Paid Today > Days Old
                if (a.isInRoute && !b.isInRoute) return -1;
                if (!a.isInRoute && b.isInRoute) return 1;
                if (a.collectedAmount > 0 && b.collectedAmount === 0) return -1;
                if (a.collectedAmount === 0 && b.collectedAmount > 0) return 1;
                return b.days - a.days;
            });
        } else {
            return phoneGroups.filter(g => {
                if (g.oldestDays < minDays || g.oldestDays > maxDays) return false;
                if (selectedSalesman !== 'all' && !g.companies.has(selectedSalesman)) return false;
                if (selectedRoute !== 'all' && !Array.from(g.routes).some(r => r === selectedRoute)) return false;
                if (isSearchingInRoute && g.isInRoute) return true;
                const routesText = Array.from(g.routes).join(' ').toLowerCase();
                const billsText = g.bills.map(b => b.bill_no).join(' ');
                const companyNamesText = Array.from(g.companyNames).join(' ').toLowerCase();

                return (
                    g.party.toLowerCase().includes(term) ||
                    g.phone.includes(term) ||
                    routesText.includes(term) ||
                    billsText.includes(term) ||
                    companyNamesText.includes(term)
                );
            }).sort((a, b) => {
                if (a.isInRoute && !b.isInRoute) return -1;
                if (!a.isInRoute && b.isInRoute) return 1;
                if (a.collectedAmount > 0 && b.collectedAmount === 0) return -1;
                if (a.collectedAmount === 0 && b.collectedAmount > 0) return 1;
                return b.oldestDays - a.oldestDays;
            });
        }
    }, [allIndividualBills, phoneGroups, viewMode, searchTerm, minDays, maxDays, selectedSalesman, selectedRoute]);

    const handleSend = (item, templateId = null) => {
        const phone = viewMode === 'individual' ? item.phoneNormalized : item.phone;
        if (!phone || phone.length < 10) {
            alert("Cannot send: Invalid Phone Number");
            return;
        }

        const tid = templateId || activeTemplate;
        const template = MESSAGE_TEMPLATES.find(t => t.id === tid);

        const party = viewMode === 'individual' ? (item.Party || 'Customer') : item.party;
        const total = viewMode === 'individual' ? Number(item.Amount || 0) : item.totalAmount;
        const days = viewMode === 'individual' ? item.days : item.oldestDays;

        const details = viewMode === 'individual'
            ? `for Bill No: ${item.bill_no}`
            : (item.bills.length === 1
                ? `for Bill No: ${item.bills[0].bill_no}`
                : `for ${item.bills.length} Bills (${item.bills.map(b => b.bill_no).join(', ')})`);

        const company = viewMode === 'individual' ? item.company : Array.from(item.companyNames).join(' & ');

        let msg = template.getMessage(party, details, total.toLocaleString('en-IN'), days, company);
        if (waBranding) {
            msg += "\n\n━━━━━━━━━━━━━━\n🙏 *Thank You*";
        }

        // TRIGGER OPEN IMMEDIATELY to avoid React render lag
        const url = `https://wa.me/91${phone.slice(-10)}?text=${encodeURIComponent(msg)}`;
        window.open(url, '_blank');

        // Update State & Persistence
        const now = new Date().toISOString();
        const newState = {
            ...sentReminders,
            [item.id]: {
                ...(sentReminders[item.id] || {}),
                [tid]: now
            }
        };
        setSentReminders(newState);
        localStorage.setItem('jarwis_reminder_history', JSON.stringify(newState));
    };

    const isToday = (dateString) => {
        if (!dateString) return false;
        const date = new Date(dateString);
        const today = new Date();
        return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return `${date.getDate()}/${date.getMonth() + 1}`;
    };

    const handleSendBatch = () => {
        const eligible = displayData.filter(i => (viewMode === 'individual' ? i.phoneNormalized : i.phone).length >= 10);
        if (eligible.length === 0) {
            alert("No items in current filter have valid phone numbers.");
            return;
        }

        if (!window.confirm(`This will open ${eligible.length} WhatsApp tabs. View: ${viewMode.toUpperCase()}. Proceed?`)) {
            return;
        }

        eligible.forEach((item, index) => {
            setTimeout(() => {
                handleSend(item);
            }, index * 1000);
        });
    };

    const eligibleCount = displayData.filter(i => (viewMode === 'individual' ? i.phoneNormalized : i.phone).length >= 10).length;

    return (
        <div className="flex flex-col h-full animate-fade-in">
            {/* COMPACT NO-SCROLL HEADER */}
            <div className="shrink-0 z-40 bg-[#0F172A]/95 backdrop-blur-xl py-0.5 -mx-4 px-4 border-b border-white/5 shadow-xl space-y-1 mb-1">

                {/* Row 1: Title + Actions */}
                <div className="flex items-center gap-2">
                    <button onClick={onBack} className="p-1 bg-white/5 rounded-lg border border-white/10 text-slate-300 hover:bg-white/10 active:scale-90 transition-all shadow-md backdrop-blur-md">
                        <ArrowLeft size={14} />
                    </button>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-[9px] font-black text-[#60A5FA] uppercase tracking-[0.2em] truncate">WhatsApp Reminders</h3>
                        <p className="text-[7px] font-bold text-slate-500 uppercase tracking-widest truncate">
                            {viewMode === 'individual' ? `Found ${displayData.length} Bills` : `Found ${displayData.length} Groups`}
                        </p>
                    </div>
                    {eligibleCount > 0 && (
                        <button
                            onClick={handleSendBatch}
                            className="bg-red-500 hover:bg-red-600 text-white px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-widest transition-all shadow-lg shadow-red-500/20 active:scale-95 border-b-2 border-red-700 whitespace-nowrap"
                        >
                            Send All ({eligibleCount}) 🚀
                        </button>
                    )}
                </div>

                {/* Row 2: Toggles & Branding (Combined) */}
                <div className="bg-slate-900/30 p-0.5 rounded border border-white/5 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
                    <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Grouping</span>
                        <div className="flex bg-slate-950 p-0.5 rounded border border-white/5">
                            <button
                                onClick={() => { setViewMode('individual'); localStorage.setItem('wa_grouping', 'false'); }}
                                className={`px-1.5 py-px rounded-[2px] text-[6px] font-black uppercase tracking-wider transition-all ${viewMode === 'individual' ? 'bg-white text-slate-950' : 'text-slate-500'}`}
                            >
                                Off
                            </button>
                            <button
                                onClick={() => { setViewMode('grouped'); localStorage.setItem('wa_grouping', 'true'); }}
                                className={`px-1.5 py-px rounded-[2px] text-[6px] font-black uppercase tracking-wider transition-all ${viewMode === 'grouped' ? 'bg-[#25D366] text-white shadow-lg' : 'text-slate-500'}`}
                            >
                                On
                            </button>
                        </div>
                    </div>
                    <div className="w-px h-2 bg-white/10 shrink-0"></div>
                    <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Branding</span>
                        <button
                            onClick={() => {
                                const newVal = !waBranding;
                                setWaBranding(newVal);
                                localStorage.setItem('wa_branding', newVal.toString());
                            }}
                            className={`w-5 h-2.5 rounded-full relative transition-all duration-300 ${waBranding ? 'bg-blue-600' : 'bg-slate-800'}`}
                        >
                            <div className={`absolute top-0.5 w-1.5 h-1.5 bg-white rounded-full transition-all duration-300 ${waBranding ? 'left-[12px] shadow-[0_0_5px_rgba(255,255,255,0.5)]' : 'left-0.5'}`}></div>
                        </button>
                    </div>
                </div>

                {/* Row 3: Template Selector */}
                <div className="bg-slate-900/30 p-0.5 rounded border border-white/5 flex gap-0.5 items-center">
                    {MESSAGE_TEMPLATES.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setActiveTemplate(t.id)}
                            className={`flex-1 flex items-center justify-center gap-1 py-0.5 px-1 rounded text-[7px] font-black uppercase tracking-tight transition-all ${activeTemplate === t.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:bg-white/5'}`}
                        >
                            {React.cloneElement(t.icon, { size: 8 })}
                            <span className="truncate">{t.label}</span>
                        </button>
                    ))}
                </div>

                {/* Row 4: Controls Grid */}
                <div className="grid grid-cols-12 gap-1">
                    <div className="col-span-8 relative group">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-[#60A5FA] transition-colors" size={10} />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 hover:bg-white/10 rounded py-1 pl-6 pr-2 text-[8px] font-bold text-white placeholder-slate-600 outline-none focus:border-[#60A5FA]/50 transition-all"
                        />
                    </div>
                    <div className="col-span-2 relative">
                        <div className="absolute left-1 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none text-[5px] font-black uppercase">Min</div>
                        <input
                            type="number"
                            value={minDays}
                            onChange={(e) => setMinDays(Number(e.target.value))}
                            className="w-full bg-white/5 border border-white/10 hover:bg-white/10 rounded py-1 pl-5 pr-1 text-[8px] font-bold text-white text-right outline-none focus:border-[#60A5FA]/50"
                        />
                    </div>
                    <div className="col-span-2 relative">
                        <div className="absolute left-1 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none text-[5px] font-black uppercase">Max</div>
                        <input
                            type="number"
                            value={maxDays}
                            onChange={(e) => setMaxDays(Number(e.target.value))}
                            className="w-full bg-white/5 border border-white/10 hover:bg-white/10 rounded py-1 pl-5 pr-1 text-[8px] font-bold text-white text-right outline-none focus:border-[#60A5FA]/50"
                        />
                    </div>

                    <div className="col-span-6 relative">
                        <button
                            onClick={() => setShowSalesmanModal(true)}
                            className="w-full bg-white/5 border border-white/10 hover:bg-white/10 rounded py-1 pl-2 pr-1 text-[8px] font-bold text-white outline-none focus:border-[#60A5FA]/50 text-left flex items-center justify-between group transition-colors"
                        >
                            <div className="flex items-center gap-1 min-w-0">
                                <Filter size={8} className="text-slate-500 group-hover:text-[#60A5FA] transition-colors my-auto" />
                                <span className={`truncate ${selectedSalesman === 'all' ? 'text-slate-400' : 'text-white'}`}>
                                    {selectedSalesman === 'all' ? 'Salesman' : selectedSalesman}
                                </span>
                            </div>
                            <span className="text-[7px] text-slate-600">▼</span>
                        </button>
                    </div>
                    <div className="col-span-6 relative">
                        <button
                            onClick={() => setShowRouteModal(true)}
                            className="w-full bg-white/5 border border-white/10 hover:bg-white/10 rounded py-1 pl-2 pr-1 text-[8px] font-bold text-white outline-none focus:border-[#60A5FA]/50 text-left flex items-center justify-between group transition-colors"
                        >
                            <div className="flex items-center gap-1 min-w-0">
                                <MapPin size={8} className="text-slate-500 group-hover:text-[#60A5FA] transition-colors my-auto" />
                                <span className={`truncate ${selectedRoute === 'all' ? 'text-slate-400' : 'text-white'}`}>
                                    {selectedRoute === 'all' ? 'Route' : selectedRoute}
                                </span>
                            </div>
                            <span className="text-[7px] text-slate-600">▼</span>
                        </button>
                    </div>
                </div>

                <SelectionModal
                    isOpen={showSalesmanModal}
                    onClose={() => setShowSalesmanModal(false)}
                    title="Select Salesman"
                    options={uniqueSalesmen}
                    selected={selectedSalesman}
                    onSelect={(val) => { setSelectedSalesman(val); setShowSalesmanModal(false); }}
                />

                <SelectionModal
                    isOpen={showRouteModal}
                    onClose={() => setShowRouteModal(false)}
                    title="Select Route"
                    options={uniqueRoutes}
                    selected={selectedRoute}
                    onSelect={(val) => { setSelectedRoute(val); setShowRouteModal(false); }}
                />
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-20">
                {displayData.map((item) => {
                    const id = item.id;
                    const phone = viewMode === 'individual' ? item.phoneNormalized : item.phone;
                    const hasPhone = phone && phone.length >= 10;

                    const billNumbers = viewMode === 'individual' ? [item.bill_no] : item.bills.map(b => b.bill_no);

                    const days = viewMode === 'individual' ? item.days : item.oldestDays;

                    return (
                        <div key={id} className={`group relative overflow-hidden backdrop-blur-md border transition-all duration-300 ${item.isInRoute ? 'border-[#25D366]/30 bg-[#25D366]/5' : 'border-white/5 bg-slate-900/40 hover:bg-slate-800/60 hover:border-white/10'} rounded-xl p-3 shadow-sm hover:shadow-md`}>
                            {/* Decorative Glow */}
                            <div className={`absolute -top-10 -right-10 w-24 h-24 blur-[60px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none ${item.isInRoute ? 'bg-[#25D366]/20' : 'bg-blue-500/20'}`}></div>

                            {/* Top Row: Name & Amount */}
                            <div className="flex justify-between items-start gap-2 mb-2 relative z-10">
                                <div className="min-w-0 flex-1">
                                    <h4 className="text-xs font-black text-white uppercase tracking-tight truncate leading-tight">
                                        {viewMode === 'individual' ? item.Party : item.party}
                                    </h4>
                                    <div className="flex items-center gap-1.5 mt-0.5 text-[9px] text-slate-400 font-medium">
                                        {viewMode === 'individual' && <span className="font-mono text-slate-500">#{item.bill_no}</span>}
                                        {item.isInRoute && <span className="text-[#25D366] font-bold text-[8px] animate-pulse">● IN ROUTE</span>}
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-sm font-black text-white tracking-tighter">
                                        ₹{(viewMode === 'individual' ? Number(item.Amount || 0) : item.totalAmount).toLocaleString('en-IN')}
                                    </p>
                                    <div className={`flex items-center justify-end gap-1 text-[8px] font-bold ${days > 30 ? 'text-red-400' : 'text-amber-400'}`}>
                                        <Clock size={8} />
                                        <span>{days} DAYS</span>
                                    </div>
                                </div>
                            </div>

                            {/* Middle Row: Badges & Info */}
                            <div className="flex items-center gap-1.5 mb-2 relative z-10">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 ${hasPhone ? (viewMode === 'grouped' ? 'bg-[#25D366]/10 border-[#25D366]/20 text-[#25D366]' : 'bg-blue-500/10 border-blue-500/20 text-blue-400') : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                                    {viewMode === 'grouped' ? <Layers size={14} /> : (hasPhone ? <MessageSquare size={14} /> : <AlertTriangle size={14} />)}
                                </div>

                                <div className="flex flex-wrap gap-1 flex-1">
                                    {/* ROUTE BADGE */}
                                    <span className="text-[8px] font-black px-1.5 py-px rounded border bg-white/5 border-white/10 text-amber-500 uppercase tracking-wider flex items-center gap-1">
                                        <MapPin size={6} />
                                        {viewMode === 'individual' ? item.Route || 'NO ROUTE' : Array.from(item.routes).slice(0, 1).join(', ') || 'NO ROUTE'}
                                    </span>

                                    {/* PAID TODAY BADGE */}
                                    {item.collectedAmount > 0 && (
                                        <span className="text-[8px] font-black px-1.5 py-px rounded border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 uppercase tracking-wider flex items-center gap-1 animate-pulse">
                                            <CheckCircle size={6} />
                                            PAID ₹{item.collectedAmount.toLocaleString('en-IN')}
                                        </span>
                                    )}

                                    {/* NEXT VISIT BADGE */}
                                    {item.nextVisit && (
                                        <span className={`text-[8px] font-black px-1.5 py-px rounded border uppercase tracking-wider flex items-center gap-1 ${item.nextVisit === 'TODAY' ? 'bg-[#25D366]/10 text-[#25D366] border-[#25D366]/20 animate-pulse' : 'bg-purple-500/10 text-purple-400 border-purple-500/20'}`}>
                                            <Calendar size={6} />
                                            {item.nextVisit === 'TODAY' ? 'VISIT TODAY' : `NEXT VISIT: ${item.nextVisit}`}
                                        </span>
                                    )}

                                    {/* COMPANY BADGE */}
                                    {viewMode === 'individual' ? (
                                        <span className={`text-[8px] font-black px-1.5 py-px rounded border ${item.company.toLowerCase() === 'cadbury' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                            item.company.toLowerCase() === 'britannia' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                item.company.toLowerCase() === 'colgate' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                    'bg-slate-500/10 text-slate-400 border-slate-500/20'
                                            } uppercase tracking-wider`}>
                                            {item.company}
                                        </span>
                                    ) : (
                                        Array.from(item.companyNames).slice(0, 3).map(name => (
                                            <span key={name} className="text-[8px] font-black px-1.5 py-px rounded border bg-slate-500/10 text-slate-400 border-slate-500/20 uppercase tracking-wider">
                                                {name}
                                            </span>
                                        ))
                                    )}

                                    {/* SALESMAN BADGE */}
                                    <span className="text-[8px] font-black px-1.5 py-px rounded border bg-blue-500/10 text-blue-400 border-blue-500/20 uppercase tracking-wider flex items-center gap-1">
                                        <User size={6} />
                                        {viewMode === 'individual'
                                            ? item.salesman
                                            : Array.from(item.companies).join(' & ').slice(0, 15) + (Array.from(item.companies).join(' & ').length > 15 ? '...' : '')}
                                    </span>

                                    {phone && (
                                        <span className="text-[8px] font-bold px-1.5 py-px rounded border bg-emerald-500/5 text-emerald-500 border-emerald-500/10 ml-auto flex items-center gap-1">
                                            <Phone size={6} />
                                            {phone}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Grouped Bills List */}
                            {viewMode === 'grouped' && item.bills.length > 1 && (
                                <div className="mb-3 bg-white/5 rounded-lg p-2 border border-white/5 relative z-10">
                                    <div className="flex justify-between items-center mb-1 pb-1 border-b border-white/5">
                                        <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Bill Details</span>
                                        <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest">{item.bills.length} Bills</span>
                                    </div>
                                    <div className="space-y-1 max-h-24 overflow-y-auto custom-scrollbar pr-1">
                                        {item.bills.sort((a, b) => new Date(a.Date) - new Date(b.Date)).map((bill, idx) => (
                                            <div key={idx} className="flex justify-between items-center text-[9px] font-medium text-slate-300">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-slate-500 w-12">{formatDate(bill.Date)}</span>
                                                    <span className="text-white">#{bill.bill_no}</span>
                                                </div>
                                                <span className="tabular-nums font-bold">₹{Number(bill.Amount || 0).toLocaleString('en-IN')}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Bottom Row: Actions */}
                            <div className="relative z-10">
                                {hasPhone ? (
                                    <div className="flex gap-1.5">
                                        {MESSAGE_TEMPLATES.map(t => {
                                            const lastSent = sentReminders[item.id]?.[t.id];
                                            const isSentToday = isToday(lastSent);

                                            return (
                                                <button
                                                    key={t.id}
                                                    onClick={() => handleSend(item, t.id)}
                                                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tight transition-all active:scale-95 border ${isSentToday
                                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]'
                                                        : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10 hover:text-white hover:border-white/10'
                                                        }`}
                                                >
                                                    {React.cloneElement(t.icon, { size: 10, className: isSentToday ? 'text-emerald-400' : 'text-current' })}
                                                    <div className="flex flex-col leading-none items-start">
                                                        <span>{t.label}</span>
                                                        {lastSent && !isSentToday && (
                                                            <span className="text-[7px] text-slate-500 font-normal normal-case">
                                                                Last: {formatDate(lastSent)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="w-full py-1.5 bg-red-500/5 border border-red-500/10 rounded-lg text-center">
                                        <p className="text-[8px] font-black text-red-500/50 uppercase tracking-widest">No Phone Number Available</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}

                {displayData.length === 0 && (
                    <div className="py-20 text-center opacity-40">
                        <Clock size={48} className="mx-auto mb-4 text-slate-700" />
                        <p className="text-xs font-black uppercase tracking-widest">No Records Found</p>
                    </div>
                )}
            </div>
        </div >
    );
}

const SelectionModal = ({ isOpen, onClose, title, options, selected, onSelect }) => {
    const [search, setSearch] = useState('');
    const [animateIn, setAnimateIn] = useState(false);

    React.useEffect(() => {
        if (isOpen) {
            setAnimateIn(true);
            setSearch('');
        } else {
            setAnimateIn(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={onClose} />
            <div className={`relative w-full max-w-sm bg-slate-900 border border-white/10 rounded-3xl shadow-2xl flex flex-col max-h-[70vh] transition-all duration-300 ${animateIn ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>

                {/* Header */}
                <div className="p-5 border-b border-white/5 flex items-center justify-between shrink-0">
                    <h3 className="text-base font-black text-white uppercase tracking-tight">{title}</h3>
                    <button onClick={onClose} className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
                        <X size={16} className="text-slate-400" />
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-white/5 shrink-0">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            autoFocus
                            className="w-full bg-slate-950 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm font-bold text-white placeholder-slate-600 outline-none focus:border-blue-500/50"
                        />
                    </div>
                </div>

                {/* List */}
                <div className="overflow-y-auto p-2 space-y-1">
                    <button
                        onClick={() => onSelect('all')}
                        className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center justify-between ${selected === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-white/5'}`}
                    >
                        <span className="font-bold text-xs uppercase tracking-wider">All {title.replace('Select ', '')}s</span>
                        {selected === 'all' && <div className="w-2 h-2 bg-white rounded-full shadow-[0_0_8px_white]" />}
                    </button>

                    {filtered.map(opt => (
                        <button
                            key={opt}
                            onClick={() => onSelect(opt)}
                            className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center justify-between ${selected === opt ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-white/5'}`}
                        >
                            <span className="font-bold text-sm">{opt}</span>
                            {selected === opt && <div className="w-2 h-2 bg-white rounded-full shadow-[0_0_8px_white]" />}
                        </button>
                    ))}

                    {filtered.length === 0 && (
                        <div className="py-8 text-center text-slate-600">
                            <p className="text-xs font-bold uppercase tracking-widest">No Matches Found</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
