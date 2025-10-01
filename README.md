[![node-ci](https://github.com/Ivan2san/Alteva-Leadership-Coach-Clean/actions/workflows/node-ci.yml/badge.svg?branch=main)](https://github.com/Ivan2san/Alteva-Leadership-Coach-Clean/actions/workflows/node-ci.yml)

# Alteva Leadership Coach

## Prod smoke
[![Prod Smoke Status](https://github.com/Ivan2san/Alteva-Leadership-Coach-Clean/actions/workflows/smoke-status.yml/badge.svg)](../../actions/workflows/smoke-status.yml)

## Journey V2 (feature flag)
- Toggle via `VITE_JOURNEY_V2` (0 = off, 1 = on).  
- Dev (v1): `npm run dev`  
- Dev (v2): `VITE_JOURNEY_V2=1 npm run dev`  
- Health check: `GET /health` should return `OK`.

