# 가정용 공기청정기 필터 주름 형상: 특허 조사

InPro 데모 도메인(가정용 공기청정기 필터 형상)을 위한 KIPRIS 특허 조사 자료입니다. (조사일 2026-11-11)

| 파일 | 내용 |
|---|---|
| [selected-patents.md](./selected-patents.md) | 질 좋은 특허 선별 결과 (★ 우선 검토 3건, 형상 특허 12건, 선행기술·추적 대상) |
| [selection-criteria.md](./selection-criteria.md) | 어떤 기준과 과정으로 추렸는지, CSV 용도·분류 라벨 기준 |
| [claim-chart.md](./claim-chart.md) | 우선 검토 3건의 구성요소별 클레임 차트 (비교 대상 제품 열은 비어 있음) |
| [kipris-collect.js](./kipris-collect.js) | KIPRIS에서 데이터셋을 다시 만드는 스크립트 (브라우저 콘솔용) |
| `air-filter-patents.csv` | InPro 데이터셋 564건 (id, title, abstract, applicant, registrationDate, claims, ipc, 용도, 분류) |

## 깔때기 요약
```
필터 전체 564건 → 가정용 227건 → 가정용·형상 36건 → 우선 검토 3건
```

## CSV를 앱에 넣기
```bash
npx tsx scripts/import-patents.ts docs/patent-research/air-filter-pleat/air-filter-patents.csv
```
결과는 `data/domains/air-filter.json`에 저장되고, 앱의 깔때기 패널에 반영됩니다.

> 이 자료는 1차 기술 검토 결과이며, 변리사의 침해·유효성 감정을 대신하지 않습니다.
