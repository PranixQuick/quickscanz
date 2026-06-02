// GET /api/protocol-selftest — Wave-2 proof.
// Exercises governance.preflight() + evidence.emit() through the engine gateway.
// preflight uses a benign (non-gated) action; emit writes one proof artifact.
import { protocol } from "../../../lib/protocol-core";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!protocol) {
    return Response.json({ ok: false, error: "protocol disabled" }, { status: 503 });
  }
  const preflight = await protocol.governance.preflight("wave2_selftest", {
    artifact: "protocol-selftest",
  });
  const evidence = await protocol.evidence.emit({
    proves: "wave2 protocol selftest",
    type: "selftest",
    success: true,
  });
  return Response.json({ ok: true, preflight, evidence });
}
