import type { ParticipantSurvey, ParticipantSurveyDetail } from "../../model";
import type { RawQuestion, RawSection, RawSurvey, RawSurveyAsset } from "../../../admin/service/gateway/rawTypes";
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
}
