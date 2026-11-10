# InPro

**Intellectual Property, in progress.** 발명 접수부터 변리사 전달까지, 특허 담당자의 반복 업무를 잇는 AI 특허 업무 솔루션. (Team Commit · Campus AX-Ton)

## 실행

```bash
npm install
# .env.local 에 GOOGLE_GENERATIVE_AI_API_KEY=... 추가
npm run dev
```

## 구조

- `app/page.tsx`, `components/inpro/` — 6단계 작업 화면 (사건 생성 → 조사 범위 → 문헌 검토 → 기술 보완 → 사내 검토 → 변리사 전달)
- `app/api/inpro/` — intake · search · compare · review API
- `lib/inpro/` — AI 프롬프트, 선행조사 검색, 원문 근거 확인, 전달자료 생성
- `data/` — 데모 검색 DB (출연연 공개 기술·특허)
- `docs/design/inpro-design-guide.html` — 디자인 가이드
