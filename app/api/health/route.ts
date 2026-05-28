import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET() {
  const start = Date.now()
  const checks: Record<string, string> = {}

  try {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { error } = await sb.from('products').select('id').limit(1)
    checks.database = error ? `error: ${error.message}` : 'ok'
  } catch (e: any) {
    checks.database = `error: ${e.message}`
  }

  checks.env = process.env.NEXT_PUBLIC_SUPABASE_URL ? 'ok' : 'missing SUPABASE_URL'
  checks.onesignal = process.env.ONESIGNAL_API_KEY ? 'configured' : 'not configured'

  const allOk = Object.values(checks).every(v => v === 'ok' || v === 'configured')

  return NextResponse.json({
    status: allOk ? 'ok' : 'degraded',
    service: 'quickscanz',
    version: 'v1.0',
    latency_ms: Date.now() - start,
    time: new Date().toISOString(),
    checks,
  }, { status: allOk ? 200 : 500 })
}
