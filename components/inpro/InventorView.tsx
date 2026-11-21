"use client";
import type { FollowUpQuestion } from "@/lib/inpro/followup";

const ASPECTS = ["치수", "배치", "재질", "작동 방식", "효과"];

// 발명자 화면: 선행 문헌 문장과 우리 구성을 나란히 놓고, 발명자가 직접 "무엇이 다른지"를 적는다.
// 발명자와 특허 담당자가 함께 차별점을 찾는 자리 (IP 실무자 총평)
export function InventorView({
  inventor,
  questions,
  answers,
  onAnswer,
}: {
  inventor: string;
  questions: FollowUpQuestion[];
  answers: Record<string, string>;
  onAnswer: (question: string, answer: string) => void;
}) {
  return (
    <div>
      <div className="mb-4 border-l-4 bg-white px-4 py-3" style={{ borderColor: "var(--crimson)" }}>
        <div className="text-[14px] font-extrabold">{inventor ? `${inventor}님` : "발명자님"}, 선행 문헌과 겹친 구성이 {questions.length}개 있습니다.</div>
        <p className="mt-0.5 text-[12.5px]" style={{ color: "var(--ink-soft)" }}>
          왼쪽 문헌 문장과 오른쪽 우리 구성을 비교해, 우리 것만의 다른 점을 적어 주세요. 이 답이 차별점이 되고, 경쟁사가 피하기 어려운 권리의 근거가 됩니다.
        </p>
      </div>
      <ol className="space-y-4">
        {questions.map((q, i) => {
          const value = answers[q.question] ?? "";
          return (
            <li key={q.question} className="border bg-white" style={{ borderColor: "var(--rule)" }}>
              <div className="flex items-center gap-2 border-b px-4 py-2" style={{ borderColor: "var(--rule)" }}>
                <span className="font-mono text-[11px] font-bold" style={{ color: "var(--crimson)" }}>
                  Q{i + 1}
                </span>
                <b className="text-[13.5px]">{q.componentName}</b>
                <span className="px-1.5 py-0.5 text-[10.5px] font-bold" style={q.relation === "공통" ? { background: "var(--crimson)", color: "#fff" } : { background: "#e6f1fb", color: "var(--crimson)" }}>
                  {q.relation === "공통" ? "문헌에도 있음" : "문헌에 일부 있음"}
                </span>
              </div>
              <div className="grid gap-px sm:grid-cols-2" style={{ background: "var(--rule)" }}>
                <div className="bg-[#fafbfe] p-4">
                  <div className="mb-1 text-[11px] font-bold" style={{ color: "var(--ink-mute)" }}>
                    선행 문헌 · {q.docTitle ?? "-"}
                  </div>
                  <p className="border-l-2 pl-3 text-[12.5px] leading-relaxed" style={{ borderColor: "var(--crimson)" }}>
                    {q.quote ?? "원문 인용 없음 (일부만 비슷함)"}
                  </p>
                </div>
                <div className="bg-white p-4">
                  <div className="mb-1 text-[11px] font-bold" style={{ color: "var(--ink-mute)" }}>
                    우리 발명 · {q.componentName}
                  </div>
                  <p className="text-[12.5px] leading-relaxed">{q.componentDescription || "-"}</p>
                </div>
              </div>
              <div className="p-4">
                <label htmlFor={`inventor-${i}`} className="mb-1.5 block text-[12.5px] font-bold">
                  우리 것은 무엇이 다른가요?
                </label>
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {ASPECTS.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => onAnswer(q.question, value.trim() ? `${value.trim()}\n${a}: ` : `${a}: `)}
                      className="border px-2 py-0.5 text-[11.5px] font-bold transition hover:border-[var(--crimson)] hover:text-[var(--crimson)]"
                      style={{ borderColor: "var(--rule)" }}
                    >
                      + {a}
                    </button>
                  ))}
                </div>
                <textarea
                  id={`inventor-${i}`}
                  rows={3}
                  value={value}
                  onChange={(e) => onAnswer(q.question, e.target.value)}
                  placeholder="예) 작동 방식: 문헌은 별도 케이스의 돌기를 끼우지만, 우리는 주름 끝에 돌기를 일체로 성형해 케이스가 필요 없다."
                  className="w-full border bg-white px-3 py-2 text-[13px] outline-none focus:border-[var(--crimson)]"
                  style={{ borderColor: "var(--rule)" }}
                />
              </div>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-[11.5px]" style={{ color: "var(--ink-mute)" }}>
        데모에서는 같은 화면에서 전환합니다. 실제로는 발명자 전용 링크로 열리고, 답이 담당자 화면에 바로 들어옵니다.
      </p>
    </div>
  );
}
