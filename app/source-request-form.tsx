"use client";

import { useState, type FormEvent } from "react";

type SubmitState = { kind: "idle" | "submitting" | "success" | "error"; message?: string; requestId?: string };

export default function SourceRequestForm() {
  const [state, setState] = useState<SubmitState>({ kind: "idle" });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ kind: "submitting" });
    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form).entries());
    try {
      const response = await fetch("/api/source-request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json() as { requestId?: string; error?: string };
      if (!response.ok) throw new Error(result.error || "We could not save this request.");
      form.reset();
      setState({ kind: "success", requestId: result.requestId, message: "Your brief is in the review queue." });
    } catch (error) {
      setState({ kind: "error", message: error instanceof Error ? error.message : "We could not save this request." });
    }
  }

  if (state.kind === "success") {
    return <div className="source-success" role="status"><span>REQUEST RECEIVED</span><strong>{state.requestId}</strong><p>{state.message} Keep this reference number. We will use the email in your brief for any necessary follow-up.</p><button type="button" onClick={() => setState({ kind: "idle" })}>Submit another request</button></div>;
  }

  return (
    <form className="source-form" onSubmit={submit}>
      <div className="form-pair"><label>Name<input name="name" autoComplete="name" maxLength={80} required /></label><label>Work email<input name="email" type="email" autoComplete="email" maxLength={160} required /></label></div>
      <label>Company <span>optional</span><input name="company" autoComplete="organization" maxLength={120} /></label>
      <label>Describe the part and why it is difficult to source<textarea name="description" rows={7} minLength={30} maxLength={4000} required placeholder="Example: four replacement impellers for a discontinued pump; existing sample available; 316 stainless; outside diameter…" /></label>
      <div className="form-pair"><label>Quantity<input name="quantity" maxLength={60} required placeholder="4 prototypes" /></label><label>Needed by <span>optional</span><input name="neededBy" maxLength={80} placeholder="September 15" /></label></div>
      <div className="form-pair"><label>Budget range <span>optional</span><select name="budgetRange" defaultValue=""><option value="">Not sure</option><option>Under $500</option><option>$500–$2,000</option><option>$2,000–$10,000</option><option>$10,000+</option></select></label><label>Drawing or reference URL <span>optional</span><input name="drawingUrl" type="url" maxLength={500} placeholder="https://…" /></label></div>
      <label className="source-honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
      <label className="source-consent"><input name="consent" type="checkbox" value="yes" required /><span>I confirm this is a lawful commercial sourcing request and agree to be contacted about it.</span></label>
      {state.kind === "error" && <p className="source-error" role="alert">{state.message}</p>}
      <button className="source-submit" type="submit" disabled={state.kind === "submitting"}>{state.kind === "submitting" ? "Saving request…" : "Submit free sourcing brief →"}</button>
      <small>Do not include export-controlled, medical, financial, or other sensitive personal information.</small>
    </form>
  );
}
