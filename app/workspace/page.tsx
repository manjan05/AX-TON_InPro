import { Workspace } from "@/components/inpro/Workspace";

// 첫 화면의 "내 작업" 링크(/workspace?view=my)로 들어오면 내 작업 화면부터 연다
export default async function WorkspacePage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams;
  return <Workspace initialView={view === "my" ? "my" : "work"} />;
}
