// 검색 실력 재기: 전문가(현직자)가 고른 "꼭 나와야 하는 특허"를 InPro가 상위 10건 안에서 몇 개 찾는지.
// 사용법: npx tsx scripts/eval-recall.ts [정답지 JSON] [k]
//   기본 정답지: data/eval/air-filter-cases.json, 기본 k = 10
// 용어 사전을 껐을 때와 켰을 때를 나란히 보여줘서, 사전이 검색을 얼마나 개선했는지 숫자로 확인한다.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { funnel, isLive, type RawDoc } from "../lib/inpro/corpus";
import { rankDocs, recallAtK, type Glossary } from "../lib/inpro/scoring";

interface EvalCase {
  name: string;
  keywords: string[];
  expected: string[]; // 전문가가 고른 특허 번호 (data/domains/air-filter.json의 id)
  usage?: string;
  facet?: string;
  purpose?: "출원 검토" | "침해 위험"; // 침해 위험이면 살아 있는 등록 특허만 검색
}

const casesPath = resolve(process.argv[2] ?? "data/eval/air-filter-cases.json");
const k = Number(process.argv[3] ?? 10);
const corpus = JSON.parse(readFileSync(resolve("data/domains/air-filter.json"), "utf-8")) as RawDoc[];
const glossary = (JSON.parse(readFileSync(resolve("data/domains/air-filter-glossary.json"), "utf-8")) as { groups: Glossary }).groups;
const { cases } = JSON.parse(readFileSync(casesPath, "utf-8")) as { cases: EvalCase[] };

const ready = cases.filter((c) => c.expected.length > 0 && c.keywords.length > 0);
if (corpus.length === 0) {
  console.log("필터 데이터가 아직 없습니다. 먼저 scripts/import-patents.ts로 넣어주세요.");
  process.exit(0);
}
if (ready.length === 0) {
  console.log(`정답지가 비어 있습니다: ${casesPath}\n각 사례에 keywords와 expected(특허 번호)를 채워주세요.`);
  process.exit(0);
}

const ids = new Set(corpus.map((d) => d.id));
let sumPlain = 0;
let sumGloss = 0;
console.log(`정답지 ${ready.length}건 · 상위 ${k}건 기준 재현율\n`);
for (const c of ready) {
  const unknown = c.expected.filter((id) => !ids.has(id));
  const scoped = funnel(corpus, "필터", c.usage, c.facet).docs;
  const scope = c.purpose === "침해 위험" ? scoped.filter(isLive) : scoped;
  const plain = recallAtK(rankDocs(scope, c.keywords, { limit: k }).map((d) => d.id), c.expected, k);
  const gloss = recallAtK(rankDocs(scope, c.keywords, { limit: k, glossary }).map((d) => d.id), c.expected, k);
  sumPlain += plain.recall;
  sumGloss += gloss.recall;
  console.log(`■ ${c.name}${c.purpose ? ` · ${c.purpose}` : ""} (검색 대상 ${scope.length}건)`);
  console.log(`  용어 사전 없이 ${pct(plain.recall)}  →  용어 사전 사용 ${pct(gloss.recall)}`);
  if (gloss.missed.length) console.log(`  놓친 특허: ${gloss.missed.join(", ")}`);
  if (unknown.length) console.log(`  ⚠ 데이터에 없는 번호: ${unknown.join(", ")}`);
}
console.log(`\n평균 재현율: ${pct(sumPlain / ready.length)} → ${pct(sumGloss / ready.length)} (기획안 목표 85%)`);

function pct(x: number) {
  return `${Math.round(x * 100)}%`;
}
