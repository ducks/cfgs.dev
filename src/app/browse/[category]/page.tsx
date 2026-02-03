import Link from "next/link";
import { notFound } from "next/navigation";
import { getToolsByCategory } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const tools = getToolsByCategory(category);

  if (tools.length === 0) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-4">
        <Link
          href="/browse"
          className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          &larr; Back to browse
        </Link>
      </div>

      <h1 className="text-2xl font-bold capitalize">{category}</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        {tools.length} {tools.length === 1 ? "tool" : "tools"} in this category
      </p>

      <div className="mt-6 space-y-2">
        {tools.map((tool) => (
          <Link
            key={tool.tool_id}
            href={`/browse/${category}/${tool.tool_id.split(".")[1]}`}
            className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
          >
            <span className="font-medium">{tool.name}</span>
            <span className="text-sm text-zinc-500">
              {tool.count} {tool.count === 1 ? "user" : "users"}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
