import type { Paragraph } from "docx";
import type { ReportBlock, ReportDraft } from "../../../api/admin/model";
import { describeSampleSize, formatFilterSummary } from "./reportDraft";

const docxFont = "Malgun Gothic";
const bulletReference = "report-bullets";

// 보고서 초안을 Word(.docx) 문서 Blob으로 변환한다.
// docx 라이브러리는 용량이 커서 내보내기 시점에만 동적으로 불러온다.
export async function exportReportDocx(draft: ReportDraft): Promise<Blob> {
  const docx = await import("docx");
  const { AlignmentType, Document, HeadingLevel, LevelFormat, Packer, Paragraph } = docx;

  // "라벨: 값" 형태의 굵은 라벨 문단을 만든다.
  const metaParagraph = (label: string, value: string): Paragraph =>
    new Paragraph({
      children: [
        new docx.TextRun({ text: `${label}: `, bold: true }),
        new docx.TextRun({ text: value || "-" }),
      ],
    });
  const paragraph = (text: string): Paragraph => new Paragraph({ children: [new docx.TextRun(text)] });
  const bullet = (text: string): Paragraph =>
    new Paragraph({ children: [new docx.TextRun(text)], numbering: { reference: bulletReference, level: 0 } });

  // 한 블록을 제목·메타·요약·본문·근거·제안 조치 문단들로 변환한다.
  const blockParagraphs = (block: ReportBlock): Paragraph[] => {
    const paragraphs: Paragraph[] = [
      new Paragraph({ text: block.title, heading: HeadingLevel.HEADING_1 }),
      metaParagraph("응답 규모", describeSampleSize(block.n)),
      metaParagraph("적용 조건", formatFilterSummary(block.filters)),
    ];
    if (block.isLowSample) paragraphs.push(metaParagraph("해석 주의", "응답이 적어 방향성 참고용으로 해석해야 합니다."));
    if (block.caution) paragraphs.push(metaParagraph("AI 주의 문구", block.caution));
    paragraphs.push(paragraph(block.summary));

    block.body?.forEach((item) => paragraphs.push(bullet(item)));

    if (block.evidence.length) {
      paragraphs.push(metaParagraph("근거", ""));
      block.evidence.forEach((evidence) =>
        paragraphs.push(bullet(`${evidence.label}${typeof evidence.n === "number" ? ` (응답 ${describeSampleSize(evidence.n)})` : ""}`)),
      );
    }

    if (block.suggestedActions?.length) {
      paragraphs.push(metaParagraph("제안 조치", ""));
      block.suggestedActions.forEach((action) => paragraphs.push(bullet(action)));
    }

    return paragraphs;
  };

  const meta = draft.metadata;
  const children: Paragraph[] = [
    new Paragraph({ text: meta.title, heading: HeadingLevel.TITLE }),
    metaParagraph("학기", meta.term),
    metaParagraph("작성일", meta.reportDate),
    metaParagraph("작성자/부서", meta.author),
    metaParagraph("조사 기간", meta.surveyPeriod),
    metaParagraph("대상", meta.audience),
    metaParagraph("방식", meta.method),
    metaParagraph("목적", meta.purpose),
    new Paragraph({ text: "목차", heading: HeadingLevel.HEADING_1 }),
    ...draft.blocks.map((block, index) => paragraph(`${index + 1}. ${block.title}`)),
  ];

  draft.blocks.forEach((block) => children.push(...blockParagraphs(block)));

  const doc = new Document({
    styles: { default: { document: { run: { font: docxFont } } } },
    numbering: {
      config: [
        {
          reference: bulletReference,
          levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT }],
        },
      ],
    },
    sections: [{ children }],
  });

  return Packer.toBlob(doc);
}

// .docx Blob을 파일로 내려받는다.
export function downloadDocx(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
