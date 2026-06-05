import type { ParticipantLoginContent, ParticipantLoginImage, ParticipantSurvey, ParticipantSurveyDetail } from "../../model";
import type { RawQuestion, RawSection, RawSurvey, RawSurveyAsset } from "../../../admin/service/gateway/rawTypes";
import type { RawParticipantLoginContent, RawParticipantLoginImage } from "../gateway";
import { AdminPayloadMapper } from "../../../admin/service/mapper/adminPayloadMapper";
import { getSurveyPublicIdentifier } from "../../../admin/model";

export class ParticipantSurveyMapper {
  constructor(private readonly adminMapper: AdminPayloadMapper = new AdminPayloadMapper()) {}

  toSurvey(row: RawSurvey): ParticipantSurvey {
    const survey = this.adminMapper.toSurvey(row);
    return {
      id: survey.id,
      title: survey.title,
      description: survey.description,
      publicSlug: survey.publicSlug,
      publicCode: survey.publicCode,
      publicIdentifier: getSurveyPublicIdentifier(survey) ?? "",
      versionNumber: survey.versionNumber,
      settings: survey.settings,
      startsAt: survey.startsAt,
      endsAt: survey.endsAt,
      publishedAt: survey.publishedAt,
    };
  }

  toDetail(args: {
    survey: RawSurvey;
    sections: RawSection[];
    questions: RawQuestion[];
    assets: RawSurveyAsset[];
  }): ParticipantSurveyDetail {
    return {
      survey: this.toSurvey(args.survey),
      sections: args.sections.map((row) => this.adminMapper.toSection(row)),
      questions: args.questions.map((row) => this.adminMapper.toQuestion(row)),
      assets: args.assets.map((row) => this.adminMapper.toAsset(row)),
    };
  }

  toLoginContent(row: RawParticipantLoginContent | null): ParticipantLoginContent | null {
    if (!row) return null;
    return {
      title: row.title,
      headline: row.headline,
      headlineEn: row.headline_en,
      bodyParagraphs: normalizeBodyParagraphs(row.body_paragraphs),
      bodyParagraphsEn: normalizeBodyParagraphs(row.body_paragraphs_en),
      headerImage: row.header_image ? toLoginImage(row.header_image) : undefined,
      bottomImage: row.bottom_image ? toLoginImage(row.bottom_image) : undefined,
    };
  }
}

function normalizeBodyParagraphs(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, 2);
}

function toLoginImage(image: RawParticipantLoginImage): ParticipantLoginImage {
  return {
    assetId: image.asset_id,
    storageBucket: image.storage_bucket,
    storagePath: image.storage_path,
    signedUrl: image.signed_url,
  };
}
