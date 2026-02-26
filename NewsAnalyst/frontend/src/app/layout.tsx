// Root layout — minimal pass-through.
// All actual layout (html, body, providers) lives in [locale]/layout.tsx.
// next-intl middleware ensures every request is routed to a locale path first.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
