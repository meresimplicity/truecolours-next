import { StaffSessionProvider } from "@/components/auth/StaffSessionProvider";
import { ServiceWorkerRegistration } from "@/components/pwa/ServiceWorkerRegistration";
import { AdminShell } from "@/components/admin/AdminShell";
import type { Metadata } from "next";
import { OfflineStatusProvider } from "@/components/pwa/OfflineStatus";
export const metadata: Metadata = {
  title: "TRUECOLOURS Admin",
  description: "Business administration",
};
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StaffSessionProvider>
      <OfflineStatusProvider>
        <ServiceWorkerRegistration />
        <AdminShell>{children}</AdminShell>
      </OfflineStatusProvider>
    </StaffSessionProvider>
  );
}
