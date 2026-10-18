const SLOT_MINUTES = 30;
const SLOT_CAPACITY = 1;
const minutes = value => {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value || "")) return NaN;
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
};
const timesForHours = hours => {
  const start = Math.ceil(minutes(hours?.open) / SLOT_MINUTES) * SLOT_MINUTES;
  const end = minutes(hours?.close);
  const times = [];
  for (let value = start; value + SLOT_MINUTES <= end; value += SLOT_MINUTES)
    times.push(`${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`);
  return times;
};
const hoursForDate = (schedule, date) => schedule.hours.find(
  ({ day }) => day === new Date(`${date}T12:00:00+08:00`).getUTCDay(),
);
const timesForDate = (schedule, date) => timesForHours(hoursForDate(schedule, date));
const scheduleTimes = schedule => [...new Set(schedule.hours.flatMap(timesForHours))].sort();
module.exports = { SLOT_MINUTES, SLOT_CAPACITY, timesForDate, scheduleTimes };
