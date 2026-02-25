import React, { useEffect, useState } from 'react';
import { Zap, Hexagon } from 'lucide-react';

const SplashScreen = ({ onComplete }) => {
    const [step, setStep] = useState(0);

    useEffect(() => {
        // Timeline of animations
        const t1 = setTimeout(() => setStep(1), 500); // Icon appears
        const t2 = setTimeout(() => setStep(2), 1200); // Text appears
        const t3 = setTimeout(() => setStep(3), 2200); // Fade out start
        const t4 = setTimeout(onComplete, 2500); // Unmount

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
            clearTimeout(t4);
        };
    }, [onComplete]);

    return (
        <div className={`fixed inset-0 z-[9999] bg-[#0f172a] flex items-center justify-center transition-opacity duration-500 ${step === 3 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>

            {/* Background Effects */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[100px] animate-pulse"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }}></div>
            </div>

            <div className="relative z-10 flex flex-col items-center">
                {/* Logo Animation */}
                <div className={`relative transition-all duration-700 transform ${step >= 1 ? 'scale-100 opacity-100 translate-y-0' : 'scale-50 opacity-0 translate-y-10'}`}>
                    <div className="relative w-24 h-24 flex items-center justify-center">
                        <Hexagon size={96} className="text-blue-500/20 absolute animate-spin-slow-reverse" strokeWidth={1} />
                        <Hexagon size={80} className="text-blue-400/40 absolute animate-spin-slow" strokeWidth={1} />

                        <div className="relative w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.5)]">
                            <Zap size={32} className="text-white fill-white animate-bounce-subtle" />
                        </div>
                    </div>
                </div>

                {/* Text Animation */}
                <div className={`mt-8 text-center transition-all duration-700 delay-300 transform ${step >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
                    <h1 className="text-4xl font-black text-white tracking-tighter mb-1">
                        JARWIS <span className="text-blue-400">PRO</span>
                    </h1>
                    <p className="text-blue-200/50 text-[10px] uppercase tracking-[0.4em] font-bold">
                        AI Powered Sales
                    </p>
                </div>

                {/* Loading Bar */}
                <div className={`mt-12 w-32 h-1 bg-slate-800 rounded-full overflow-hidden transition-opacity duration-500 delay-500 ${step >= 2 ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 w-full animate-progress-indeterminate origin-left"></div>
                </div>
            </div>
        </div>
    );
};

export default SplashScreen;
