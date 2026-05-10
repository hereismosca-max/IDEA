import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Study Tutor",
  description: "A simple personal study webapp."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
