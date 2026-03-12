import re

with open(r'c:\Users\rafae\workspace\portfolio_rafael_midolli\index.html', 'r', encoding='utf-8') as f:
    text = f.read()

# Get the projects container
container_match = re.search(r'(<div class="projects-container" id="projectsContainer">)(.*?)(      </div>\n    </div>\n  </section>)', text, re.DOTALL)
if container_match:
    print("Found container")
    content = container_match.group(2)
    cards = re.split(r'(<article class="project-card.*?)</article>', content, flags=re.DOTALL)
    print(f"Split into {len(cards)} chunks")
    
    project_blocks = []
    
    for c in cards:
        if '<article' in c:
            block = c + "</article>"
            title_match = re.search(r'<span class="lang-en">(.*?)</span>', block)
            if title_match:
                title = title_match.group(1).strip()
                project_blocks.append((title, block))
                
    for idx, (title, _) in enumerate(project_blocks):
        print(f"Project {idx}: {title}")
