# Vercel 자동배포 파이프라인 설정 방법

`.github/workflows/deploy-vercel.yml`이 이미 준비되어 있습니다. `feature/hackathon-mvp`에
push할 때마다 자동으로 `npm test` → 빌드 → Vercel 프로덕션 배포까지 실행됩니다.

**단, 아래 3개 값을 GitHub Secrets에 등록해야 작동합니다.** (아직 등록 안 됨 — 지금 이대로
push하면 워크플로우가 실행되지만 Vercel 인증 단계에서 실패합니다.)

## 필요한 값 3개와 찾는 방법

이 프로젝트가 이미 배포되어 있는 Vercel 계정(현재 `hackathon-mvp-cyan.vercel.app`을
소유한 계정 — PROGRESS.md 기록상 `manjan1` 계정)으로 https://vercel.com 에 로그인한 뒤:

### 1. VERCEL_TOKEN
- https://vercel.com/account/tokens 접속
- "Create Token" 클릭 → 이름 아무거나(예: `github-actions-deploy`) → Scope는 이 프로젝트가 속한
  계정/팀 선택 → 만료기간 설정(예: 90일 또는 No Expiration) → 생성
- 생성된 토큰 문자열 복사 (한 번만 보여지니 바로 복사)

### 2. VERCEL_ORG_ID
- 프로젝트 대시보드 → 해당 프로젝트(`hackathon-mvp`) → **Settings → General** 탭
- 페이지 하단 "Project ID" 근처에 "Team ID"(팀 계정인 경우) 또는 계정 설정의
  "Your ID"(개인 계정인 경우)가 있음 — 이 값이 `VERCEL_ORG_ID`

### 3. VERCEL_PROJECT_ID
- 위와 같은 **Settings → General** 페이지 하단의 "Project ID" 값

## 값을 얻으신 후

세 값을 저한테 알려주시면(또는 아래 안내로 직접 등록하셔도 됩니다), 제가 GitHub API로
저장소 Secrets에 안전하게 암호화해서 등록해드리고, 곧바로 테스트 push로 파이프라인이
정상 동작하는지 확인해드리겠습니다.

**직접 등록하고 싶으시면**: GitHub 저장소 → Settings → Secrets and variables → Actions →
"New repository secret" → 이름/값 3번 반복 (`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`)

## 등록 후 동작 확인

Secrets 등록이 끝나면, 아래 중 하나로 파이프라인이 도는지 확인 가능:
- 아무 커밋이나 `feature/hackathon-mvp`에 push
- 또는 GitHub 저장소 → Actions 탭 → "Deploy to Vercel (Production)" 워크플로우 →
  "Run workflow" 버튼으로 수동 실행(`workflow_dispatch`)

성공하면 Actions 로그에 배포된 URL과 commit SHA가 출력됩니다.
