"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  currentUrl: string | null;
}

export function ScanForm({ currentUrl }: Props) {
  const router = useRouter();
  const [url, setUrl] = useState(currentUrl || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    filesScanned: number;
    toolsDetected: number;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl: url }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error types with helpful messages
        if (response.status === 429) {
          if (data.message?.includes("concurrent")) {
            throw new Error("You have too many scans running. Please wait for them to finish.");
          }
          const resetTime = data.resetAt ? new Date(data.resetAt).toLocaleTimeString() : "later";
          throw new Error(`Rate limit exceeded. Try again at ${resetTime}.`);
        }
        if (response.status === 404) {
          throw new Error("Repository not found. Make sure the URL is correct and the repo is public.");
        }
        if (response.status === 403) {
          throw new Error("Cannot access repository. It may be private or require authentication.");
        }
        if (response.status === 408) {
          throw new Error("Repository took too long to clone. Try a smaller repository.");
        }

        throw new Error(data.error || data.message || "Scan failed");
      }

      setResult({
        filesScanned: data.scan.filesScanned,
        toolsDetected: data.tools.length,
      });

      // Refresh the page to show new detections
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4">
      <div className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://github.com/username/dotfiles"
          className="flex-1 rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {loading ? "Scanning..." : "Scan"}
        </button>
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {result && (
        <p className="mt-2 text-sm text-green-600 dark:text-green-400">
          Scanned {result.filesScanned} files, detected {result.toolsDetected}{" "}
          tools
        </p>
      )}
    </form>
  );
}
