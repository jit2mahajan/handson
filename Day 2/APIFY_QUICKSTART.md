# Apify MCP - Quick Start (5 minutes)

## 1. Get Your Apify Token (2 minutes)

1. Go to https://apify.com and sign up (free tier available)
2. Click your profile → API tokens
3. Copy your token (starts with `apk_`)

## 2. Add Token to Your Project (1 minute)

Edit `.env.backend`:
```bash
APIFY_API_TOKEN=apk_your_token_here
```

## 3. Install Dependencies (1 minute)

```bash
cd "/home/labuser/Downloads/handson/Day 2"
npm install
```

## 4. Start the App (1 minute)

**Option A - Local Development:**
```bash
npm run dev
```

**Option B - Docker:**
```bash
docker-compose up
```

## 5. Use the Search

1. Open http://localhost:3000
2. Login (use test user: admin/admin)
3. Click "Apify Search" in the menu
4. Search for "web scraper"
5. Click a result and press "Run Actor"

## ✅ Done!

You now have a full MCP server integrated with a React UI.

### What You Can Do

- Search for thousands of Apify Actors
- Configure custom input parameters
- Execute web scraping jobs
- View results and run history
- Track execution status

### Example Searches

- "web scraper" - General purpose scraping
- "google search" - Search results extraction
- "twitter scraper" - Social media data
- "amazon scraper" - E-commerce data
- "instagram scraper" - Photo/post extraction

## 🚀 Next: Production Setup

For production, set environment variables:

```bash
export APIFY_API_TOKEN=apk_your_token
export NODE_ENV=production
export VITE_API_BASE_URL=https://your-api-domain.com/api
```

## 📖 Full Documentation

See `APIFY_MCP_SETUP.md` for:
- Architecture details
- API endpoint documentation
- Development guide
- Troubleshooting
- Security considerations
