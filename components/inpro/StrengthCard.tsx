"use client";
import { useState } from "react";
import { STRENGTH_AXES, overallStrength, secretHint, type RightsStrength } from "@/lib/inpro/strength";
import type { Matrix } from "@/lib/inpro/matrix";
import { componentEvidence } from "@/lib/inpro/basis";
import { LevelMeter } from "./StepParts";
import { EvidenceLine } from "./Evidence";

// 권리의 강도: 특허를 받을 수 있는지가 아니라, 받은 권리로 경쟁사를 실제로 막을 수 있는지
export function StrengthCard({ strength, matrix }: { strength: RightsStrength; matrix?: Matrix | null }) {
  const [open, setOpen] = useState(false);
  const total = overallStrength(strength);
  const hint = secretHint(strength);
  return (
    <section className="border bg-white" style={{ borderColor: "var(--rule)" }}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b px-5 py-4" style={{ borderColor: "var(--rule)" }}>
        <div className="min-w-0">
          <h3 className="text-[15px] font-extrabold">권리의 강도</h3>
          <p className="mt-0.5 text-[12.5px]" style={{ color: "var(--ink-soft)" }}>
            특허를 받을 수 있는지와 별개로, 받은 권리로 경쟁사를 실제로 막을 수 있는지 봅니다. 가장 약한 축이 전체 강도를 정합니다.
          </p>
        </div>
        <div className="text-right">
          <div className="text-[11px] font-bold" style={{ color: "var(--ink-mute)" }}>
            종합
          </div>
          <LevelMeter level={total.level} />
          <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="mt-1.5 text-[11.5px] font-bold underline underline-offset-2" style={{ color: "var(--ink-soft)" }}>
            {open ? "근거 접기" : "근거 보기"}
          </button>
        </div>
      </div>
      <div className="grid gap-px sm:grid-cols-3" style={{ background: "var(--rule)" }}>
        {STRENGTH_AXES.map((a) => {
          const x = strength[a.key];
          const weakest = a.label === total.weakest && total.level !== "높음";
          return (
            <div key={a.key} className="bg-white p-4" style={weakest ? { boxShadow: "inset 0 3px 0 var(--crimson)" } : undefined}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[13px] font-extrabold">{a.label}</span>
                {weakest && (
                  <span className="text-[10.5px] font-bold" style={{ color: "var(--crimson)" }}>
                    가장 약한 축
                  </span>
                )}
              </div>
              <div className="mb-2 text-[11px]" style={{ color: "var(--ink-mute)" }}>
                {a.question}
              </div>
              <LevelMeter level={x.level} />
              {open && (
                <>
                  <p className="mt-2 text-[12.5px] leading-snug">{x.reason}</p>
                  {x.basis &&
                    (componentEvidence(matrix ?? null, x.basis) ? (
                      <EvidenceLine ev={componentEvidence(matrix ?? null, x.basis)} />
                    ) : (
                      <div className="mt-2 text-[11px]" style={{ color: "var(--ink-soft)" }}>
                        근거 구성 · <b>{x.basis}</b>
                      </div>
                    ))}
                </>
              )}
            </div>
          );
        })}
      </div>
      <div className="border-t px-5 py-3 text-[12.5px]" style={{ borderColor: "var(--rule)" }}>
        <b>종합 {total.level}</b> · {total.text}
        {hint && (
          <div className="mt-1 font-bold" style={{ color: "var(--crimson)" }}>
            {hint}
          </div>
        )}
      </div>
    </section>
  );
}
