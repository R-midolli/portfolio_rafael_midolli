import re

with open(r'c:\Users\rafae\workspace\portfolio_rafael_midolli\index.html', 'r', encoding='utf-8') as f:
    text = f.read()

res = re.findall(r'<section class="section" id="(.*?)">', text)
for i in res:
    print(i)
