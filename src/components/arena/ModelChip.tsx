import Link from "next/link";
import Avatar from "@/components/Avatar";
import { modelKey, providerColor } from "@/data/arena";

/** An arena competitor, rendered consistently everywhere it appears:
    provider mark, name, and (optionally) the provider underneath.
    Links to the competitor page unless `link` is false. */
export default function ModelChip({
  name,
  provider,
  slug,
  size = 32,
  showProvider = true,
  link = true,
  muted = false,
}: {
  name: string;
  provider: string;
  slug: string;
  size?: number;
  showProvider?: boolean;
  link?: boolean;
  muted?: boolean;
}) {
  const inner = (
    <span className="flex min-w-0 items-center gap-2.5">
      <Avatar provider={provider} size={size} fontSize={size * 0.42} color={providerColor(provider)} />
      <span className="min-w-0">
        <span
          className={`block truncate text-sm font-semibold ${muted ? "text-t3" : "text-t1"}`}
        >
          {name}
        </span>
        {showProvider && (
          <span className="block truncate text-xs text-t4">{provider}</span>
        )}
      </span>
    </span>
  );

  if (!link) return inner;
  return (
    <Link
      href={`/competitors/${modelKey(slug)}/`}
      className="group min-w-0 transition hover:opacity-80"
    >
      {inner}
    </Link>
  );
}
