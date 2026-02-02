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
                  <Link
                    key={user.id}
                    href={`/${user.username}`}
                    className="block rounded-lg border border-zinc-200 p-4 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
                  >
                    <div className="flex items-center gap-3">
                      {user.avatar_url && (
                        <img
                          src={user.avatar_url}
                          alt={user.username}
                          className="h-10 w-10 rounded-full"
                        />
                      )}
                      <div>
                        <div className="font-medium">{user.username}</div>
                        <div className="text-sm text-zinc-500">
                          {detections.length} tools across {categories.size}{" "}
                          categories
                        </div>
                      </div>
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
                  </Link>
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
              {toolStats.slice(0, 10).map((tool) => (
                <div
                  key={tool.tool_id}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800"
                >
                  <div>
                    <div className="text-sm font-medium">{tool.name}</div>
                    <div className="text-xs text-zinc-500">{tool.category}</div>
                  </div>
                  <div className="text-sm text-zinc-500">
                    {tool.count} {tool.count === 1 ? "user" : "users"}
                  </div>
                </div>
              ))}
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
