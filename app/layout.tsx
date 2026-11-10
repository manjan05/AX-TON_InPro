import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "대덕 NEXUS",
  description: "묻힌 특허를 AI가 조합해 제품으로 만들고 기업에 제안하는 기술사업화 플랫폼",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Gothic+A1:wght@400;500;700;800;900&family=Roboto+Mono:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
