# rstful

<img src="./public/rstful.png" align="left" width="200" alt="Sakhal logo of a deer and a dead tree" style="margin-right: 20px; margin-bottom: 10px; background: white;">

rstful is a modern agentic RSS reader built with React Router, Convex, Tailwind, BaseUI, Resend, Polar, TypeScript, and Effect-TS. 


Chat with an agent that has full context of your saved articles and first 50 articles in your feed, and deep search for content creators you can relate to.

Planned features include a recommendation algorithm, automatic RSS feed conversions, and more!

<br clear="left">

## Prerequisites

- [Bun](https://bun.sh)
- A [Convex](https://convex.dev) account
- A [Resend](https://resend.com) account (for email)
- A [Polar](https://polar.sh) account (for payments)
- A [Dedalus Labs](https://dedalus.dev) account

## Installation

```bash
bun install
```

### Environment Variables

Create a `.env.local` file for local development:

```bash
# Convex
CONVEX_DEPLOYMENT=dev:<your-dev-deployment>
VITE_CONVEX_URL=https://<your-dev-deployment>.convex.cloud

# Site URL (used for OAuth redirects and email links)
SITE_URL=http://localhost:5173

# JWT Keys (generate with: bun utils/generateKeys.mjs)
JWT_PRIVATE_KEY=<generated-private-key>
JWKS=<generated-jwks>

# Resend (for sending emails)
AUTH_RESEND_KEY=re_xxxxxxxx

# Dedalus Labs
DEDALUS_API_KEY=<your-dedalus-api-key>

# Polar (payments)
POLAR_ORGANIZATION_TOKEN=<your-polar-org-token>
POLAR_WEBHOOK_SECRET=<your-polar-webhook-secret>
POLAR_PRODUCT_ID=<your-polar-product-id>
POLAR_SERVER=sandbox  # use "production" for live
```

### Generating JWT Keys

```bash
bun utils/generateKeys.mjs
```

Copy the output values into your environment variables.

## Local Development

1. Start the Convex development server:

```bash
bunx convex dev
```

2. In a separate terminal, start the frontend:

```bash
bun run dev
```

Your application will be available at `http://localhost:5173`.

## Production Deployment (Vercel)

### 1. Deploy Convex Backend

Deploy your Convex backend to production:

```bash
bunx convex deploy
```

Set the following environment variables in the [Convex dashboard](https://dashboard.convex.dev):

| Variable | Description |
|----------|-------------|
| `SITE_URL` | Your production domain (e.g., `https://yourdomain.com`) |
| `JWT_PRIVATE_KEY` | Generated private key for auth |
| `JWKS` | Generated JWKS for auth |
| `AUTH_RESEND_KEY` | Resend API key |
| `POLAR_ORGANIZATION_TOKEN` | Polar production org token |
| `POLAR_WEBHOOK_SECRET` | Polar production webhook secret |
| `POLAR_PRODUCT_ID` | Polar production product ID |
| `POLAR_SERVER` | Set to `production` |

### 2. Sync Polar Products

After deploying Convex, sync your Polar products:

```bash
bunx convex run polar:syncProducts --prod
```

This is a one-time step. Products stay in sync via webhooks afterward.

### 3. Deploy to Vercel

1. Push your code to GitHub
2. Import the repository in [Vercel](https://vercel.com)
3. Generate a deploy key in the [Convex dashboard](https://dashboard.convex.dev) under project settings → "Generate Production Deploy Key"
4. Set the following environment variables in Vercel:

| Variable | Description |
|----------|-------------|
| `CONVEX_DEPLOY_KEY` | Your generated deploy key |
| `DEDALUS_API_KEY` | Dedalus Labs production API key |

5. Override the build command in Vercel project settings:

```bash
bunx convex deploy --cmd 'bun run build'
```

This ensures Convex functions deploy before your frontend builds, and automatically sets `VITE_CONVEX_URL`.

### 4. Deploy

Push to your repository and Vercel will automatically deploy both your Convex backend and frontend.

See [Convex Vercel docs](https://docs.convex.dev/production/hosting/vercel) for more details.

## Building for Production

```bash
bun run build
```
