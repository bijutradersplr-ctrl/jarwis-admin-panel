import re
import os

filepath = r"c:\Users\biju\Downloads\New Test Software\jarwis-web\src\components\RemindersView.jsx"
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Adjust main container
content = content.replace('max-w-6xl mx-auto w-full', 'max-w-4xl mx-auto w-full')
content = content.replace('max-w-5xl mx-auto w-full', 'max-w-4xl mx-auto w-full') # In case it was 5xl

# 2. Revert header sizing
content = content.replace('py-2 px-6 sm:px-8', 'py-1 sm:py-2 px-4 sm:px-5')
content = content.replace('text-[11px] sm:text-[13px] font-black', 'text-[10px] sm:text-[11px] font-black') # title
content = content.replace('text-[9px] sm:text-[10px] font-bold', 'text-[8px] sm:text-[9px] font-bold') # subtitle

# 3. Revert filter elements sizes
content = content.replace('py-2.5 sm:py-3 pl-10 pr-4 text-xs sm:text-sm', 'py-2 pl-8 pr-3 text-[10px] sm:text-[11px]')
content = content.replace('py-2.5 sm:py-3 pl-8 pr-3 text-xs sm:text-sm', 'py-2 pl-7 pr-2 text-[10px] sm:text-[11px]')
content = content.replace('py-2.5 sm:py-3 px-4 text-xs sm:text-sm', 'py-2 px-3 text-[10px] sm:text-[11px]')

# 4. Decrease card paddings and spacings
content = content.replace('rounded-2xl p-4 sm:p-5 shadow-md', 'rounded-[1.25rem] p-3 sm:p-4 shadow-sm')

# 5. Decrease Typography
content = content.replace('text-base sm:text-lg lg:text-xl font-black', 'text-[13px] sm:text-[15px] font-black')
content = content.replace('text-xl sm:text-2xl font-black text-white px-4 py-1.5', 'text-lg sm:text-xl font-black text-white px-3 py-1')

# 6. Decrease Badges
content = content.replace('w-10 h-10 rounded-xl', 'w-8 h-8 rounded-[10px]')
content = content.replace('text-[9px] sm:text-[10px]', 'text-[8px]')
content = content.replace('px-2 py-0.5', 'px-1.5 py-px')

# 7. Decrease Action Buttons
content = content.replace('py-2 rounded-xl text-[10px] sm:text-xs', 'py-1.5 rounded-xl text-[8.5px] sm:text-[9.5px]')

# Write back
with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Sizes dialed back to medium compactness.")
