// GET /api/protocol-selftest — RETIRED.
// Superseded by real business call sites (Wave 3B: subscription payment + payment verified).
// Kept as a tombstone to avoid 404s from old links; performs NO gateway calls and writes NO evidence.
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(
    { ok: false, retired: true, message: "protocol-selftest retired; superseded by real call sites" },
    { status: 410 }
  );
}
