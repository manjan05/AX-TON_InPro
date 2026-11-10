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
