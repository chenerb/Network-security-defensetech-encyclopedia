import type { CSSProperties, ReactNode } from 'react';
const paths: Record<string, ReactNode> = {
  shield: (
    <>
      <path d="M12 3 3.5 6.5v5c0 5 4 8.3 8.5 10 4.5-1.7 8.5-5 8.5-10v-5L12 3Z" />
      <path d="m8 12 2.6 2.6L16 9" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </>
  ),
  book: (
    <>
      <path d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Z" />
      <path d="M12 5v15" />
    </>
  ),
  layers: (
    <>
      <path d="m12 3 10 5-10 5L2 8l10-5Z" />
      <path d="m2 12 10 5 10-5M2 16l10 5 10-5" />
    </>
  ),
  check: <path d="m5 12 4.5 4.5L20 6" />,
  arrow: <path d="M4 12h15m-6-6 6 6-6 6" />,
  chevron: <path d="m9 5 7 7-7 7" />,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  pen: (
    <>
      <path d="m14 5 5 5M4 20l5-1L21 7l-4-4L5 15l-1 5Z" />
    </>
  ),
  bookmark: <path d="M6 3h12v19l-6-4-6 4V3Z" />,
  activity: <path d="M3 12h4l3-8 4 16 3-8h4" />,
  key: (
    <>
      <circle cx="8" cy="8" r="5" />
      <path d="m12 12 9 9m-4-4 3-3m-6 0 3-3" />
    </>
  ),
  network: (
    <>
      <rect x="8" y="3" width="8" height="6" rx="1" />
      <rect x="2" y="16" width="7" height="5" rx="1" />
      <rect x="15" y="16" width="7" height="5" rx="1" />
      <path d="M12 9v4H5v3m7-3h7v3" />
    </>
  ),
  spark: <path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z" />,
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
    </>
  ),
  download: <path d="M12 3v12m-5-5 5 5 5-5M4 15v6h16v-6" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6m0-10h.01" />
    </>
  ),
};
export function Icon({
  name,
  size = 20,
  style,
}: {
  name: string;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      {paths[name] || paths.book}
    </svg>
  );
}
