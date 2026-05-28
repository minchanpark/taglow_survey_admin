import { createContext, useContext, type ReactNode } from "react";
import type { ParticipantSurveyController } from "./participantSurveyController";

const ParticipantSurveyControllerContext = createContext<ParticipantSurveyController | null>(null);

export function ParticipantSurveyControllerProvider(props: {
  controller: ParticipantSurveyController;
  children: ReactNode;
}) {
  return (
    <ParticipantSurveyControllerContext.Provider value={props.controller}>
      {props.children}
    </ParticipantSurveyControllerContext.Provider>
  );
}

export function useParticipantSurveyController(): ParticipantSurveyController {
  const controller = useContext(ParticipantSurveyControllerContext);
  if (!controller) {
    throw new Error("ParticipantSurveyControllerProvider is missing.");
  }
  return controller;
}
