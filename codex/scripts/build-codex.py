import html
import re
import sys
from pathlib import Path

from markdown_it import MarkdownIt
from mdit_py_plugins.dollarmath import dollarmath_plugin

codex_dir = Path(sys.argv[1])


def resolve_folder(parent, *names):
    """Match vault folder names consistently on macOS and Linux."""
    accepted = {name.casefold() for name in names}
    matches = sorted(
        (path for path in parent.iterdir()
         if path.is_dir() and path.name.casefold() in accepted),
        key=lambda path: path.name,
    ) if parent.is_dir() else []
    if len(matches) == 1:
        return matches[0]
    if matches:
        raise SystemExit(f'ERROR: Ambiguous folders in {parent}: '
                         + ', '.join(path.name for path in matches))
    available = ', '.join(sorted(path.name for path in parent.iterdir() if path.is_dir())) \
        if parent.is_dir() else '(parent folder missing)'
    raise SystemExit(f'ERROR: Expected folder {" or ".join(names)} in {parent}. '
                     f'Available folders: {available}. '
                     'Check that the vault folders are committed and pushed to main.')


source_dir = resolve_folder(
    resolve_folder(codex_dir / 'codex-content', 'Learn'), 'Learn - Career'
)
template_path = codex_dir / 'pages' / 'template.html'
output_dir = codex_dir / 'pages'
index_path = codex_dir / 'index.html'
categories = ['Tech', 'Sciences', 'Business']

def is_published(raw):
    # Accept an enabled checkbox or the equivalent Obsidian text property.
    match = re.match(r'\A\ufeff?---[ \t]*\n(.*?)\n---[ \t]*(?:\n|$)', raw, re.DOTALL)
    return bool(match and re.search(
        r'''^compaulo-codex[ \t]*:[ \t]*(?:true|"true"|'true')[ \t]*(?:#.*)?$''',
        match.group(1), re.MULTILINE | re.IGNORECASE
    ))

def discover_notes():
    notes = []
    slugs = set()
    for category in categories:
        names = ('Learn - Sciences', 'Learn - Science') if category == 'Sciences' else (f'Learn - {category}',)
        folder = resolve_folder(source_dir, *names)
        for path in sorted(folder.rglob('*.md')):
            raw = path.read_text(encoding='utf-8-sig')
            if not is_published(raw):
                continue
            subtopic, separator, title = path.stem.partition(' - ')
            if not separator or not subtopic.strip() or not title.strip():
                raise SystemExit(f'Public note must be named SubTopic - File name.md: {path}')
            slug = slugify(category + '-' + path.stem)
            if slug in slugs or slug == 'template':
                raise SystemExit(f'Duplicate page URL for: {path}')
            slugs.add(slug)
            notes.append((path, raw, category, subtopic.strip(), title.strip(), slug + '.html'))
    return notes

def slugify(name):
    return re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')

def strip_frontmatter(raw):
    match = re.match(r'\A---\s*\n.*?\n---[ \t]*(?:\n|$)', raw, re.DOTALL)
    return raw[match.end():] if match else raw

def render_math(content, options):
    opening, closing = (r'\[', r'\]') if options['display_mode'] else (r'\(', r'\)')
    return opening + html.escape(content) + closing


markdown = MarkdownIt('commonmark', {'html': False, 'breaks': True}).enable('table')
markdown.use(dollarmath_plugin, renderer=render_math, allow_labels=False)


def strip_editing_separators(body):
    # Inspect source ranges before cleaning so literal code and math are preserved.
    protected = set()
    for token in markdown.parse(body):
        if token.type in ('fence', 'code_block', 'math_block', 'math_block_label') and token.map:
            protected.update(range(*token.map))
    marker = re.compile(r'(?:##\s*<wbr\s*/?>|(?:\.\s*)+|-{2,})', re.IGNORECASE)
    return '\n'.join(
        '' if i not in protected and marker.fullmatch(line.strip()) else line
        for i, line in enumerate(body.splitlines())
    )


def parse_chapters(body, title):
    # Parse before splitting so headings inside code/math blocks stay untouched.
    tokens = markdown.parse(strip_editing_separators(body))
    starts = [i for i, token in enumerate(tokens)
              if token.type == 'heading_open' and token.tag == 'h4' and token.level == 0]
    chapters = []
    for number, start in enumerate(starts):
        end = starts[number + 1] if number + 1 < len(starts) else len(tokens)
        chapters.append({'title': tokens[start + 1].content, 'tokens': tokens[start + 3:end]})
    if not chapters:
        chapters = [{'title': title, 'tokens': tokens}]
    return chapters


