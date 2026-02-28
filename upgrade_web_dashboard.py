import re

filepath = r"c:\Users\biju\Downloads\New Test Software\jarwis-web\src\components\AdminWebViewDashboard.jsx"
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Expand the container width to utilize wide screens better (from 7xl to 8xl/90rem)
content = content.replace('max-w-7xl mx-auto space-y-6', 'max-w-[90rem] mx-auto space-y-8')

# 2. Upgrade the immense Header Panel
content = content.replace(
    'bg-gradient-to-br from-slate-900/80 to-[#020617]/90 p-5 lg:p-6 rounded-[2rem] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]',
    'bg-slate-900/40 backdrop-blur-3xl p-8 lg:p-12 rounded-[2.5rem] lg:rounded-[3.5rem] border border-white/10 hover:border-white/20 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.7)] ring-1 ring-inset ring-white/10'
)

# 3. Upgrade Total Amount Font Size & Tracking
content = content.replace(
    'text-4xl lg:text-5xl xl:text-6xl font-black',
    'text-6xl lg:text-[5rem] xl:text-[6.5rem] leading-none font-black drop-shadow-2xl'
)

# 4. Enhance Mini Payment Cards
content = content.replace(
    'className="flex-1 min-w-[120px] bg-white/5 backdrop-blur-md border border-white/5 p-3 rounded-xl flex flex-col items-center group/mini',
    'className="flex-1 min-w-[140px] bg-slate-800/50 backdrop-blur-2xl border border-white/10 p-5 lg:p-6 rounded-3xl flex flex-col items-center group/mini shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_10px_20px_rgba(0,0,0,0.2)]'
)
content = content.replace('text-lg font-black text-white italic', 'text-2xl lg:text-3xl font-black text-white italic drop-shadow-md')
content = content.replace('mb-2', 'mb-3')

# 5. Pending Verifications Pill Upgrade
content = content.replace(
    'className="relative bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-3 rounded-2xl border border-orange-500/30 shadow-[0_10px_30px_rgba(249,115,22,0.15)]',
    'className="relative bg-slate-900/80 backdrop-blur-xl px-8 py-4 lg:px-10 lg:py-5 rounded-[2rem] border border-orange-500/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_15px_40px_rgba(249,115,22,0.2)]'
)
content = content.replace(
    '<span className="text-2xl font-black text-orange-400 drop-shadow-[0_0_10px_rgba(249,115,22,0.5)]">{pendingCount}</span>',
    '<span className="text-3xl lg:text-4xl font-black text-orange-400 drop-shadow-[0_0_15px_rgba(249,115,22,0.6)]">{pendingCount}</span>'
)
content = content.replace(
    '<span className="text-[10px] font-black text-orange-200/80 uppercase tracking-[0.2em] relative z-10">Pending Verifications</span>',
    '<span className="text-xs lg:text-sm font-black text-orange-200 uppercase tracking-[0.25em] relative z-10 drop-shadow-md">Pending Verifications</span>'
)

# 6. Brand Performance Cards & Layout
content = content.replace('max-w-7xl mx-auto h-full', 'max-w-[90rem] mx-auto h-full')
content = content.replace('gap-8', 'gap-10')

content = content.replace(
    'bg-slate-900/40 backdrop-blur-3xl border border-white/5 rounded-3xl p-5 shadow-lg relative overflow-hidden',
    'bg-slate-900/50 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-6 lg:p-8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_20px_40px_rgba(0,0,0,0.3)] relative overflow-hidden'
)
# Increase target numbers
content = content.replace(
    '<span className="text-2xl lg:text-3xl font-black',
    '<span className="text-3xl lg:text-5xl font-black drop-shadow-xl block mb-1 group-hover:scale-105 transition-transform origin-left'
)
content = content.replace('text-[12px] font-black uppercase tracking-[0.2em]', 'text-[14px] lg:text-[16px] font-black uppercase tracking-[0.25em]')

# 7. Flow Summary Widget
content = content.replace(
    'group bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 p-5 rounded-3xl relative overflow-hidden',
    'group bg-slate-900/60 backdrop-blur-3xl border border-white/10 p-8 lg:p-10 rounded-[2.5rem] relative overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_25px_50px_-12px_rgba(0,0,0,0.5)]'
)
content = content.replace('text-2xl lg:text-3xl font-black text-white tracking-tighter', 'text-4xl lg:text-5xl font-black text-white tracking-tighter drop-shadow-2xl')
content = content.replace('text-xs font-black text-slate-400 uppercase tracking-[0.2em]', 'text-sm font-black text-slate-300 uppercase tracking-[0.25em]')
content = content.replace('text-base font-black text-slate-300', 'text-lg lg:text-xl font-black text-slate-300') # Brand target text

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Web Dashboard updated with Adipoli styling!")
