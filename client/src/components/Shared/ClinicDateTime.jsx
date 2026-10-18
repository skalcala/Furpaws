import { useEffect, useState } from "react";
import { CalendarOutlined } from "@ant-design/icons";
import { formatDateTime } from "../../api";
export default function ClinicDateTime() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const interval = window.setInterval(() => setNow(new Date()), 30000); return () => window.clearInterval(interval); }, []);
  return <time className="page-date" dateTime={now.toISOString()}><CalendarOutlined /> {formatDateTime(now)}</time>;
}
