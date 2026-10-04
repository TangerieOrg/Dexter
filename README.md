# Dexter
Dexcom web UI / api / database

- `api/` - deno, polls dexcom share every minute into sqlite (`deno task dev`, `deno task test`)
- `frontend/` - preact + vite pwa with trend graph (`npm run dev`, `DEXTER_API=http://localhost:8080 npm run dev` for a local api)

API is public on purpose, PicoDexter reads `/glucose/current` and `/glucose/ten`.

Old redis data (pre sqlite) backed up to `~/dexter-redis-backup-20261004` on the swarm host.
