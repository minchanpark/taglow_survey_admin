import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../../../test/renderWithProviders";
import { GlobalFilterBar } from "./GlobalFilterBar";

describe("GlobalFilterBar", () => {
  it("shows a loading message before profile filter fields arrive", () => {
    renderWithProviders(
      <GlobalFilterBar
        filters={{}}
        fields={[]}
        isLoading={true}
        onChange={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    expect(screen.getByText("기본 정보 필터를 불러오는 중입니다.")).toBeInTheDocument();
    expect(screen.queryByText("선택형 기본 정보 질문이 없습니다.")).not.toBeInTheDocument();
  });

  it("shows the empty message only after loading finishes", () => {
    renderWithProviders(
      <GlobalFilterBar
        filters={{}}
        fields={[]}
        isLoading={false}
        onChange={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    expect(screen.getByText("선택형 기본 정보 질문이 없습니다.")).toBeInTheDocument();
  });
});
