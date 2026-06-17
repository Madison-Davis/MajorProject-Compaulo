#!/bin/bash
set -e

CODEX="$(cd "$(dirname "$0")/.." && pwd)"
GIT_ROOT="$(cd "$CODEX/.." && pwd)"
SUBMODULE="$CODEX/codex-content"

echo "Updating submodule..."
git -C "$GIT_ROOT" submodule update --remote codex/codex-content

echo ""
echo "Building public-tagged files..."

while IFS= read -r FILE; do
  if grep -q "^  - Public" "$FILE"; then
    BASENAME="$(basename "$FILE" .md)"
    OUTNAME="$(echo "$BASENAME" | tr '[:upper:]' '[:lower:]' | tr ' ' '-').html"
    OUTPATH="$CODEX/$OUTNAME"

    python3 - "$FILE" "$CODEX/template.html" "$OUTPATH" << 'PYEOF'
import sys, re, os

md_file, template_file, out_file = sys.argv[1], sys.argv[2], sys.argv[3]

# Read markdown and strip frontmatter
with open(md_file) as f:
    raw = f.read()

body = raw
if raw.startswith('---'):
    end = raw.find('\n---', 3)
    if end != -1:
        body = raw[end + 4:].lstrip()

# Parse into chapters
chapters = []
cur_chapter = None
cur_section = None
pending = []

def flush():
    text = ' '.join(l.strip() for l in pending if l.strip())
    if text and cur_section is not None:
        cur_section['paragraphs'].append(text)
    pending.clear()

for line in body.splitlines():
    if line.startswith('## '):
        flush()
        cur_section = {'subtitle': None, 'paragraphs': []}
        cur_chapter = {'title': line[3:].strip(), 'sections': [cur_section]}
        chapters.append(cur_chapter)
    elif line.startswith('### '):
        flush()
        cur_section = {'subtitle': line[4:].strip(), 'paragraphs': []}
        if cur_chapter:
            cur_chapter['sections'].append(cur_section)
    elif line.strip() == '':
        flush()
    elif cur_chapter:
        pending.append(line)

flush()

title = os.path.basename(md_file).replace('.md', '').upper()

# Build TOC buttons
toc = ''
for i, ch in enumerate(chapters):
    active = ' is-active' if i == 0 else ''
    toc += f'        <button class="toc-link{active}" data-target="ch-{i+1}">\n'
    toc += f'          <span class="toc-num">{i+1}</span>\n'
    toc += f'          <span>{ch["title"]}</span>\n'
    toc += f'        </button>\n'

# Build chapter divs
ch_divs = ''
for i, ch in enumerate(chapters):
    active = ' is-active' if i == 0 else ''
    body_html = ''
    for sec in ch['sections']:
        if sec['subtitle']:
            body_html += f'\n          <h3 class="tpl-chapter-subtitle">{sec["subtitle"]}</h3>'
        for p in sec['paragraphs']:
            body_html += f'\n          <p>{p}</p>'
    ch_divs += f'      <div class="tpl-chapter{active}" id="ch-{i+1}">\n'
    ch_divs += f'        <div class="tpl-chapter-header">\n'
    ch_divs += f'          <p class="kicker">CHAPTER {i+1}</p>\n'
    ch_divs += f'          <h2 class="tpl-chapter-title">{ch["title"]}</h2>\n'
    ch_divs += f'        </div>\n'
    ch_divs += f'        <div class="tpl-chapter-body">{body_html}\n'
    ch_divs += f'        </div>\n'
    ch_divs += f'      </div>\n\n'

# Read template and substitute
with open(template_file) as f:
    html = f.read()

html = re.sub(r'<title>[^<]*</title>', f'<title>{title} — Learn a Bit</title>', html)
html = re.sub(r'<h3 class="tpl-content-title">[^<]*</h3>', f'<h3 class="tpl-content-title">{title}</h3>', html)
html = re.sub(r'(<nav>).*?(</nav>)', f'\\1\n{toc}      \\2', html, flags=re.DOTALL)

start = html.find('<div class="tpl-chapter')
end = html.rfind('</main>')
if start != -1 and end != -1:
    html = html[:start] + ch_divs + '\n    ' + html[end:]

with open(out_file, 'w') as f:
    f.write(html)
PYEOF

    echo "  $(basename "$FILE") → $OUTNAME"
  fi
done < <(find "$SUBMODULE" -name "*.md")
