import { Panel } from "./UI";
import { isFollowUpService } from "../../api";
export default function VisitDetails({ appointment }) {
  const followUp = isFollowUpService(appointment.service);
  const emergency = appointment.source === "Emergency";
  if (
    appointment.service?.type !== "Consultation" &&
    !appointment.reasonForVisit
  )
    return null;
  return (
    <Panel
      title={
        emergency
          ? "Emergency concern / intake notes"
          : followUp
            ? "Follow-up notes (optional)"
            : "Owner’s explanation / symptoms"
      }
    >
      <p className="visit-explanation">
        {appointment.reasonForVisit ||
          (followUp
            ? "No additional follow-up notes were provided."
            : "No owner explanation was recorded for this earlier booking.")}
      </p>
    </Panel>
  );
}
