import { Router, Request, Response } from 'express';
import { processTool } from '../mcp/apify-mcp-server.js';

const router = Router();

interface ToolRequest {
  tool: string;
  input: Record<string, unknown>;
}

// Search Actors
router.post('/search', async (req: Request, res: Response) => {
  try {
    const { query, limit } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    const result = await processTool('search_actors', {
      query,
      limit: limit || 10,
    });

    res.json(JSON.parse(result));
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

// Get Actor Details
router.get('/actors/:actorId', async (req: Request, res: Response) => {
  try {
    const { actorId } = req.params;

    if (!actorId) {
      return res.status(400).json({ error: 'Actor ID is required' });
    }

    const result = await processTool('get_actor_details', {
      actorId,
    });

    res.json(JSON.parse(result));
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

// Run Actor
router.post('/run', async (req: Request, res: Response) => {
  try {
    const { actorId, input, maxResults } = req.body;

    if (!actorId || !input) {
      return res.status(400).json({
        error: 'actorId and input parameters are required',
      });
    }

    const result = await processTool('run_actor', {
      actorId,
      input,
      maxResults: maxResults || 1000,
    });

    res.json(JSON.parse(result));
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

// Get Run Status
router.get('/runs/:runId/status', async (req: Request, res: Response) => {
  try {
    const { runId } = req.params;

    if (!runId) {
      return res.status(400).json({ error: 'Run ID is required' });
    }

    const result = await processTool('get_actor_run_status', {
      runId,
    });

    res.json(JSON.parse(result));
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

// Get Run Results
router.get('/runs/:runId/results', async (req: Request, res: Response) => {
  try {
    const { runId } = req.params;
    const { limit } = req.query;

    if (!runId) {
      return res.status(400).json({ error: 'Run ID is required' });
    }

    const result = await processTool('get_actor_results', {
      runId,
      limit: limit ? parseInt(limit as string) : 100,
    });

    res.json(JSON.parse(result));
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

// Execute generic MCP tool (for future extensibility)
router.post('/tool', async (req: Request, res: Response) => {
  try {
    const { tool, input }: ToolRequest = req.body;

    if (!tool || !input) {
      return res.status(400).json({
        error: 'tool and input parameters are required',
      });
    }

    const result = await processTool(tool, input);
    res.json(JSON.parse(result));
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

export default router;
