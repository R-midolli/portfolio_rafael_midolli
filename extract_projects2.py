import re

with open(r'c:\Users\rafae\workspace\portfolio_rafael_midolli\index.html', 'r', encoding='utf-8') as f:
    text = f.read()

# find all article blocks
cards = re.findall(r'<article class="project-card".*?</article>', text, re.DOTALL)
print(f"Found {len(cards)} project cards.")

from html import unescape
for idx, c in enumerate(cards):
    title_en = re.search(r'<span class="lang-en">(.*?)</span>', c, re.DOTALL)
    if title_en:
        print(f"Project {idx}: {title_en.group(1).strip()}")

