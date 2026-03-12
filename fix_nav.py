import re
with open(r'c:\Users\rafae\workspace\portfolio_rafael_midolli\index.html', 'r', encoding='utf-8') as f:
    text = f.read()

nav_pattern = r'(<div class="nav-links".*?>)(.*?)(</div>)'
nav_match = re.search(nav_pattern, text, re.DOTALL)
if nav_match:
    nav_links_html = nav_match.group(2)
    # The links are something like:
    # <a href="#about" ...>
    # <a href="#skills" ...>
    # <a href="#projects" ...>
    # <a href="#education" ...>
    # <a href="#contact" ...>
    
    links = re.findall(r'<a.*?</a>', nav_links_html, re.DOTALL)
    
    # We want order: about, education, skills, projects, contact
    # Let's map them by href
    link_map = {}
    for l in links:
        if '#about' in l: link_map['about'] = l
        elif '#skills' in l: link_map['skills'] = l
        elif '#projects' in l: link_map['projects'] = l
        elif '#education' in l: link_map['education'] = l
        elif '#contact' in l: link_map['contact'] = l

    if all(k in link_map for k in ['about', 'education', 'skills', 'projects', 'contact']):
        new_links_html = "\n          " + "\n          ".join([
            link_map['about'],
            link_map['education'],
            link_map['skills'],
            link_map['projects'],
            link_map['contact']
        ]) + "\n        "
        
        new_nav = nav_match.group(1) + new_links_html + nav_match.group(3)
        text = text[:nav_match.start()] + new_nav + text[nav_match.end():]
        print("Reordered nav links")
    else:
        print("Could not find all links in nav")

# Also update the js scrollspy
js_pattern = r'const sections = \[\'about\', \'skills\', \'education\', \'projects\', \'contact\'\]'
js_replace = r"const sections = ['about', 'education', 'skills', 'projects', 'contact']"
if js_pattern in text:
    text = text.replace(js_pattern, js_replace)
    print("Reordered js scrollspy sections")

with open(r'c:\Users\rafae\workspace\portfolio_rafael_midolli\index.html', 'w', encoding='utf-8') as f:
    f.write(text)
