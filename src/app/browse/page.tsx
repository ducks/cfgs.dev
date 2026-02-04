import Link from "next/link";
import { getAllUsers, getDetectionsForUser, getToolStats } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function BrowsePage() {
  const users = getAllUsers(50);
  const toolStats = getToolStats();

  // Get users with detections
  const usersWithSetups = users
    .map((user) => {
      const detections = getDetectionsForUser(user.id);
      return { user, detections };
    })
    .filter(({ detections }) => detections.length > 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold">Browse Setups</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Discover what tools developers are using
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        {/* Main content - user list */}
        <div className="lg:col-span-2">
          <h2 className="font-semibold">Recent Setups</h2>
          {usersWithSetups.length > 0 ? (
            <div className="mt-4 space-y-4">
              {usersWithSetups.map(({ user, detections }) => {
                // Group by category for preview
                const categories = new Set(detections.map((d) => d.category));
                const preview = detections.slice(0, 4);

                return (
                  <div
                    key={user.id}
                    className="rounded-lg border border-zinc-200 p-4 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
                  >
                    <div className="flex items-center gap-3">
                      {user.avatar_url && (
                        <img
                          src={user.avatar_url}
                          alt={user.username}
                          className="h-10 w-10 rounded-full"
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Link href={`/${user.username}`} className="font-medium hover:underline">
                            {user.username}
                          </Link>
                          {user.provider === "github" && (
                            <svg className="h-4 w-4 text-zinc-400" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                            </svg>
                          )}
                          {user.provider === "gitlab" && (
                            <svg className="h-4 w-4 text-zinc-400" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 0 1-.3-.94l1.22-3.78 2.44-7.51A.42.42 0 0 1 4.82 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.49h8.1l2.44-7.51A.42.42 0 0 1 18.6 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.51L23 13.45a.84.84 0 0 1-.35.94z" />
                            </svg>
                          )}
                        </div>
                        <div className="text-sm text-zinc-500">
                          {detections.length} tools across {categories.size}{" "}
                          categories
                        </div>
                      </div>
                      {user.dotfiles_url && (
                        <a
                          href={user.dotfiles_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                        >
                          repo &rarr;
                        </a>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {preview.map((d) => (
                        <span
                          key={d.id}
                          className="rounded-full bg-zinc-100 px-2 py-1 text-xs dark:bg-zinc-800"
                        >
                          {d.name}
                        </span>
                      ))}
                      {detections.length > 4 && (
                        <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs text-zinc-500 dark:bg-zinc-800">
                          +{detections.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 rounded-lg border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
              <p className="text-zinc-600 dark:text-zinc-400">
                No setups yet. Be the first to scan your dotfiles!
              </p>
              <Link
                href="/login"
                className="mt-4 inline-block rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                Get started
              </Link>
            </div>
          )}
        </div>

        {/* Sidebar - tool stats */}
        <div>
          <h2 className="font-semibold">Popular Tools</h2>
          {toolStats.length > 0 ? (
            <div className="mt-4 space-y-2">
              {toolStats.slice(0, 10).map((tool) => {
                const toolSlug = tool.tool_id.split(".")[1];
                return (
                  <Link
                    key={tool.tool_id}
                    href={`/browse/${tool.category}/${toolSlug}`}
                    className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
                  >
                    <div>
                      <div className="text-sm font-medium">{tool.name}</div>
                      <div className="text-xs text-zinc-500">{tool.category}</div>
                    </div>
                    <div className="text-sm text-zinc-500">
                      {tool.count} {tool.count === 1 ? "user" : "users"}
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="mt-4 text-sm text-zinc-500">
              No tools detected yet
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
