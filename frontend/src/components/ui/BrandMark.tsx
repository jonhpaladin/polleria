interface BrandMarkProps {
  className?: string;
}

/** Mascota de la marca: pollo caricatura del letrero, en SVG para no depender de un raster. */
export function BrandMark({ className }: BrandMarkProps) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={className}>
      <circle cx="32" cy="35" r="19" fill="#fff" stroke="#b71c1c" strokeWidth="3" />
      <path
        d="M20 17c1-6 5-8 7-3 2-5 6-6 7 0 3-3 7-1 6 4-5-2-15-3-20-1Z"
        fill="#d32f2f"
      />
      <path
        d="M41 34l11 5-11 5V34Z"
        fill="#fbc02d"
        stroke="#a16207"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="27" cy="31" r="2.6" fill="#1c1917" />
      <circle cx="37" cy="31" r="2.6" fill="#1c1917" />
      <circle cx="23" cy="35" r="1.6" fill="#fecaca" />
      <circle cx="41" cy="35" r="1.6" fill="#fecaca" />
      <path
        d="M29 45c2 3 4 3 6 0"
        stroke="#d32f2f"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}
