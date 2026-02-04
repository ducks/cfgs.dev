"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";

interface UserResult {
  id: string;
  username: string;
  avatar_url: string | null;
  provider: string;
  claimed: boolean;
  dotfiles_url: string | null;
  tools: Array<{ name: string; category: string }>;
  toolCount: number;
}

interface ToolResult {
  tool_id: string;
  name: string;
  category: string;
  count: number;
}

interface SearchResults {
  type: "tools" | "mixed" | "empty";
  query: string;
  matchedTools?: string[];
  results?: UserResult[];
  users?: UserResult[];
  tools?: ToolResult[];
}

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const doSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults(null);
      setSearched(false);
      return;
    }

    setLoading(true);
    setSearched(true);

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setResults(data);
    } catch (error) {
      console.error("Search failed:", error);
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Search on initial load if query param exists
  useEffect(() => {
    if (initialQuery) {
      doSearch(initialQuery);
    }
  }, [initialQuery, doSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Update URL with query
    router.push(`/search?q=${encodeURIComponent(query)}`);
    doSearch(query);
  };

  const users = results?.type === "tools" ? results.results : results?.users;
  const tools = results?.type === "mixed" ? results.tools : [];

  return (
    <>
      <form onSubmit={handleSubmit} className="mt-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="neovim, tmux, hyprland..."
            className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-zinc-900 px-6 py-2 font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {loading ? "..." : "Search"}
          </button>
        </div>
      </form>

      {/* Tool match indicator */}
      {results?.type === "tools" && results.matchedTools && results.matchedTools.length > 0 && (
        <div className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
          Showing users with:{" "}
          {results.matchedTools.map((tool, i) => (
            <span key={tool}>
              <span className="font-medium text-zinc-900 dark:text-zinc-100">{tool}</span>
              {i < results.matchedTools!.length - 1 && " + "}
            </span>
          ))}
        </div>
      )}

      {/* Results */}
      {searched && !loading && (
        <div className="mt-8">
          {/* Users section */}
          {users && users.length > 0 && (
            <div>
              <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Users</h2>
              <div className="mt-4 space-y-3">
                {users.map((user) => (
                  <Link
                    key={user.id}
                    href={`/${user.username}`}
                    className="flex items-center gap-4 rounded-lg border border-zinc-200 p-4 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
                  >
                    {user.avatar_url && (
                      <img
                        src={user.avatar_url}
                        alt={user.username}
                        className="h-10 w-10 rounded-full"
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{user.username}</span>
                        {user.provider === "github" && (
                          <svg className="h-4 w-4 text-zinc-400" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                          </svg>
                        )}
                        {user.claimed && (
                          <span title="Verified owner" className="text-blue-500">
                            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {user.tools.map((tool) => (
                          <span
                            key={tool.name}
                            className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs dark:bg-zinc-800"
                          >
                            {tool.name}
                          </span>
                        ))}
                        {user.toolCount > 6 && (
                          <span className="text-xs text-zinc-500">
                            +{user.toolCount - 6} more
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Tools section (for mixed search) */}
          {tools && tools.length > 0 && (
            <div className={users && users.length > 0 ? "mt-8" : ""}>
              <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Tools</h2>
              <div className="mt-4 space-y-2">
                {tools.map((tool) => {
                  const toolSlug = tool.tool_id.split(".")[1];
                  return (
                    <Link
                      key={tool.tool_id}
                      href={`/browse/${tool.category}/${toolSlug}`}
                      className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
                    >
                      <div>
                        <div className="font-medium">{tool.name}</div>
                        <div className="text-sm text-zinc-500">{tool.category}</div>
                      </div>
                      <div className="text-sm text-zinc-500">
                        {tool.count} {tool.count === 1 ? "user" : "users"}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* No results */}
          {(!users || users.length === 0) && (!tools || tools.length === 0) && (
            <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
              <p className="text-zinc-600 dark:text-zinc-400">
                No results found for &quot;{results?.query}&quot;
              </p>
              <p className="mt-2 text-sm text-zinc-500">
                Try searching for a tool name like &quot;neovim&quot; or &quot;hyprland&quot;
              </p>
            </div>
          )}
        </div>
      )}

      {/* Help text when no search yet */}
      {!searched && (
        <div className="mt-8 rounded-lg border border-dashed border-zinc-300 p-8 dark:border-zinc-700">
          <h3 className="font-medium text-zinc-900 dark:text-zinc-100">Search tips</h3>
          <ul className="mt-3 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
            <li><strong>Single tool:</strong> &quot;neovim&quot; - find all Neovim users</li>
            <li><strong>Multiple tools:</strong> &quot;neovim + tmux&quot; - find users with both</li>
            <li><strong>Username:</strong> &quot;tpope&quot; - find a specific user</li>
            <li><strong>Natural:</strong> &quot;hyprland waybar&quot; - works too</li>
          </ul>
        </div>
      )}
    </>
  );
}

export default function SearchPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold">Search</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Search for users or tools. Try &quot;neovim + tmux&quot; or a username.
      </p>

      <Suspense fallback={<div className="mt-6 animate-pulse h-10 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />}>
        <SearchContent />
      </Suspense>
    </div>
  );
}
