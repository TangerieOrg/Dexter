# Dexter
Dexcom web UI / api / database

- `api/` - deno, polls dexcom share every minute into sqlite (`deno task dev`, `deno task test`)
- `frontend/` - preact + vite pwa with trend graph (`npm run dev`, `DEXTER_API=http://localhost:8080 npm run dev` for a local api)

API is public on purpose, PicoDexter reads `/glucose/current` and `/glucose/ten`.

## Redis cutover
On first start the api imports `glucose:readings` from `REDIS_URL` into sqlite and logs `[Migrate] Imported redis readings`.
Once `/dexter/api/health` shows the count, remove the `redis` service, `REDIS_URL` and `depends_on` from `docker-compose.yml`.
