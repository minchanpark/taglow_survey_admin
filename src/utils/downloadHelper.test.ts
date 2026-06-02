import { afterEach, describe, expect, it, vi } from "vitest";

import { downloadElementAsPng } from "./downloadHelper";

describe("downloadElementAsPng", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });

  it("keeps the downloaded file as PNG when high-fidelity rendering fails", async () => {
    const downloads: string[] = [];
    const element = document.createElement("section");
    element.textContent = "상세 명단";
    Object.defineProperty(element, "scrollWidth", { configurable: true, value: 320 });
    Object.defineProperty(element, "scrollHeight", { configurable: true, value: 180 });
    Object.defineProperty(element, "getBoundingClientRect", {
      configurable: true,
      value: () =>
        ({
          bottom: 180,
          height: 180,
          left: 0,
          right: 320,
          top: 0,
          width: 320,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        }) as DOMRect,
    });

    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(URL, "createObjectURL").mockImplementation((blob) => `blob:${blob instanceof Blob ? blob.type : "media"}`);
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    vi.spyOn(document.body, "append").mockImplementation((...nodes) => {
      nodes.forEach((node) => {
        if (node instanceof HTMLAnchorElement) downloads.push(node.download);
      });
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
      () =>
        ({
          drawImage: vi.fn(),
          fillRect: vi.fn(),
          fillText: vi.fn(),
          scale: vi.fn(),
          strokeRect: vi.fn(),
        }) as unknown as CanvasRenderingContext2D,
    );
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback, type) => {
      callback(new Blob(["png"], { type: type || "image/png" }));
    });
    vi.stubGlobal(
      "Image",
      class {
        crossOrigin = "";
        onerror: (() => void) | null = null;
        onload: (() => void) | null = null;

        set src(_source: string) {
          queueMicrotask(() => this.onerror?.());
        }
      },
    );

    await downloadElementAsPng(element, "analysis-node.svg");

    expect(downloads).toEqual(["analysis-node.png"]);
  });
});
