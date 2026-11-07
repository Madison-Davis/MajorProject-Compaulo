# Compaulo Content Pipeline

This document describes how content flows from the Obsidian vault in
`compaulo-codex` to the live site served out of `MajorProject-Compaulo`
(compaulo.com).

## Repositories involved

| Repo | Visibility | Role |
|---|---|---|
| `compaulo-codex` | — | Obsidian vault (`.obsidian/`) — source of notes/content |
| `MajorProject-Compaulo` | **Private** | Produces the site |
| `MajorProject-Compaulo-Codex` | Private | A sync of the Obsidian Vault hoisted onto GitHub |

## How to Add More Pages

1. Edit notes in the `compaulo-codex` Obsidian vault under `Learn/Learn - Career/`.
2. Put each note in `Learn - Tech`, `Learn - Science` (or `Learn - Sciences`), or `Learn - Business`. These folders map to the three main Codex categories; nested folders are supported. Folder matching ignores capitalization, including the vault's tracked `learn - Career` name, so builds work on both macOS and Linux. The folders and notes must be committed and pushed to the vault's `main` branch.
3. Name the note `SubTopic - File name.md`. For example, `Learn/Learn - Career/Learn - Tech/AIML - RL.md` appears under **Tech → AIML → RL**. Other prefixes, such as `Software` and `Hardware`, create their own subsections.
4. Add an Obsidian checkbox property named `compaulo-codex` and enable it:

   ```yaml
   ---
   compaulo-codex: true
   ---
   ```

   Notes with `compaulo-codex: true` are published. Text properties containing `"true"` or `'true'` also work. Missing, blank, or false values keep a note private. Category tags and the old `Compaulo - ` filename prefix are no longer used.
5. Push the vault changes to `MajorProject-Compaulo-Codex` on `main`. Its notification triggers this site's build and deployment.

The build groups and sorts public notes by subtopic and title. Unchecking `compaulo-codex` removes the generated page on the next build. Page URLs include the category and full note name to distinguish matching titles across categories. Duplicate URLs within a category cause the build to fail rather than overwrite a page.

The deployment artifact excludes the source vault. Notes render Markdown lists, headings, emphasis, code, and tables. Inline `$...$` and display `$$...$$` equations render with MathJax (loaded from a CDN). Obsidian wiki references display as plain labels. The note renderer uses `####` headings for chapters and `#####` headings for subsections. Notes without chapter headings display their body as a single chapter.

Standalone editing separators (`## <wbr>`, dot-only lines such as `. . .`, and lines of two or more hyphens) are hidden from displayed notes. Code blocks and equations retain their original content.

To build locally with the vault checked out:

```sh
python3 -m pip install -r codex/scripts/requirements.txt
bash codex/scripts/build-codex.sh
```

To verify publication filtering and grouping using temporary sample notes:

```sh
python3 -m unittest discover -s codex/scripts -p 'test_*.py'
```

Chapter buttons expand their subsection list in the sidebar. Subsections (`#####` or `###` headings) display as collapsible panels, with only one open per chapter. Click an open subsection again to minimize it; introductory chapter text appears as Overview.
