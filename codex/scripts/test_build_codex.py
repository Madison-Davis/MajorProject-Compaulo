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

    def test_unstructured_note_and_escaped_titles(self):
        note = self.note('Hardware - A & B.md')
        note.write_text('---\ncompaulo-codex: true\n---\nA body without chapter headings.')
        self.build()
        page = (self.codex / 'pages/tech-hardware-a-b.html').read_text()
        self.assertIn('A &amp; B', page)
        self.assertIn('A body without chapter headings.', page)


if __name__ == '__main__':
    unittest.main()
