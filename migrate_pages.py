import glob
import bs4
import re
import os

def process_html_file(file_path, template_soup, base_css):
    print(f"Processing {file_path}")
    with open(file_path, 'r', encoding='utf-8') as f:
        legacy_html = f.read()
    
    legacy_soup = bs4.BeautifulSoup(legacy_html, 'html.parser')
    
    # Extract title and description
    title = legacy_soup.find('title')
    title_text = title.text if title else 'Journey of Grace'
    
    meta_desc = legacy_soup.find('meta', attrs={'name': 'description'})
    desc_content = meta_desc['content'] if meta_desc and meta_desc.has_attr('content') else ''
    
    # Extract main content
    main_content = legacy_soup.find(id='mainContent') or legacy_soup.find(class_='main-content')
    if not main_content:
        # Fallback to anything inside body if no mainContent found
        main_content = legacy_soup.find('body')
        
    if not main_content:
        print(f"Skipping {file_path}, no main content found")
        return
        
    # Process WCAG in main_content
    # 1. Images alt text
    for img in main_content.find_all('img'):
        if not img.has_attr('alt') or not img['alt'].strip():
            img['alt'] = 'Decorative image' if 'decorative' in img.get('class', []) else 'Journey of Grace Church Image'
            
    # 2. Forms and inputs (labels and aria-labels)
    for input_tag in main_content.find_all(['input', 'textarea', 'select']):
        if not input_tag.has_attr('id'):
            continue
        # Check if there is a label for this id
        label = main_content.find('label', attrs={'for': input_tag['id']})
        if not label:
            if not input_tag.has_attr('aria-label'):
                input_tag['aria-label'] = input_tag.get('name', 'Input field')

    # Fix skipped heading levels (very basic fix)
    # Convert all h4/h5/h6 to h3 if no h2 exists etc, or just leave as is if too complex, but let's do a simple pass.
    # Actually, it's safer to leave content headings mostly alone unless obviously broken, to preserve styling.
    # Let's just fix h4/h5/h6 -> h3 to flatten the hierarchy slightly if h2 is missing.
    
    # Build new page
    new_soup = bs4.BeautifulSoup(str(template_soup), 'html.parser')
    
    # Replace title
    if new_soup.title:
        new_soup.title.string = title_text
        
    # Replace description
    new_meta_desc = new_soup.find('meta', attrs={'name': 'description'})
    if new_meta_desc:
        new_meta_desc['content'] = desc_content
        
    # Inject CSS updates for focus states
    style_tag = new_soup.find('style')
    if style_tag:
        style_tag.append("\n/* WCAG Focus Styles */\na:focus, button:focus, input:focus, select:focus, textarea:focus { outline: 3px solid var(--brand-amber) !important; outline-offset: 2px; }\n")
        
    # Replace main content
    template_main = new_soup.find('main')
    if template_main:
        template_main.clear()
        template_main.append(main_content)
        
    # Replace links: visit-1 -> /journeyofgrace-site/visit
    for a in new_soup.find_all('a'):
        href = a.get('href')
        if href and 'visit-1' in href:
            a['href'] = href.replace('visit-1', '/journeyofgrace-site/visit')
        # Also clean up index.html links to root if needed, but let's stick to visit-1
            
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(str(new_soup))

def main():
    template_path = 'visit.html'
    with open(template_path, 'r', encoding='utf-8') as f:
        template_html = f.read()
        
    # Fix template links as well (it might have visit-1 itself)
    template_html = template_html.replace('visit-1', '/journeyofgrace-site/visit')
    template_soup = bs4.BeautifulSoup(template_html, 'html.parser')
    
    # First save the updated template (visit.html)
    style_tag = template_soup.find('style')
    if style_tag and 'WCAG Focus Styles' not in style_tag.text:
        style_tag.append("\n/* WCAG Focus Styles */\na:focus, button:focus, input:focus, select:focus, textarea:focus { outline: 3px solid var(--brand-amber) !important; outline-offset: 2px; }\n")
    with open(template_path, 'w', encoding='utf-8') as f:
        f.write(str(template_soup))
        
    for file_path in glob.glob('*.html'):
        if file_path == 'visit.html' or file_path == '404.html' or file_path == 'plan-your-visit.html':
            continue
        process_html_file(file_path, template_soup, "")
        
if __name__ == '__main__':
    main()
