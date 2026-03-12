import subprocess
import re

out = subprocess.check_output(['git', 'show', '88ebd39:index.html']).decode('utf-8')

print("=== PROJECTS ORDER ===")
cards = re.findall(r'<article class="project-card.*?<h3>(.*?)</h3>', out, re.DOTALL)
for c in cards:
    tit = re.search(r'<span class="lang-en">(.*?)</span>', c)
    if tit:
        print(tit.group(1).strip())

print("=== EDUCATION ORDER ===")
edu = re.findall(r'<div class="edu-card.*?<div class="edu-title">(.*?)</div>', out, re.DOTALL)
for e in edu:
    tit = re.search(r'<span class="lang-en">(.*?)</span>', e)
    if tit:
        print(tit.group(1).strip())
