import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getToolStats } from "@/lib/db";

export default async function Home() {
  const session = await auth();

  // If logged in, redirect to their profile
  if (session?.user?.username) {
    redirect(`/${session.user.username}`);
  }

  // Get popular tools for the landing page
  const popularTools = getToolStats().slice(0, 8);

  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <div className="flex flex-col items-center text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          Developer Setups
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
          Discover what terminals, shells, editors, and window managers
          developers use. Connect your dotfiles and let us detect your setup
          automatically.
        </p>

        <div className="mt-10 flex gap-4">
          <Link
            href="/login"
            className="rounded-md bg-zinc-900 px-6 py-3 font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Connect your dotfiles
          </Link>
          <Link
            href="/browse"
            className="rounded-md border border-zinc-300 px-6 py-3 font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            Browse setups
          </Link>
        </div>
      </div>

      {popularTools.length > 0 && (
        <div className="mt-24">
          <h2 className="text-center text-2xl font-semibold">Popular Tools</h2>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {popularTools.map((tool) => (
              <div
                key={tool.tool_id}
                className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
              >
                <div className="font-medium">{tool.name}</div>
                <div className="mt-1 text-sm text-zinc-500">
                  {tool.count} {tool.count === 1 ? "user" : "users"}
                </div>
                <div className="mt-1 text-xs text-zinc-400">{tool.category}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-24">
        <h2 className="text-center text-2xl font-semibold">How it works</h2>
        <div className="mt-8 grid gap-8 sm:grid-cols-3">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-xl dark:bg-zinc-800">
              1
            </div>
            <h3 className="mt-4 font-medium">Sign in</h3>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Connect with GitHub, GitLab, or Codeberg
            </p>
          </div>
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-xl dark:bg-zinc-800">
              2
            </div>
            <h3 className="mt-4 font-medium">Link your dotfiles</h3>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Paste the URL to your dotfiles repository
            </p>
          </div>
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-xl dark:bg-zinc-800">
              3
            </div>
            <h3 className="mt-4 font-medium">Auto-detect</h3>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              We scan and detect your terminal, shell, editor, and more
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
