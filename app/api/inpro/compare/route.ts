import { NextRequest, NextResponse } from "next/server";
import { runCompare } from "@/lib/inpro/ai";
import { verifyComparisons } from "@/lib/inpro/evidence";
import { findDocs } from "@/lib/inpro/search";
import { aiError } from "@/lib/inpro/route-utils";
import type { InventionComponent, PriorDoc } from "@/lib/inpro/types";

export async function POST(req: NextRequest) {
  const { components, docIds } = (await req.json()) as {
    components?: InventionComponent[];
    docIds?: string[];
  };
  if (!components?.length || !docIds?.length) {
    return NextResponse.json({ error: "구성 요소와 비교할 문헌을 하나 이상 골라주세요." }, { status: 400 });
  }
  // 원문은 클라이언트가 보낸 값이 아니라 서버 DB에서 다시 읽는다 (근거 조작 방지)
  const docs = findDocs(docIds.slice(0, 6));
  try {
    const raw = await runCompare(
      components,
      docs.map((d) => ({ ...d, score: 0, matchedKeywords: [] })) as PriorDoc[]
    );
    return NextResponse.json({ rows: verifyComparisons(raw, components, docs) });
  } catch (err) {
    return aiError(err);
  }
}
