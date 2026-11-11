import type { ReactNode } from "react";
import type { Decision, Level } from "@/lib/inpro/types";

// 4~6단계에서 함께 쓰는 작은 화면 조각들

export function LevelMeter({ level, label }: { level: Level; label?: string }) {
  const n = level === "높음" ? 3 : level === "보통" ? 2 : 1;
  return (
    <span className="inline-flex items-center gap-2">
      <span className="flex gap-0.5" aria-hidden="true">
        {[1, 2, 3].map((i) => (
          <i key={i} className="block h-2.5 w-5" style={{ background: i <= n ? "var(--crimson)" : "#dad9d5" }} />
        ))}
      </span>
      <span className="text-[13px] font-bold">{label ?? level}</span>
    </span>
  );
}

export function EmptyAction({ title, items, children }: { title: string; items: string[]; children: ReactNode }) {
  return (
    <div className="lp-frame p-6 sm:p-10">
      <div className="mx-auto max-w-xl bg-white p-6 shadow-[0_30px_40px_-30px_rgba(0,0,0,.5)] sm:p-8">
        <div className="mb-1 font-mono text-[11px] font-bold tracking-widest" style={{ color: "var(--crimson)" }}>
          InPro AI
        </div>
        <p className="text-[16px] font-bold leading-snug">{title}</p>
        <ul className="mt-4 space-y-1.5 text-[13px]" style={{ color: "var(--ink-soft)" }}>
          {items.map((x) => (
            <li key={x} className="flex gap-2">
              <span style={{ color: "var(--crimson)" }}>—</span>
              {x}
            </li>
          ))}
        </ul>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

export function MetricCard({ label, children, sub }: { label: string; children: ReactNode; sub?: string }) {
  return (
    <div className="border bg-white p-4" style={{ borderColor: "var(--rule)" }}>
      <div className="mb-2 text-[11px] font-bold" style={{ color: "var(--ink-mute)" }}>
        {label}
      </div>
      <div>{children}</div>
      {sub && (
        <p className="mt-2 text-[12px] leading-snug" style={{ color: "var(--ink-soft)" }}>
          {sub}
        </p>
      )}
    </div>
  );
}

export function DocSection({ n, title, tag, children }: { n: string; title: string; tag?: ReactNode; children: ReactNode }) {
  return (
    <section className="border-t pt-5 first:border-t-0 first:pt-0" style={{ borderColor: "#e6e5e1" }}>
      <h3 className="mb-2 flex flex-wrap items-center gap-2 text-[14px] font-extrabold">
        <span className="font-mono text-[12px]" style={{ color: "var(--crimson)" }}>
          {n}
        </span>
        {title}
        {tag}
      </h3>
      <div className="text-[13.5px] leading-relaxed">{children}</div>
    </section>
  );
}

// 팀장 인터뷰 질문 2: "국내 출원, 해외 출원, 영업비밀 관리 또는 보류 중 적절한 방안을 선택"
export const DECISION_INFO: Record<Decision, string> = {
  "국내 출원": "한국 특허청에 출원합니다. 출원일부터 12개월 안에 우선권을 주장해 해외로 넓힐 수 있습니다.",
  "해외 출원": "주요 판매·생산 국가에 권리를 확보합니다. 비용과 기간이 크므로 사업 중요도가 높을 때 고릅니다.",
  영업비밀: "제품을 뜯어봐도 알기 어려운 공정·제어 노하우는 공개하지 않고 사내 비밀로 보호합니다.",
  보류: "자료 보완이나 사업성 확인이 필요합니다. 공개 예정일이 있으면 그 전에 다시 결정합니다.",
};

// AI가 "A, B 또는 C"처럼 쓴 대체 수단을 칩으로 나눈다
export function splitAlternatives(s: string): string[] {
  return s
    .split(/,|·|、|\/|\s또는\s|\s및\s|\s혹은\s/)
    .map((x) => x.trim().replace(/^(혹은|또는|및)\s*/, ""))
    .filter((x) => x.length > 0);
}
