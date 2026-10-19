import type { DefaultSession } from "next-auth";
import type { BusinessRole } from "@/lib/business/permissions";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: BusinessRole;
      locationIds: string[];
      staffSessionVersion: number;
    };
  }

  interface User {
    role: BusinessRole;
    locationIds: string[];
    staffSessionVersion: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: BusinessRole;
    locationIds: string[];
    staffSessionVersion: number;
  }
}
