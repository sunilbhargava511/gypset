# Gypste - Trip Curator

A modern travel planning app that helps you bookmark locations, record voice notes, and transform them into polished travel writing using AI.

## Features

- **Chrome Extension**: Save locations from any website with one click
- **Voice Notes**: Record audio notes about places you want to remember
- **AI-Powered Writing**: Transform your notes into polished travel descriptions
- **Smart Tagging**: Automatic categorization of places (restaurants, attractions, etc.)
- **Trip Organization**: Group locations into trips
- **Share Trips**: Generate shareable links for your curated trips
- **Map View**: Visualize all your saved locations on a map

## Tech Stack

- **Frontend**: Next.js 16, React, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **AI**: Google Gemini API
- **Auth**: NextAuth.js
- **Maps**: Mapbox GL

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (recommend [Neon](https://neon.tech) for free hosting)
- Google Gemini API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/sunilbhargava511/gypste.git
cd gypste
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your values:
- `DATABASE_URL`: Your PostgreSQL connection string
- `NEXTAUTH_SECRET`: Generate with `openssl rand -base64 32`
- `GOOGLE_GENERATIVE_AI_API_KEY`: From Google AI Studio

4. Set up the database:
```bash
npx prisma generate
npx prisma db push
npm run db:seed
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000)

### Default Login

- **Username**: `admin`
- **Password**: `1234`

**Important**: Change this password after first login!

### Chrome Extension Setup

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `chrome-extension` folder from this repo
5. The Trip Curator extension will appear in your toolbar

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Connect your repo to [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy!

### Environment Variables for Production

Set these in your hosting platform:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Random secret for session encryption |
| `NEXTAUTH_URL` | Your production URL (e.g., https://gypste.vercel.app) |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini API key |

## Chrome Extension for Production

After deploying, update the extension to use your production URL:

1. Edit `chrome-extension/popup.js` and `chrome-extension/background.js`
2. Change `API_BASE` from `http://localhost:3000` to your production URL
3. Reload the extension in Chrome

To publish on Chrome Web Store:
1. Zip the `chrome-extension` folder
2. Submit at [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/developer/dashboard)

## Admin Panel

Access at `/admin` to configure:
- **API Keys**: Manage Gemini and Mapbox keys
- **Settings**: Control audio limits, LLM models, cost alerts
- **Costs**: Track per-user API usage
- **Tags**: Manage global tags

## Project Structure

```
├── chrome-extension/    # Chrome extension files
├── prisma/              # Database schema
├── src/
│   ├── app/
│   │   ├── admin/       # Admin panel
│   │   ├── api/         # API routes
│   │   ├── dashboard/   # User dashboard
│   │   ├── share/       # Public shared trips
│   │   └── login/       # Auth pages
│   ├── components/      # React components
│   └── lib/             # Utilities
└── scripts/             # Database scripts
```

## License

MIT
