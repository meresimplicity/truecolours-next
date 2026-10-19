import type { Metadata } from "next";
import { AccountAccess } from "@/components/auth/AccountAccess";

export const metadata: Metadata = {
  title: "My Account | TRUECOLOURS",
  description: "Manage your TRUECOLOURS quotations, orders, saved paint colours and delivery details.",
};

export default function AccountPage() {
  return <AccountAccess />;
}
