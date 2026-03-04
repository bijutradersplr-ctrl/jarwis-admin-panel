import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { db as dexieDB } from './db';
import { X, Check, Banknote, CreditCard, Building2, Loader2, Smartphone, ChevronDown, Clock } from 'lucide-react';

export default function CollectPaymentModal({ isOpen, onClose, bill, salesmanID, onPaymentSuccess, initialAmount }) {
    const [amount, setAmount] = useState(initialAmount || '');
    const [type, setType] = useState('Cash');
    const [chequeDate, setChequeDate] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isSuccess, setIsSuccess] = useState(false);
    const [whatsappUrl, setWhatsappUrl] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [description, setDescription] = useState('');

    // Sync amount when bill changes or initialAmount changes
    React.useEffect(() => {
        if (isOpen) {
            setAmount(initialAmount || bill?.Amount || '');
            setIsSuccess(false);
            setWhatsappUrl('');
            setType('Cash'); // Reset to Cash
            setChequeDate(''); // Reset cheque date
            setDescription(''); // Reset description
        }
    }, [isOpen, bill, initialAmount]);

    if (!isOpen || !bill) return null;



    const handleWhatsAppRedirect = () => {
        if (whatsappUrl) {
            window.open(whatsappUrl, '_blank');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (loading) return;

        if (!amount || isNaN(amount) || Number(amount) <= 0) {
            setError("Please enter a valid amount");
            return;
        }

        if (type === 'Cheque' && !chequeDate) {
            setError("ENTER DUE DATE");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const basePts = Math.floor(Number(amount) / 1000);
            const isOverdue = Number(bill?.Overdue || 0) > 0;
            const ptsToAward = isOverdue ? Math.floor(basePts * 1.2) : basePts;

            const docData = {
                salesman: salesmanID,
                party: bill.Party,
                bill_no: bill.bill_no || "N/A",
                route: bill.Route || "Unknown",
                amount: Number(amount),
                payment_type: type,
                cheque_date: type === 'Cheque' ? chequeDate : null,
                description: type === 'Less' ? description : null,
                status: "Pending",
                timestamp: serverTimestamp(),
                bill_date: bill.Date || null,
                total_bill_amount: bill.Amount,
                shop_id: bill.shop_id || bill.id || bill.ShopID || null,
                points_awarded: type === 'Less' ? 0 : ptsToAward,
                ...(bill._isDeliveryConsole ? { is_delivery: true } : {})
            };

            let docId = "offline_" + Date.now();

            if (navigator.onLine) {
                // Online: Save to Firestore
                const docRef = await addDoc(collection(db, "pending_collections"), docData);
                docId = docRef.id;
            } else {
                // Offline: Save to Dexie Queue
                await dexieDB.pending_sync.add({
                    type: 'pending_collections',
                    timestamp: Date.now(),
                    status: 'queued',
                    retryCount: 0,
                    data: { ...docData, timestamp: Date.now() } // replace serverTimestamp for local
                });
                console.log("[Offline] Payment saved locally to queue.");
            }

            // PREPARE WHATSAPP MESSAGE (BUT DON'T OPEN YET)
            if (bill.Phone && bill.Phone.length === 10) {
                const totalAmt = Number(bill.Amount) || (bill.totalAmount || 0); // Handle both single bill and multi-bill shop total
                const currentPaidAmt = Number(amount);
                const prevPaidAmt = Number(bill.previouslyPaidAmount || 0);
                const totalPaidSoFar = prevPaidAmt + currentPaidAmt;
                const balanceAmt = totalAmt - totalPaidSoFar;
                const today = new Date().toLocaleDateString('en-IN');

                const message = `*BIJU TRADERS - PAYMENT RECEIPT*\n\n` +
                    `👤 *Party:* ${bill.Party}\n` +
                    `💰 *Total Outstanding:* ₹${totalAmt.toLocaleString('en-IN')}\n` +
                    (prevPaidAmt > 0 ? `⏮️ *Previously Paid:* ₹${prevPaidAmt.toLocaleString('en-IN')}\n` : '') +
                    `✅ *Current Payment:* ₹${currentPaidAmt.toLocaleString('en-IN')}\n` +
                    `⚖️ *Balance Amount:* ₹${balanceAmt.toLocaleString('en-IN')}\n` +
                    `👤 *Salesman:* ${salesmanID.toUpperCase()}\n` +
                    `💳 *Mode:* ${type}\n` +
                    (type === 'Cheque' && chequeDate ? `🏦 *Cheque Date:* ${new Date(chequeDate).toLocaleDateString('en-IN')}\n` : '') +
                    `📅 *Date:* ${today}\n\n` +
                    `_Status: Pending Office Verification._`;

                const encodedMsg = encodeURIComponent(message);
                setWhatsappUrl(`https://wa.me/91${bill.Phone}?text=${encodedMsg}`);
            }

            // Play Success Sound
            try {
                const audio = new Audio('https://notificationsounds.com/storage/sounds/file-sounds-1148-juntos.mp3');
                audio.volume = 0.5;
                audio.play();
            } catch (e) {
                console.log("Audio play prevented by browser");
            }

            if (onPaymentSuccess) {
                onPaymentSuccess({
                    id: docId,
                    shop_id: bill.shop_id || bill.id || bill.ShopID, // Match snake_case expectation
                    bill_no: bill.bill_no,
                    party: bill.Party,
                    amount: Number(amount),
                    type: type,
                    isOverdue: Number(bill.Overdue) > 30,
                    points_awarded: ptsToAward,
                    is_delivery: !!bill._isDeliveryConsole
                });
            }

            setIsSuccess(true);
        } catch (err) {
            console.error("Error submitting payment:", err);
            setError("Failed to submit payment. Try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        createPortal(
            <div className="relative z-50" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                {/* Background backdrop */}
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"></div>

                {/* Fixed z-10 wrapper to position modal */}
                <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
                    {/* Flex container to center the modal */}
                    <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">

                        {/* Modal panel */}
                        <div className="relative transform overflow-hidden w-full max-w-md rounded-3xl sm:rounded-[2.5rem] bg-slate-900 border border-white/10 text-left shadow-[0_32px_64px_-16px_rgba(0,0,0,0.8)] transition-all my-auto p-5 sm:p-6 animate-scale-in max-h-[90vh] overflow-y-auto">
                            <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-600/20 rounded-full blur-[80px] pointer-events-none"></div>

                            {isSuccess ? (
                                <div className="py-8 text-center animate-scale-in flex flex-col items-center justify-center min-h-[300px]">
                                    <div className="mb-6 mx-auto">
                                        <svg className="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                                            <circle className="checkmark__circle" cx="26" cy="26" r="25" fill="none" />
                                            <path className="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
                                        </svg>
                                    </div>
                                    <h3 className="text-3xl font-black text-white mb-2 tracking-tight">Payment Recorded!</h3>
                                    {!navigator.onLine && (
                                        <div className="bg-amber-500/20 text-amber-500 text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full border border-amber-500/30 mb-3 flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></div>
                                            Saved Offline - Will sync when connected
                                        </div>
                                    )}
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-6">Transaction ID: #{Date.now().toString().slice(-6)}</p>

                                    {/* POINTS ANIMATION POP */}
                                    {(() => {
                                        const basePts = Math.floor(Number(amount) / 1000);
                                        const isOverdue = Number(bill?.Overdue || 0) > 0;
                                        const pts = isOverdue ? Math.floor(basePts * 1.2) : basePts;

                                        if (pts > 0) {
                                            return (
                                                <div className="mb-10 text-center animate-bounce-in relative z-20">
                                                    <div className="absolute inset-0 bg-yellow-500/20 blur-xl top-1/2 -translate-y-1/2 rounded-full h-10"></div>
                                                    <span className="text-4xl font-black text-yellow-400 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)] flex items-center justify-center gap-2">
                                                        +{pts} <span className="text-[14px] uppercase tracking-widest text-yellow-500/80">Points</span>
                                                    </span>
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()}

                                    <div className="space-y-3 w-full">
                                        {whatsappUrl && (
                                            <button
                                                onClick={handleWhatsAppRedirect}
                                                className="w-full bg-[#25D366] hover:bg-[#20ba56] text-white font-black py-4 rounded-2xl shadow-[0_12px_30px_-8px_rgba(37,211,102,0.4)] active:scale-95 transition-all flex items-center justify-center gap-3 group"
                                            >
                                                <Smartphone size={20} className="group-hover:rotate-12 transition-transform" />
                                                <span className="uppercase tracking-[0.2em] text-[10px]">Send WhatsApp Receipt</span>
                                            </button>
                                        )}

                                        <button
                                            onClick={onClose}
                                            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-black py-4 rounded-2xl border border-white/5 active:scale-95 transition-all flex items-center justify-center gap-3 shadow-lg"
                                        >
                                            <span className="uppercase tracking-[0.2em] text-[10px]">Close & Continue</span>
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* Header */}
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">Receive Funds</h2>
                                            <p className="text-[8px] sm:text-[10px] text-slate-500 mt-1 uppercase tracking-[0.2em] sm:tracking-[0.3em] font-black opacity-80">{bill.Party}</p>
                                        </div>
                                        <button
                                            onClick={onClose}
                                            className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-400 hover:text-white transition-all active:scale-95 border border-white/5"
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>

                                    {/* Bill Info Card */}
                                    <div className="bg-slate-950/50 backdrop-blur-2xl rounded-2xl sm:rounded-3xl p-4 mb-4 border border-white/5 flex justify-between items-center shadow-inner relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-600"></div>
                                        <div>
                                            <p className="text-[8px] sm:text-[9px] text-slate-500 font-black uppercase tracking-[0.2em] mb-1 opacity-60">Total Outstanding</p>
                                            <p className="text-xl sm:text-2xl font-black text-slate-50 tracking-tighter">₹{Number(bill.Amount).toLocaleString('en-IN')}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[8px] sm:text-[9px] text-slate-500 font-black uppercase tracking-[0.2em] mb-1 opacity-60">Aging</p>
                                            <div className="flex items-center justify-end gap-2">
                                                <span className={`text-xl sm:text-2xl font-black tracking-tighter ${Number(bill.Overdue) > 30 ? 'text-red-500' : 'text-amber-500'}`}>
                                                    {bill.Overdue}
                                                </span>
                                                <span className="text-[8px] sm:text-[10px] font-black text-slate-600">Days</span>
                                            </div>
                                        </div>
                                    </div>

                                    <form onSubmit={handleSubmit} className="space-y-3">

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-500 uppercase ml-4 tracking-[0.2em]">Transaction Protocol</label>
                                            <div className="relative group">
                                                {/* CUSTOM DROPDOWN TRIGGER */}
                                                <div
                                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                                    className={`w-full bg-slate-950/50 border ${isDropdownOpen ? 'border-blue-500/50' : 'border-white/5'} hover:border-blue-600/40 rounded-3xl py-3 px-5 flex items-center justify-between text-slate-100 font-black transition-all text-xs tracking-widest shadow-inner cursor-pointer`}
                                                >
                                                    <span className="uppercase">{type === 'Cash' ? 'CASH CLEARANCE' : type === 'UPI' ? 'DIGITAL TRANSFER' : type === 'Cheque' ? 'BANK CHEQUE' : type === 'Credit' ? 'CREDIT ALIGNMENT' : 'RETURNS / LESS'}</span>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-px h-5 bg-white/10"></div>
                                                        <div className={`flex items-center justify-center p-1 rounded-lg ${type === 'Credit' ? 'bg-fuchsia-500/10 text-fuchsia-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                                            {type === 'Cash' && <Banknote size={14} />}
                                                            {type === 'UPI' && <CreditCard size={14} />}
                                                            {type === 'Cheque' && <Building2 size={14} />}
                                                            {type === 'Less' && <X size={14} />}
                                                            {type === 'Credit' && <Clock size={14} />}
                                                        </div>
                                                        <ChevronDown size={14} className={`text-slate-500 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180 text-blue-400' : ''}`} />
                                                    </div>
                                                </div>

                                                {/* CUSTOM DROPDOWN MENU */}
                                                {isDropdownOpen && (
                                                    <>
                                                        <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)}></div>
                                                        <div className="absolute top-full left-0 right-0 mt-2 bg-[#020617] border border-white/10 rounded-3xl p-2 shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-20 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                                            <div className="flex flex-col gap-1 relative">
                                                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-[40px] pointer-events-none"></div>

                                                                <button
                                                                    type="button"
                                                                    onClick={() => React.startTransition(() => { setType('Cash'); setIsDropdownOpen(false); })}
                                                                    className={`flex items-center gap-3 w-full text-left p-2.5 rounded-xl transition-all relative z-10 ${type === 'Cash' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-slate-300 hover:bg-white/5 border border-transparent hover:text-white'}`}
                                                                >
                                                                    <div className={`p-1.5 rounded-lg flex items-center justify-center ${type === 'Cash' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-400'}`}>
                                                                        <Banknote size={16} />
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <span className="font-black text-xs uppercase tracking-widest">Cash Clearance</span>
                                                                        <span className="text-[8px] font-bold uppercase tracking-[0.2em] opacity-60">Physical Currency</span>
                                                                    </div>
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    onClick={() => React.startTransition(() => { setType('UPI'); setIsDropdownOpen(false); })}
                                                                    className={`flex items-center gap-3 w-full text-left p-2.5 rounded-xl transition-all relative z-10 ${type === 'UPI' ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-300 hover:bg-white/5 border border-transparent hover:text-white'}`}
                                                                >
                                                                    <div className={`p-1.5 rounded-lg flex items-center justify-center ${type === 'UPI' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-400'}`}>
                                                                        <CreditCard size={16} />
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <span className="font-black text-xs uppercase tracking-widest">Digital Transfer</span>
                                                                        <span className="text-[8px] font-bold uppercase tracking-[0.2em] opacity-60">UPI / NetBanking</span>
                                                                    </div>
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    onClick={() => React.startTransition(() => { setType('Cheque'); setIsDropdownOpen(false); })}
                                                                    className={`flex items-center gap-3 w-full text-left p-2.5 rounded-xl transition-all relative z-10 ${type === 'Cheque' ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30' : 'text-slate-300 hover:bg-white/5 border border-transparent hover:text-white'}`}
                                                                >
                                                                    <div className={`p-1.5 rounded-lg flex items-center justify-center ${type === 'Cheque' ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-800 text-slate-400'}`}>
                                                                        <Building2 size={16} />
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <span className="font-black text-xs uppercase tracking-widest">Bank Cheque</span>
                                                                        <span className="text-[8px] font-bold uppercase tracking-[0.2em] opacity-60">Physical Bank Draft</span>
                                                                    </div>
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    onClick={() => React.startTransition(() => { setType('Credit'); setIsDropdownOpen(false); })}
                                                                    className={`flex items-center gap-3 w-full text-left p-2.5 rounded-xl transition-all relative z-10 ${type === 'Credit' ? 'bg-fuchsia-600/20 text-fuchsia-400 border border-fuchsia-500/30' : 'text-slate-300 hover:bg-white/5 border border-transparent hover:text-white'}`}
                                                                >
                                                                    <div className={`p-1.5 rounded-lg flex items-center justify-center ${type === 'Credit' ? 'bg-fuchsia-500/20 text-fuchsia-400' : 'bg-slate-800 text-slate-400'}`}>
                                                                        <Clock size={16} />
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <span className="font-black text-xs uppercase tracking-widest">Credit Alignment</span>
                                                                        <span className="text-[8px] font-bold uppercase tracking-[0.2em] opacity-60">Time Extension</span>
                                                                    </div>
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    onClick={() => React.startTransition(() => { setType('Less'); setIsDropdownOpen(false); })}
                                                                    className={`flex items-center gap-3 w-full text-left p-2.5 rounded-xl transition-all relative z-10 ${type === 'Less' ? 'bg-red-600/20 text-red-400 border border-red-500/30' : 'text-slate-300 hover:bg-white/5 border border-transparent hover:text-white'}`}
                                                                >
                                                                    <div className={`p-1.5 rounded-lg flex items-center justify-center ${type === 'Less' ? 'bg-red-500/20 text-red-400' : 'bg-slate-800 text-slate-400'}`}>
                                                                        <X size={16} />
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <span className="font-black text-xs uppercase tracking-widest">Returns / Less</span>
                                                                        <span className="text-[8px] font-bold uppercase tracking-[0.2em] opacity-60">Deduction / Stock Return</span>
                                                                    </div>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {type === 'Cheque' && (
                                            <div className="space-y-2 animate-scale-in">
                                                <label className="text-[10px] font-black text-slate-500 uppercase ml-4 tracking-[0.2em]">Cheque Due Date</label>
                                                <div className="relative group">
                                                    <input
                                                        type="date"
                                                        value={chequeDate}
                                                        onChange={(e) => setChequeDate(e.target.value)}
                                                        className="w-full bg-slate-950/50 border border-white/5 focus:border-blue-600/40 rounded-3xl py-3 px-6 text-slate-100 font-black outline-none transition-all text-sm tracking-widest shadow-inner cursor-pointer [color-scheme:dark]"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {type === 'Less' && (
                                            <div className="space-y-2 animate-scale-in">
                                                <label className="text-[10px] font-black text-slate-500 uppercase ml-4 tracking-[0.2em]">Return Description</label>
                                                <div className="relative group">
                                                    <textarea
                                                        value={description}
                                                        onChange={(e) => setDescription(e.target.value)}
                                                        placeholder="e.g. Malkist 10/- 2 PKT Returned"
                                                        className="w-full bg-slate-950/50 border border-white/5 focus:border-red-600/40 rounded-3xl py-3 px-6 text-slate-100 font-bold outline-none transition-all text-xs tracking-wide shadow-inner placeholder:text-slate-600"
                                                        rows={2}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Amount Input */}
                                        <div className="space-y-2 mt-4">
                                            {type === 'Credit' ? (
                                                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-slate-500 uppercase ml-4 tracking-[0.2em]">Credit Extended</label>
                                                        <div className="relative group">
                                                            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                                                <span className="text-slate-400 font-bold group-focus-within:text-fuchsia-400 transition-colors">₹</span>
                                                            </div>
                                                            <input
                                                                type="number"
                                                                value={amount}
                                                                onChange={(e) => setAmount(e.target.value)}
                                                                className="w-full bg-slate-950/50 border border-white/5 rounded-3xl py-4 pl-10 pr-5 text-fuchsia-400 font-black text-2xl tracking-tighter shadow-inner focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50 focus:border-fuchsia-500/50 hover:border-fuchsia-600/40 transition-all text-right"
                                                                placeholder="0.00"
                                                                min="0"
                                                                step="0.01"
                                                            />
                                                        </div>
                                                        <p className="text-[10px] text-fuchsia-400/80 px-4 font-bold text-right pt-1 uppercase tracking-widest"><Clock size={10} className="inline mr-1" /> Marked as pending</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <label className="text-[10px] font-black text-slate-500 uppercase ml-4 tracking-[0.2em]">Collection Amount</label>
                                                    <div className="relative group">
                                                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-blue-500 font-black text-xl drop-shadow-[0_0_8px_rgba(59,130,246,0.3)] pointer-events-none">₹</span>
                                                        <input
                                                            type="number"
                                                            value={amount}
                                                            onChange={(e) => setAmount(e.target.value)}
                                                            placeholder="0.00"
                                                            className="w-full bg-slate-950/50 border border-white/5 focus:border-blue-600/40 rounded-3xl py-4 pl-14 pr-6 text-2xl sm:text-3xl font-black text-white placeholder-slate-600 outline-none transition-all shadow-inner tracking-tighter"
                                                            autoFocus
                                                        />
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        {error && (
                                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 animate-shake">
                                                <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div> {error}
                                            </div>
                                        )}

                                        {/* Submit Button */}
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black py-4 rounded-full shadow-[0_12px_30px_-8px_rgba(59,130,246,0.6)] active:scale-[0.97] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group"
                                        >
                                            {loading ? (
                                                <>
                                                    <Loader2 size={24} className="animate-spin" />
                                                    <span className="uppercase tracking-[0.3em] text-[10px]">Verifying...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="uppercase tracking-[0.3em] text-[10px]">Secure Confirm</span>
                                                    <Check size={20} className="group-hover:scale-125 transition-transform" />
                                                </>
                                            )}
                                        </button>
                                    </form>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>,
            document.body
        )
    );
}
