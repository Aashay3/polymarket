// NEXORA brand SVG logo mark — solid inline fills, always visible on dark bg
export function NexoraIcon({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Left zigzag blade */}
      <path d="M6 40 L18 20 L26 30 L20 40Z" fill="#FF541B" />
      {/* Right upward arrow body */}
      <path d="M22 36 L32 12 L44 12 L44 19 L36 19 L26 40Z" fill="#FF7A3D" />
      {/* Arrow tip highlight */}
      <path d="M32 12 L44 12 L38 6Z" fill="#FFB07A" />
      {/* Inner highlight slash */}
      <path d="M24 28 L30 16 L34 16 L28 28Z" fill="white" opacity="0.22" />
    </svg>
  );
}

export function NexoraWordmark({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <NexoraIcon size={30} />
      <span
        className="font-black tracking-[0.14em] text-white uppercase select-none"
        style={{
          fontSize: "1.05rem",
        }}
      >
        NEXORA
      </span>
    </div>
  );
}
