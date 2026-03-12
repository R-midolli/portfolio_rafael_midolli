import subprocess, re
html = subprocess.check_output(['git', 'show', '88ebd39:index.html']).decode('utf-8')
for i, r in enumerate(re.findall(r'<article class="project-card(.*?)</h3>', html, re.DOTALL)):
    title = re.search(r'<span class="lang-fr">(.*?)</span>', r, re.DOTALL)
    if title: print(f"Project {i}: {title.group(1).strip()}")
