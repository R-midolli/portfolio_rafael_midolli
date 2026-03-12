import re

with open(r'c:\Users\rafae\workspace\portfolio_rafael_midolli\index.html', 'r', encoding='utf-8') as f:
    text = f.read()

# Get projects
from html import unescape
res = re.findall(r'<article class="project-card(.*?)</h3>', text, re.DOTALL)
for i, r in enumerate(res):
    title = re.search(r'<span class="lang-fr">(.*?)</span>', r, re.DOTALL)
    if title:
        print(f"Project {i}: {title.group(1).strip()}")
