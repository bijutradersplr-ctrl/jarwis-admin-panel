import React, { useEffect, useState } from 'react';
import { Zap, Hexagon, Component, Activity } from 'lucide-react';

export default function Splash({ onFinish }) {
    const [step, setStep] = useState(0);
    const [fade, setFade] = useState(false);

    useEffect(() => {
        // Timeline of animations
        // 0ms: Mount (Background visible)
        // 300ms: Logo Scale Up
        // 1000ms: Text Reveal
        // 2500ms: Start Exit Fade
        // 2800ms: Unmount (onFinish)

        const timers = [
            setTimeout(() => setStep(1), 300),
            setTimeout(() => setStep(2), 1000),
            setTimeout(() => {
                setFade(true); // Trigger CSS opacity fade
            }, 2500),
            setTimeout(() => {
                onFinish();
            }, 2800)
        ];

        return () => timers.forEach(clearTimeout);
    }, [onFinish]);

    return (
        <div className={`fixed inset-0 z-[9999] bg-[#020617] flex items-center justify-center transition-opacity duration-500 ease-out ${fade ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>

            {/* Background Ambient Glows */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] bg-blue-600/10 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[70vw] h-[70vw] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
            </div>

            {/* Main Content Container */}
            <div className="relative z-10 flex flex-col items-center">

                {/* Logo Composition */}
                <div className={`relative transition-all duration-1000 cubic-bezier(0.34, 1.56, 0.64, 1) ${step >= 1 ? 'scale-100 opacity-100 translate-y-0' : 'scale-50 opacity-0 translate-y-12'}`}>
                    <div className="relative w-28 h-28 flex items-center justify-center">
                        {/* Rotating Rings */}
                        <div className="absolute inset-0 border border-blue-500/20 rounded-full animate-spin-slow-reverse" style={{ animationDuration: '8s' }}></div>
                        <div className="absolute inset-2 border border-indigo-500/20 rounded-full animate-spin-slow" style={{ animationDuration: '6s' }}></div>

                        {/* Center Icon */}
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-[0_0_40px_rgba(59,130,246,0.4)] relative overflow-hidden group">
                            <div className="absolute inset-0 bg-white/20 translate-y-full skew-y-12 animate-shimmer"></div>
                            <Zap size={36} className="text-white fill-white drop-shadow-md" />
                        </div>

                        {/* Orbiting Decor */}
                        <div className="absolute -top-4 right-0">
                            <Activity size={16} className="text-blue-400 animate-bounce" style={{ animationDelay: '0.5s' }} />
                        </div>
                    </div>
                </div>

                {/* Text Reveal */}
                <div className={`mt-10 text-center transition-all duration-700 delay-200 ${step >= 2 ? 'opacity-100 translate-y-0 blur-0' : 'opacity-0 translate-y-8 blur-sm'}`}>
                    <h1 className="text-5xl font-black text-white tracking-tighter leading-tight drop-shadow-2xl">
                        JARWIS <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">PRO</span>
                    </h1>
                    <div className="mt-3 flex items-center justify-center gap-3 opacity-60">
                        <div className="h-[1px] w-8 bg-blue-400/50"></div>
                        <p className="text-blue-200 text-[10px] uppercase tracking-[0.4em] font-bold">
                            AI Powered System
                        </p>
                        <div className="h-[1px] w-8 bg-blue-400/50"></div>
                    </div>
                </div>

                {/* Loader Bar */}
                <div className={`mt-16 w-32 h-1 bg-slate-800/50 rounded-full overflow-hidden transition-all duration-500 delay-500 ${step >= 2 ? 'opacity-100 w-32' : 'opacity-0 w-0'}`}>
                    <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 w-full animate-progress-indeterminate origin-left"></div>
                </div>

            </div>

            {/* Disclaimer / Footer */}
            <div className={`absolute bottom-8 left-0 right-0 text-center transition-opacity duration-700 delay-700 ${step >= 2 ? 'opacity-30' : 'opacity-0'}`}>
                <p className="text-[9px] font-mono text-white uppercase tracking-widest">
                    Initializing Core Modules...
                </p>
            </div>
        </div>
    );
}
