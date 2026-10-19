"use client";
import { useState, type FormEvent } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function save(event: FormEvent) {
    event.preventDefault();
    if (password !== confirmation) {
      setMessage("The passwords do not match.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const db = getSupabaseBrowser();
      const {
        data: { user },
      } = await db.auth.getUser();
      if (!user)
        throw new Error("Open a fresh password recovery link from your email.");
      const { error } = await db.auth.updateUser({ password });
      if (error) throw error;
      setPassword("");
      setConfirmation("");
      setMessage("Password updated. You can return to your account.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Password could not be updated.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 p-5">
      <form
        onSubmit={save}
        className="w-full max-w-md space-y-5 rounded-2xl border border-slate-200 bg-white p-7"
      >
        <h1 className="text-2xl font-black">Choose your new password</h1>
        <label className="block text-sm font-bold">
          New password
          <input
            required
            minLength={10}
            autoComplete="new-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-300 p-3"
          />
        </label>
        <label className="block text-sm font-bold">
          Confirm password
          <input
            required
            minLength={10}
            autoComplete="new-password"
            type="password"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-300 p-3"
          />
        </label>
        <button
          disabled={busy}
          className="w-full rounded-xl bg-slate-950 p-3 font-bold text-white disabled:opacity-40"
        >
          Update password
        </button>
        {message && (
          <p role="status" className="text-sm">
            {message}
          </p>
        )}
        <a className="block text-sm font-bold underline" href="/account">
          Return to account
        </a>
      </form>
    </div>
  );
}
