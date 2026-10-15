# GitHub Pages Migration Implementation Plan

> **For agentic workers:** Use native execution for this hosting change; verify deployment before reporting completion.

**Goal:** Publish the existing learning website through GitHub Pages, following the ML encyclopedia's deployment approach.

**Architecture:** Keep the Vite static build, relative resource base and hash routes. Build `dist/` in GitHub Actions on `main`, then deploy the artifact with the official Pages actions. Revoke public access to the previous Sites deployment.

**Tech Stack:** React, Vite, Node.js 24, GitHub Actions, GitHub Pages.

**Spec:** User request on 2026-10-15: use GitHub homepage hosting and refer to `/Users/chen/projects/ML-encyclopedia/`.

## Constraints and review focus

- Keep course content, learning features and browser-local records unchanged.
- Publish only `dist/`; do not upload the source repository as the website.
- Confirm relative assets, Markdown and papers load under the repository path.
- Use minimum job permissions and serialize production deployments.
- Confirm the deployed URL responds successfully before announcing completion.

## Tasks

- [x] Inspect the reference repository's remote Pages workflow and settings.
- [x] Restrict the previous Sites audience to the owner and enable GitHub Pages Actions hosting.
- [x] Add `.github/workflows/pages.yml`; replace Sites documentation and remove its manifest.
- [x] Run the production build, content checker, 26 unit tests and existing browser subpath test.
- [ ] Commit and push the change; fast-forward `main` without overwriting remote history.
- [ ] Confirm the Pages Actions deployment, verify the public repository URL, and open it for the user.
