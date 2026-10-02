# DanOS 🖥️

Your personal command centre. Built with React + Vite.

## Phase 1 includes
- **Dashboard** — glanceable overview of everything
- **Calendar** — events, birthdays, football matches, reminders
- **Ideas Wall** — sticky notes, tagged and filterable
- **Shopping** — multiple lists, tick items off as you shop
- **Pick-me-up** — Bible verses, quotes, messages from loved ones

## Getting started

### Requirements
- [Node.js](https://nodejs.org/) v18 or higher

### Run locally

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server
npm run dev

# 3. Open in your browser
# http://localhost:5173
```

That's it! DanOS runs in your browser at localhost:5173.

All data is saved to your browser's localStorage — it persists between sessions on the same machine.

## Coming in future phases
- Phase 2: Wheel of Decide, 92 Club tracker, House reno to-dos, Coaching & quals, App links
- Phase 3: Fitness (Strava/Apple Activity), Workout guide, F1 Sim race tracker
- Phase 4: Finance dashboard, PlayStation trophy tracker

## Future: upgrading to a proper backend
The app is structured so swapping localStorage for a C# Web API + MySQL backend is straightforward.
Each `useLocalStorage` call in `App.jsx` can be replaced with API calls — the rest of the components don't need to change.
