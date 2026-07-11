# Cozy Town 3D 🏡

A cozy **3D browser game** you can play instantly and share with friends.

**Play:** [https://robdon3.github.io/Cozy_Town/](https://robdon3.github.io/Cozy_Town/)

## Features

- **3D town** built with React Three Fiber (Three.js)
- **Sprite characters** (billboard avatars for you + NPCs)
- **Procedural sound** — footsteps, coins, quests, ambient jingle (no downloads)
- **Joystick + keyboard** controls (mobile & desktop)
- **Quests, shop, inventory, energy, XP & levels**
- **Save progress** in your browser
- **Share / invite** friends with one tap (Web Share API + copy link)
- Hosted on **GitHub Pages** — free to play, free to share

## Locations

| Place | What to do |
|-------|------------|
| Cozy Cafe ☕ | Restore energy |
| General Store 🏪 | Buy items |
| Central Park 🌳 | Relax |
| Town Hall 🏛️ | View & complete quests |
| Fishing Dock 🎣 | Catch fish |
| Dark Forest 🌲 | Chop wood |
| Crystal Mine ⛏️ | Mine ore |

## Controls

| Input | Action |
|-------|--------|
| WASD / Arrow keys | Move |
| On-screen joystick | Move (touch) |
| E / Space / green button | Interact |
| 📤 | Share game link |
| ☰ | Menu (quests, inventory, settings) |

## Develop locally

```bash
git clone https://github.com/robdon3/Cozy_Town.git
cd Cozy_Town
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm run build    # production build → dist/
npm run preview  # preview production build
```

## Deploy

Push to `main` — GitHub Actions builds with Vite and deploys `dist/` to GitHub Pages.

## Stack

- React 18 + Vite
- Three.js via `@react-three/fiber` + `@react-three/drei`
- Zustand state + `localStorage` saves
- Web Audio API (procedural SFX & music)

## License

MIT — have fun and share the town 🌟
