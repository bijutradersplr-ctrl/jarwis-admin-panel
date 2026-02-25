import React, { useState } from 'react';
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import { Eye, EyeOff, Check } from 'lucide-react';

export default function Login({ onLoginSuccess }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [salesmanName, setSalesmanName] = useState('');
    const [rememberMe, setRememberMe] = useState(true);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    React.useEffect(() => {
        const savedName = localStorage.getItem('remember_name');
        const savedEmail = localStorage.getItem('remember_email');
        if (savedName) setSalesmanName(savedName);
        if (savedEmail) {
            // Strip @jarwis.com for display logic if present
            setEmail(savedEmail.replace('@jarwis.com', ''));
        }
    }, []);

    const handleLogin = (e) => {
        e.preventDefault();
        setError('');

        if (!salesmanName.trim()) {
            setError("Name is required to sync data");
            return;
        }

        setLoading(true);

        const cleanName = salesmanName.trim().toUpperCase().replace(/\s+/g, ' ');
        // Auto-append domain if missing
        let loginEmail = email.trim();
        if (!loginEmail.includes('@')) {
            loginEmail += '@jarwis.com';
        }

        if (rememberMe) {
            localStorage.setItem('remember_name', cleanName);
            // Save the simple username or full email? Saving simple username is better for the UI logic
            localStorage.setItem('remember_email', email.trim());
        } else {
            localStorage.removeItem('remember_name');
            localStorage.removeItem('remember_email');
        }

        const auth = getAuth();
        const cachedRole = localStorage.getItem('jarwis_role');

        signInWithEmailAndPassword(auth, loginEmail, password)
            .then(async (userCredential) => {
                const user = userCredential.user;

                // OPTIMIZATION: Use cached role immediately if available (for instant login)
                if (cachedRole) {
                    console.log("Using cached role for instant login:", cachedRole);
                    onLoginSuccess(cleanName, cachedRole);

                    // Update cache in background for next time
                    getDoc(doc(db, "users", user.uid)).then(docSnap => {
                        if (docSnap.exists()) {
                            const newRole = docSnap.data().role || 'salesman';
                            if (newRole !== cachedRole) {
                                console.warn("Role mismatch! Updating cache for next session.");
                                localStorage.setItem('jarwis_role', newRole);
                            }
                        }
                    }).catch(console.error);
                    return;
                }

                let role = 'salesman'; // Default

                try {
                    const userDoc = await getDoc(doc(db, "users", user.uid));
                    if (userDoc.exists()) {
                        role = userDoc.data().role || 'salesman';
                        console.log("Role matched:", role);
                    } else {
                        console.warn("User role profile not found in Firestore.");
                        // alert("Note: Role profile not found for " + email + ". Defaulting to salesman.");
                    }
                } catch (e) {
                    console.error("Error fetching user role:", e);
                    // alert("Role fetch error: " + e.message);
                }

                localStorage.setItem('jarwis_role', role);
                onLoginSuccess(cleanName, role);
            })
            .catch((error) => {
                console.error(error);
                setError("Invalid Email or Password");
                setLoading(false);
            });
    };

    return (
        <div className="min-h-screen bg-[#020617] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#020617] to-[#020617] flex flex-col items-center justify-center p-6 text-white font-sans overflow-hidden relative">
            {/* Vivid Background Elements */}
            <div className="absolute top-[-20%] right-[-20%] w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute top-[20%] left-[20%] w-[300px] h-[300px] bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none"></div>

            <div className="w-full max-w-[340px] bg-slate-900/40 border border-white/10 p-8 rounded-[3rem] shadow-[0_0_50px_-10px_rgba(79,70,229,0.3)] backdrop-blur-xl relative z-10 text-center overflow-hidden ring-1 ring-white/5">
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-80"></div>

                <div className="mb-8 relative">
                    <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full transform -translate-y-4 opacity-50"></div>
                    <div className="inline-block p-5 bg-gradient-to-b from-slate-800/80 to-slate-900/80 rounded-[2rem] mb-6 border border-white/10 shadow-lg relative z-10 backdrop-blur-md">
                        <div className="flex flex-col items-center">
                            <h1 className="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-tr from-blue-200 via-blue-100 to-white drop-shadow-[0_2px_10px_rgba(59,130,246,0.3)] uppercase">BIJU</h1>
                            <h1 className="text-4xl font-black tracking-tighter text-indigo-500 -mt-2 uppercase drop-shadow-[0_2px_15px_rgba(99,102,241,0.5)]">TRADERS</h1>
                        </div>
                    </div>
                    <p className="text-indigo-400/80 text-[9px] uppercase tracking-[0.6em] font-bold opacity-90">Secured Intelligence Node</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5 text-left relative z-20">
                    <div className="space-y-2 group">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] block text-center group-focus-within:text-indigo-400 transition-colors">Authorized Identity</label>
                        <div className="relative group-focus-within:scale-[1.02] transition-transform duration-300">
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl blur opacity-20 group-focus-within:opacity-60 transition-opacity"></div>
                            <input
                                type="text"
                                placeholder=""
                                className="relative w-full bg-slate-950/80 border border-white/5 p-4 rounded-2xl outline-none focus:border-indigo-500/50 focus:bg-slate-900/90 transition-all text-sm text-white placeholder:text-slate-600 shadow-inner tracking-widest font-black uppercase text-center"
                                value={salesmanName}
                                onChange={(e) => setSalesmanName(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2 group">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] block text-center group-focus-within:text-indigo-400 transition-colors">USERNAME</label>
                        <div className="relative group-focus-within:scale-[1.02] transition-transform duration-300">
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-2xl blur opacity-20 group-focus-within:opacity-60 transition-opacity"></div>
                            <input
                                type="text"
                                placeholder="USERNAME"
                                className="relative w-full bg-slate-950/80 border border-white/5 p-4 rounded-2xl outline-none focus:border-cyan-500/50 focus:bg-slate-900/90 transition-all text-sm text-white placeholder:text-slate-600 shadow-inner tracking-wider font-bold text-center pl-4 pr-24"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-cyan-500/70 font-bold text-xs pointer-events-none tracking-wide">
                                @jarwis.com
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2 group">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] block text-center group-focus-within:text-indigo-400 transition-colors">PASSWORD</label>
                        <div className="relative group-focus-within:scale-[1.02] transition-transform duration-300">
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur opacity-20 group-focus-within:opacity-60 transition-opacity"></div>
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                className="relative w-full bg-slate-950/80 border border-white/5 p-4 rounded-2xl outline-none focus:border-purple-500/50 focus:bg-slate-900/90 transition-all text-sm text-white placeholder:text-slate-600 shadow-inner tracking-[0.5em] text-center pr-10"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-purple-400 transition-colors z-10"
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center justify-center gap-3 pt-2">
                        <div className="relative flex items-center">
                            <input
                                type="checkbox"
                                id="remember"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                className="peer appearance-none w-5 h-5 rounded-lg bg-slate-900 border border-white/10 checked:bg-indigo-600 checked:border-indigo-500 cursor-pointer transition-all shadow-md"
                            />
                            <Check size={12} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity font-bold" strokeWidth={4} />
                        </div>
                        <label htmlFor="remember" className="text-[9px] text-slate-500 font-bold uppercase tracking-widest cursor-pointer select-none hover:text-indigo-400 transition-colors">Preserve Node Session</label>
                    </div>

                    {error && (
                        <div className="text-red-400 text-[9px] text-center font-bold bg-red-500/10 p-3 rounded-2xl border border-red-500/20 uppercase tracking-widest animate-shake backdrop-blur-md">
                            <span className="opacity-70">Protocol Error:</span> {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full relative overflow-hidden bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 hover:from-indigo-500 hover:via-blue-500 hover:to-purple-500 text-white font-black py-5 rounded-2xl shadow-[0_10px_40px_-10px_rgba(79,70,229,0.5)] transition-all active:scale-[0.97] mt-6 disabled:opacity-50 disabled:cursor-not-allowed group flex items-center justify-center gap-3 uppercase tracking-[0.2em] text-[10px]"
                    >
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500 blur-md"></div>
                        <span className="relative z-10">{loading ? 'SYNCHRONIZING...' : 'ESTABLISH CONNECT'}</span>
                    </button>
                </form>

                <p className="text-center text-slate-600 text-[8px] mt-8 font-bold uppercase tracking-[0.5em] opacity-40 hover:opacity-100 transition-opacity cursor-default">JARWIS PRO 1.1.1</p>
            </div>
        </div>
    );
}
