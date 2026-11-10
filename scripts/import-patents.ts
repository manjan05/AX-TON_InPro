// 사용법: npx tsx scripts/import-patents.ts <팀원이 준 CSV 파일>
// 엑셀은 "CSV UTF-8" 또는 "CSV(쉼표로 분리)"로 저장하면 된다 (CP949도 자동 인식).
// 결과는 data/domains/air-filter.json 에 저장되고, 앱이 자동으로 이 데이터를 쓴다.
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { decodeCsv, parseCsv, rowsToDocs } from "../lib/inpro/importCsv";
import { funnel } from "../lib/inpro/corpus";

const file = process.argv[2];
if (!file) {
  console.error("CSV 파일 경로를 넣어주세요: npx tsx scripts/import-patents.ts 필터특허.csv");
  process.exit(1);
}

const report = rowsToDocs(parseCsv(decodeCsv(readFileSync(resolve(file)))));
if (report.missingColumns.length) {
  console.warn(`⚠ 없는 열: ${report.missingColumns.join(", ")} (용도·분류가 없으면 깔때기가 안 나옵니다)`);
}
report.skipped.forEach((s) => console.warn(`  - ${s.line}행 건너뜀: ${s.reason}`));

const out = resolve(process.argv[3] ?? "data/domains/air-filter.json");
writeFileSync(out, JSON.stringify(report.docs, null, 2) + "\n", "utf-8");

const f = funnel(report.docs, "공기청정기 필터", "가정용", "형상");
console.log(`✔ ${report.docs.length}건 저장 → ${out}`);
console.log(`  깔때기: ${f.stages.map((s) => `${s.label} ${s.count}건`).join(" → ")}`);
console.log(`  용도 값: ${f.usages.join(", ") || "없음"} / 분류 값: ${f.facets.join(", ") || "없음"}`);
console.log(`  청구항 있는 문헌: ${report.docs.filter((d) => d.claims).length}건`);
