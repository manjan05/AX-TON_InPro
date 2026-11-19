"use client";
import type { ComponentEvidence } from "@/lib/inpro/basis";

// 결론 옆에 붙는 근거 한 줄: 어느 문헌에 어떻게 있었는지 (원문 인용이 확인된 매트릭스 칸에서)
export function EvidenceLine({ ev }: { ev: ComponentEvidence | null }) {
  if (!ev) return null;
  return (
    <div className="mt-1 text-[12.5px] leading-snug" style={{ color: "var(--ink-soft)" }}>
      <span className="font-bold" style={{ color: "var(--ink)" }}>
        근거 · {ev.componentName}
      </span>{" "}
      {ev.closest ? (
        <>
          — {ev.closest.label}에 <b>{ev.closest.presence === "있음" ? "있음" : "일부만 있음"}</b>
          {ev.closest.quote && <q className="ml-1">{ev.closest.quote}</q>}
          {ev.closest.presence !== "있음" && ev.closest.note && <span> · {ev.closest.note}</span>}
          {ev.absentIn.length > 0 && <span> · {ev.absentIn.join(", ")}에는 없음</span>}
        </>
      ) : (
        <>— 비교한 문헌 {ev.total}건 어디에도 없음</>
      )}
    </div>
  );
}

export function BasisList({ title, facts }: { title: string; facts: string[] }) {
  return (
    <div className="border bg-white p-4" style={{ borderColor: "var(--rule)" }}>
      <div className="mb-1.5 text-[11px] font-bold" style={{ color: "var(--ink-mute)" }}>
        {title}
      </div>
      <ul className="space-y-1 text-[12px] leading-snug">
        {facts.map((f) => (
          <li key={f} className="flex gap-1.5">
            <span style={{ color: "var(--crimson)" }}>—</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
