# Scamly Website

Marketing site and web app for [Scamly](https://scamly.io) — scam protection for consumers. Includes the public landing experience, blog, legal pages, authentication, and a lightweight customer portal for onboarding.

## Tech stack

- **Framework:** [Next.js](https://nextjs.org/) (App Router)
- **UI:** React, TypeScript, Tailwind CSS, [shadcn/ui](https://ui.shadcn.com/)
- **Backend / auth:** [Supabase](https://supabase.com/) (client, SSR helpers, Edge Functions)
- **Observability:** Sentry, PostHog, Vercel Analytics & Speed Insights

## Prerequisites

- Node.js 20+ (Node 24 is the Vercel default if you deploy there)
- npm (or your preferred package manager)

## Getting started

```sh
git clone <repository-url>
cd scamly-website
npm install
npm run dev
```

The dev server runs at [http://localhost:3000](http://localhost:3000).

## Environment variables

Create a `.env.local` in the project root (values come from your Supabase project and observability dashboards):

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase anon / publishable key |
| `NEXT_PUBLIC_POSTHOG_API_KEY` | PostHog project API key (optional locally) |
| `NEXT_PUBLIC_POSTHOG_HOST` | PostHog ingest host (defaults to `https://us.i.posthog.com`) |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry browser DSN (optional locally) |

Server-side secrets for Edge Functions live in the Supabase project, not in this repo.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Run the production server locally |
| `npm run lint` | Run ESLint |

## Project layout

```
src/
  app/              # Routes (marketing, auth, portal)
  components/       # UI and page sections
  contexts/         # React context (e.g. auth, theme)
  hooks/            # Shared hooks
  integrations/     # Supabase client and generated types
  lib/              # Utilities (analytics, consent, Sentry, etc.)
  constants/        # Static content (blog posts, countries, etc.)
supabase/
  functions/        # Supabase Edge Functions (AI, webhooks, email, etc.)
```

Route groups under `src/app/`:

- `(base)` — Marketing pages: home, blog, contact, privacy, terms
- `(auth)` — Sign-in, email verification, password reset
- `(portal)` — Logged-in onboarding flows

## Supabase Edge Functions

Backend logic that does not belong in the browser lives under `supabase/functions/`. Deploy and manage these with the [Supabase CLI](https://supabase.com/docs/guides/cli) against your linked project.

## Deployment

This app is intended to run on [Vercel](https://vercel.com/) (or any host that supports Next.js). Set the environment variables above in the project settings, connect the Git repository, and use the default Next.js build settings (`npm run build`, output handled by Next.js).

## License

Proprietary — Scamly Pty Ltd.
