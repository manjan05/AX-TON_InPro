"use client";
import type { IntakeResult as Result } from "@/lib/inpro/types";
import { ChecklistView } from "./ChecklistView";

// 접수 결과 화면: "AI 검토 요청"을 누르면 입력 화면 대신 이 화면이 나온다 (멘토 시안 구성)
export function IntakeSummary({ intake, questionCount, onEdit, onNext }: { intake: Result; questionCount: number; onEdit: () => void; onNext: () => void }) {
  const checklist = intake.checklist ?? [];
  const done = checklist.filter((c) => c.status === "충족").length;
  const todo = checklist.length - done;
  return (
    <div>
      <section>
        <h3 className="flex flex-wrap items-baseline gap-3 text-[18px] font-extrabold">
          기술 구성 {intake.components.length}개
          <span className="text-[13px] font-normal" style={{ color: "var(--ink-mute)" }}>
            자료에서 뽑은 구성
          </span>
        </h3>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {intake.components.map((c) => (
            <div key={c.id} className="rounded-[14px] border bg-white px-5 py-5" style={{ borderColor: "var(--rule)" }}>
              <div className="text-[12px] font-bold" style={{ color: "var(--crimson)" }}>
                {c.id}
              </div>
              <div className="mt-1.5 text-[16px] font-bold leading-snug">{c.name}</div>
              <p className="mt-3 text-[13px] leading-[1.65]" style={{ color: "var(--ink-soft)" }}>
                {c.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h3 className="flex flex-wrap items-baseline gap-3 text-[18px] font-extrabold">
          {todo > 0 ? `보완할 항목 ${todo}개` : "보완할 항목 없음"}
          <span className="text-[13px] font-normal" style={{ color: "var(--ink-mute)" }}>
            출원 준비 {checklist.length}개 중 {done}개 충족
          </span>
        </h3>
        <div className="mt-3">
          <ChecklistView items={checklist} />
        </div>
      </section>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t pt-8" style={{ borderColor: "var(--rule)" }}>
        <button
          type="button"
          onClick={onEdit}
          className="h-[46px] rounded-[10px] border bg-white px-5 text-[14.5px] font-bold transition hover:bg-[var(--crimson-soft)]"
          style={{ borderColor: "var(--crimson)", color: "var(--crimson)" }}
        >
          자료 고쳐서 다시 검토
        </button>
        <button
          type="button"
          onClick={onNext}
          className="h-[52px] rounded-[10px] px-7 text-[15px] font-bold text-white transition hover:brightness-110"
          style={{ background: "var(--crimson)" }}
        >
          {questionCount > 0 ? `보완 질문 ${questionCount}개 보기` : "다음 단계"}
        </button>
      </div>
    </div>
  );
}
