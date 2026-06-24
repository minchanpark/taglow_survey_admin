export async function downloadElementAsPng(element: HTMLElement, filename: string): Promise<void> {
  const width = Math.max(1, Math.ceil(element.scrollWidth || element.getBoundingClientRect().width || 800));
  const height = Math.max(1, Math.ceil(element.scrollHeight || element.getBoundingClientRect().height || 480));
  const pngFilename = ensurePngFilename(filename);
  const clone = element.cloneNode(true) as HTMLElement;
  clone.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  inlineComputedStyles(element, clone);
  clone.querySelectorAll('[data-capture-hidden="true"]').forEach((node) => node.remove());
  await inlineImages(clone);
  clone.style.width = `${width}px`;
  clone.style.minHeight = `${height}px`;
  clone.style.background = getComputedStyle(element).backgroundColor || "#ffffff";

  const html = new XMLSerializer().serializeToString(clone);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <foreignObject width="100%" height="100%">${html}</foreignObject>
    </svg>
  `;
  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const image = await loadImage(svgUrl);
    const canvas = document.createElement("canvas");
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas context is not available.");
    context.scale(window.devicePixelRatio, window.devicePixelRatio);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    const blob = await canvasToBlob(canvas);
    downloadBlob(blob, pngFilename);
  } catch (error) {
    console.warn("High-fidelity PNG export failed. Falling back to simplified PNG export.", error);
    const fallbackBlob = await renderElementFallbackPng(element, width, height);
    downloadBlob(fallbackBlob, pngFilename);
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

type TrustedCsvFormula = Readonly<{
  kind: "trusted-csv-formula";
  formula: string;
}>;

export function createExcelTextFormulaCell(value: string): TrustedCsvFormula {
  return {
    kind: "trusted-csv-formula",
    formula: `="${value.replace(/"/g, '""')}"`,
  };
}

export function downloadCsvFile(filename: string, rows: ReadonlyArray<ReadonlyArray<unknown>>): void {
  const csv = rows.map((row) => row.map(formatCsvCell).join(",")).join("\r\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  downloadBlob(blob, ensureCsvFilename(filename));
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Image capture failed."));
    image.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("PNG export failed."));
      }
    }, "image/png");
  });
}

async function renderElementFallbackPng(element: HTMLElement, width: number, height: number): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = width * window.devicePixelRatio;
  canvas.height = height * window.devicePixelRatio;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas context is not available.");

  context.scale(window.devicePixelRatio, window.devicePixelRatio);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  await drawElementFallback(context, element, element.getBoundingClientRect());
  return canvasToBlob(canvas);
}

async function drawElementFallback(
  context: CanvasRenderingContext2D,
  element: Element,
  rootRect: DOMRect,
): Promise<void> {
  if (!(element instanceof HTMLElement) || element.dataset.captureHidden === "true") return;
  const style = getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  if (!isVisible(style, rect)) return;

  const x = rect.left - rootRect.left;
  const y = rect.top - rootRect.top;
  drawElementBox(context, style, x, y, rect.width, rect.height);

  if (element instanceof HTMLImageElement) {
    await drawImageElementFallback(context, element, x, y, rect.width, rect.height);
    return;
  }

  for (const child of Array.from(element.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      drawTextNodeFallback(context, child, style, rootRect);
    } else if (child instanceof Element) {
      await drawElementFallback(context, child, rootRect);
    }
  }
}

function drawElementBox(
  context: CanvasRenderingContext2D,
  style: CSSStyleDeclaration,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  const backgroundColor = normalizePaintColor(style.backgroundColor);
  if (backgroundColor) {
    context.fillStyle = backgroundColor;
    context.fillRect(x, y, width, height);
  }

  const borderWidth = parseCssPixels(style.borderTopWidth);
  const borderColor = normalizePaintColor(style.borderTopColor);
  if (borderWidth > 0 && borderColor) {
    context.strokeStyle = borderColor;
    context.lineWidth = borderWidth;
    context.strokeRect(x + borderWidth / 2, y + borderWidth / 2, width - borderWidth, height - borderWidth);
  }
}

async function drawImageElementFallback(
  context: CanvasRenderingContext2D,
  imageElement: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
): Promise<void> {
  const source = imageElement.currentSrc || imageElement.src;
  if (!source) {
    drawImagePlaceholder(context, x, y, width, height, imageElement.alt);
    return;
  }

  try {
    const image = await loadImage(source);
    context.drawImage(image, x, y, width, height);
  } catch {
    drawImagePlaceholder(context, x, y, width, height, imageElement.alt);
  }
}

