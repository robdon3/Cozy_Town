# Cozy Town 3D 🏡

A cozy **3D browser game** you can play instantly — including **live multiplayer** with friends.

**Play:** [https://robdon3.github.io/Cozy_Town/](https://robdon3.github.io/Cozy_Town/)

## Features

- **3D town** built with React Three Fiber (Three.js)
- **Live multiplayer** — create/join a room; friends appear as sprites in the same town (P2P via [Trystero](https://github.com/dmotz/trystero), no game server)
- **Sprite characters** (billboard avatars for you, friends + NPCs)
- **Procedural sound** — footsteps, coins, quests, ambient jingle
- **Joystick + keyboard** controls (mobile & desktop)
- **Quests, shop, inventory, energy, XP & levels**
- **Chat** in multiplayer rooms
- **Save progress** in your browser
- **Share invite links** (`?room=CODE`) with one tap
- Hosted on **GitHub Pages**

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

## Multiplayer

1. **Create room & play** on the title screen (generates a 5-character code)
2. Tap **📤** or **Invite friends** — copy/share the link
3. Friends open the link → enter a name → **Join**
4. You’ll see each other walk around the town; use **💬** to chat

Solo mode still works if you prefer offline play.

> Connections are peer-to-peer (WebRTC). Both players need a network that allows WebRTC; home/mobile data usually works. If a friend can’t connect, try the same Wi‑Fi or a different network.

## Controls

| Input | Action |
|-------|--------|
| WASD / Arrow keys | Move |
| On-screen joystick | Move (touch) |
| E / Space / green button | Interact |
| 📤 | Share invite / game link |
| 💬 | Chat |
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
- [Trystero](https://github.com/dmotz/trystero) for serverless WebRTC multiplayer

## License

MIT — have fun and share the town 🌟
