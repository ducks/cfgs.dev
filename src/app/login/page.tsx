"use client";

import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-center text-2xl font-bold">Sign in to cfgs.dev</h1>
      <p className="mt-4 text-center text-zinc-600 dark:text-zinc-400">
        Connect your account to share your developer setup
      </p>

      <div className="mt-8 flex flex-col gap-4">
        <button
          onClick={() => signIn("github", { callbackUrl: "/" })}
          className="flex items-center justify-center gap-3 rounded-md border border-zinc-300 px-4 py-3 font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
            <path
              fillRule="evenodd"
              d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
              clipRule="evenodd"
            />
          </svg>
          Continue with GitHub
        </button>

        <button
          onClick={() => signIn("gitlab", { callbackUrl: "/" })}
          className="flex items-center justify-center gap-3 rounded-md border border-zinc-300 px-4 py-3 font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 01-.3-.94l1.22-3.78 2.44-7.51A.42.42 0 014.82 2a.43.43 0 01.58 0 .42.42 0 01.11.18l2.44 7.49h8.1l2.44-7.51A.42.42 0 0118.6 2a.43.43 0 01.58 0 .42.42 0 01.11.18l2.44 7.51L23 13.45a.84.84 0 01-.35.94z" />
          </svg>
          Continue with GitLab
        </button>
      </div>
    </div>
  );
}
