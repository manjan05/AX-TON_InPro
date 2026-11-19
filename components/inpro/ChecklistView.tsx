"use client";
import type { CheckResult } from "@/lib/inpro/checklist";

// 보완할 항목: 이름은 왼쪽, 상태(부족·없음)는 오른쪽 글자로. 충족한 항목은 접어 둔다.
export function ChecklistView({ items }: { items: CheckResult[] }) {
  const todo = items.filter((c) => c.status !== "충족");
  const done = items.filter((c) => c.status === "충족");
  return (
    <div>
      {todo.length > 0 ? (
        <ul>
          {todo.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-4 border-b py-[18px]" style={{ borderColor: "var(--rule)" }}>
              <span className="text-[15px]">{c.name}</span>
              <span className="shrink-0 text-[13px] font-bold" style={{ color: "var(--crimson)" }}>
                {c.status}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="border-b py-[18px] text-[15px]" style={{ borderColor: "var(--rule)" }}>
          보완할 항목이 없습니다.
        </p>
      )}

      {done.length > 0 && (
        // 결과가 바뀌면 key가 달라져 다시 접힌 상태로 나온다
        <details key={items.map((c) => `${c.id}${c.status}`).join()} className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 border-b py-[18px] text-[14px] font-bold [&::-webkit-details-marker]:hidden" style={{ borderColor: "var(--rule)", color: "var(--ink-soft)" }}>
            <span>충족한 항목 {done.length}개</span>
            <span className="text-[13px] font-normal group-open:hidden">열기</span>
            <span className="hidden text-[13px] font-normal group-open:inline">접기</span>
          </summary>
          <ul>
            {done.map((c) => (
              <li key={c.id} className="border-b py-4" style={{ borderColor: "var(--rule)" }}>
                <div className="text-[14px]" style={{ color: "var(--ink-soft)" }}>
                  {c.name}
                </div>
                {c.quote && (
                  <p className="mt-1 text-[12.5px] leading-[1.65]" style={{ color: "var(--ink-mute)" }}>
                    “{c.quote}”
                  </p>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
