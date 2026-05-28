import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAdminApiController } from "../controller/adminApiControllerProvider";
import type { UploadSurveyImageCommand } from "../model";
import { adminQueryKeys } from "./queryKeys";

export function useUploadSurveyImageMutation() {
  const controller = useAdminApiController();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (command: UploadSurveyImageCommand) => controller.uploadSurveyImage(command),
    onSuccess: (asset) => {
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.survey(asset.surveyId) });
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.assets(asset.surveyId) });
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.questions(asset.surveyId) });
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.previewRoot(asset.surveyId) });
    },
  });
}
