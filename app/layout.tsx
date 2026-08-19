import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "建築法規くん｜法規・ボリュームチェック",
  description: "建築設計者向けの法規・ボリューム概算支援ツール",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
