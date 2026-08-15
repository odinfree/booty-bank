"use client";

import { useState } from "react";

export default function PrivyPlaceholder() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("DEMO ONLY. NO ACCOUNT CREATED.");

  function preview(method: "GOOGLE" | "EMAIL") {
    setStatus(`${method} READY WHEN PRIVY KEYS LAND.`);
  }

  return (
    <div className="wallet-connect-block privy-placeholder">
      <button
        className="wallet-connect-button privy-button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="privy-preview-panel"
      >
        <span className="privy-label-wide">SOCIAL LOGIN</span>
        <span className="privy-label-short">LOGIN</span>
      </button>
      {open && (
        <section className="privy-preview-panel" id="privy-preview-panel" role="dialog" aria-labelledby="privy-preview-title">
          <div className="privy-preview-head">
            <span>PRIVY / PREVIEW</span>
            <button onClick={() => setOpen(false)} aria-label="Close social login preview">×</button>
          </div>
          <h4 id="privy-preview-title">SIGN IN.</h4>
          <div className="privy-preview-actions">
            <button onClick={() => preview("GOOGLE")}><i>G</i> GOOGLE <span>↗</span></button>
            <button onClick={() => preview("EMAIL")}><i>@</i> EMAIL <span>↗</span></button>
          </div>
          <p aria-live="polite">{status}</p>
        </section>
      )}
    </div>
  );
}