function drawImagePlaceholder(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  label?: string,
): void {
  context.fillStyle = "#F1F3F7";
  context.fillRect(x, y, width, height);
  context.strokeStyle = "#D1D5E0";
  context.strokeRect(x, y, width, height);
  context.fillStyle = "#6B7280";
  context.font = "13px sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(label || "이미지를 캡처할 수 없습니다.", x + width / 2, y + height / 2, Math.max(40, width - 24));
}

function drawTextNodeFallback(
  context: CanvasRenderingContext2D,
  textNode: ChildNode,
  style: CSSStyleDeclaration,
  rootRect: DOMRect,
): void {
  const text = textNode.textContent?.replace(/\s+/g, " ").trim();
  if (!text) return;

  const range = document.createRange();
  range.selectNodeContents(textNode);
  const [rect] = typeof range.getClientRects === "function" ? Array.from(range.getClientRects()) : [];
  range.detach();
  if (!rect || rect.width <= 0 || rect.height <= 0) return;

  context.fillStyle = normalizePaintColor(style.color) || "#111217";
  context.font = [
    style.fontStyle,
    style.fontVariant,
    style.fontWeight,
    `${style.fontSize}/${style.lineHeight === "normal" ? "1.4" : style.lineHeight}`,
    style.fontFamily,
  ].join(" ");
  context.textAlign = "left";
  context.textBaseline = "top";
  context.fillText(text, rect.left - rootRect.left, rect.top - rootRect.top, Math.max(20, rect.width));
}

function isVisible(style: CSSStyleDeclaration, rect: DOMRect): boolean {
  return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) !== 0 && rect.width > 0 && rect.height > 0;
}

function normalizePaintColor(color: string): string | null {
  if (!color || color === "transparent" || color === "rgba(0, 0, 0, 0)") return null;
  return color;
}

function parseCssPixels(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function ensurePngFilename(filename: string): string {
  return filename.replace(/\.(svg|jpe?g|png)$/i, "") + ".png";
}

function ensureCsvFilename(filename: string): string {
  return filename.replace(/\.(xlsx?|csv|tsv)$/i, "") + ".csv";
}

function formatCsvCell(value: unknown): string {
  if (isTrustedCsvFormula(value)) {
    return `"${value.formula.replace(/"/g, '""')}"`;
  }
  const text = value == null ? "" : String(value);
  const safeText = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safeText.replace(/"/g, '""')}"`;
}

function isTrustedCsvFormula(value: unknown): value is TrustedCsvFormula {
  return Boolean(value && typeof value === "object" && (value as TrustedCsvFormula).kind === "trusted-csv-formula");
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function inlineComputedStyles(source: Element, target: Element): void {
  if (target instanceof HTMLElement || target instanceof SVGElement) {
    const targetStyle = target instanceof HTMLElement || target instanceof SVGElement ? target.style : undefined;
    const computedStyle = getComputedStyle(source);
    for (let index = 0; index < computedStyle.length; index += 1) {
      const property = computedStyle.item(index);
      targetStyle?.setProperty(property, computedStyle.getPropertyValue(property), computedStyle.getPropertyPriority(property));
    }
  }

  const sourceChildren = Array.from(source.children);
  const targetChildren = Array.from(target.children);
  sourceChildren.forEach((sourceChild, index) => {
    const targetChild = targetChildren[index];
    if (targetChild) inlineComputedStyles(sourceChild, targetChild);
  });
}

async function inlineImages(root: HTMLElement): Promise<void> {
  const images = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    images.map(async (image) => {
      const source = image.currentSrc || image.src;
      if (!source || source.startsWith("data:") || source.startsWith("blob:")) return;
      try {
        const response = await fetch(source, { mode: "cors" });
        if (!response.ok) throw new Error("Image fetch failed.");
        const blob = await response.blob();
        image.src = await blobToDataUrl(blob);
      } catch {
        const placeholder = document.createElement("span");
        placeholder.textContent = image.alt || "이미지를 캡처할 수 없습니다.";
        placeholder.style.display = "grid";
        placeholder.style.width = "100%";
        placeholder.style.height = "100%";
        placeholder.style.placeItems = "center";
        placeholder.style.padding = "16px";
        placeholder.style.color = "#6B7280";
        placeholder.style.background = "#F1F3F7";
        placeholder.style.font = "13px/20px sans-serif";
        placeholder.style.textAlign = "center";
        image.replaceWith(placeholder);
      }
    }),
  );
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Image conversion failed."));
      }
    };
    reader.onerror = () => reject(new Error("Image conversion failed."));
    reader.readAsDataURL(blob);
  });
}
