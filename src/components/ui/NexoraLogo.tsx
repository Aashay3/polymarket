/**
 * NEXORA brand logos.
 *
 * Three variants, each fed from a PNG in /public/brand/ (drop the file
 * in there, done). Using plain <img> rather than next/image so we
 * don't pay the image-optimiser overhead on tiny always-on header
 * assets.
 *
 *   NexoraIcon     — square "N" mark only; use anywhere compact.
 *   NexoraWordmark — horizontal "nexora" wordmark; use in the nav.
 *   NexoraLogoFull — stacked icon + wordmark; use on hero / auth pages.
 */

interface LogoProps {
  size?: number;
  className?: string;
}

export function NexoraIcon({ size = 32, className = "" }: LogoProps) {
  return (
    <img
      src="/brand/nexora-icon.png"
      alt="Nexora"
      width={size}
      height={size}
      className={`select-none object-contain ${className}`}
      draggable={false}
    />
  );
}

/**
 * Horizontal wordmark used in the navbar (md+).
 * `size` controls the rendered height; width scales to preserve the
 * ~4:1 aspect ratio of the asset.
 */
export function NexoraWordmark({
  className = "",
  size = 26,
}: LogoProps) {
  return (
    <img
      src="/brand/nexora-wordmark.png"
      alt="Nexora"
      height={size}
      // Width set via style so the browser can scale proportionally
      // even before the asset has loaded — prevents layout shift.
      style={{ height: size, width: "auto" }}
      className={`select-none object-contain ${className}`}
      draggable={false}
    />
  );
}

/**
 * Stacked icon + wordmark. For auth pages / hero placements where the
 * brand needs room to breathe.
 */
export function NexoraLogoFull({ size = 96, className = "" }: LogoProps) {
  return (
    <img
      src="/brand/nexora-full.png"
      alt="Nexora"
      width={size}
      height={size}
      className={`select-none object-contain ${className}`}
      draggable={false}
    />
  );
}
