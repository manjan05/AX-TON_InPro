import Link from "next/link";
import { HeroDocs, WorkflowCircle } from "@/components/landing/HeroDocs";
import { WorkflowSection } from "@/components/landing/WorkflowSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { DataNotice } from "@/components/inpro/DataNotice";

export default function Landing() {
  return (
    <div className="lp-wrap">
      <div className="lp-page">
        {/* NAV */}
        <nav className="flex items-center justify-between px-[var(--pad)] py-6">
          <Link href="/" className="lp-wordmark">InPro</Link>
          <div className="hidden gap-5 md:flex">
            <a href="#workflow" className="lp-nav-link">Workflow</a>
            <a href="#pricing" className="lp-nav-link">Pricing</a>
          </div>
          <Link href="/workspace" className="flex items-center gap-2 font-[family-name:var(--font-display)] text-[11px] uppercase tracking-[.06em]">
            <span className="block h-px w-3.5 bg-[var(--ink)] shadow-[0_4px_0_var(--ink),0_-4px_0_var(--ink)]" />
            Demo
          </Link>
        </nav>

        {/* HERO */}
        <header className="relative">
          <div className="pointer-events-none relative z-30 px-[var(--pad)] pt-4">
            <p className="lp-hero-sub mb-3">
              Intellectual Property, in progress.
              <br />
              차별점을 찾고, 경쟁사가 피하기 어려운 권리로.
              <br />
              발명자와 특허 담당자가 함께 설계합니다.
            </p>
            <h1 className="lp-hero-title">InPro</h1>
          </div>
          <WorkflowCircle className="absolute right-[var(--pad)] top-20 z-20 max-md:top-auto max-md:bottom-[104px]" />
          <div className="lp-band relative -mt-12 h-[360px] max-md:mt-4 max-md:h-[320px]">
            <HeroDocs />
            <Link href="/workspace" className="lp-cta absolute bottom-7 right-[var(--pad)] z-20 max-md:left-[var(--pad)] max-md:bottom-5">
              <span>
                <small>무료 데모 · 가입 없이</small>
                데모 시작하기
              </span>
              <span className="lp-cta-arrow" aria-hidden="true">→</span>
            </Link>
          </div>
        </header>

        {/* WORKFLOW */}
        <WorkflowSection />

        {/* PRICING */}
        <PricingSection />

        {/* DATA */}
        <section id="data" className="lp-rule px-[var(--pad)] py-10">
          <h2 className="mb-1 font-[family-name:var(--font-display)] text-[12px] font-bold uppercase tracking-[.12em]" style={{ color: "var(--ink-soft)" }}>
            Data &amp; Security
          </h2>
          <p className="mb-4 text-[15px] font-bold">미공개 발명을 다루는 서비스라, 데이터가 어디로 가는지 먼저 밝힙니다.</p>
          <DataNotice defaultOpen />
        </section>

        {/* FOOTER */}
        <footer className="lp-rule flex flex-wrap items-center justify-between gap-5 px-[var(--pad)] py-6">
          <div>
            <span className="lp-wordmark">InPro</span>
            <div className="mt-1 font-[family-name:var(--font-display)] text-[10px] uppercase tracking-[.04em]" style={{ color: "var(--ink-mute)" }}>
              Intellectual Property, in progress
            </div>
          </div>
          <div className="flex gap-7 font-[family-name:var(--font-display)] text-[11px] uppercase">
            <Link href="/workspace">Demo</Link>
            <a href="#workflow">Workflow</a>
          </div>
          <span className="font-mono text-[10px]" style={{ color: "var(--ink-mute)" }}>© 2026 Team Commit</span>
        </footer>
      </div>
    </div>
  );
}
