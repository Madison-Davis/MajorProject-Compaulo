import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path


class BuildCodexTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.codex = Path(self.temp.name)
        original = Path(__file__).resolve().parents[1]
        shutil.copytree(original / 'scripts', self.codex / 'scripts')
        (self.codex / 'pages').mkdir()
        shutil.copy(original / 'pages/template.html', self.codex / 'pages/template.html')
        shutil.copy(original / 'index.html', self.codex / 'index.html')
        self.source = self.codex / 'codex-content/Learn/Learn - Career'
        for category in ['Tech', 'Sciences', 'Business']:
            (self.source / f'Learn - {category}').mkdir(parents=True)

    def note(self, name, property='compaulo-codex: true', category='Tech'):
        path = self.source / f'Learn - {category}' / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(f'---\n{property}\n---\n#### Introduction\nSample content.')
        return path

    def build(self, success=True):
        result = subprocess.run(['bash', str(self.codex / 'scripts/build-codex.sh')],
                                capture_output=True, text=True)
        self.assertEqual(result.returncode == 0, success, result.stdout + result.stderr)
        return result

    def test_public_filter_groups_categories_and_unpublishing(self):
        public = self.note('AIML - RL.md')
        self.note('nested/Software - Compilers.md')
        self.note('Physics - Waves.md', category='Sciences')
        self.note('Strategy - Growth.md', category='Business')
        for name, value in [('Private', 'compaulo-codex: false'), ('Blank', 'compaulo-codex:'),
                            ('Missing', 'tags: [compaulo-codex]'), ('OldProperty', 'public: true'), ('Quoted', 'compaulo-codex: "false"'),
                            ('Nested', 'metadata:\n  compaulo-codex: true')]:
            self.note(f'AIML - {name}.md', value)
        self.build()
        pages = {p.name for p in (self.codex / 'pages').glob('*.html')}
        self.assertEqual(pages, {'template.html', 'tech-aiml-rl.html',
                                'tech-software-compilers.html', 'sciences-physics-waves.html',
                                'business-strategy-growth.html'})
        index = (self.codex / 'index.html').read_text()
        self.assertIn('course-subtopic-title">AIML</h2>', index)
        self.assertIn('<h3>RL</h3>', index)
        self.assertIn('href="pages/tech-aiml-rl.html"', index)
        self.assertIn('Sample content.', (self.codex / 'pages/tech-aiml-rl.html').read_text())
        public.write_text('---\ncompaulo-codex: false\n---\nPrivate now')
        self.build()
        self.assertFalse((self.codex / 'pages/tech-aiml-rl.html').exists())
        self.assertNotIn('tech-aiml-rl.html', (self.codex / 'index.html').read_text())

    def test_duplicate_urls_fail_before_removing_pages(self):
        self.note('AIML - RL.md')
        self.build()
        self.note('nested/AIML - RL.md')
        self.assertIn('Duplicate page URL', self.build(success=False).stderr)
        self.assertTrue((self.codex / 'pages/tech-aiml-rl.html').exists())

    def test_git_folder_casing_and_singular_science(self):
        self.note('AIML - RL.md')
        self.note('Science - Statistics.md', category='Sciences')
        (self.source / 'Learn - Sciences').rename(self.source / 'Learn - Science')
        # Use an intermediate name so this also exercises the rename on macOS.
        intermediate = self.source.with_name('career-temp')
        self.source.rename(intermediate)
        intermediate.rename(self.source.with_name('learn - Career'))
        self.build()
        self.assertTrue((self.codex / 'pages/tech-aiml-rl.html').exists())
        self.assertTrue((self.codex / 'pages/sciences-science-statistics.html').exists())

    def test_quoted_true_properties_publish(self):
        self.note('AIML - Reinforcement Learning.md', 'compaulo-codex: "true"')
        self.note('Software - Tools.md', "compaulo-codex: 'true'")
        self.build()
        self.assertTrue((self.codex / 'pages/tech-aiml-reinforcement-learning.html').exists())
        self.assertTrue((self.codex / 'pages/tech-software-tools.html').exists())

    def test_missing_career_folder_reports_available_folders(self):
        self.source.rename(self.source.with_name('Other'))
        error = self.build(success=False).stderr
        self.assertIn('Available folders: Other', error)
        self.assertIn('committed and pushed to main', error)

    def test_unstructured_note_and_escaped_titles(self):
        note = self.note('Hardware - A & B.md')
        note.write_text('---\ncompaulo-codex: true\n---\nA body without chapter headings.')
        self.build()
        page = (self.codex / 'pages/tech-hardware-a-b.html').read_text()
        self.assertIn('A &amp; B', page)
        self.assertIn('A body without chapter headings.', page)

    def test_markdown_and_math_preserve_structure(self):
        note = self.note('AIML - RL.md')
        note.write_text(r'''---
compaulo-codex: true
---
#### MDPs and Policies
##### Foundational Terminology
A **model** with [[Markov Decision Process|MDP]] and $s_{H-1}$.
- $\mu$: initial distribution
- States
  - Nested state

1. First step
2. Second step

$$
V_h(s) = \sum_a \pi_h(a|s) Q_h(s,a)
$$

```text
#### This is code, not a chapter
$s_0$
```

<script>alert('unsafe')</script>
#### Next Chapter
### A Markdown heading
More content.
''')
        self.build()
        page = (self.codex / 'pages/tech-aiml-rl.html').read_text()
        self.assertIn('<strong>model</strong>', page)
        self.assertIn('with MDP and', page)
        self.assertGreaterEqual(page.count('<ul>'), 2)
        self.assertIn('<ol>', page)
        self.assertIn(r'\(s_{H-1}\)', page)
        self.assertIn(r'\[V_h(s) = \sum_a', page)
        self.assertNotIn('<em>H-1</em>', page)
        self.assertIn('<h3 class="tpl-chapter-subtitle">Foundational Terminology</h3>', page)
        self.assertIn('<h3>A Markdown heading</h3>', page)
        self.assertEqual(page.count('class="toc-link'), 2)
        self.assertIn('#### This is code, not a chapter\n$s_0$', page)
        self.assertNotIn("<script>alert('unsafe')</script>", page)
        self.assertIn('mathjax@3.2.2', page)


if __name__ == '__main__':
    unittest.main()
