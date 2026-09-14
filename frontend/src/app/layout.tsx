import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BalootBooks",
  description: "Interactive courseware platform for institutions and independent learners.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-slate-900 antialiased">{children}</body>
    </html>
  );
}
