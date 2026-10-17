import { Panel } from "./UI";

// Owner-supplied history is kept separate from the Admin's clinical findings.
export default function VisitDetails({ appointment }) {
  if (
    appointment.service?.type !== "Consultation" &&
    !appointment.reasonForVisit
  )
    return null;
  return (
    <Panel title="Owner’s explanation / symptoms">
      <p className="visit-explanation">
        {appointment.reasonForVisit ||
          "No owner explanation was recorded for this earlier booking."}
      </p>
    </Panel>
  );
}
