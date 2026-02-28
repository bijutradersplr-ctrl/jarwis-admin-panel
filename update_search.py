import re

def update_search():
    filepath = r"C:\Users\biju\Downloads\New Test Software\jarwis-web\src\components\RemindersView.jsx"
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    replacements = [
        # Search Inputs
        (r'className="w-full bg-white/5 border border-white/10 hover:bg-white/10 rounded py-1 pl-6 pr-2 text-[8px] font-bold text-white placeholder-slate-600 outline-none focus:border-[#60A5FA]/50 transition-all"',
         r'className="w-full bg-slate-950/50 border border-white/5 hover:bg-white/10 rounded-xl sm:rounded-2xl py-2 pl-8 pr-3 text-[10px] sm:text-[11px] font-bold text-white placeholder-slate-600 outline-none focus:border-[#60A5FA]/50 transition-all shadow-inner"'),
         
        # Min/Max Inputs
        (r'className="w-full bg-white/5 border border-white/10 hover:bg-white/10 rounded py-1 pl-5 pr-1 text-[8px] font-bold text-white text-right outline-none focus:border-[#60A5FA]/50"',
         r'className="w-full bg-slate-950/50 border border-white/5 hover:bg-white/10 rounded-xl sm:rounded-2xl py-2 pl-7 pr-2 text-[10px] sm:text-[11px] font-bold text-white text-right outline-none focus:border-[#60A5FA]/50 transition-all"'),
         
        # Dropdown Buttons (Salesman/Route)
        (r'className="w-full bg-white/5 border border-white/10 hover:bg-white/10 rounded py-1 pl-2 pr-1 text-[8px] font-bold text-white outline-none focus:border-[#60A5FA]/50 text-left flex items-center justify-between group transition-colors"',
         r'className="w-full bg-slate-950/50 border border-white/5 hover:bg-white/10 rounded-xl sm:rounded-2xl py-2 px-3 text-[10px] sm:text-[11px] font-bold text-white outline-none focus:border-[#60A5FA]/50 text-left flex items-center justify-between group transition-all"'),
         
        # Individual Card Bills Details (Inner border)
        (r'className="mb-3 bg-white/5 rounded p-2 border border-white/5 relative z-10"',
         r'className="mb-3 bg-slate-950/50 rounded-xl p-3 border border-white/5 hover:border-white/10 transition-all relative z-10"'),
         
        # Action Buttons (Standard Due, Pre-Visit)
        (r'className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-[9px] font-black uppercase tracking-tight transition-all active:scale-95 border ${isSentToday\n                                                        \? \'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-\[0_0_10px_rgba\(16,185,129,0.1\)\]\'\n                                                        : \'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10 hover:text-white hover:border-white/10\'\n                                                        }`}',
         r'className={`flex-1 flex items-center justify-center gap-1.5 py-2 sm:py-2.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-tight transition-all active:scale-95 border ${isSentToday ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]" : "bg-slate-950/50 text-slate-400 border-white/5 hover:bg-slate-900 hover:text-white hover:border-white/10"}`}')
    ]
    
    for old, new in replacements:
        content = content.replace(old, new)
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
        print("Updated RemindersView.jsx Inputs")

if __name__ == "__main__":
    update_search()
