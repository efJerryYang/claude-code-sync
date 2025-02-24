# Claude Code Sync

This repository would sync the [`@anthropic-ai/claude-code`](https://www.npmjs.com/package/@anthropic-ai/claude-code) NPM package using GitHub Actions.

### Workflow

- Runs daily or manually via GitHub Actions.
- Fetches the latest package version.
- Syncs contents to `npm-pkg/`.
- Commits and tags changes if an update is detected.

### Requirements

Please setup your `PAT_TOKEN` for write permission.

