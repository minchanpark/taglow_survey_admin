import { create } from "zustand";

type ToastTone = "info" | "success" | "warning" | "danger";

type ToastState = Readonly<{
  message: string;
  tone: ToastTone;
}>;

type UiState = Readonly<{
  toast?: ToastState;
  isSidebarCollapsed: boolean;
  showToast: (toast: ToastState) => void;
  clearToast: () => void;
  setSidebarCollapsed: (isCollapsed: boolean) => void;
}>;

export const useUiStore = create<UiState>((set) => ({
  toast: undefined,
  isSidebarCollapsed: false,
  showToast: (toast) => set({ toast }),
  clearToast: () => set({ toast: undefined }),
  setSidebarCollapsed: (isSidebarCollapsed) => set({ isSidebarCollapsed }),
}));
