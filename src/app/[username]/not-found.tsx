import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">User not found</h1>
      <p className="mt-4 text-zinc-600 dark:text-zinc-400">
        This user doesn&apos;t exist or hasn&apos;t signed up yet.
      </p>
      <Link
        href="/browse"
        className="mt-8 inline-block rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        Browse setups
      </Link>
    </div>
  );
}
