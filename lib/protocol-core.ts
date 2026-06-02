// Thin shared layer over @pranix/protocol-core (server-side only).
// Connects to the Pranix control plane (NOT this product's database) using
// PROTOCOL_CORE_URL / PROTOCOL_CORE_KEY. Stays inert (no-op) until both are set,
// so builds and runtime are unaffected when the control-plane credentials are absent.
import { createClient } from "@supabase/supabase-js";
import { credentials, evidence, governance } from "@pranix/protocol-core";

const url = process.env.PROTOCOL_CORE_URL;
const key = process.env.PROTOCOL_CORE_KEY;

const cp = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;

export const protocolEnabled = Boolean(cp);

// `protocol` is null until control-plane credentials are configured.
export const protocol = cp
  ? {
      credentials: credentials(cp),
      evidence: evidence(cp),
      governance: governance(cp),
    }
  : null;
