import re
import os

filepath = r"c:\Users\biju\Downloads\New Test Software\jarwis-web\src\components\RemindersView.jsx"
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Widen main container
content = content.replace('max-w-2xl mx-auto', 'max-w-6xl mx-auto w-full')

# 2. Increase header sizing
content = content.replace('py-0.5 px-4', 'py-2 px-6 sm:px-8')
content = content.replace('text-[9px] font-black', 'text-[11px] sm:text-[13px] font-black') # title
content = content.replace('text-[7px] font-bold', 'text-[9px] sm:text-[10px] font-bold') # subtitle

# 3. Increase filter elements sizes
content = content.replace('py-2 pl-8 pr-3 text-[10px] sm:text-[11px]', 'py-2.5 sm:py-3 pl-10 pr-4 text-xs sm:text-sm')
content = content.replace('py-2 pl-7 pr-2 text-[10px] sm:text-[11px]', 'py-2.5 sm:py-3 pl-8 pr-3 text-xs sm:text-sm')
content = content.replace('py-2 px-3 text-[10px] sm:text-[11px]', 'py-2.5 sm:py-3 px-4 text-xs sm:text-sm')

# 4. Increase card paddings and spacings
content = content.replace('rounded-xl p-3 shadow-sm', 'rounded-2xl p-4 sm:p-5 shadow-md')
content = content.replace('mb-2 relative', 'mb-3 relative')

# 5. Increase Typography
content = content.replace('text-sm sm:text-base font-black', 'text-base sm:text-lg lg:text-xl font-black')
content = content.replace('text-base sm:text-lg font-black text-white px-3 py-1', 'text-xl sm:text-2xl font-black text-white px-4 py-1.5')

# 6. Increase Badges
content = content.replace('w-8 h-8 rounded-lg', 'w-10 h-10 rounded-xl')
content = re.sub(r'text-\[8px\](.*?px-1\.5 py-px)', r'text-[9px] sm:text-[10px]\1', content)
content = content.replace('px-1.5 py-px', 'px-2 py-0.5')

# 7. Increase Action Buttons
content = content.replace('py-1.5 rounded-lg text-[9px]', 'py-2 rounded-xl text-[10px] sm:text-xs')

# Write back
with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Widgets widened and height increased.")
