import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle, Building2, UserCircle2, Map as MapIcon, Loader2 } from 'lucide-react';
import { db } from "../firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

export default function FrontOfficeUpload({ setView, playSound }) {
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const [selectedCompany, setSelectedCompany] = useState('');
    const [selectedSalesman, setSelectedSalesman] = useState('');
    const [selectedRoute, setSelectedRoute] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);

    // State lists
    const [salesmenList, setSalesmenList] = useState([]);

    // Hardcoded companies as requested
    const COMPANIES = ['Britannia', 'Cadbury', 'Colgate', 'Godrej'];

    // Fetch salesmen dynamically from Firestore users collection
    useEffect(() => {
        const fetchSalesmen = async () => {
            try {
                // Assuming salesmen have role === 'salesman'
                const q = query(collection(db, "users"), where("role", "==", "salesman"));
                const snap = await getDocs(q);
                const smData = [];
                snap.forEach(doc => {
                    const data = doc.data();
                    smData.push({
                        id: doc.id,
                        name: data.salesman_name || data.name || doc.id
                    });
                });

                // fallback if the query returns empty or role isn't structured properly:
                if (smData.length === 0) {
                    const allUsers = await getDocs(collection(db, "users"));
                    allUsers.forEach(doc => {
                        const data = doc.data();
                        if (data.role === 'salesman' || data.salesman_name) {
                            smData.push({
                                id: doc.id,
                                name: data.salesman_name || data.name || doc.id
                            });
                        }
                    });
                }

                // Deduplicate and sort
                const uniqueDict = {};
                smData.forEach(item => {
                    const key = item.name.trim().toUpperCase();
                    if (!uniqueDict[key]) uniqueDict[key] = item;
                });

                const sorted = Object.values(uniqueDict).sort((a, b) => a.name.localeCompare(b.name));
                setSalesmenList(sorted);
            } catch (e) {
                console.error("Error fetching salesmen:", e);
                setErrorMessage("Failed to load salesmen list from database.");
            }
        };
        fetchSalesmen();
    }, []);

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            playSound('click');
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();

        if (!selectedCompany || !selectedSalesman || !selectedRoute || !selectedFile) {
            playSound('error');
            setErrorMessage("Please fill all fields and select a valid Excel file.");
            setSuccessMessage('');
            return;
        }

        playSound('click');
        setLoading(true);
        setErrorMessage('');
        setSuccessMessage('');

        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("company_name", selectedCompany);
        formData.append("salesman_id", selectedSalesman);
        formData.append("route_name", selectedRoute);

        try {
            const response = await fetch("http://127.0.0.1:5000/upload_loadsheets", {
                method: "POST",
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to process the sheet");
            }

            const data = await response.json();
            playSound('success');
            setSuccessMessage(`Success! Processed ${data.shops_processed || 0} shops for ${selectedRoute}.`);

            // Clear form on success
            setSelectedRoute('');
            setSelectedFile(null);
            // Optionally keep company and salesman the same if they upload multiple routes

        } catch (err) {
            console.error("API Upload Error:", err);
            playSound('error');
            setErrorMessage(err.message || "An unexpected error occurred connecting to the backend.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in pb-20 w-full max-w-4xl mx-auto mt-8">
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={() => { playSound('pop'); setView('DASHBOARD'); }}
                    className="p-3 bg-white/5 rounded-2xl border border-white/10 text-slate-300 hover:bg-white/10 active:scale-90 transition-all shadow-xl backdrop-blur-md"
                >
                    <ArrowLeft size={24} />
                </button>
                <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Data Ingestion</p>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tight">Front Office Upload</h3>
                </div>
            </div>

            <div className="bg-slate-900/60 backdrop-blur-3xl border border-white/10 p-8 lg:p-10 rounded-[2.5rem] relative overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.4)] ring-1 ring-inset ring-white/5 relative z-10 transition-all">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[60px] pointer-events-none"></div>

                <form onSubmit={handleUpload} className="space-y-8 relative z-20">

                    {/* Form Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* Company Dropdown */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Building2 size={14} className="text-blue-400" /> Company
                            </label>
                            <select
                                value={selectedCompany}
                                onChange={(e) => { playSound('click'); setSelectedCompany(e.target.value); }}
                                className="w-full bg-slate-950/50 border border-white/10 text-white p-4 rounded-2xl outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all appearance-none cursor-pointer"
                            >
                                <option value="" disabled className="bg-slate-900 text-slate-500">Select Company...</option>
                                {COMPANIES.map(comp => (
                                    <option key={comp} value={comp} className="bg-slate-900 text-white">{comp}</option>
                                ))}
                            </select>
                        </div>

                        {/* Salesman Dropdown */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <UserCircle2 size={14} className="text-emerald-400" /> Salesman
                            </label>
                            <select
                                value={selectedSalesman}
                                onChange={(e) => { playSound('click'); setSelectedSalesman(e.target.value); }}
                                className="w-full bg-slate-950/50 border border-white/10 text-white p-4 rounded-2xl outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all appearance-none cursor-pointer"
                            >
                                <option value="" disabled className="bg-slate-900 text-slate-500">Select Salesman...</option>
                                {salesmenList.map(sm => (
                                    <option key={sm.id} value={sm.id} className="bg-slate-900 text-white">{sm.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Route Name Input */}
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <MapIcon size={14} className="text-purple-400" /> Route Name
                            </label>
                            <input
                                type="text"
                                value={selectedRoute}
                                onChange={(e) => setSelectedRoute(e.target.value)}
                                placeholder="e.g. MONDAY_CITY, ROUTE_A"
                                className="w-full bg-slate-950/50 border border-white/10 text-white p-4 rounded-2xl outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all uppercase placeholder:normal-case placeholder:text-slate-600"
                            />
                        </div>
                    </div>

                    <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/10 to-transparent my-4"></div>

                    {/* File Upload Zone */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                            <FileSpreadsheet size={14} className="text-orange-400" /> Delivery Loadsheet
                        </label>
                        <div className="relative border-2 border-dashed border-white/20 hover:border-blue-500/50 rounded-[2rem] p-10 flex flex-col items-center justify-center text-center transition-all bg-slate-950/30 group">
                            <input
                                type="file"
                                accept=".xlsx, .xls"
                                onChange={handleFileChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer object-cover"
                            />

                            {!selectedFile ? (
                                <>
                                    <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500">
                                        <UploadCloud size={32} className="text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]" />
                                    </div>
                                    <p className="text-white font-black text-lg mb-1">Upload Excel Extract</p>
                                    <p className="text-slate-400 text-sm">Drag and drop or click to browse</p>
                                </>
                            ) : (
                                <>
                                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4 border border-emerald-500/30">
                                        <FileSpreadsheet size={32} className="text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                                    </div>
                                    <p className="text-emerald-400 font-black text-lg mb-1">{selectedFile.name}</p>
                                    <p className="text-emerald-600 font-bold text-sm tracking-wide">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Messages */}
                    {errorMessage && (
                        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-3 animate-fade-in shadow-inner">
                            <AlertCircle size={20} className="text-red-400 shrink-0" />
                            <p className="text-red-400 font-bold text-sm">{errorMessage}</p>
                        </div>
                    )}

                    {successMessage && (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl flex items-center gap-3 animate-fade-in shadow-inner">
                            <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
                            <p className="text-emerald-400 font-black text-sm">{successMessage}</p>
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 p-5 rounded-2xl flex items-center justify-center gap-3 font-black text-white uppercase tracking-widest text-sm transition-all duration-300 shadow-[0_10px_20px_rgba(59,130,246,0.3)] hover:shadow-[0_15px_30px_rgba(59,130,246,0.4)] active:scale-[0.98] ${loading ? 'opacity-80 pointer-events-none' : 'hover:-translate-y-1'}`}
                    >
                        {loading ? (
                            <>
                                <Loader2 size={20} className="animate-spin text-white" />
                                Processing Upload...
                            </>
                        ) : (
                            <>
                                <UploadCloud size={20} />
                                Confirm & Process
                            </>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[100%] hover:animate-shimmer" style={{ backgroundSize: '200% 100%' }}></div>
                    </button>

                </form>
            </div>
        </div>
    );
}
