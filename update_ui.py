import re

def update_ui():
    filepath = r"C:\Users\biju\Downloads\New Test Software\jarwis-web\src\components\RemindersView.jsx"
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    replacements = [
        # Main Container
        (r'className="max-w-2xl mx-auto space-y-2 pb-20 animate-in fade-in duration-500"',
         r'className="max-w-5xl mx-auto space-y-4 sm:space-y-6 pb-20 animate-in fade-in duration-500"'),
         
        # Header Box
        (r'className="flex items-center justify-between bg-slate-900/80 backdrop-blur-xl p-2 rounded border border-white/10 shadow-2xl sticky top-2 z-50"',
         r'className="flex items-center justify-between bg-slate-900/40 backdrop-blur-2xl px-4 py-3 sm:px-6 sm:py-4 rounded-2xl sm:rounded-[2rem] border border-white/5 shadow-2xl sticky top-2 sm:top-4 z-50"'),
         
        # Header Text
        (r'className="text-\[10px\] font-black text-white uppercase tracking-widest flex items-center gap-1.5"',
         r'className="text-sm sm:text-base font-black text-white uppercase tracking-widest flex items-center gap-2"'),
         
        (r'className="text-\[7px\] font-bold text-slate-500 uppercase tracking-widest"',
         r'className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-0.5"'),
         
        # Filters Box
        (r'className="bg-slate-900/60 backdrop-blur-xl rounded border border-white/10 p-2 shadow-2xl space-y-2"',
         r'className="bg-slate-900/40 backdrop-blur-2xl rounded-2xl sm:rounded-[2rem] border border-white/5 p-4 sm:p-5 shadow-2xl space-y-4"'),
         
        # Filter Padding
        (r'className="flex items-center justify-between pb-1.5 border-b border-white/5"',
         r'className="flex items-center justify-between pb-3 border-b border-white/5"'),
         
        # Card Container
        (r'className={`bg-slate-900/40 backdrop-blur-lg border \$\{isSevere \? \'border-red-500/20\' : \'border-white/5\'\} rounded p-3 hover:bg-slate-900/60 transition-all shadow-xl relative overflow-hidden group`}',
         r'className={`bg-slate-900/40 backdrop-blur-2xl border ${isSevere ? "border-red-500/20" : "border-white/5"} rounded-2xl sm:rounded-[2rem] p-4 hover:bg-slate-900/60 transition-all hover:border-white/10 shadow-xl relative overflow-hidden group`}')
    ]
    
    for old, new in replacements:
        content = content.replace(old, new)
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
        print("Updated RemindersView.jsx")

if __name__ == "__main__":
    update_ui()
