import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAdminApiController } from "../controller/adminApiControllerProvider";
import type { AdminSignInCommand } from "../model";
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

export function useGoogleSignInMutation() {
  const controller = useAdminApiController();
  return useMutation({
    mutationFn: (command: AdminSignInCommand) => controller.signInWithGoogle(command),
  });
}

export function useAdminSignOutMutation() {
  const controller = useAdminApiController();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => controller.signOut(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.adminSession });
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.currentAdmin });
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.surveys });
    },
  });
}
