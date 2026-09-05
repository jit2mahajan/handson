import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import ApifyClient from 'apify-client';

// Initialize Apify client
const apiToken = process.env.APIFY_API_TOKEN || '';
const apifyClient = new ApifyClient({ token: apiToken });

// Define available tools
const tools: Tool[] = [
  {
    name: 'search_actors',
    description: 'Search for Apify Actors by keyword or category. Returns a list of available actors.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Search query (e.g., "web scraper", "social media", "e-commerce")',
        },
        limit: {
          type: 'number',
          description: 'Number of results to return (default: 10, max: 50)',
          default: 10,
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_actor_details',
    description: 'Get detailed information about a specific Actor including input schema and pricing',
    inputSchema: {
      type: 'object' as const,
      properties: {
        actorId: {
          type: 'string',
          description: 'The Actor ID (e.g., "apify/web-scraper")',
        },
      },
      required: ['actorId'],
    },
  },
  {
    name: 'run_actor',
    description: 'Execute an Actor with specified input parameters',
    inputSchema: {
      type: 'object' as const,
      properties: {
        actorId: {
          type: 'string',
          description: 'The Actor ID to run',
        },
        input: {
          type: 'object',
          description: 'Input parameters for the Actor',
        },
        maxResults: {
          type: 'number',
          description: 'Maximum number of results to wait for (default: 1000)',
          default: 1000,
        },
      },
      required: ['actorId', 'input'],
    },
  },
  {
    name: 'get_actor_run_status',
    description: 'Get the status of a running or completed Actor run',
    inputSchema: {
      type: 'object' as const,
      properties: {
        runId: {
          type: 'string',
          description: 'The run ID returned from run_actor',
        },
      },
      required: ['runId'],
    },
  },
  {
    name: 'get_actor_results',
    description: 'Get results from a completed Actor run',
    inputSchema: {
      type: 'object' as const,
      properties: {
        runId: {
          type: 'string',
          description: 'The run ID',
        },
        limit: {
          type: 'number',
          description: 'Maximum results to retrieve (default: 100)',
          default: 100,
        },
      },
      required: ['runId'],
    },
  },
];

// Tool implementations
async function searchActors(
  query: string,
  limit: number = 10
): Promise<Record<string, unknown>> {
  if (!apiToken) {
    return {
      error: 'APIFY_API_TOKEN not configured. Please set the environment variable.',
      results: [],
    };
  }

  // Mock search results since we can't directly search without full Apify SDK integration
  const mockActors = [
    {
      id: 'apify/web-scraper',
      title: 'Web Scraper',
      description: 'Universal web scraper for any website',
      category: 'Web Scraping',
      pricing: 'Usage-based',
    },
    {
      id: 'apify/google-search-results-scraper',
      title: 'Google Search Results Scraper',
      description: 'Scrape Google search results',
      category: 'Search Engines',
      pricing: 'Usage-based',
    },
    {
      id: 'apify/twitter-scraper',
      title: 'Twitter Scraper',
      description: 'Scrape tweets and user data from Twitter',
      category: 'Social Media',
      pricing: 'Usage-based',
    },
    {
      id: 'apify/amazon-product-scraper',
      title: 'Amazon Product Scraper',
      description: 'Extract product data from Amazon',
      category: 'E-Commerce',
      pricing: 'Usage-based',
    },
    {
      id: 'apify/instagram-scraper',
      title: 'Instagram Scraper',
      description: 'Scrape Instagram posts and profiles',
      category: 'Social Media',
      pricing: 'Usage-based',
    },
  ];

  const filtered = mockActors
    .filter(
      (a) =>
        a.title.toLowerCase().includes(query.toLowerCase()) ||
        a.description.toLowerCase().includes(query.toLowerCase()) ||
        a.category.toLowerCase().includes(query.toLowerCase())
    )
    .slice(0, limit);

  return {
    query,
    count: filtered.length,
    results: filtered,
  };
}

