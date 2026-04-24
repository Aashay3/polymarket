/**
 * Inline SVG crypto icons.
 *
 * Bundled, no external fetch. Each is a branded circle with the token's
 * canonical monogram — recognisable at a glance, trademark-safe
 * (they're our stylised renderings, not Circle/Tether/Bitcoin official
 * logos which have usage restrictions).
 *
 * Add new tokens by extending TOKENS + TOKEN_SPEC.
 */

import type { SVGProps } from "react";

export type CryptoSymbol = "USDC" | "USDT" | "DAI" | "ETH" | "BTC" | "MATIC" | "POL";

interface TokenSpec {
  name: string;
  bg: string;   // circle fill
  fg: string;   // glyph fill
  glyph: React.ReactNode; // centered element (text or path)
}

const GLYPH_TEXT = (
  t: string,
  opts: { size?: number; weight?: number; dy?: number } = {},
) => (
  <text
    x="16"
    y="16"
    textAnchor="middle"
    dominantBaseline="central"
    fontSize={opts.size ?? 14}
    fontWeight={opts.weight ?? 900}
    fontFamily="system-ui, -apple-system, sans-serif"
    dy={opts.dy}
  >
    {t}
  </text>
);

const TOKEN_SPEC: Record<CryptoSymbol, TokenSpec> = {
  USDC: { name: "USD Coin",  bg: "#2775CA", fg: "#FFFFFF", glyph: GLYPH_TEXT("$", { size: 18 }) },
  USDT: { name: "Tether",    bg: "#26A17B", fg: "#FFFFFF", glyph: GLYPH_TEXT("₮", { size: 18 }) },
  DAI:  { name: "Dai",       bg: "#F5AC37", fg: "#FFFFFF", glyph: GLYPH_TEXT("◈", { size: 16 }) },
  ETH:  { name: "Ethereum",  bg: "#627EEA", fg: "#FFFFFF", glyph: GLYPH_TEXT("Ξ", { size: 18 }) },
  BTC:  { name: "Bitcoin",   bg: "#F7931A", fg: "#FFFFFF", glyph: GLYPH_TEXT("₿", { size: 18 }) },
  MATIC:{ name: "Polygon",   bg: "#8247E5", fg: "#FFFFFF", glyph: GLYPH_TEXT("M", { size: 14 }) },
  POL:  { name: "Polygon",   bg: "#8247E5", fg: "#FFFFFF", glyph: GLYPH_TEXT("P", { size: 14 }) },
};

export function CryptoIcon({
  symbol,
  size = 24,
  className = "",
  ...rest
}: {
  symbol: CryptoSymbol;
  size?: number;
  className?: string;
} & Omit<SVGProps<SVGSVGElement>, "ref">) {
  const spec = TOKEN_SPEC[symbol];
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label={spec.name}
      role="img"
      {...rest}
    >
      <circle cx="16" cy="16" r="16" fill={spec.bg} />
      <g fill={spec.fg}>{spec.glyph}</g>
    </svg>
  );
}

export function getTokenName(symbol: CryptoSymbol): string {
  return TOKEN_SPEC[symbol].name;
}
