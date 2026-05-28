export const participantSurveyQueryKeys = {
  survey: (publicIdentifier: string) => ["participant", "survey", publicIdentifier] as const,
};
