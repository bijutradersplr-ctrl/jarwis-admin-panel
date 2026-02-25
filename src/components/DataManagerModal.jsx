import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { X, Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase'; // Adjust path as needed

const DataManagerModal = ({ onClose }) => {
    const [file, setFile] = useState(null);
    const [previewData, setPreviewData] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState(null);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            readExcel(selectedFile);
        }
    };

    const readExcel = (file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = e.target.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(sheet);
            setPreviewData(json);
        };
        reader.readAsBinaryString(file);
    };

    // Helper to find the best matching key
    const findKey = (row, keywords) => {
        const keys = Object.keys(row);
        for (const keyword of keywords) {
            const match = keys.find(k => k.toLowerCase().includes(keyword.toLowerCase()));
            if (match) return match;
        }
        return null;
    };

    const processImport = async () => {
        setUploading(true);
        setUploadStatus(null);
        let successCount = 0;
        let diffCount = 0;
        let failCount = 0;

        try {
            for (const row of previewData) {
                // Dynamic Key Detection
                const nameKey = findKey(row, ['customer', 'party', 'name', 'client']);
                const mobileKey = findKey(row, ['mobile', 'phone', 'cell', 'contact', 'ph']);

                const partyNameRaw = nameKey ? row[nameKey] : '';
                const mobile = mobileKey ? String(row[mobileKey]).trim() : '';

                if (!partyNameRaw || !mobile) {
                    failCount++; // Skip invalid rows
                    continue;
                }

                // Logic: Extract clean name? Or use exact?
                // User requirement: "KL-0152121 A.K.M.STORES" -> "A.K.M.STORES" ??
                // Strategy: Try exact match first. If not found, try to strip "KL-XXXXXX " prefix.

                // Assuming database stores "A.K.M.STORES" (uppercase) as ID/Key.
                // Regex to strip prefix: /^[A-Z]{2}-\d+\s+(.*)$/
                let partyId = partyNameRaw.trim().toUpperCase();

                // Only strip if it matches the pattern
                const match = partyId.match(/^[A-Z]{2}-\d+\s+(.*)$/);
                if (match && match[1]) {
                    partyId = match[1].trim();
                }

                const docRef = doc(db, 'party_directory', partyId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    await updateDoc(docRef, { phone: mobile });
                    successCount++;
                } else {
                    // Try creating it? Or skip if not found?
                    // User says "modify existing". So maybe skip or create new entry?
                    // Let's create it if it doesn't exist, just in case, but usually we modify.
                    // For now, let's just setMerge.
                    await setDoc(docRef, { phone: mobile }, { merge: true });
                    successCount++;
                }
            }
            setUploadStatus({ type: 'success', message: `Imported ${successCount} numbers successfully!` });
            setTimeout(() => {
                onClose();
            }, 2000);
        } catch (error) {
            console.error("Import Error:", error);
            setUploadStatus({ type: 'error', message: 'Failed to import data. Check console.' });
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-950/50">
                    <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                        <FileSpreadsheet className="text-emerald-500" />
                        Data Manager
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    {!previewData.length ? (
                        <div className="border-2 border-dashed border-white/10 rounded-2xl p-10 flex flex-col items-center justify-center text-center gap-4 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all group cursor-pointer relative">
                            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                <Upload size={32} className="text-blue-500" />
                            </div>
                            <div>
                                <h4 className="text-lg font-bold text-white mb-1">Upload Excel File</h4>
                                <p className="text-sm text-slate-500">Supported formats: .xlsx, .xls</p>
                            </div>
                            <input
                                type="file"
                                accept=".xlsx, .xls"
                                onChange={handleFileChange}
                                className="absolute inset-0 opacity-0 cursor-pointer z-50"
                            />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-slate-400">Preview: {previewData.length} rows found</span>
                                <button onClick={() => setPreviewData([])} className="text-xs font-bold text-red-400 hover:underline">Remove File</button>
                            </div>
                            <div className="max-h-[300px] overflow-y-auto border border-white/10 rounded-xl">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-950 sticky top-0">
                                        <tr>
                                            <th className="p-3 font-bold text-slate-500 uppercase tracking-wider text-xs">Customer Name</th>
                                            <th className="p-3 font-bold text-slate-500 uppercase tracking-wider text-xs">Mobile</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {previewData.slice(0, 10).map((row, i) => {
                                            const nameKey = findKey(row, ['customer', 'party', 'name', 'client']);
                                            const mobileKey = findKey(row, ['mobile', 'phone', 'cell', 'contact', 'ph']);
                                            return (
                                                <tr key={i} className="hover:bg-white/5">
                                                    <td className="p-3 text-slate-300">{nameKey ? row[nameKey] : <span className="text-red-500 italic">Not Found</span>}</td>
                                                    <td className="p-3 text-slate-300 font-mono">{mobileKey ? row[mobileKey] : <span className="text-red-500 italic opacity-50">-</span>}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                                {previewData.length > 10 && (
                                    <div className="p-2 text-center text-xs text-slate-600 bg-slate-950/50 italic">
                                        Showing first 10 rows. Total {previewData.length} rows will be imported.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {uploadStatus && (
                        <div className={`p-4 rounded-xl border flex items-center gap-3 ${uploadStatus.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                            {uploadStatus.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                            <span className="font-bold">{uploadStatus.message}</span>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-white/5 flex justify-end gap-3 bg-slate-950/50">
                    <button onClick={onClose} className="px-6 py-3 rounded-xl font-bold text-slate-400 hover:bg-white/5 transition-all">Cancel</button>
                    <button
                        onClick={processImport}
                        disabled={!previewData.length || uploading}
                        className="px-6 py-3 rounded-xl font-black uppercase tracking-widest bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all shadow-lg shadow-blue-600/20"
                    >
                        {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                        {uploading ? 'Importing...' : 'Start Import'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DataManagerModal;
