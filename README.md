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

1. Step 1: Notes are edited in the `compaulo-codex` Obsidian vault. All notes must follow the format Compaulo - Title.md and be located within Learn - Compaulo.
2. Step 2: Open the `MajorProject-Compaulo-Codex` repo.  It'll show the changes you made in Obsidian.
2. Step 3: Push the `MajorProject-Compaulo-Codex` repo to main.
3. Step 4: `MajorProject-Compaulo` will be notified of this change and update its pages.
