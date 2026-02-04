import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserByUsername, getDetectionsForUser, getLatestScanForUser } from "@/lib/db";
import { ScanForm } from "./ScanForm";

interface Props {
  params: Promise<{ username: string }>;
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params;
  const session = await auth();
  const user = getUserByUsername(username);

  if (!user) {
    notFound();
  }

  const isOwner = session?.user?.username === username;
  const detections = getDetectionsForUser(user.id);
  const latestScan = getLatestScanForUser(user.id);

  // Group detections by category
  const byCategory = new Map<string, typeof detections>();
  for (const detection of detections) {
    const existing = byCategory.get(detection.category) || [];
    existing.push(detection);
    byCategory.set(detection.category, existing);
  }

  const categoryOrder = [
    "terminal",
    "shell",
    "editor",
    "wm",
    "multiplexer",
    "prompt",
    "bar",
    "launcher",
    "notifications",
  ];

  const sortedCategories = [...byCategory.keys()].sort((a, b) => {
    const aIndex = categoryOrder.indexOf(a);
    const bIndex = categoryOrder.indexOf(b);
    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        {user.avatar_url && (
          <img
            src={user.avatar_url}
            alt={user.username}
            className="h-16 w-16 rounded-full"
          />
        )}
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            {user.username}
            {user.claimed && (
              <span title="Verified owner" className="text-blue-500">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
            )}
          </h1>
          {user.name && (
            <p className="text-zinc-600 dark:text-zinc-400">{user.name}</p>
          )}
          {user.dotfiles_url && (
            <a
              href={user.dotfiles_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              <svg
                className="h-4 w-4"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              dotfiles
            </a>
          )}
        </div>
      </div>

      {/* Scan form for owner */}
      {isOwner && (
        <div className="mt-8 rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
          <h2 className="font-semibold">Scan your dotfiles</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Enter the URL to your dotfiles repository to detect your tools
          </p>
          <ScanForm currentUrl={user.dotfiles_url} />
          {latestScan && (
            <p className="mt-4 text-xs text-zinc-500">
              Last scanned: {new Date(latestScan.created_at).toLocaleString()}
              {latestScan.status === "completed" && (
                <span>
                  {" "}
                  ({latestScan.files_scanned} files, {latestScan.duration_ms}ms)
                </span>
              )}
            </p>
          )}
        </div>
      )}

      {/* Detected tools */}
      {detections.length > 0 ? (
        <div className="mt-8">
          <h2 className="text-xl font-semibold">Setup</h2>
          <div className="mt-4 space-y-6">
            {sortedCategories.map((category) => {
              const items = byCategory.get(category) || [];
              return (
                <div key={category}>
                  <h3 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
                    {category}
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-3">
                    {items.map((item) => {
                      const details = item.details
                        ? JSON.parse(item.details)
                        : null;
                      return (
                        <div
                          key={item.id}
                          className="min-w-[200px] flex-1 basis-64 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
                        >
                          <div className="font-medium">{item.name}</div>
                          {details && Object.keys(details).length > 0 && (
                            <div className="mt-2 space-y-1">
                              {Object.entries(details).map(([key, value]) => (
                                <div
                                  key={key}
                                  className="text-sm text-zinc-600 dark:text-zinc-400"
                                >
                                  <span className="text-zinc-400 dark:text-zinc-500">
                                    {key}:
                                  </span>{" "}
                                  {value as string}
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="mt-2 text-xs text-zinc-400">
                            {item.confidence} confidence
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="mt-8 rounded-lg border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
          <p className="text-zinc-600 dark:text-zinc-400">
            {isOwner
              ? "No tools detected yet. Scan your dotfiles to get started."
              : "This user hasn't scanned their dotfiles yet."}
          </p>
        </div>
      )}
    </div>
  );
}
