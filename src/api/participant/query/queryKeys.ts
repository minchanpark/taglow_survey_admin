export const participantSurveyQueryKeys = {
  session: ["participant", "session"] as const,
  loginContent: (publicIdentifier: string) => ["participant", "loginContent", publicIdentifier] as const,
  survey: (publicIdentifier: string) => ["participant", "survey", publicIdentifier] as const,
};
