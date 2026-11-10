import { NextRequest, NextResponse } from "next/server";
import { CORPUS, searchPriorArt } from "@/lib/inpro/search";
import { LIMITS, readJson } from "@/lib/inpro/route-utils";

export async function POST(req: NextRequest) {
  const parsed = await readJson<{ keywords?: string[] }>(req);
  if ("error" in parsed) return parsed.error;
  const { keywords } = parsed.body;
  if (!keywords?.length) {
    return NextResponse.json({ error: "검색 키워드가 없습니다." }, { status: 400 });
  }
  if (keywords.length > LIMITS.keywords || keywords.some((k) => typeof k !== "string" || k.length > LIMITS.keyword)) {
    return NextResponse.json({ error: "검색 키워드가 너무 많거나 깁니다." }, { status: 413 });
  }
  const docs = searchPriorArt(keywords, 10);
  return NextResponse.json({
    docs,
    log: {
      searchedAt: new Date().toISOString(),
      keywords,
      corpus: `출연연 공개 기술·특허 ${CORPUS.length.toLocaleString()}건 (데모 DB)`,
      hits: docs.length,
    },
  });
}
