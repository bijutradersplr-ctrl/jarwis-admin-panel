import React, { useEffect, useState } from 'react';
import { Cpu, Wifi, Shield, Database, Activity, Zap } from 'lucide-react';

const NewSplash = ({ onFinish }) => {
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState("Initializing System Core...");
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        // Simulate loading progress
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    return 100;
                }
                // Much faster increments to reduce blocking LCP
                return prev + 15;
            });
        }, 40);

        // Accelerated status text updates
        const statusTimers = [
            setTimeout(() => setStatus("Handshaking Secure Protocols..."), 100),
            setTimeout(() => setStatus("Decrypting User Session..."), 200),
            setTimeout(() => setStatus("Synchronizing Cloud Database..."), 300),
            setTimeout(() => setStatus("JARWIS PRO SYSTEM READY"), 400),
        ];

        return () => {
            clearInterval(interval);
            statusTimers.forEach(clearTimeout);
        };
    }, []);

    // Trigger exit animation when progress hits 100% or parent tells us to finish (if we added that prop support fully)
    // For now, let's auto-trigger exit after a minimum time to ensure the improved animation is seen.
    useEffect(() => {
        if (progress >= 100) {
            setTimeout(() => {
                setIsExiting(true);
                setTimeout(() => {
                    if (onFinish) onFinish();
                }, 300);
            }, 100);
        }
    }, [progress, onFinish]);


    return (
        <div className={`fixed inset-0 z-[9999] bg-slate-950 flex flex-col items-center justify-center overflow-hidden transition-all duration-700 ${isExiting ? 'opacity-0 scale-110 filter blur-xl' : 'opacity-100 scale-100'}`}>

            {/* Dynamic Background Grid (Disabled on Mobile to fix 9s LCP) */}
            <div className="hidden sm:block absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none"></div>

            <div className="relative z-10 flex flex-col items-center">
                {/* Central Hexagon Container */}
                <div className="relative w-32 h-32 mb-12">
                    {/* Spinning Outer Ring */}
                    <div className="absolute inset-0 border-2 border-dashed border-cyan-500/30 rounded-full sm:animate-spin-slow"></div>
                    <div className="hidden sm:block absolute inset-2 border border-cyan-400/20 rounded-full animate-reverse-spin"></div>

                    {/* Pulsing Core */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-20 h-20 bg-cyan-500/10 rounded-xl rotate-45 backdrop-blur-md border border-cyan-400/30 flex items-center justify-center shadow-[0_0_30px_rgba(34,211,238,0.2)] animate-pulse">
                            <Cpu size={40} className="text-cyan-400 -rotate-45" />
                        </div>
                    </div>

                    {/* Orbiting Particles */}
                    <div className="absolute inset-0 animate-ping opacity-20 bg-cyan-500 rounded-full"></div>
                </div>

                {/* Title Glitch Effect */}
                <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 tracking-tighter mb-2 relative">
                    JARWIS <span className="text-white">PRO</span>
                </h1>

                {/* Status Terminal */}
                <div className="h-6 mb-8">
                    <p className="font-mono text-cyan-500/80 text-xs uppercase tracking-widest animate-pulse">
                        {">"} {status}
                    </p>
                </div>

                {/* Loading Bar */}
                <div className="w-64 h-1 bg-slate-800 rounded-full overflow-hidden relative">
                    <div
                        className="h-full bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.8)] transition-all duration-300 ease-out relative"
                        style={{ width: `${Math.min(progress, 100)}%` }}
                    >
                        <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/50 blur-[2px]"></div>
                    </div>
                </div>


            </div>

            {/* Decorative Corners */}
            <div className="absolute top-0 left-0 p-8">
                <div className="w-24 h-24 border-l-2 border-t-2 border-cyan-500/20 rounded-tl-3xl"></div>
            </div>
            <div className="absolute bottom-0 right-0 p-8">
                <div className="w-24 h-24 border-r-2 border-b-2 border-cyan-500/20 rounded-br-3xl"></div>
            </div>

            {/* Grid Stats */}
            <div className="absolute bottom-10 flex gap-8 text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                <div className="flex items-center gap-2">
                    <Wifi size={12} className="text-emerald-500" />
                    <span>Net: Secure</span>
                </div>
                <div className="flex items-center gap-2">
                    <Database size={12} className="text-blue-500" />
                    <span>Db: Synced</span>
                </div>
                <div className="flex items-center gap-2">
                    <Shield size={12} className="text-purple-500" />
                    <span>Sys: Protected</span>
                </div>
            </div>

        </div>
    );
};

export default NewSplash;