def split_sections(tokens):
    starts = [i for i, token in enumerate(tokens)
              if token.type == 'heading_open' and token.tag in ('h3', 'h5') and token.level == 0]
    sections = []
    if not starts:
        return [{'title': 'Overview', 'tokens': tokens}]
    if starts[0]:
        sections.append({'title': 'Overview', 'tokens': tokens[:starts[0]]})
    for number, start in enumerate(starts):
        end = starts[number + 1] if number + 1 < len(starts) else len(tokens)
        sections.append({'title': tokens[start + 1].content, 'tokens': tokens[start + 3:end]})
    return sections


def render_body(tokens):
    for token in tokens:
        if token.type in ('heading_open', 'heading_close') and token.tag == 'h5':
            token.tag = 'h3'
            if token.type == 'heading_open':
                token.attrSet('class', 'tpl-chapter-subtitle')
        # Unpublished Obsidian references display their label without broken links.
        for child in token.children or []:
            if child.type == 'text':
                child.content = re.sub(r'\[\[([^]\n]+)\]\]',
                                       lambda m: m.group(1).split('|')[-1], child.content)
    return markdown.renderer.render(tokens, markdown.options, {})

template = template_path.read_text(encoding='utf-8')
output_dir.mkdir(parents=True, exist_ok=True)

notes = discover_notes()
entries = {category: {} for category in categories}
# Generated pages are disposable; remove stale pages when compaulo-codex is unchecked.
for old_page in output_dir.glob('*.html'):
    if old_page.name != 'template.html':
        old_page.unlink()

for md_file, raw, category, subtopic, title, output_name in notes:
    entries[category].setdefault(subtopic, []).append((title, output_name))
    body = strip_frontmatter(raw)
    chapters = parse_chapters(body, title)

    page_title = title.upper()

    toc = ''
    chapter_html = ''

    for i, ch in enumerate(chapters):
        active = ' is-active' if i == 0 else ''
        chapter_id = f'ch-{i+1}'
        expanded = 'true' if i == 0 else 'false'
        hidden = '' if i == 0 else ' hidden'
        sections = split_sections(ch['tokens'])
        section_links = ''
        body_html = ''
        for j, section in enumerate(sections):
            section_id = f'{chapter_id}-section-{j+1}'
            opened = i == 0 and j == 0
            section_links += (
                f'<button class="toc-section-link" data-section="{section_id}" '
                f'aria-controls="{section_id}" aria-expanded="{str(opened).lower()}">'
                f'{html.escape(section["title"])}</button>\n'
            )
            body_html += (
                f'<details class="tpl-section" id="{section_id}"'
                + (' open' if opened else '') + '>'
                f'<summary><h3 class="tpl-chapter-subtitle">{html.escape(section["title"])}</h3></summary>'
                f'<div class="tpl-section-body">{render_body(section["tokens"])}</div></details>\n'
            )
        toc += (
            f'<button class="toc-link{active}" data-target="{chapter_id}" '
            f'aria-controls="{chapter_id}-subsections" aria-expanded="{expanded}">'
            f'<span class="toc-num">{i+1}</span><span>{html.escape(ch["title"])}</span>'
            f'<span class="toc-chevron" aria-hidden="true">›</span></button>\n'
            f'<div class="toc-subsections" id="{chapter_id}-subsections"{hidden}>'
            + section_links + '</div>\n'
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
        lambda m: f'<title>{html.escape(page_title)} — Learn a Bit</title>',
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

print(f'Generated {len(notes)} HTML page(s).')

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

    groups = []
    for subtopic, pages in sorted(entries[category].items(), key=lambda item: item[0].casefold()):
        cards = '\n'.join(
            f'<a class="course-card" href="pages/{html.escape(filename, quote=True)}">'
            f'<h3>{html.escape(title)}</h3></a>'
            for title, filename in sorted(pages, key=lambda item: item[0].casefold())
        )
        groups.append(
            '<section class="course-subtopic">'
            f'<h2 class="course-subtopic-title">{html.escape(subtopic)}</h2>'
            f'<div class="course-grid">{cards}</div></section>'
        )
    cards = '\n'.join(groups)

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
    print(f'  {category}: {sum(len(pages) for pages in entries[category].values())} page(s)')

print('Updated index.html.')
