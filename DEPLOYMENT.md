# Deploying Cozy Town 3D to GitHub Pages

Push to `main` and GitHub Actions builds the Vite app, then deploys the `dist/` folder.

## Live URL

**https://robdon3.github.io/Cozy_Town/**

## First-time setup

1. Repo **Settings → Pages → Source**: GitHub Actions
2. Ensure the repo is public (or you have Pages on a private plan)
3. Push to `main`

## Local commands

```bash
npm install
npm start          # http://localhost:3000
npm run build      # writes to dist/
npm run preview    # preview production build
```

## Sharing with friends

In-game, tap **📤** or **Invite friends** — uses the Web Share API on mobile, or copies the play link on desktop.
