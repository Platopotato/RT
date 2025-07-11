# Radix Tribes

A real-time, turn-based, post-apocalyptic strategy game.  
Players lead tribes, explore a hex-grid wasteland, gather resources, research technologies, negotiate (or fight) with others – all updated instantly through WebSockets.

---

## Tech Stack

| Layer      | Stack                                   |
|------------|-----------------------------------------|
| Frontend   | Vite + React + TypeScript + TailwindCSS |
| Realtime   | Socket.IO (WebSocket transport)         |
| Backend    | Node.js + Express + TypeScript          |
| Shared     | `lib/` – single source of truth for types, constants and helpers |

---

## Repository Structure

```
.
├─ components/         – React UI components
├─ lib/                – Shared logic (types, constants, utilities)
├─ public/             – Static assets & single index.html
├─ src/
│  ├─ index.tsx        – Front-end entry point
│  ├─ server/          – Back-end (Express + Socket.IO)
│  │   ├─ gameLogic/   – Map generator, turn processor, AI, data
│  │   └─ index.ts     – Server entry
└─ ...
```

---

## Prerequisites

* Node ≥ 18  
* npm (v9+)  
*(Yarn / pnpm will work too, adjust commands yourself)*

---

## Installation

```bash
# clone the repo
git clone https://github.com/yourname/radix-tribes.git
cd radix-tribes

# install all dependencies (frontend + backend are one workspace)
npm install
```

---

## Running the Game (dev mode)

### 1. Start the backend

```bash
npm run server:dev
```

* Runs `src/server/index.ts` with nodemon / ts-node  
* Listens on **http://localhost:3000**  
* Persists game data to `data/game-data.json`

### 2. Start the frontend

In a second terminal:

```bash
npm run dev
```

* Vite dev server on **http://localhost:5173**  
* Proxy configured so UI autoconnects to backend WebSocket.

Open `http://localhost:5173` in your browser, create an account, enter the lobby and start playing.

---

## Production Build

```bash
# transpile server to dist/server
npm run build:server

# bundle & minify frontend into dist/
npm run build
```

Serve with:

```bash
npm run server
```

The Express server will automatically serve the static bundle from `dist/` and expose the Socket.IO endpoint.

---

## Environment Variables

| Variable      | Default | Description                                  |
|---------------|---------|----------------------------------------------|
| `PORT`        | 3000    | Backend port                                 |
| `DATA_DIR`    | ./data  | Directory for `game-data.json` persistence   |

You usually don’t need an `.env` file for local development.

---

## Gameplay Notes

* All simulation & rule enforcement runs **server-side**.  
* Clients only emit actions and render state updates.  
* Turn processing is triggered either by an admin or automatically once every tribe has submitted its orders (manual by default).  
* AI tribes use simple heuristic decision-making and move every turn.

---

## Contributing

PRs are welcome!  
Follow the existing folder conventions – **never** duplicate shared types; always import from `lib/`.

---

## License

MIT © 2025 Radix Tribes Team
