/**
 * Inline crypto icons. Each token can either render as a stylised
 * SVG monogram (default) or as a PNG image at `public/brand/coins/<id>.png`
 * when `image` is set on its spec — useful for swapping in a 3D coin
 * render that's nicer than the flat circle.
 *
 * Add new tokens by extending CryptoSymbol + TOKEN_SPEC.
 */

import type { SVGProps } from "react";

export type CryptoSymbol = "USDC" | "USDT" | "DAI" | "ETH" | "BTC" | "MATIC" | "POL";

interface TokenSpec {
  name: string;
  bg: string;   // circle fill (SVG mode) / fallback bg (image mode)
  fg: string;   // glyph fill
  glyph: React.ReactNode; // centered element (text or path)
  /** Public-folder path to a custom artwork image. When set, the
   *  component renders an <img> instead of the SVG monogram. */
  image?: string;
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
  USDC: { name: "USD Coin",  bg: "#2775CA", fg: "#FFFFFF", glyph: GLYPH_TEXT("$", { size: 18 }), image: "/brand/coins/usdc.png" },
  USDT: { name: "Tether",    bg: "#26A17B", fg: "#FFFFFF", glyph: GLYPH_TEXT("₮", { size: 18 }), image: "/brand/coins/usdt.png" },
  DAI:  { name: "Dai",       bg: "#F5AC37", fg: "#FFFFFF", glyph: GLYPH_TEXT("◈", { size: 16 }), image: "/brand/coins/dai.png" },
  ETH:  { name: "Ethereum",  bg: "#627EEA", fg: "#FFFFFF", glyph: GLYPH_TEXT("Ξ", { size: 18 }), image: "/brand/coins/etherum.png" },
  BTC:  { name: "Bitcoin",   bg: "#F7931A", fg: "#FFFFFF", glyph: GLYPH_TEXT("₿", { size: 18 }), image: "/brand/coins/bitcoin.png" },
  MATIC:{ name: "Polygon",   bg: "#8247E5", fg: "#FFFFFF", glyph: GLYPH_TEXT("M", { size: 14 }), image: "/brand/coins/polygon.png" },
  POL:  { name: "Polygon",   bg: "#8247E5", fg: "#FFFFFF", glyph: GLYPH_TEXT("P", { size: 14 }), image: "/brand/coins/polygon.png" },
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

  // Image mode — render the artwork PNG inside an <svg> via <image> so
  // the component still returns an SVGSVGElement (callers may rely on
  // that). The PNG carries its own appearance; no colored circle sits
  // behind it.
  if (spec.image) {
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
        <image
          href={spec.image}
          x="0"
          y="0"
          width="32"
          height="32"
          preserveAspectRatio="xMidYMid meet"
        />
      </svg>
    );
  }

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
