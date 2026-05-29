export const participantSurveyQueryKeys = {
  session: ["participant", "session"] as const,
  survey: (publicIdentifier: string) => ["participant", "survey", publicIdentifier] as const,
};
