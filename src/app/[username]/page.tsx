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
          <h1 className="text-2xl font-bold">{user.username}</h1>
          {user.name && (
            <p className="text-zinc-600 dark:text-zinc-400">{user.name}</p>
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
                  <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((item) => {
                      const details = item.details
                        ? JSON.parse(item.details)
                        : null;
                      return (
                        <div
                          key={item.id}
                          className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
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
