# Apify MCP Server Integration Guide

## Overview

This guide walks you through setting up the Apify MCP (Model Context Protocol) Server integration for your ALCOA+ QA platform. This allows users to search for and execute Apify Actors directly from the web interface.

## Architecture

```
┌─────────────────────┐
│   React Frontend    │
│  (ApifySearch.tsx)  │
└──────────┬──────────┘
           │ HTTP REST
┌──────────▼──────────┐
│   Express Backend   │
│  (/api/apify/...)   │
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│   MCP Server        │
│(apify-mcp-server.ts)│
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│   Apify Client SDK  │
│    (apify-client)   │
└─────────────────────┘
```

## Installation

### 1. Install Dependencies

```bash
cd "/home/labuser/Downloads/handson/Day 2"
npm install
```

This installs:
- `@modelcontextprotocol/sdk` - MCP protocol support
- `apify-client` - Apify API client
- Express.js - Backend framework

### 2. Environment Configuration

Create or update your `.env.backend` file with Apify credentials:

```bash
# Add to .env.backend
APIFY_API_TOKEN=<your-apify-api-token>

# Optional: Configure API endpoint
APIFY_API_BASE_URL=https://api.apify.com
```

### 3. Get Your Apify API Token

1. Visit [apify.com](https://apify.com)
2. Sign up for a free or paid account
3. Navigate to Account Settings → API tokens
4. Copy your API token (starts with `apk_`)
5. Add it to `.env.backend`

## Project Structure

```
src/
├── backend/
│   ├── mcp/
│   │   └── apify-mcp-server.ts      # MCP server implementation
│   ├── api/
│   │   └── apify.ts                 # Express routes for Apify
│   └── app.ts                       # Updated with /api/apify route
├── pages/
│   └── ApifySearch.tsx              # React UI component
└── App.tsx                          # Updated with apify route

package.json                         # Updated with new dependencies
```

## Features

### MCP Server Tools

The MCP server implements 5 tools:

1. **search_actors** - Search for Apify Actors
   - Input: `query` (string), `limit` (optional number)
   - Returns: List of matching Actors

2. **get_actor_details** - Get Actor specifications
   - Input: `actorId` (string)
   - Returns: Actor details, input schema, pricing

3. **run_actor** - Execute an Actor
   - Input: `actorId` (string), `input` (object), `maxResults` (optional)
   - Returns: Run ID and status

4. **get_actor_run_status** - Check run status
   - Input: `runId` (string)
   - Returns: Run status, timestamps, output count

5. **get_actor_results** - Retrieve Actor results
   - Input: `runId` (string), `limit` (optional)
   - Returns: Paginated results from completed run

### Backend API Routes

- `POST /api/apify/search` - Search Actors
- `GET /api/apify/actors/:actorId` - Get Actor details
- `POST /api/apify/run` - Execute Actor
- `GET /api/apify/runs/:runId/status` - Check status
- `GET /api/apify/runs/:runId/results` - Get results
- `POST /api/apify/tool` - Generic tool execution

## Usage

### Starting the Development Server

```bash
npm run dev
```

### Accessing the UI

1. Navigate to http://localhost:3000
2. Login with credentials
3. Click "Apify Search" in the navigation menu
4. Search for an Actor (e.g., "web scraper")
5. Select an Actor and configure input parameters
6. Click "Run Actor" to execute
7. View results and run history

## Development

### Adding New Tools to MCP Server

Edit `src/backend/mcp/apify-mcp-server.ts` to add new tools.

### Adding New API Routes

Edit `src/backend/api/apify.ts` to add new endpoints.

## Permissions & Roles

The Apify Search page is restricted to:
- **admin** - Full access
- **qa-manager** - Full access

## Production Deployment

### Environment Variables

```bash
APIFY_API_TOKEN=<your-production-token>
NODE_ENV=production
VITE_API_BASE_URL=https://your-api-domain.com/api
CORS_ORIGIN=https://your-frontend-domain.com
```

## Testing

### Example Searches

- "web scraper"
- "google search"  
- "social media"
- "e-commerce"

## Troubleshooting

### "APIFY_API_TOKEN not configured"

1. Verify `.env.backend` contains `APIFY_API_TOKEN`
2. Restart backend

### "Module not found: @modelcontextprotocol/sdk"

```bash
npm install
```

### Results showing mock data

This is intentional for testing without API usage. Replace mock functions in `apify-mcp-server.ts` to use real Apify API.

## Resources

- [Apify Documentation](https://docs.apify.com/)
- [Apify Store](https://apify.com/store)
- [MCP Protocol](https://modelcontextprotocol.io/)

---

**Version**: 1.0.0  
**Last Updated**: 2026-09-05
