# MsopAPI

MsopAPI is an AI API gateway and reseller storefront, built from the open-source
APInexGate project by APInex (MIT license, see LICENSE).

Live site: https://msopapi.vercel.app

Vercel git deployment: pushes to main deploy automatically.

## What this is

One API key for OpenAI-compatible, Anthropic, and Responses models, with
streaming and tool calling, a customer dashboard, billing, subscriptions,
and an admin panel.

## UI

Vercel-style theme: pure black background, white text, grey secondary text,
thin grey borders, white primary buttons, small 6-8px radii. No purple
gradients or glowing orbs from the original APInexGate theme.

## Vercel storefront note

The Vercel deployment serves the storefront (landing, pricing, docs, models).
The full Fastify + SQLite gateway server in `server/` needs a persistent
server to run accounts, keys, billing, and the `/v1` API. On Vercel alone,
login, dashboard, and live API calls will not work until that backend is
hosted and `API_BASE_URL` points at it.

## Local gateway (full backend)

```
git clone https://github.com/MeowSamOPDZN/msopapi.git
cd msopapi && cp .env.example .env
npm install
npm run dev:full
```

Free models get 10,000 tokens a day per account (the gateway default). Continuous, unlimited use is a paid subscription, not free.

Set `ADMIN_PASSWORD` in `.env`, then open `/admin`, add your APInex key
in Admin → Providers, and import models in Admin → Models.

## Environment (storefront)

```
SITE_NAME=MsopAPI
SITE_URL=https://msopapi.vercel.app
API_BASE_URL=https://msopapi.vercel.app/v1
API_ORIGIN=https://msopapi.vercel.app
CONTACT_EMAIL=info@msopapi.vercel.app
CORS_ORIGINS=https://msopapi.vercel.app
```

Upstream provider remains APInex (api.apinex.bond). MsopAPI is the reseller
brand on top of it, not a replacement for APInex itself.
