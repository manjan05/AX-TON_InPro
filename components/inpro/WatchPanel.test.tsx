import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { WatchPanel } from "./WatchPanel";

const props = {
  components: [{ id: "C1", name: "여과재" }],
  keywords: ["주름", "필터"],
  scope: "가정용 · 형상",
  onCancel: vi.fn(),
};

describe("WatchPanel", () => {
  it("shows what will be watched and registers on click", () => {
    const onRegister = vi.fn();
    render(<WatchPanel {...props} watch={null} onRegister={onRegister} />);
    expect(screen.getByText("C1 여과재")).toBeTruthy();
    expect(screen.getByText(/KIPRIS\) 연동 후 동작/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "이 사건 감시 등록" }));
    expect(onRegister).toHaveBeenCalled();
  });

  it("shows the active state once registered", () => {
    render(<WatchPanel {...props} watch={{ at: new Date().toISOString(), ...props }} onRegister={vi.fn()} />);
    expect(screen.getByText("감시 중")).toBeTruthy();
    expect(screen.getByRole("button", { name: "감시 해제" })).toBeTruthy();
  });
});
