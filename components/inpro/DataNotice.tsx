"use client";
import { useState } from "react";
import { DATA_POLICY } from "@/lib/inpro/privacy";

// 미공개 발명을 넣기 전에 보는 데이터 처리 방식 (IP 실무자 피드백 6)
export function DataNotice({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const warn = DATA_POLICY.find((p) => p.warn);
  return (
    <div className="border text-[12.5px]" style={{ borderColor: "#c3d3f5", background: "#f3f7fe" }}>
      <div className="flex flex-wrap items-start justify-between gap-2 px-4 py-3">
        <p className="min-w-0 flex-1 leading-snug">
          <b style={{ color: "var(--crimson)" }}>데이터 처리 방식</b> · InPro는 사건 내용을 저장하지 않지만, AI 단계마다 내용이 Google Gemini API로 전송됩니다.{" "}
          {warn && <b>데모는 무료 API라 입력이 Google 서비스 개선에 쓰일 수 있으니, 실제 미공개 발명은 넣지 마세요.</b>}
        </p>
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="shrink-0 text-[11.5px] font-bold underline underline-offset-2" style={{ color: "var(--ink-soft)" }}>
          {open ? "접기" : "자세히"}
        </button>
      </div>
      {open && (
        <dl className="grid gap-x-4 gap-y-2 border-t px-4 py-3 sm:grid-cols-[96px_1fr]" style={{ borderColor: "#c3d3f5" }}>
          {DATA_POLICY.map((p) => (
            <div key={p.item} className="contents">
              <dt className="font-bold" style={{ color: p.warn ? "var(--crimson)" : "var(--ink)" }}>
                {p.item}
              </dt>
              <dd className="leading-snug" style={{ color: "var(--ink-soft)" }}>
                {p.text}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
