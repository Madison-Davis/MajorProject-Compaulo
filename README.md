# Compaulo Content Pipeline

This document describes how content flows from the Obsidian vault in
`compaulo-codex` to the live site served out of `MajorProject-Compaulo`
(compaulo.com).

## Repositories involved

| Repo | Visibility | Role |
|---|---|---|
| `compaulo-codex` | — | Obsidian vault (`.obsidian/`) — source of notes/content |
| `MajorProject-Portfolio` | **Private** | Build step — consumes codex updates, produces portfolio output |
| `MajorProject-Compaulo` | Public | Site repo — hosts `codex` (submodule) and `portfolio/` (built output), served via `index.html` / `styles.css`, likely GitHub Pages, linked to compaulo.com |

## Pipeline

1. **Edit & push** — Notes are edited in the `compaulo-codex` Obsidian vault and pushed to `main`.
2. **Dispatch** — The `Notify Compaulo` workflow in `compaulo-codex` fires on every push to `main` and sends a `repository_dispatch` event (`event_type: codex-updated`) to `MajorProject-Portfolio`, authenticated with the `COMPAULO_TOKEN` secret.

   ```yaml
   name: Notify Compaulo

   on:
     push:
       branches: [main]

   jobs:
     dispatch:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/github-script@v7
           with:
             github-token: ${{ secrets.COMPAULO_TOKEN }}
             script: |
               github.rest.repos.createDispatchEvent({
                 owner: 'Madison-Davis',
                 repo: 'MajorProject-Portfolio',
                 event_type: 'codex-updated'
               })
   ```

3. **Build (private)** — `MajorProject-Portfolio` listens for the `codex-updated` dispatch and builds/transforms the updated codex content. *(Contents of this workflow are not visible — it's a private repo.)*
4. **Publish to Compaulo** — The build output from `MajorProject-Portfolio` is committed/pushed into `MajorProject-Compaulo`, landing in the `portfolio/` folder — likely using the same `COMPAULO_TOKEN` for cross-repo write access.
5. **Serve** — `MajorProject-Compaulo` serves the result (root `index.html` / `styles.css`), presumably via GitHub Pages, as compaulo.com. The `codex` folder in this repo is a git submodule (per `.gitmodules`) pointing back to `compaulo-codex`.

## Open questions / to verify

- [ ] Exact transform `MajorProject-Portfolio` applies to Obsidian markdown → portfolio output
- [ ] Mechanism used to push output back into `MajorProject-Compaulo` (direct commit, PR, etc.)
- [ ] Whether `codex` is a submodule of `MajorProject-Compaulo`, `MajorProject-Portfolio`, or both
- [ ] Deployment mechanism for compaulo.com (GitHub Pages vs. other host)