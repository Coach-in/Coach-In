import { ICON } from "./icons";

export function Icon({ path, size = 16 }: { path: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  );
}

export const inputClass =
  "px-3 py-2.5 rounded-lg bg-navy-800 border border-gold-border text-ink text-sm placeholder-ink-muted focus:outline-none focus:border-gold transition-colors";
export const labelClass = "text-[0.7rem] font-semibold text-ink-muted tracking-wide uppercase";
