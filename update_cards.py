import re

def update_cards():
    filepath = r"C:\Users\biju\Downloads\New Test Software\jarwis-web\src\components\RemindersView.jsx"
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    replacements = [
        # Main Card Wrapping
        (r'className={`bg-slate-900/40 backdrop-blur-lg border \$\{isSevere \? \'border-red-500/20\' : \'border-white/5\'\} rounded-3xl p-5 hover:bg-slate-900/60 transition-all shadow-xl relative overflow-hidden group`}',
         r'className={`bg-slate-900/40 backdrop-blur-2xl border ${isSevere ? "border-red-500/20" : "border-white/5"} rounded-2xl sm:rounded-[2rem] p-4 sm:p-5 hover:bg-slate-900/60 transition-all hover:border-white/10 shadow-xl relative overflow-hidden group`}'),
         
        # Name
        (r'className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2"',
         r'className="text-sm sm:text-base font-black text-white uppercase tracking-tight flex items-center gap-2"'),
         
        # ID text
        (r'className="text-\[10px\] font-bold text-slate-500"',
         r'className="text-[9px] font-bold text-slate-500 italic mt-0.5"'),
         
        # Amount
        (r'className="text-xl font-black text-white"',
         r'className="text-base sm:text-lg font-black text-white px-3 py-1 bg-white/5 rounded-xl border border-white/5"'),
         
        # Days
        (r'className="flex items-center gap-1 justify-end mt-1 text-amber-400"',
         r'className="flex items-center gap-1 justify-end mt-1.5 px-1 text-red-400"'),
         
        (r'className="text-\[10px\] font-black uppercase tracking-widest"',
         r'className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest"'),
         
        # Badges
        (r'className={`text-\[8px\] font-black px-1.5 py-px rounded border uppercase tracking-wider flex items-center gap-1 \$\{item.nextVisit === \'TODAY\' \? \'bg-\[#25D366\]/10 text-\[#25D366\] border-\[#25D366\]/20 animate-pulse\' : \'bg-purple-500/10 text-purple-400 border-purple-500/20\'\}`}',
         r'className={`text-[8px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider flex items-center gap-1 ${item.nextVisit === "TODAY" ? "bg-[#25D366]/10 text-[#25D366] border-[#25D366]/20 animate-pulse shadow-[0_0_10px_rgba(37,211,102,0.1)]" : "bg-purple-500/10 text-purple-400 border-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.1)]"}`}'),
         
        (r'className={`text-\[8px\] font-black px-1.5 py-px rounded border \$\{item.company.toLowerCase\(\) === \'cadbury\' \? \'bg-purple-500/10 text-purple-400 border-purple-500/20\' : \n                                            item.company.toLowerCase\(\) === \'britannia\' \? \'bg-red-500/10 text-red-400 border-red-500/20\' :\n                                                item.company.toLowerCase\(\) === \'colgate\' \? \'bg-emerald-500/10 text-emerald-400 border-emerald-500/20\' :\n                                                    \'bg-slate-500/10 text-slate-400 border-slate-500/20\'\n                                            \} uppercase tracking-wider`}',
         r'className={`text-[8px] font-black px-2 py-0.5 rounded-full border shadow-inner ${item.company.toLowerCase() === "cadbury" ? "bg-purple-500/10 text-purple-400 border-purple-500/20" : item.company.toLowerCase() === "britannia" ? "bg-red-500/10 text-red-400 border-red-500/20" : item.company.toLowerCase() === "colgate" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-slate-500/10 text-slate-400 border-slate-500/20"} uppercase tracking-wider`}'),
         
        (r'className="text-\[8px\] font-black px-1.5 py-px rounded border bg-slate-500/10 text-slate-400 border-slate-500/20 uppercase tracking-wider"',
         r'className="text-[8px] font-black px-2 py-0.5 rounded-full border bg-slate-500/10 text-slate-400 border-slate-500/20 uppercase tracking-wider shadow-inner"'),
         
        (r'className="text-\[8px\] font-black px-1.5 py-px rounded border bg-blue-500/10 text-blue-400 border-blue-500/20 uppercase tracking-wider flex items-center gap-1"',
         r'className="text-[8px] font-black px-2 py-0.5 rounded-full border bg-blue-500/10 text-blue-400 border-blue-500/20 uppercase tracking-wider flex items-center gap-1 shadow-[0_0_10px_rgba(59,130,246,0.1)]"')
    ]
    
    for old, new in replacements:
        content = content.replace(old, new)
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
        print("Updated RemindersView.jsx Cards")

if __name__ == "__main__":
    update_cards()
