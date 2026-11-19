import type { Metadata } from "next";
import { Inter, Noto_Sans_KR, Roboto_Mono } from "next/font/google";
import "./globals.css";

const latin = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "700", "800", "900"],
  variable: "--font-latin",
});
const sans = Noto_Sans_KR({
  weight: ["400", "500", "700", "800", "900"],
  variable: "--font-kr",
  preload: false,
});
const mono = Roboto_Mono({ subsets: ["latin"], weight: ["500"], variable: "--font-mono-src" });

export const metadata: Metadata = {
  title: "InPro",
  description: "선행기술을 확인하고 차별점을 찾아, 경쟁사가 피하기 어려운 권리를 발명자와 특허 담당자가 함께 설계하도록 돕는 AI",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${latin.variable} ${sans.variable} ${mono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
