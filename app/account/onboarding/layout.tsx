import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Get Started | TRUECOLOURS",
  description:
    "Complete your TRUECOLOURS account setup to start managing quotes, orders, and paint colour references.",
  robots: { index: false, follow: false },
};

/**
 * Onboarding layout
 *
 * This is a minimal layout that does NOT include the Navbar/Footer.
 * The onboarding flow is a full-screen experience — no distractions.
 *
 * The layout renders as a direct child of the /account route group,
 * so it inherits the AuthProvider from the root layout.
 */
export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <main className="flex flex-1 items-center justify-center">
        {children}
      </main>
    </div>
  );
}
