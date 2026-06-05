import { useMutation } from "@tanstack/react-query";
import { useAdminApiController } from "../controller/adminApiControllerProvider";
import type { ReportNarrativeCommand } from "../model";

export function useGenerateReportNarrativeMutation() {
  const controller = useAdminApiController();
  return useMutation({
    mutationFn: (command: ReportNarrativeCommand) => controller.generateReportNarrative(command),
  });
}
