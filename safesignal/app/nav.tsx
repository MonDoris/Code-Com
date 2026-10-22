"use client";
import Link from "next/link";
import { useTideCloak } from "@tidecloak/nextjs";

export function Nav() {
  const { logout, getValueFromIdToken, authenticated } = useTideCloak();
  return (
    <nav>
      <strong>SafeSignal Escalate</strong>
      <Link href="/home">Home</Link>
      <Link href="/report">Report</Link>
      <Link href="/review">Review</Link>
      <Link href="/admin">Admin: policies</Link>
      {authenticated && (
        <span className="muted">
          signed in as {String(getValueFromIdToken("preferred_username") ?? "")}{" "}
          <button className="secondary" onClick={() => logout()}>Log out</button>
        </span>
      )}
    </nav>
  );
}

export function Synthetic() {
  return (
    <p className="banner">
      Prototype for RMIT UNLOCKED 2026. Synthetic data only: never enter real patient or staff information.
      This is not an anonymous channel and does not replace mandatory incident reporting or emergency procedures.
    </p>
  );
}
