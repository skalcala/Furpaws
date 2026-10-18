import { adminPaths, ownerPaths, screenPath } from "./routes";
import { Navigate, Outlet, Route, Routes, useLocation, useParams } from "react-router-dom";
import { Spin } from "antd";
import { useAuth } from "./components/Auth/AuthContext";
import Login from "./components/Auth/Login";
import PublicLanding from "./components/Public/PublicLanding";
import AccountSettings from "./components/Shared/AccountSettings";
import Layout from "./components/Shared/Layout";
import {
  MedicalRecords,
  MyPets,
  Notifications,
  OwnerAppointments,
  OwnerDashboard,
  PetDetail,
} from "./components/Owner/OwnerPages";
import Booking from "./components/Booking/Booking";
import AdminAppointments from "./components/Admin/Appointments";
import Consultation from "./components/Admin/Consultation";
import {
  AdminDashboard,
  AuditLogs,
  Billing,
  Owners,
  Reports,
  ResourceManager,
  ScheduleSettings,
  Vaccinations,
} from "./components/Admin/Management";
function LegacyRoute({ role, screen }) {
  const { id } = useParams();
  const { search, hash } = useLocation();
  return <Navigate to={`/${role}/${screenPath(role, screen)}${id ? '/' + encodeURIComponent(id) : ''}${search}${hash}`} replace />;
}
function Protected({ role }) {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="loading">
        <Spin />
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role)
    return (
      <Navigate
        to={user.role === "ADMIN" ? "/admin/dashboard" : "/owner/dashboard"}
        replace
      />
    );
  return <Outlet />;
}
function Home() {
  const { user, loading } = useAuth();
  return loading ? (
    <Spin />
  ) : (
    <Navigate
      to={user ? (user.role === "ADMIN" ? "/admin/dashboard" : "/owner/dashboard") : "/"}
      replace
    />
  );
}
export default function AppController() {
  return (
    <Routes>
      <Route path="/" element={<PublicLanding />} />
      <Route path="/login" element={<Login />} />
      <Route element={<Protected role="OWNER" />}>
        <Route path="/owner" element={<Layout />}>
          {Object.keys(ownerPaths).flatMap(screen => [
            <Route key={screen} path={screen} element={<LegacyRoute role="owner" screen={screen} />} />,
            <Route key={screen + '-detail'} path={screen + '/:id'} element={<LegacyRoute role="owner" screen={screen} />} />
          ])}
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<OwnerDashboard />} />
          <Route path="settings" element={<AccountSettings />} />

          <Route path="my-pets" element={<MyPets />} />
          <Route path="pets/:id" element={<PetDetail />} />
          <Route path="medical-records/:id" element={<MedicalRecords />} />
          {["U4", "U5", "U6", "U7", "U8"].map((screen) => (
            <Route key={screen} path={ownerPaths[screen]} element={<Booking />} />
          ))}

          <Route path="my-appointments" element={<OwnerAppointments />} />
          <Route path="notifications" element={<Notifications />} />
        </Route>
      </Route>
      <Route element={<Protected role="ADMIN" />}>
        <Route path="/admin" element={<Layout />}>
          {Object.keys(adminPaths).flatMap(screen => [
            <Route key={screen} path={screen} element={<LegacyRoute role="admin" screen={screen} />} />,
            <Route key={screen + '-detail'} path={screen + '/:id'} element={<LegacyRoute role="admin" screen={screen} />} />
          ])}
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="approvals" element={<AdminAppointments mode="approvals" />} />
          <Route
            path="approvals/:id"
            element={<AdminAppointments mode="approvals" />}
          />

          <Route path="appointments" element={<AdminAppointments />} />
          <Route path="todays-queue" element={<AdminAppointments mode="queue" />} />
          <Route path="consultations" element={<Consultation />} />
          <Route path="consultations/:id" element={<Consultation />} />

          <Route path="pets-and-owners" element={<Owners />} />
          <Route path="owners/:id" element={<Owners />} />
          <Route path="pets/:id" element={<PetDetail admin />} />
          <Route path="medical-records/:id" element={<MedicalRecords admin />} />
          <Route path="vaccinations" element={<Vaccinations />} />
          <Route
            path="medicine-inventory"
            element={<ResourceManager key="medicines" resource="medicines" />}
          />
          <Route
            path="services"
            element={<ResourceManager key="services" resource="services" />}
          />
          <Route path="schedule-settings" element={<ScheduleSettings />} />
          <Route path="billing-and-payments" element={<Billing />} />
          <Route path="reports" element={<Reports />} />
          <Route
            path="expenses"
            element={<ResourceManager key="expenses" resource="expenses" />}
          />
          <Route path="notifications" element={<Notifications admin />} />
          <Route path="audit-logs" element={<AuditLogs />} />
          <Route path="settings" element={<AccountSettings />} />
        </Route>
      </Route>
      <Route path="*" element={<Home />} />
    </Routes>
  );
}
