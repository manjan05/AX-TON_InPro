import Link from "next/link";
import { InProLogo } from "@/components/inpro/ui";
import { HeroMotion } from "@/components/landing/HeroMotion";
import { WorkflowSection } from "@/components/landing/WorkflowSection";
import { PricingSection } from "@/components/landing/PricingSection";

// 서비스가 주는 강점. 첫 화면 오른쪽에 번호 목록으로 둔다 (네모 없이 가는 선으로만 나눔)
const STRENGTHS = [
  { title: "원문 근거가 붙은 비교표", desc: "구성마다 문헌 문장을 그대로 인용합니다." },
  { title: "경쟁사 회피를 먼저 해 보는 권리범위", desc: "피하기 쉬운 구성은 넓게, 핵심은 중심에 둡니다." },
  { title: "공개 전 출원 알림", desc: "공개 날짜를 넣으면 남은 날을 계속 보여줍니다." },
  { title: "개발 단계별 재조사", desc: "설계가 바뀌면 다시 조사하고, 바뀐 구성만 다시 승인합니다." },
];

export default function Landing() {
  return (
    <div className="lp-wrap">
      <div className="lp-page">
        {/* NAV */}
        <nav className="flex items-center justify-between px-[var(--pad)] py-6">
          <InProLogo size={34} />
          <div className="flex items-center gap-1 text-[14px]">
            {(
              [
                ["/workspace", "작업 화면"],
                ["/workspace?view=my", "내 작업"],
                ["/workspace", "처음부터"],
              ] as const
            ).map(([href, label]) => (
              <Link key={label} href={href} className="rounded-full px-3.5 py-2 font-bold transition hover:bg-[var(--crimson-soft)]" style={{ color: "var(--ink-soft)" }}>
                {label}
              </Link>
            ))}
          </div>
        </nav>

        {/* HERO: 왼쪽 소개와 시작 버튼 하나, 오른쪽 로고가 움직이는 장면. 강점은 그 아래로 */}
        <header className="px-[var(--pad)] pb-20 pt-10 md:pt-16">
          <div className="grid gap-12 md:grid-cols-[1.05fr_1fr] md:items-center md:gap-16">
            <div>
              <p className="lp-hero-sub mb-5">Intellectual Property, in progress.</p>
              <h1 className="lp-hero-title">InPro</h1>
              <p className="mt-9 max-w-[440px] text-[17px] leading-[1.75]" style={{ color: "var(--ink-soft)" }}>
                특허 담당자가 1~2명인 회사에서 쓰는 발명 검토 도구. 접수부터 선행기술 조사, 권리범위 방향까지 한 사건으로 이어서 봅니다.
              </p>
              <Link href="/workspace" className="lp-cta mt-10">
                시작하기
              </Link>
            </div>
            <HeroMotion />
          </div>

          <ol className="mt-20 grid gap-x-10 gap-y-2 md:grid-cols-4">
            {STRENGTHS.map((s, i) => (
              <li key={s.title} className="border-t py-6" style={{ borderColor: "var(--rule)" }}>
                <span className="font-[family-name:var(--font-display)] text-[15px] font-bold" style={{ color: "var(--crimson)" }}>
                  {i + 1}
                </span>
                <h2 className="mt-2 text-[17px] font-bold leading-snug">{s.title}</h2>
                <p className="mt-1.5 text-[14px] leading-[1.7]" style={{ color: "var(--ink-soft)" }}>
                  {s.desc}
                </p>
              </li>
            ))}
          </ol>
        </header>

        {/* WORKFLOW */}
        <WorkflowSection />

        {/* PRICING */}
        <PricingSection />

        {/* FOOTER: 데이터 처리 안내는 여기 한 곳에만 짧게 */}
        <footer className="lp-rule px-[var(--pad)] py-10">
          <p className="max-w-[760px] text-[12.5px] leading-[1.8]" style={{ color: "var(--ink-soft)" }}>
            <b style={{ color: "var(--ink)" }}>데이터 처리</b> 사건 내용은 서버에 저장하지 않고, AI 단계마다 Google Gemini로 전송됩니다. 데모는 무료 API를 쓰므로 실제 미공개 발명은 입력하지 마세요.
          </p>
          <div className="mt-8 flex items-center justify-between gap-5">
            <InProLogo size={28} />
            <span className="font-mono text-[10px]" style={{ color: "var(--ink-mute)" }}>© 2026 Team Commit</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
