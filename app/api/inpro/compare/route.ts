import { NextRequest, NextResponse } from "next/server";
import { runMatrix } from "@/lib/inpro/ai";
import { buildMatrix, rowsFromMatrix } from "@/lib/inpro/matrix";
import { findDocs } from "@/lib/inpro/search";
import { aiError, tooLarge, readJson } from "@/lib/inpro/route-utils";
import { PURPOSES, type InventionComponent, type PriorDoc, type Purpose } from "@/lib/inpro/types";

export async function POST(req: NextRequest) {
  const parsed = await readJson<{
    components?: InventionComponent[];
    docIds?: string[];
    purpose?: Purpose;
  }>(req);
  if ("error" in parsed) return parsed.error;
  const { components, docIds, purpose } = parsed.body;
  if (!components?.length || !docIds?.length) {
    return NextResponse.json({ error: "구성 요소와 비교할 문헌을 하나 이상 골라주세요." }, { status: 400 });
  }
  const big = tooLarge({ components });
  if (big) return big;
  // 원문은 클라이언트가 보낸 값이 아니라 서버 DB에서 다시 읽는다 (근거 조작 방지)
  const ids = docIds.slice(0, 6);
  const found = findDocs(ids);
  // 담당자가 고른 순서(검색 순위) 그대로 문헌 A, B, C…로 붙인다
  const docs = ids.map((id) => found.find((d) => d.id === id)).filter((d): d is (typeof found)[number] => !!d);
  try {
    const { cells, nextChecks } = await runMatrix(
      components,
      docs.map((d) => ({ ...d, score: 0, matchedKeywords: [] })) as PriorDoc[]
    );
    const matrix = buildMatrix(components, docs, cells, PURPOSES.includes(purpose as Purpose) ? purpose : "출원 검토");
    return NextResponse.json({ rows: rowsFromMatrix(matrix, nextChecks, components), matrix });
  } catch (err) {
    return aiError(err);
  }
}
