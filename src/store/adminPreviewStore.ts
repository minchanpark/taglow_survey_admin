import { create } from "zustand";
import type { Locale } from "../api/admin/model";

type PreviewDevice = "mobile" | "desktop";

type AdminPreviewState = Readonly<{
  locale: Locale;
  device: PreviewDevice;
  activeSectionId?: string;
  setLocale: (locale: Locale) => void;
  setDevice: (device: PreviewDevice) => void;
  setActiveSectionId: (sectionId: string | undefined) => void;
  resetPreview: () => void;
}>;

export const useAdminPreviewStore = create<AdminPreviewState>((set) => ({
  locale: "ko",
  device: "mobile",
  activeSectionId: undefined,
  setLocale: (locale) => set({ locale }),
  setDevice: (device) => set({ device }),
  setActiveSectionId: (sectionId) => set({ activeSectionId: sectionId }),
  resetPreview: () => set({ locale: "ko", device: "mobile", activeSectionId: undefined }),
}));
