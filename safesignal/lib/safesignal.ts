// SafeSignal Escalate: the fixed names that tie the app, the realm template and the Tide policies
// together. Nothing here is secret.
import type { RelationshipSubject, RelationshipAccess } from "./tide/relationship";

/**
 * The single "record" both policies are bound to (RelationshipAttestation:1 `assignmentId`).
 * Every referral narrative is encrypted with exactly this one tag.
 * Consequence (documented limitation): a granted reviewer can read every referral in this queue,
 * not one case at a time. Per-case grants would need one admin-signed policy per case.
 */
export const REFERRAL_RECORD_ID = "safesignal-referrals-v1";

/** Realm roles (see init/realm.json). Composite roles carry the fixed Tide contract roles. */
export const ROLE_REPORTER = "safesignal-reporter"; // composite: _tide_encryptor
export const ROLE_REVIEWER = "independent-reviewer"; // composite: _tide_decryptor
export const ROLE_REALM_ADMIN = "tide-realm-admin"; // client role of realm-management

export type PolicyKind = "submit" | "review";

/** The two policies a realm admin signs once, in the Tide enclave. */
export const POLICY_SPECS: Record<PolicyKind, { subject: RelationshipSubject; access: RelationshipAccess; label: string }> = {
  // Reporters may ENCRYPT into the queue but cannot decrypt it (write-only drop box).
  submit: { subject: { type: "Role", id: ROLE_REPORTER }, access: "write", label: "Reporters: encrypt only" },
  // Reviewers may DECRYPT the queue but not write to it (read-only).
  review: { subject: { type: "Role", id: ROLE_REVIEWER }, access: "read", label: "Independent reviewers: decrypt only" },
};

export const EXPECTED_POLICY_ROLES: Record<PolicyKind, string> = {
  submit: JSON.stringify(["_tide_encryptor"]),
  review: JSON.stringify(["_tide_decryptor"]),
};

export type CaseStatus = "REFERRED" | "REVIEWED";
export interface CaseSummary {
  id: string;
  createdAt: string;
  status: CaseStatus;
}