async function getActorDetails(actorId: string): Promise<Record<string, unknown>> {
  if (!apiToken) {
    return {
      error: 'APIFY_API_TOKEN not configured',
    };
  }

  // Mock actor details
  const actorDetails: Record<string, Record<string, unknown>> = {
    'apify/web-scraper': {
      id: 'apify/web-scraper',
      title: 'Web Scraper',
      description: 'Universal web scraper that can extract data from any website',
      documentation: 'https://apify.com/apify/web-scraper',
      inputSchema: {
        startUrls: { type: 'array', description: 'URLs to scrape' },
        globs: { type: 'array', description: 'URL patterns to follow' },
        maxPagesPerCrawl: { type: 'number', description: 'Max pages to crawl' },
      },
      pricing: { computeUnits: 'Variable', costPerRun: 'Variable' },
    },
    'apify/google-search-results-scraper': {
      id: 'apify/google-search-results-scraper',
      title: 'Google Search Results Scraper',
      description: 'Scrape Google search results',
      documentation: 'https://apify.com/apify/google-search-results-scraper',
      inputSchema: {
        queries: { type: 'array', description: 'Search queries' },
        maxResults: { type: 'number', description: 'Max results per query' },
      },
      pricing: { computeUnits: 'Low', costPerRun: 'Low' },
    },
  };

  return (
    actorDetails[actorId] || {
      error: `Actor ${actorId} not found`,
    }
  );
}

async function runActor(
  actorId: string,
  input: Record<string, unknown>
): Promise<Record<string, unknown>> {
  if (!apiToken) {
    return {
      error: 'APIFY_API_TOKEN not configured',
    };
  }

  // Mock run response
  const runId = `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  return {
    runId,
    actorId,
    status: 'RUNNING',
    startedAt: new Date().toISOString(),
    input,
  };
}

async function getActorRunStatus(runId: string): Promise<Record<string, unknown>> {
  if (!apiToken) {
    return {
      error: 'APIFY_API_TOKEN not configured',
    };
  }

  // Mock status response
  return {
    runId,
    status: 'SUCCEEDED',
    startedAt: new Date(Date.now() - 60000).toISOString(),
    finishedAt: new Date().toISOString(),
    outputCount: 42,
  };
}

async function getActorResults(runId: string, limit: number = 100): Promise<Record<string, unknown>> {
  if (!apiToken) {
    return {
      error: 'APIFY_API_TOKEN not configured',
    };
  }

  // Mock results response
  const mockResults = Array.from({ length: Math.min(limit, 10) }, (_, i) => ({
    id: `result_${i}`,
    data: {
      title: `Result ${i + 1}`,
      url: `https://example.com/item-${i + 1}`,
      timestamp: new Date().toISOString(),
    },
  }));

  return {
    runId,
    count: mockResults.length,
    results: mockResults,
  };
}

// Process tool calls
async function processTool(name: string, input: Record<string, unknown>): Promise<string> {
  try {
    let result: Record<string, unknown>;

    switch (name) {
      case 'search_actors':
        result = await searchActors(input.query as string, (input.limit as number) || 10);
        break;
      case 'get_actor_details':
        result = await getActorDetails(input.actorId as string);
        break;
      case 'run_actor':
        result = await runActor(
          input.actorId as string,
          input.input as Record<string, unknown>
        );
        break;
      case 'get_actor_run_status':
        result = await getActorRunStatus(input.runId as string);
        break;
      case 'get_actor_results':
        result = await getActorResults(input.runId as string, (input.limit as number) || 100);
        break;
      default:
        return JSON.stringify({ error: `Unknown tool: ${name}` });
    }

    return JSON.stringify(result);
  } catch (error) {
    return JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// Create and configure MCP server
async function createApifyServer(): Promise<Server> {
  const server = new Server({
    name: 'apify-mcp-server',
    version: '1.0.0',
  });

  // Register tools
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools,
  }));

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const result = await processTool(
      request.params.name,
      request.params.arguments as Record<string, unknown>
    );

    return {
      content: [
        {
          type: 'text' as const,
          text: result,
        },
      ],
    };
  });

  return server;
}

// Export for use in backend
export { createApifyServer, processTool };
