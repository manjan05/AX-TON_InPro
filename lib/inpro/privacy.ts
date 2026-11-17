// 발명정보 보안 (IP 실무자 피드백 6): 외부 AI로 보내기 전에 AI 판단에 필요 없는 개인정보를 뺀다.
// 접수 화면이 붙이는 "[발명자] 이름 / 소속" 줄만 뺀다. 자료 본문 속 이름까지 찾아내지는 못한다.
export function stripPersonal(description: string): string {
  return description
    .split("\n")
    .filter((line) => !/^\s*\[발명자\]/.test(line))
    .join("\n");
}

// 화면에 보여주는 데이터 처리 방식. 코드의 실제 동작과 맞춰 둔다.
export const DATA_POLICY: { item: string; text: string; warn?: boolean }[] = [
  { item: "저장 위치", text: "InPro 서버·DB에 저장하지 않습니다. 사건 내용은 이 브라우저 화면에만 있고, 새로고침하거나 창을 닫으면 사라집니다. 올린 PDF도 글자만 읽고 파일은 저장하지 않습니다." },
  { item: "외부 AI 전송", text: "정리·비교·검토 단계마다 그 단계에 필요한 내용이 Google Gemini API로 전송됩니다. 발명자 이름·소속은 보내지 않습니다." },
  {
    item: "AI 학습 사용",
    text: "이 데모는 Gemini 무료 API를 씁니다. Google 약관상 무료 사용분의 입력은 Google 서비스 개선에 쓰일 수 있고 사람이 검토할 수 있습니다. 실제 미공개 발명은 넣지 말고, 예시나 이미 공개된 내용으로 시연해 주세요.",
    warn: true,
  },
  { item: "접근 권한", text: "로그인 없이 쓰는 데모입니다. 사건 내용은 입력한 사람의 브라우저에만 있어 다른 사용자에게 보이지 않습니다." },
  { item: "삭제", text: "InPro에는 저장되지 않으므로 창을 닫으면 남지 않습니다. Google로 전송된 내용의 보관은 Google 정책을 따릅니다." },
  { item: "기업 도입 시", text: "학습에 쓰지 않는 유료 API, 더 민감한 경우 사내 설치형과 사내 AI 모델로 외부 전송 없이 운영합니다." },
];
