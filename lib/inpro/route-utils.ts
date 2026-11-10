import { NextResponse } from "next/server";

export function aiError(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY || /api key/i.test(message)) {
    return NextResponse.json(
      { error: "AI 키가 없습니다. .env.local에 GOOGLE_GENERATIVE_AI_API_KEY를 넣어주세요." },
      { status: 503 }
    );
  }
  console.error("[inpro]", err);
  return NextResponse.json({ error: `AI 처리에 실패했습니다. 다시 시도해 주세요. (${message.slice(0, 120)})` }, { status: 502 });
}

// 공개 데모 URL에서 큰 입력으로 AI 호출량을 낭비하지 못하게 크기를 제한한다
export const LIMITS = { text: 6000, answers: 4000, keywords: 20, keyword: 40, components: 8, rows: 8 };

export function tooLarge(fields: Record<string, string | unknown[] | undefined>): NextResponse | null {
  for (const [name, v] of Object.entries(fields)) {
    if (v === undefined) continue;
    const max =
      typeof v === "string"
        ? name === "answers"
          ? LIMITS.answers
          : LIMITS.text
        : name === "keywords"
          ? LIMITS.keywords
          : name === "components"
            ? LIMITS.components
            : LIMITS.rows;
    if (v.length > max) {
      return NextResponse.json({ error: `입력이 너무 깁니다 (${name} 최대 ${max}).` }, { status: 413 });
    }
  }
  return null;
}
