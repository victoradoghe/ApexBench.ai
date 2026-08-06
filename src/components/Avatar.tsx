import { PROVIDER_COLORS } from "@/data/models";

/** Provider mark. `color` overrides the registry palette, so arena
    providers (which are a different set from the model registry's)
    can pass their own from arena.ts without a second component. */
export default function Avatar({
  provider,
  size = 36,
  fontSize = 14,
  color,
}: {
  provider: string;
  size?: number;
  fontSize?: number;
  color?: string;
}) {
  const c = color ?? PROVIDER_COLORS[provider] ?? "#10b981";
  return (
    <span
      className="grid shrink-0 place-items-center rounded-lg font-mono font-bold"
      style={{
        height: size,
        width: size,
        fontSize,
        background: `${c}1f`,
        color: c,
        border: `1px solid ${c}3a`,
      }}
    >
      {provider[0]}
    </span>
  );
}
