import React, { useState } from 'react';
import { Search, Loader, AlertCircle, CheckCircle, Play } from 'lucide-react';

interface Actor {
  id: string;
  title: string;
  description: string;
  category: string;
  pricing: string;
}

interface SearchResult {
  query: string;
  count: number;
  results: Actor[];
}

interface ActorRun {
  runId: string;
  actorId: string;
  status: string;
  startedAt: string;
  input: Record<string, unknown>;
}

export const ApifySearch: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [selectedActor, setSelectedActor] = useState<Actor | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [runs, setRuns] = useState<ActorRun[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [actorInput, setActorInput] = useState<Record<string, unknown>>({});

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setError('Please enter a search query');
      return;
    }

    setIsSearching(true);
    setError(null);
    setSelectedActor(null);

    try {
      const response = await fetch(`${API_BASE_URL}/apify/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery, limit: 10 }),
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const data = await response.json();
      setSearchResults(data);

      if (data.count === 0) {
        setError('No actors found matching your search');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectActor = async (actor: Actor) => {
    setSelectedActor(actor);
    setError(null);
    setActorInput({});

    // Fetch actor details
    try {
      const response = await fetch(`${API_BASE_URL}/apify/actors/${actor.id}`);
      if (!response.ok) throw new Error('Failed to fetch actor details');

      const details = await response.json();
      setSelectedActor((prev) => (prev ? { ...prev, ...details } : null));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch actor details');
    }
  };

  const handleRunActor = async () => {
    if (!selectedActor) return;

    setIsRunning(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/apify/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actorId: selectedActor.id,
          input: actorInput || {},
        }),
      });

      if (!response.ok) {
        throw new Error(`Run failed: ${response.statusText}`);
      }

      const run = await response.json();
      setRuns([run, ...runs]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run actor');
    } finally {
      setIsRunning(false);
    }
  };

  const handleViewResults = async (run: ActorRun) => {
    try {
      const response = await fetch(`${API_BASE_URL}/apify/runs/${run.runId}/results`);
      if (!response.ok) throw new Error('Failed to fetch results');

      const data = await response.json();
      alert(`Results (${data.count} items):\n${JSON.stringify(data.results.slice(0, 3), null, 2)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch results');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-eli-light to-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-eli-blue mb-2">Apify MCP Search</h1>
          <p className="text-gray-600">
            Search for Apify Actors to scrape web data and automate workflows
          </p>
        </div>

        {/* Search Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search actors (e.g., 'web scraper', 'social media', 'e-commerce')"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-eli-blue"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="btn-primary px-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSearching ? <Loader size={20} className="animate-spin" /> : <Search size={20} />}
              Search
            </button>
          </form>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
              <AlertCircle className="text-red-600" size={20} />
              <p className="text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Results Grid */}
        {searchResults && searchResults.count > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Search Results */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold text-eli-blue mb-4">
                  Found {searchResults.count} actors
                </h2>
                <div className="space-y-3">
                  {searchResults.results.map((actor) => (
                    <div
                      key={actor.id}
                      onClick={() => handleSelectActor(actor)}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition ${
                        selectedActor?.id === actor.id
                          ? 'border-eli-blue bg-eli-light'
                          : 'border-gray-200 hover:border-eli-gold'
                      }`}
                    >
                      <h3 className="font-semibold text-lg text-eli-blue">{actor.title}</h3>
                      <p className="text-gray-600 text-sm mt-1">{actor.description}</p>
                      <div className="flex gap-2 mt-2">
                        <span className="inline-block px-2 py-1 bg-eli-gold/20 text-eli-blue text-xs rounded">
                          {actor.category}
                        </span>
                        <span className="inline-block px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded">
                          {actor.pricing}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Actor Details & Run */}
            {selectedActor && (
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow-md p-6 sticky top-8">
                  <h3 className="text-xl font-bold text-eli-blue mb-4">{selectedActor.title}</h3>
                  <p className="text-gray-600 text-sm mb-4">{selectedActor.description}</p>

                  {/* Input Parameters */}
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Input Parameters (JSON)
                    </label>
                    <textarea
                      value={JSON.stringify(actorInput, null, 2)}
                      onChange={(e) => {
                        try {
                          setActorInput(JSON.parse(e.target.value));
                        } catch {
                          // Keep invalid JSON as-is
                        }
                      }}
                      placeholder='{"key": "value"}'
                      rows={4}
                      className="w-full p-3 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-eli-blue"
                    />
                  </div>

                  {/* Run Button */}
                  <button
                    onClick={handleRunActor}
                    disabled={isRunning}
                    className="btn-primary w-full mb-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isRunning ? (
                      <Loader size={20} className="animate-spin" />
                    ) : (
                      <Play size={20} />
                    )}
                    {isRunning ? 'Running...' : 'Run Actor'}
                  </button>

                  {/* Run History */}
                  {runs.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <h4 className="font-semibold text-gray-700 mb-3">Recent Runs</h4>
                      <div className="space-y-2">
                        {runs.slice(0, 3).map((run) => (
                          <div
                            key={run.runId}
                            className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                {run.status === 'SUCCEEDED' ? (
                                  <CheckCircle size={16} className="text-green-600" />
                                ) : (
                                  <Loader size={16} className="text-blue-600 animate-spin" />
                                )}
                                <span className="text-xs font-mono text-gray-600 truncate">
                                  {run.runId}
                                </span>
                              </div>
                              <button
                                onClick={() => handleViewResults(run)}
                                className="text-xs text-eli-blue hover:underline"
                              >
                                View
                              </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(run.startedAt).toLocaleString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!searchResults && (
          <div className="text-center py-12">
            <Search size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">
              Search for Apify Actors to get started
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApifySearch;
