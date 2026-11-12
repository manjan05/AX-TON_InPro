import { NextRequest, NextResponse } from "next/server";
import { CORPUS_NAME, DEFAULT_SCOPE, STATUS_AVAILABLE, explainedSearch, scopedCorpus } from "@/lib/inpro/search";
import { PURPOSES, type InventionComponent, type Purpose } from "@/lib/inpro/types";
import { LIMITS, readJson, tooLarge } from "@/lib/inpro/route-utils";

// GET: 검색 전에 깔때기(분야 좁히기) 숫자만 보여준다
export async function GET(req: NextRequest) {
  const usage = req.nextUrl.searchParams.get("usage") ?? DEFAULT_SCOPE.usage;
  const facet = req.nextUrl.searchParams.get("facet") ?? DEFAULT_SCOPE.facet;
  const p = req.nextUrl.searchParams.get("purpose");
  const purpose: Purpose = PURPOSES.includes(p as Purpose) ? (p as Purpose) : "출원 검토";
  const f = scopedCorpus(usage || undefined, facet || undefined, purpose);
  return NextResponse.json({ corpus: CORPUS_NAME, stages: f.stages, usages: f.usages, facets: f.facets, scope: { usage, facet }, statusAvailable: STATUS_AVAILABLE });
}

export async function POST(req: NextRequest) {
  const parsed = await readJson<{ keywords?: string[]; usage?: string; facet?: string; components?: InventionComponent[]; purpose?: Purpose }>(req);
  if ("error" in parsed) return parsed.error;
  const { keywords, usage, facet, components, purpose } = parsed.body;
  if (!keywords?.length) {
    return NextResponse.json({ error: "검색 키워드가 없습니다." }, { status: 400 });
  }
  if (keywords.length > LIMITS.keywords || keywords.some((k) => typeof k !== "string" || k.length > LIMITS.keyword)) {
    return NextResponse.json({ error: "검색 키워드가 너무 많거나 깁니다." }, { status: 413 });
  }
  if ([usage, facet].some((v) => v !== undefined && (typeof v !== "string" || v.length > 20))) {
    return NextResponse.json({ error: "검색 범위 값이 잘못됐습니다." }, { status: 400 });
  }
  const big = tooLarge({ components });
  if (big) return big;
  const r = explainedSearch(keywords, {
    usage: usage || undefined,
    facet: facet || undefined,
    components,
    purpose: PURPOSES.includes(purpose as Purpose) ? purpose : "출원 검토",
  });
  return NextResponse.json({
    ...r,
    log: {
      searchedAt: new Date().toISOString(),
      keywords,
      corpus: `${CORPUS_NAME} · ${r.path.map((s) => `${s.label} ${s.count.toLocaleString()}건`).join(" → ")}`,
      hits: r.docs.length,
    },
  });
}
