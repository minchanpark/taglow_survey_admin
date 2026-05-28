export function isHandongEmail(email: string | undefined): boolean {
  return email?.toLowerCase().endsWith("@handong.ac.kr") ?? false;
}
