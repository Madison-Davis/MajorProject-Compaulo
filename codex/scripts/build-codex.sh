#!/bin/bash
set -e

CODEX="$(cd "$(dirname "$0")/.." && pwd)"
GIT_ROOT="$(cd "$CODEX/.." && pwd)"
SUBMODULE="$CODEX/codex-content"
SOURCE_DIR="$SUBMODULE/Learn/Learn - Compaulo"
TEMPLATE="$CODEX/pages/template.html"
INDEX="$CODEX/index.html"

# Uncomment this line if you want the script to pull the latest submodule changes.
# git -C "$GIT_ROOT" submodule update --remote codex/codex-content

if [[ ! -d "$SOURCE_DIR" ]]; then
  echo "ERROR: Source folder not found: $SOURCE_DIR"
  exit 1
fi

if [[ ! -f "$TEMPLATE" || ! -f "$INDEX" ]]; then
  echo "ERROR: Could not find pages/template.html or index.html."
  exit 1
fi

echo "Building HTML pages..."

python3 - "$SOURCE_DIR" "$TEMPLATE" "$CODEX/pages" <<'PYEOF'
import html
import re
import sys
from pathlib import Path

source_dir = Path(sys.argv[1])
template_path = Path(sys.argv[2])
output_dir = Path(sys.argv[3])

def slugify(name):
    return re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')

def strip_frontmatter(raw):
    match = re.match(r'\A---\s*\n.*?\n---[ \t]*(?:\n|$)', raw, re.DOTALL)
    return raw[match.end():] if match else raw

def clean_line(line):
    line = line.strip()
    if line.startswith('**') and line.endswith('**') and len(line) >= 4:
        line = line[2:-2].strip()
    return line

def parse_chapters(body):
    chapters = []
    chapter = None
    section = None
    pending = []

    def flush():
        nonlocal pending
        text = ' '.join(x.strip() for x in pending if x.strip())
        if text and section is not None:
            section['paragraphs'].append(text)
        pending = []

    for original in body.splitlines():
        line = clean_line(original)

        # Four hashes = chapter; five hashes = subsection.
        if line.startswith('##### '):
            flush()
            section = {
                'subtitle': line[6:].strip(),
                'paragraphs': []
            }
            if chapter is not None:
                chapter['sections'].append(section)

        elif line.startswith('#### '):
            flush()
            section = {'subtitle': None, 'paragraphs': []}
            chapter = {
                'title': line[5:].strip(),
                'sections': [section]
            }
            chapters.append(chapter)

        elif (
            not line
            or line == '---'
            or re.fullmatch(r'##\s*<wbr\s*/?>', line, re.IGNORECASE)
        ):
            flush()

        elif chapter is not None:
            pending.append(line)

    flush()
    return chapters

template = template_path.read_text(encoding='utf-8')
output_dir.mkdir(parents=True, exist_ok=True)

files = sorted(source_dir.rglob('*.md'))

for md_file in files:
    raw = md_file.read_text(encoding='utf-8')
    body = strip_frontmatter(raw)
    chapters = parse_chapters(body)

    basename = md_file.stem
    page_title = basename.upper()
    output_name = slugify(basename) + '.html'

    toc = ''
    chapter_html = ''

    for i, ch in enumerate(chapters):
        active = ' is-active' if i == 0 else ''
        toc += (
            f'        <button class="toc-link{active}" '
            f'data-target="ch-{i+1}">\n'
            f'          <span class="toc-num">{i+1}</span>\n'
            f'          <span>{html.escape(ch["title"])}</span>\n'
            f'        </button>\n'
        )

        body_html = ''
        for sec in ch['sections']:
            if sec['subtitle']:
                body_html += (
                    '\n          <h3 class="tpl-chapter-subtitle">'
                    + html.escape(sec['subtitle'])
                    + '</h3>'
                )

            for paragraph in sec['paragraphs']:
                body_html += (
                    '\n          <p>'
                    + html.escape(paragraph)
                    + '</p>'
                )

        chapter_html += (
            f'      <div class="tpl-chapter{active}" id="ch-{i+1}">\n'
            f'        <div class="tpl-chapter-header">\n'
            f'          <p class="kicker">CHAPTER {i+1}</p>\n'
            f'          <h2 class="tpl-chapter-title">'
            f'{html.escape(ch["title"])}</h2>\n'
            f'        </div>\n'
            f'        <div class="tpl-chapter-body">{body_html}\n'
            f'        </div>\n'
            f'      </div>\n\n'
        )

    page = template
    page = re.sub(
        r'<title>[^<]*</title>',
        f'<title>{html.escape(page_title)} — Learn a Bit</title>',
        page,
        count=1
    )
    page = re.sub(
        r'(<h3 class="tpl-content-title">)[^<]*(</h3>)',
        lambda m: m.group(1) + html.escape(page_title) + m.group(2),
        page,
        count=1
    )
    page = re.sub(
        r'(<nav>).*?(</nav>)',
        lambda m: m.group(1) + '\n' + toc + '      ' + m.group(2),
        page,
        count=1,
        flags=re.DOTALL
    )

    start = page.find('<div class="tpl-chapter')
    end = page.rfind('</main>')

    if start != -1 and end != -1 and start < end:
        page = page[:start] + chapter_html + '\n    ' + page[end:]

    (output_dir / output_name).write_text(page, encoding='utf-8')
    print(f'  {md_file.name} -> {output_name}')

