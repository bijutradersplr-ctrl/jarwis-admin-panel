import re

def update_ui():
    filepath = r"C:\Users\biju\Downloads\New Test Software\jarwis-web\src\components\RemindersView.jsx"
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    replacements = [
        # Desktop Main Container
        (r'className="max-w-7xl mx-auto h-[calc\(100vh-6rem\)] flex flex-col pt-4 overflow-hidden animate-in fade-in duration-500"',
         r'className="max-w-5xl mx-auto h-[calc(100vh-6rem)] flex flex-col pt-4 overflow-hidden animate-in fade-in duration-500"'),
         
        # Desktop Header Box
        (r'className="shrink-0 flex items-center justify-between bg-slate-900/80 backdrop-blur-xl p-4 sm:p-5 rounded-t-3xl border border-white/10 shadow-2xl relative z-20"',
         r'className="shrink-0 flex items-center justify-between bg-slate-900/40 backdrop-blur-2xl p-4 sm:p-5 rounded-t-2xl sm:rounded-t-[2rem] border border-white/5 shadow-2xl relative z-20"'),
         
        # Desktop Header Text
        (r'className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-2"',
         r'className="text-base sm:text-lg font-black text-white uppercase tracking-widest flex items-center gap-2"'),
         
        (r'className="text-\[10px\] font-bold text-slate-500 uppercase tracking-widest mt-0.5"',
         r'className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest mt-1"'),
         
        # Desktop Filters Box
        (r'className="shrink-0 bg-slate-900/60 backdrop-blur-xl border-x border-b border-white/10 p-4 shadow-xl relative z-10"',
         r'className="shrink-0 bg-slate-900/40 backdrop-blur-2xl border-x border-b border-white/5 p-4 shadow-2xl relative z-10"'),
         
        # Desktop Cards Container
        (r'className={`group relative overflow-hidden backdrop-blur-md border transition-all duration-300 \$\{item.isInRoute \? \'border-\[#25D366\]/30 bg-\[#25D366\]/5\' : \'border-white/5 bg-slate-900/40 hover:bg-slate-800/60 hover:border-white/10\'\} rounded-xl p-3 shadow-sm hover:shadow-md`}',
         r'className={`group relative overflow-hidden backdrop-blur-2xl border transition-all duration-300 ${item.isInRoute ? "border-[#25D366]/30 bg-[#25D366]/5" : "border-white/5 bg-slate-900/40 hover:bg-slate-900/60 hover:border-white/10"} rounded-2xl sm:rounded-[2rem] p-4 sm:p-5 shadow-xl relative overflow-hidden group`}'),
         
        # Desktop Badges & Styles
        (r'className="text-xs font-black text-white uppercase tracking-tight truncate leading-tight"',
         r'className="text-sm sm:text-base font-black text-white uppercase tracking-tight truncate leading-tight"'),
         
        (r'className="text-sm font-black text-white tracking-tighter"',
         r'className="text-base sm:text-lg font-black text-white px-3 py-1 bg-white/5 rounded-xl border border-white/5 tracking-tighter"'),
         
        (r'className={`flex items-center justify-end gap-1 text-\[8px\] font-bold \$\{days > 30 \? \'text-red-400\' : \'text-amber-400\'\}`}',
         r'className={`flex items-center justify-end gap-1 text-[9px] sm:text-[10px] font-black uppercase tracking-widest mt-1.5 px-1 ${days > 30 ? "text-red-400" : "text-amber-400"}`}'),
         
        # Badges Pill Shapes
        (r'className="text-\[8px\] font-black px-1.5 py-px rounded border bg-white/5 border-white/10 text-amber-500 uppercase tracking-wider flex items-center gap-1"',
         r'className="text-[8px] font-black px-2 py-0.5 rounded-full border shadow-inner bg-white/5 border-white/10 text-amber-500 uppercase tracking-wider flex items-center gap-1.5"'),
         
        (r'className="text-\[8px\] font-black px-1.5 py-px rounded border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 uppercase tracking-wider flex items-center gap-1 animate-pulse"',
         r'className="text-[8px] font-black px-2 py-0.5 rounded-full border shadow-[0_0_10px_rgba(16,185,129,0.1)] bg-emerald-500/10 text-emerald-400 border-emerald-500/20 uppercase tracking-wider flex items-center gap-1.5 animate-pulse"'),
         
        (r'className={`text-\[8px\] font-black px-1.5 py-px rounded border uppercase tracking-wider flex items-center gap-1 \$\{item.nextVisit === \'TODAY\' \? \'bg-\[#25D366\]/10 text-\[#25D366\] border-\[#25D366\]/20 animate-pulse\' : \'bg-purple-500/10 text-purple-400 border-purple-500/20\'\}`}',
         r'className={`text-[8px] font-black px-2 py-0.5 rounded-full border shadow-[0_0_10px_rgba(255,255,255,0.05)] uppercase tracking-wider flex items-center gap-1.5 ${item.nextVisit === "TODAY" ? "bg-[#25D366]/10 text-[#25D366] border-[#25D366]/20 animate-pulse" : "bg-purple-500/10 text-purple-400 border-purple-500/20"}`}')
    ]
    
    for old, new in replacements:
        content = content.replace(old, new)
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
        print("Updated RemindersView.jsx Desktop Layout")

if __name__ == "__main__":
    update_ui()
