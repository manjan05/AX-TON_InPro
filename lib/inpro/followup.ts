// 선행기술이 나온 뒤 발명자에게 다시 묻는 질문 (재인터뷰).
// 실무 반복: 기술 이해 → 선행기술 조사 → 발명자 재인터뷰 → 차별점 재정의 → 재검색
// AI를 다시 부르지 않고 비교표에서 바로 만든다: 어떤 문헌의 어떤 문장 때문에 묻는지가 그대로 보인다.
import type { ComparisonRow } from "./types";

export interface FollowUpQuestion {
  componentName: string;
  docTitle: string | null;
  question: string;
  relation: "공통" | "일부";
  quote: string | null; // 선행 문헌 원문 (발명자 화면에 나란히 보여준다)
  componentDescription: string;
}

export interface SurveyRound {
  n: number;
  at: string;
  common: number; // 선행 문헌에 그대로 있는 구성
  partial: number; // 일부만 있는 구성
  distinct: number; // 어디에도 없는 구성
  changed: number; // 지난 회차보다 판단이 바뀐 구성
}

export function priorArtQuestions(rows: ComparisonRow[], max = 4, descriptions: Record<string, string> = {}): FollowUpQuestion[] {
  const common = rows.filter((r) => r.relation === "공통" && r.docId);
  const partial = rows.filter((r) => r.relation === "차이 후보" && r.docId);
  return [...common, ...partial].slice(0, max).map((r) => {
    const doc = r.docTitle ? `‘${r.docTitle}’` : "선행 문헌";
    const question =
      r.relation === "공통"
        ? `"${r.componentName}"이(가) ${doc}에도 나옵니다${r.quote ? ` ("${r.quote}")` : ""}. 우리 것은 무엇이 다른가요? 치수·배치·재질·작동 방식 중 다른 점을 구체적으로 알려주세요.`
        : `"${r.componentName}"과(와) 비슷한 내용이 ${doc}에 일부 있습니다. 그 문헌에는 없고 우리 것에만 있는 특징은 무엇인가요?`;
    return {
      componentName: r.componentName,
      docTitle: r.docTitle,
      question,
      relation: r.relation === "공통" ? "공통" : "일부",
      quote: r.quote,
      componentDescription: descriptions[r.componentName] ?? "",
    };
  });
}

export function summarizeRound(n: number, rows: ComparisonRow[], changed: number): SurveyRound {
  return {
    n,
    at: new Date().toISOString(),
    common: rows.filter((r) => r.relation === "공통").length,
    partial: rows.filter((r) => r.relation === "차이 후보" && r.docId).length,
    distinct: rows.filter((r) => r.relation === "차이 후보" && !r.docId).length,
    changed,
  };
}

// 발명자 답변을 발명 자료에 회차별로 붙인다 (전달자료의 [연구원 확인] 원문이 된다)
export function appendFollowUp(description: string, round: number, qa: { question: string; answer: string }[]): string {
  const answered = qa.filter((q) => q.answer.trim());
  if (!answered.length) return description;
  const block = answered.map((q) => `Q. ${q.question}\nA. ${q.answer.trim()}`).join("\n");
  return `${description}\n\n[선행기술 대비 발명자 재인터뷰 ${round}회차]\n${block}`;
}
