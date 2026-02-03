import Link from "next/link";
import { notFound } from "next/navigation";
import { getUsersByTool, getToolInfo } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ToolPage({
  params,
}: {
  params: Promise<{ category: string; tool: string }>;
}) {
  const { category, tool } = await params;
  const toolId = `${category}.${tool}`;
  const toolInfo = getToolInfo(toolId);

  if (!toolInfo) {
    notFound();
  }

  const users = getUsersByTool(toolId);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-4">
        <Link
          href={`/browse/${category}`}
          className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          &larr; Back to {category}
        </Link>
      </div>

      <h1 className="text-2xl font-bold">{toolInfo.name}</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        {users.length} {users.length === 1 ? "developer uses" : "developers use"}{" "}
        {toolInfo.name}
      </p>

      {users.length > 0 ? (
        <div className="mt-6 space-y-3">
          {users.map((user) => {
            const details = user.details ? JSON.parse(user.details) : null;
            return (
              <Link
                key={user.id}
                href={`/${user.username}`}
                className="flex items-center gap-4 rounded-lg border border-zinc-200 px-4 py-3 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
              >
                {user.avatar_url && (
                  <img
                    src={user.avatar_url}
                    alt={user.username}
                    className="h-10 w-10 rounded-full"
                  />
                )}
                <div className="flex-1">
                  <div className="font-medium">{user.username}</div>
                  {details && Object.keys(details).length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-2">
                      {Object.entries(details).map(([key, value]) => (
                        <span
                          key={key}
                          className="text-xs text-zinc-500"
                        >
                          {key}: {String(value)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="mt-6 rounded-lg border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
          <p className="text-zinc-600 dark:text-zinc-400">
            No users have been detected using {toolInfo.name} yet.
          </p>
        </div>
      )}
    </div>
  );
}
