import Link from "next/link";
import type { ReactNode } from "react";
import type { ComparisonRow, Relation } from "@/lib/inpro/types";

export function InProLogo() {
  return (
    <Link href="/" className="lp-wordmark" aria-label="InPro 홈">
      InPro
    </Link>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-none border p-5 sm:p-7 ${className}`}
      style={{ borderColor: "var(--hairline)", background: "var(--paper-2)" }}
    >
      {children}
    </section>
  );
}

export function StepTitle({ n, title, sub }: { n: number; title: string; sub: string }) {
  return (
    <div className="mb-7 flex items-start gap-5 border-b pb-6" style={{ borderColor: "var(--hairline)" }}>
      <div
        className="shrink-0 font-[family-name:var(--font-display)] text-[72px] font-black leading-[.78] tracking-[-.04em] max-sm:text-[52px]"
        style={{ color: "var(--crimson)" }}
        aria-hidden="true"
      >
        {String(n).padStart(2, "0")}
      </div>
      <div className="min-w-0 pt-1">
        <div className="mb-1 font-mono text-[11px] font-bold tracking-widest" style={{ color: "var(--ink-mute)" }}>
          STEP {String(n).padStart(2, "0")} / 06
        </div>
        <h2 className="font-[family-name:var(--font-display)] text-[30px] font-extrabold leading-tight max-sm:text-2xl" style={{ color: "var(--ink)" }}>
          {title}
        </h2>
        <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
          {sub}
        </p>
      </div>
    </div>
  );
}

export function Button({
  children,
  onClick,
  disabled,
  variant = "primary",
  loading,
  arrow,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "ghost";
  loading?: boolean;
  arrow?: boolean;
}) {
  const primary = variant === "primary";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={`ws-btn ${primary ? "ws-btn-primary" : "ws-btn-ghost"} ${arrow ? "ws-btn-arrow" : ""}`}
    >
      {loading && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {children}
      {arrow && !loading && (
        <span className="ws-btn-arrowbox" aria-hidden="true">
          →
        </span>
      )}
    </button>
  );
}

export function Tag({ children, tone = "blue" }: { children: ReactNode; tone?: "blue" | "orange" | "gray" | "green" }) {
  const tones = {
    blue: { background: "var(--blue-soft)", color: "var(--blue)" },
    orange: { background: "#efe2e2", color: "#8a1420" },
    gray: { background: "#e4e2dd", color: "var(--ink-soft)" },
    green: { background: "#e2e8df", color: "#3d5a35" },
  };
  return (
    <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-bold" style={tones[tone]}>
      {children}
    </span>
  );
}

const relationTone: Record<Relation, "blue" | "orange" | "gray"> = {
  공통: "gray",
  "차이 후보": "blue",
  "근거 부족": "orange",
};

export function CompareTable({
  rows,
  confirmed,
  changed,
  onToggle,
}: {
  rows: ComparisonRow[];
  confirmed?: Set<string>;
  changed?: Set<string>;
  onToggle?: (name: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse text-left text-[13px]">
        <thead>
          <tr style={{ color: "var(--ink-soft)" }} className="border-b" >
            <th className="py-2 pr-3 font-bold">발명 구성</th>
            <th className="py-2 pr-3 font-bold">가장 가까운 문헌</th>
            <th className="py-2 pr-3 font-bold">판단</th>
            <th className="w-[34%] py-2 pr-3 font-bold">원문 근거</th>
            <th className="py-2 pr-3 font-bold">다음 확인</th>
            {onToggle && <th className="py-2 font-bold">담당자 확인</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const isChanged = changed?.has(r.componentName);
            return (
              <tr
                key={r.componentName}
                className="border-b align-top"
                style={{ borderColor: "var(--hairline)", background: isChanged ? "#f6efe9" : undefined }}
              >
                <td className="py-3 pr-3 font-bold" style={{ color: "var(--ink-2)" }}>
                  {r.componentName}
                  {isChanged && (
                    <div className="mt-1">
                      <Tag tone="orange">보완 후 바뀜 · 재승인 필요</Tag>
                    </div>
                  )}
                </td>
                <td className="py-3 pr-3" style={{ color: "var(--ink-2)" }}>
                  {r.docTitle ? (
                    <>
                      <div className="line-clamp-2">{r.docTitle}</div>
                      <div className="font-mono text-[10px]" style={{ color: "var(--ink-soft)" }}>
                        #{r.docId}
                      </div>
                    </>
                  ) : (
                    <span style={{ color: "var(--ink-soft)" }}>없음</span>
                  )}
                </td>
                <td className="py-3 pr-3">
                  <Tag tone={relationTone[r.relation]}>{r.relation}</Tag>
                </td>
                <td className="py-3 pr-3">
                  {r.quote ? (
                    <blockquote
                      className="border-l-2 pl-2 text-[12.5px] leading-relaxed"
                      style={{ borderColor: "var(--blue)", color: "var(--ink-2)" }}
                    >
                      “{r.quote}”
                    </blockquote>
                  ) : (
                    <span className="text-[12px] font-bold" style={{ color: "#8a1420" }}>
                      원문 근거 없음
                    </span>
                  )}
                  <div className="mt-1 text-[12px]" style={{ color: "var(--ink-soft)" }}>
                    {r.note}
                  </div>
                </td>
                <td className="py-3 pr-3 text-[12.5px]" style={{ color: "var(--ink-2)" }}>
                  {r.nextCheck}
                </td>
                {onToggle && (
                  <td className="py-3">
                    <label className="inline-flex cursor-pointer items-center gap-1.5 text-[12px] font-bold" style={{ color: "var(--ink-2)" }}>
                      <input
                        type="checkbox"
                        checked={confirmed?.has(r.componentName) ?? false}
                        onChange={() => onToggle(r.componentName)}
                        className="h-4 w-4 accent-[#6e0b14]"
                      />
                      확인
                    </label>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
