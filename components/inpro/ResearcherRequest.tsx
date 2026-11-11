"use client";
import { useState } from "react";

// 연구원에게 보완 질문 보내기 (가벼운 버전): 서버 없이 메일 앱을 열거나 메시지를 복사한다.
// 다음 단계 계획: 연구원 전용 답변 링크로 답이 자동으로 들어오게 한다.
export function buildRequestMessage(p: { title: string; caseNo: string | null; inventor: string; questions: string[] }) {
  const lines = [
    `[InPro 발명 보완 요청] ${p.title}${p.caseNo ? ` (${p.caseNo})` : ""}`,
    "",
    `${p.inventor ? `${p.inventor}님` : "연구원님"}, 안녕하세요.`,
    `출원 검토를 위해 아래 ${p.questions.length}가지를 확인 부탁드립니다.`,
    "",
    ...p.questions.map((q, i) => `${i + 1}. ${q}`),
    "",
    "질문 번호에 맞춰 회신해 주시면 됩니다. 수치나 도면이 있으면 함께 보내주세요.",
    "— 특허 담당자 드림",
  ];
  return lines.join("\n");
}

export function ResearcherRequest({
  title,
  caseNo,
  inventor,
  dept,
  questions,
  sentAt,
  onSent,
}: {
  title: string;
  caseNo: string | null;
  inventor: string;
  dept: string;
  questions: string[];
  sentAt: string | null;
  onSent: (channel: "메일" | "메시지 복사") => void;
}) {
  const [email, setEmail] = useState("");
  const [copied, setCopied] = useState(false);
  const message = buildRequestMessage({ title, caseNo, inventor, questions });
  const subject = message.split("\n")[0];
  const mailto = `mailto:${encodeURIComponent(email.trim())}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
    message.split("\n").slice(2).join("\n")
  )}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = message;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
    onSent("메시지 복사");
  }

  return (
    <div className="border bg-white" style={{ borderColor: "var(--rule)" }}>
      <div className="border-b px-4 py-3" style={{ borderColor: "var(--rule)" }}>
        <div className="text-[13px] font-extrabold">연구원에게 보내기</div>
        <div className="mt-0.5 text-[11.5px]" style={{ color: "var(--ink-soft)" }}>
          보완 질문을 한 번에 묶어 보냅니다.
        </div>
      </div>

      <div className="space-y-3 px-4 py-4">
        <div>
          <div className="mb-1 text-[11px] font-bold" style={{ color: "var(--ink-mute)" }}>
            받는 사람
          </div>
          <div className="text-[13px] font-bold">
            {inventor || "발명자 미입력"}
            {dept && <span className="font-normal" style={{ color: "var(--ink-soft)" }}> · {dept}</span>}
          </div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일 (선택)"
            aria-label="연구원 이메일"
            className="mt-1.5 w-full border px-2.5 py-1.5 text-[12.5px] outline-none focus:border-[var(--crimson)]"
            style={{ borderColor: "var(--rule)" }}
          />
        </div>

        <div>
          <div className="mb-1 text-[11px] font-bold" style={{ color: "var(--ink-mute)" }}>
            미리보기
          </div>
          <pre
            className="max-h-56 overflow-y-auto whitespace-pre-wrap border p-3 text-[11.5px] leading-relaxed"
            style={{ borderColor: "var(--rule)", background: "var(--paper)", fontFamily: "var(--font-body)" }}
          >
            {message}
          </pre>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <a
            href={mailto}
            onClick={() => onSent("메일")}
            className="ws-btn ws-btn-primary justify-center !px-3 !py-2 !text-[12.5px]"
          >
            메일로 보내기
          </a>
          <button type="button" onClick={copy} className="ws-btn ws-btn-ghost justify-center !px-3 !py-2 !text-[12.5px]">
            {copied ? "복사됨 ✓" : "메시지 복사"}
          </button>
        </div>
      </div>

      <div className="border-t px-4 py-3 text-[11.5px]" style={{ borderColor: "var(--rule)", color: sentAt ? "var(--ink)" : "var(--ink-mute)" }}>
        {sentAt ? (
          <>
            <b style={{ color: "var(--crimson)" }}>발송 기록</b> · {new Date(sentAt).toLocaleString("ko-KR")} · 질문 {questions.length}개
          </>
        ) : (
          "아직 보내지 않았습니다."
        )}
      </div>
    </div>
  );
}
