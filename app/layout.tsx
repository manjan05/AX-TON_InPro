import type { Metadata } from "next";
import { Noto_Sans_KR, Roboto_Condensed, Roboto_Mono } from "next/font/google";
import "./globals.css";

const condensed = Roboto_Condensed({
  subsets: ["latin"],
  weight: ["400", "500", "700", "800", "900"],
  variable: "--font-condensed",
});
const sans = Noto_Sans_KR({
  weight: ["400", "500", "700", "800", "900"],
  variable: "--font-kr",
  preload: false,
});
const mono = Roboto_Mono({ subsets: ["latin"], weight: ["500"], variable: "--font-mono-src" });

export const metadata: Metadata = {
  title: "InPro",
  description: "발명 접수부터 변리사 전달까지, 특허 담당자의 반복 업무를 잇는 AI 특허 업무 솔루션",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${condensed.variable} ${sans.variable} ${mono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
