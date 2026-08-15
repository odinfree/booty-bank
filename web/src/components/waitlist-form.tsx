"use client";

import { FormEvent, useState } from "react";

type WaitlistState = "idle" | "submitting" | "success" | "error";
const WAITLIST_API_URL = process.env.NEXT_PUBLIC_WAITLIST_API_URL ?? "https://bootybank.app/api/waitlist";

export default function WaitlistForm() {
  const [state, setState] = useState<WaitlistState>("idle");
  const [message, setMessage] = useState("");

  async function joinWaitlist(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setState("submitting");
    setMessage("");
    try {
      const response = await fetch(WAITLIST_API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: String(form.get("email") ?? ""), company: String(form.get("company") ?? "") }) });
      const result = await response.json() as { message?: string };
      if (!response.ok) throw new Error(result.message ?? "JOIN FAILED. TRY AGAIN.");
      formElement.reset();
      setState("success");
      setMessage(result.message ?? "YOU ARE ON THE LIST.");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "JOIN FAILED. TRY AGAIN.");
    }
  }

  return (
    <form className="dossier-form" onSubmit={joinWaitlist}>
      <label htmlFor="waitlist-email">EMAIL</label>
      <div><input id="waitlist-email" name="email" type="email" autoComplete="email" inputMode="email" placeholder="YOU@DOMAIN.COM" maxLength={254} required /><button type="submit" disabled={state === "submitting"}>{state === "submitting" ? "JOINING..." : "JOIN WAITLIST ↗"}</button></div>
      <div className="waitlist-honeypot" aria-hidden="true"><label htmlFor="waitlist-company">COMPANY</label><input id="waitlist-company" name="company" tabIndex={-1} autoComplete="off" /></div>
      <p>EMAIL + SIGNUP TIME ONLY.</p>
      <output className={`dossier-status ${state}`} aria-live="polite">{message}</output>
    </form>
  );
}
