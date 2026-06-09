import type { ReportBlock, ReportNarrativeBlockResult, ReportNarrativeCommand, ReportNarrativeResult } from "../../model";

const maxBodyItemsPerBlock = 8;
const maxBodyTextLength = 180;
const maxNarrativeBodyItems = 5;
const maxNarrativeBodyTextLength = 280;
const maxEvidencePerBlock = 8;
const lowSampleFallbackCaution = "응답이 적어 방향성 참고용으로 해석해야 합니다.";
const sensitivePatterns = [
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
  /\b\d{7,10}\b/g,
  /\b(?:user|response|student|email|name|학번|이름|메일|사용자|응답자)[-_ ]?id\s*[:=]\s*[\w-]+/gi,
];

export function sanitizeReportNarrativeCommand(command: ReportNarrativeCommand): ReportNarrativeCommand {
  return {
    surveyId: command.surveyId,
    metadata: {
      title: sanitizeText(command.metadata.title),
      term: sanitizeText(command.metadata.term),
      reportDate: sanitizeText(command.metadata.reportDate),
      author: sanitizeText(command.metadata.author),
      surveyPeriod: sanitizeText(command.metadata.surveyPeriod),
      audience: sanitizeText(command.metadata.audience),
      method: sanitizeText(command.metadata.method),
      purpose: sanitizeText(command.metadata.purpose, 240),
    },
    filters: command.filters,
    blocks: command.blocks.map(sanitizeBlock),
  };
}

export function normalizeReportNarrativeResult(result: unknown, command: ReportNarrativeCommand): ReportNarrativeResult {
  const generatedAt = readRecord(result)?.generatedAt;
  const blocks = Array.isArray(readRecord(result)?.blocks) ? (readRecord(result)?.blocks as unknown[]) : [];
  const commandBlocks = new Map(command.blocks.map((block) => [block.id, block]));
  const normalized = blocks
    .map((block) => normalizeBlockResult(block, commandBlocks))
    .filter((block): block is ReportNarrativeBlockResult => Boolean(block));

  return {
    generatedAt: typeof generatedAt === "string" && generatedAt.trim() ? generatedAt : new Date().toISOString(),
    blocks: normalized,
  };
}

function sanitizeBlock(block: ReportBlock): ReportBlock {
  return {
    id: block.id,
    kind: block.kind,
    title: sanitizeText(block.title),
    summary: sanitizeText(block.summary, 240),
    n: block.n,
    filters: block.filters,
    isLowSample: block.isLowSample,
    evidence: block.evidence.slice(0, maxEvidencePerBlock).map((evidence) => ({
      id: sanitizeIdentifier(evidence.id),
      label: sanitizeText(evidence.label, 140),
      source: evidence.source,
      n: evidence.n,
    })),
    body: block.body?.slice(0, maxBodyItemsPerBlock).map((item) => sanitizeText(item, maxBodyTextLength)).filter(Boolean),
    caution: block.caution ? sanitizeText(block.caution, 160) : undefined,
    suggestedActions: block.suggestedActions?.slice(0, 5).map((item) => sanitizeText(item, 140)).filter(Boolean),
    narrativeEvidenceIds: block.narrativeEvidenceIds?.slice(0, maxEvidencePerBlock).map(sanitizeIdentifier).filter(Boolean),
  };
}

function normalizeBlockResult(block: unknown, commandBlocks: Map<string, ReportBlock>): ReportNarrativeBlockResult | null {
  const record = readRecord(block);
  if (!record) return null;
  const blockId = typeof record.blockId === "string" ? record.blockId : "";
  const commandBlock = commandBlocks.get(blockId);
  if (!commandBlock) return null;
  const summary = typeof record.summary === "string" ? sanitizeText(record.summary, 360) : "";
  if (!summary) return null;
  const validEvidenceIds = new Set(commandBlock.evidence.map((evidence) => evidence.id));
  const evidenceIds = Array.isArray(record.evidenceIds)
    ? record.evidenceIds
        .filter((id): id is string => typeof id === "string")
        .map(sanitizeIdentifier)
        .filter((id) => validEvidenceIds.has(id))
        .slice(0, maxEvidencePerBlock)
    : [];
  const suggestedActions = Array.isArray(record.suggestedActions)
    ? record.suggestedActions
        .filter((item): item is string => typeof item === "string")
        .map((item) => sanitizeText(item, 160))
        .filter(Boolean)
        .slice(0, 5)
    : [];
  const body = Array.isArray(record.body)
    ? record.body
        .filter((item): item is string => typeof item === "string")
        .map((item) => sanitizeText(item, maxNarrativeBodyTextLength))
        .filter(Boolean)
        .slice(0, maxNarrativeBodyItems)
    : [];
  const caution = typeof record.caution === "string" && record.caution.trim()
    ? sanitizeText(record.caution, 180)
    : commandBlock.isLowSample
      ? lowSampleFallbackCaution
      : undefined;

  return {
    blockId,
    summary,
    body,
    evidenceIds,
    caution,
    suggestedActions,
  };
}

function sanitizeText(value: string, maxLength = 160): string {
  const compact = value.replace(/\s+/g, " ").trim();
  const redacted = sensitivePatterns.reduce((text, pattern) => text.replace(pattern, "[비식별]"), compact);
  return redacted.length > maxLength ? `${redacted.slice(0, maxLength).trim()}...` : redacted;
}

function sanitizeIdentifier(value: string): string {
  return value.replace(/[^\w:-]/g, "").slice(0, 120);
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}