print(f'Generated {len(files)} HTML page(s).')
PYEOF

echo "Generating category cards..."

python3 - "$SOURCE_DIR" "$INDEX" <<'PYEOF'
import html
import re
import sys
from pathlib import Path

source_dir = Path(sys.argv[1])
index_path = Path(sys.argv[2])

categories = ['Tech', 'Economics', 'Business']

def slugify(name):
    return re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')

def get_frontmatter(raw):
    match = re.match(r'\A---\s*\n(.*?)\n---[ \t]*(?:\n|$)', raw, re.DOTALL)
    return match.group(1) if match else ''

def get_tags(frontmatter):
    tags = set()
    in_tags = False

    for line in frontmatter.splitlines():
        if re.match(r'^tags\s*:', line, re.IGNORECASE):
            in_tags = True
            value = line.split(':', 1)[1].strip()

            if value:
                value = value.strip('[]')
                tags.update(
                    item.strip().strip('"\'').lower()
                    for item in value.split(',')
                    if item.strip()
                )
            continue

        if in_tags:
            if re.match(r'^\s*-\s+', line):
                tag = re.sub(r'^\s*-\s+', '', line).strip().strip('"\'')
                if tag:
                    tags.add(tag.lower())
            elif line.strip():
                in_tags = False

    return tags

entries = {category: [] for category in categories}

for md_file in sorted(source_dir.rglob('*.md'), key=lambda p: p.name.lower()):
    raw = md_file.read_text(encoding='utf-8')
    tags = get_tags(get_frontmatter(raw))

    title = re.sub(
        r'^Compaulo\s*-\s*',
        '',
        md_file.stem,
        flags=re.IGNORECASE
    ).strip()

    output_name = slugify(md_file.stem) + '.html'
    link = f'pages/{output_name}'

    for category in categories:
        if category.lower() in tags:
            card = (
                f'<a class="course-card" href="{html.escape(link, quote=True)}">'
                f'<h3>{html.escape(title)}</h3>'
                f'</a>'
            )
            entries[category].append((title.lower(), card))

index = index_path.read_text(encoding='utf-8')

for category in categories:
    start_marker = f'<!-- AUTO-GENERATED: {category.upper()} START -->'
    end_marker = f'<!-- AUTO-GENERATED: {category.upper()} END -->'

    start = index.find(start_marker)
    end = index.find(end_marker)

    if start == -1 or end == -1 or end < start:
        raise SystemExit(
            f'Missing markers for {category}. '
            f'Add the START and END comments inside its course-grid.'
        )

    cards = '\n'.join(
        '                  ' + card
        for _, card in sorted(entries[category])
    )

    if not cards:
        cards = (
            f'<p class="course-empty">No {category} pages yet.</p>'
        )

    replacement = (
        start_marker + '\n'
        + cards + '\n'
        + '                  ' + end_marker
    )

    index = (
        index[:start]
        + replacement
        + index[end + len(end_marker):]
    )

index_path.write_text(index, encoding='utf-8')

for category in categories:
    print(f'  {category}: {len(entries[category])} page(s)')

print('Updated index.html.')
PYEOF

echo "Build complete."