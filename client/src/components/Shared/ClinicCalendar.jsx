import { useState } from "react";
import { Button } from "antd";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import { dayKey } from "../../api";

export default function ClinicCalendar({ appointments = [] }) {
  const today = dayKey();
  const [month, setMonth] = useState(() => new Date(`${today}T12:00:00`));
  const year = month.getFullYear(),
    index = month.getMonth();
  const offset = (new Date(year, index, 1).getDay() + 6) % 7;
  const length = new Date(year, index + 1, 0).getDate();
  const visits = appointments.reduce((counts, visit) => {
    if (!["Declined", "Cancelled"].includes(visit.status))
      counts[visit.date] = (counts[visit.date] || 0) + 1;
    return counts;
  }, {});
  const previous = () => setMonth(new Date(year, index - 1, 1));
  const next = () => setMonth(new Date(year, index + 1, 1));
  return (
    <section className="clinic-mini-calendar" aria-label="Clinic calendar">
      <h2>Calendar</h2>
      <div className="clinic-calendar-month">
        <Button
          type="text"
          size="small"
          aria-label="Previous calendar month"
          icon={<LeftOutlined />}
          onClick={previous}
        />
        <strong aria-live="polite">
          {month.toLocaleDateString("en-PH", {
            month: "long",
            year: "numeric",
          })}
        </strong>
        <Button
          type="text"
          size="small"
          aria-label="Next calendar month"
          icon={<RightOutlined />}
          onClick={next}
        />
      </div>
      <div className="clinic-calendar-grid">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
          <span className="clinic-calendar-weekday" key={day}>
            {day}
          </span>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <span aria-hidden="true" key={`empty-${i}`} />
        ))}
        {Array.from({ length }, (_, i) => {
          const date = `${year}-${String(index + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
          return (
            <time
              key={date}
              dateTime={date}
              aria-current={date === today ? "date" : undefined}
              className={`clinic-calendar-date${date === today ? " is-today" : ""}${visits[date] ? " has-visits" : ""}`}
              title={`${date}${visits[date] ? ` · ${visits[date]} appointments` : ""}`}
            >
              {i + 1}
            </time>
          );
        })}
      </div>
    </section>
  );
}
