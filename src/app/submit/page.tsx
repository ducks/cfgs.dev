"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SubmitPage() {
  const router = useRouter();
  const [repoUrl, setRepoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to scan repository");
        return;
      }

      // Redirect to the user's profile
      router.push(`/${data.username}`);
    } catch {
      setError("Failed to submit. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-2xl font-bold">Submit a Setup</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Enter a public dotfiles repository URL to add it to cfgs.dev.
        You don't need to be the owner.
      </p>

      <form onSubmit={handleSubmit} className="mt-8">
        <label htmlFor="repoUrl" className="block text-sm font-medium">
          Repository URL
        </label>
        <input
          type="url"
          id="repoUrl"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          placeholder="https://github.com/username/dotfiles"
          required
          className="mt-2 w-full rounded-lg border border-zinc-300 px-4 py-2 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
        />
        <p className="mt-2 text-sm text-zinc-500">
          Supports GitHub and GitLab repositories
        </p>

        {error && (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-6 rounded-lg bg-zinc-900 px-6 py-2 font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {loading ? "Scanning..." : "Submit"}
        </button>
      </form>

      <div className="mt-12 rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
        <h2 className="font-semibold">How it works</h2>
        <ul className="mt-4 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
          <li>1. We clone the repository and scan for config files</li>
          <li>2. We detect tools like Neovim, Zsh, Hyprland, etc.</li>
          <li>3. A profile page is created for the repository owner</li>
          <li>4. The owner can claim their profile by logging in</li>
        </ul>
      </div>
    </div>
  );
}
