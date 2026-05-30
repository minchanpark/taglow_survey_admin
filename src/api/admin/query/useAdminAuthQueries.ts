import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAdminApiController } from "../controller/adminApiControllerProvider";
import type {
  AdminSignInCommand,
  ApproveAdminMemberCommand,
  DeleteAdminMemberCommand,
  UpdateAdminMemberRoleCommand,
} from "../model";
import { adminQueryKeys } from "./queryKeys";

export function useAdminSessionQuery() {
  const controller = useAdminApiController();
  return useQuery({
    queryKey: adminQueryKeys.adminSession,
    queryFn: () => controller.getAdminSessionState(),
  });
}

export function useCurrentAdminQuery() {
  const controller = useAdminApiController();
  return useQuery({
    queryKey: adminQueryKeys.currentAdmin,
    queryFn: () => controller.getCurrentAdmin(),
  });
}

export function usePendingAdminMembersQuery(enabled = true) {
  const controller = useAdminApiController();
  return useQuery({
    queryKey: adminQueryKeys.pendingAdminMembers,
    queryFn: () => controller.listPendingAdminMembers(),
    enabled,
  });
}

export function useActiveAdminMembersQuery(enabled = true) {
  const controller = useAdminApiController();
  return useQuery({
    queryKey: adminQueryKeys.activeAdminMembers,
    queryFn: () => controller.listActiveAdminMembers(),
    enabled,
  });
}

export function useGoogleSignInMutation() {
  const controller = useAdminApiController();
  return useMutation({
    mutationFn: (command: AdminSignInCommand) => controller.signInWithGoogle(command),
  });
}

export function useRequestAdminAccessMutation() {
  const controller = useAdminApiController();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => controller.requestAdminAccess(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.adminSession });
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.currentAdmin });
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.pendingAdminMembers });
    },
  });
}

export function useApproveAdminMemberMutation() {
  const controller = useAdminApiController();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (command: ApproveAdminMemberCommand) => controller.approveAdminMember(command),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.pendingAdminMembers });
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.activeAdminMembers });
    },
  });
}

export function useUpdateAdminMemberRoleMutation() {
  const controller = useAdminApiController();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (command: UpdateAdminMemberRoleCommand) => controller.updateAdminMemberRole(command),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.activeAdminMembers });
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.adminSession });
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.currentAdmin });
    },
  });
}

export function useDeleteAdminMemberMutation() {
  const controller = useAdminApiController();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (command: DeleteAdminMemberCommand) => controller.deleteAdminMember(command),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.activeAdminMembers });
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.pendingAdminMembers });
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.adminSession });
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.currentAdmin });
    },
  });
}

export function useAdminSignOutMutation() {
  const controller = useAdminApiController();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => controller.signOut(),
    onSuccess: () => {
      queryClient.setQueryData(adminQueryKeys.adminSession, { isAuthenticated: false });
      queryClient.setQueryData(adminQueryKeys.currentAdmin, null);
      queryClient.setQueryData(adminQueryKeys.pendingAdminMembers, []);
      queryClient.setQueryData(adminQueryKeys.activeAdminMembers, []);
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.adminSession });
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.currentAdmin });
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.pendingAdminMembers });
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.activeAdminMembers });
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.surveys });
    },
  });
}
