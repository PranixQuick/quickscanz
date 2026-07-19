import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createBasicClient } from "@supabase/supabase-js";

// ── Types ─────────────────────────────────────────────────────────────────────
interface OCRResult {
  brand: string | null;
  product_name: string | null;
  model_number: string | null;
  serial_number: string | null;
  purchase_date: string | null;   // ISO yyyy-mm-dd
  price: string | null;           // numeric string, INR
  store_name: string | null;
  warranty_months: number | null;
  confidence: "high" | "medium" | "low";
}

// ── Regex fallback (works without AI key) ─────────────────────────────────────
function regexExtract(text: string): OCRResult {
  const t = text;

  // Price — look for ₹ or Rs followed by numbers
  const priceMatch = t.match(/(?:₹|Rs\.?\s*)([\d,]+(?:\.\d{1,2})?)/i);
  const price = priceMatch ? priceMatch[1].replace(/,/g, "") : null;

  // Date — DD/MM/YYYY or DD-MM-YYYY or YYYY-MM-DD
  const datePatterns = [
    /\b(\d{2})[\/-](\d{2})[\/-](\d{4})\b/,
    /\b(\d{4})[\/-](\d{2})[\/-](\d{2})\b/,
    /\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})\b/i,
  ];
  let purchase_date: string | null = null;
  for (const pat of datePatterns) {
    const m = t.match(pat);
    if (m) {
      try {
        if (pat === datePatterns[0]) {
          purchase_date = `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
        } else if (pat === datePatterns[1]) {
          purchase_date = `${m[1]}-${m[2]}-${m[3]}`;
        } else {
          const months: Record<string,string> = { jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12' };
          purchase_date = `${m[3]}-${months[m[2].toLowerCase().slice(0,3)]}-${m[1].padStart(2,'0')}`;
        }
        // Validate range
        const d = new Date(purchase_date);
        if (d.getFullYear() < 2010 || d > new Date()) purchase_date = null;
        else break;
      } catch { purchase_date = null; }
    }
  }

  // Model/Serial — look for common label patterns
  const modelMatch = t.match(/(?:Model\s*(?:No\.?|Number|#)?\s*:?\s*)([A-Z0-9][A-Z0-9\-]{3,20})/i);
  const serialMatch = t.match(/(?:S\.?No\.?|Serial\s*(?:No\.?|Number)?|IMEI)\s*:?\s*([A-Z0-9][A-Z0-9\-]{5,20})/i);

  // Store name — Invoice/Bill from / Sold by
  const storeMatch = t.match(/(?:Sold\s*by|Invoice\s*from|Bill\s*from|Store)\s*:?\s*([A-Za-z0-9 &.]{3,40})/i);

  // Known Indian brands
  const BRANDS = ["Samsung","Apple","LG","Sony","OnePlus","Redmi","Xiaomi","Realme",
    "Oppo","Vivo","iQOO","Motorola","Nokia","HP","Dell","Lenovo","Asus","Acer",
    "Whirlpool","Godrej","Haier","Voltas","Daikin","Blue Star","Carrier","Bosch",
    "IFB","Siemens","Philips","Prestige","Butterfly","Kent","Aquaguard","Pureit",
    "boAt","JBL","Bose","Dyson","Panasonic","Toshiba","Hisense","TCL","Mi","Vu",
    "Usha","Orient","Havells","Crompton","Bajaj","Honda","TVS","Hero","Suzuki"];
  let brand: string | null = null;
  for (const b of BRANDS) {
    if (new RegExp(`\\b${b}\\b`, 'i').test(t)) { brand = b; break; }
  }

  return {
    brand,
    product_name: null, // regex can't reliably extract product names
    model_number: modelMatch ? modelMatch[1].trim() : null,
    serial_number: serialMatch ? serialMatch[1].trim() : null,
    purchase_date,
    price,
    store_name: storeMatch ? storeMatch[1].trim() : null,
    warranty_months: null,
    confidence: brand && purchase_date ? "medium" : "low",
  };
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  let user: any = null;
  const authHeader = req.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseAnonKey) {
      const client = createBasicClient(supabaseUrl, supabaseAnonKey);
      const { data } = await client.auth.getUser(token);
      user = data.user;
    }
  }

  if (!user) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data.user;
  }

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { image_base64, mime_type = "image/jpeg" } = body;
  if (!image_base64) return NextResponse.json({ error: "image_base64 required" }, { status: 400 });

  // ── Try OpenRouter Vision (genuinely free model; no Google prepay) ─────────
  // Gemini API needs region-specific prepay (0 balance in IN), so OpenRouter is
  // the free path. Model overridable via OPENROUTER_MODEL.
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
  // Verified free + image-capable model on OpenRouter's live catalog.
  // (google/gemini-2.0-flash-exp:free returned "No endpoints found".)
  const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free";
  if (OPENROUTER_API_KEY) {
    try {
      const orPrompt = `You are a receipt/invoice OCR assistant for an Indian warranty tracker app. Extract fields from the image and return ONLY valid minified JSON, no markdown:
{"brand":string|null,"product_name":string|null,"model_number":string|null,"serial_number":string|null,"purchase_date":"yyyy-mm-dd"|null,"price":string|null,"store_name":string|null,"warranty_months":number|null,"confidence":"high"|"medium"|"low"}
Parse Indian DD/MM/YYYY dates to yyyy-mm-dd. price = numeric INR string without symbol/commas. Use null for anything not found.`;
      const orRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://www.quickscanz.com",
          "X-Title": "QuickScanZ",
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL,
          messages: [{
            role: "user",
            content: [
              { type: "text", text: orPrompt },
              { type: "image_url", image_url: { url: `data:${mime_type};base64,${image_base64}` } },
            ],
          }],
          response_format: { type: "json_object" },
          max_tokens: 512,
          temperature: 0.2,
        }),
      });
      if (orRes.ok) {
        const d = await orRes.json();
        let raw: string = d?.choices?.[0]?.message?.content || "{}";
        raw = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
        try {
          const parsed = JSON.parse(raw) as OCRResult;
          return NextResponse.json({ ok: true, data: parsed, method: "vision-openrouter" });
        } catch {
          console.error("[ocr] OpenRouter non-JSON:", String(raw).slice(0, 200));
        }
      } else {
        const errTxt = await orRes.text().catch(() => "");
        console.error(`[ocr] OpenRouter non-OK status=${orRes.status} model=${OPENROUTER_MODEL} body=${errTxt.slice(0, 400)}`);
      }
    } catch (e) {
      console.error("[ocr] OpenRouter fetch threw:", String(e));
    }
  }

  // ── Try Gemini Vision (free tier) ─────────────────────────────────────────
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  // gemini-1.5-flash is retired (404). Use gemini-2.0-flash, which works once
  // billing is enabled on the key's Google Cloud project. Overridable via GEMINI_MODEL.
  const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  if (GEMINI_API_KEY) {
    try {
      const prompt = `You are a receipt/invoice OCR assistant for an Indian warranty tracker app.
Extract the following fields from this receipt/invoice image. Return ONLY valid JSON, no markdown.

Fields to extract:
- brand: manufacturer brand name (e.g. "Samsung", "LG", "Apple")
- product_name: product name/description
- model_number: model number if visible
- serial_number: serial number or IMEI if visible
- purchase_date: date of purchase in ISO format yyyy-mm-dd (parse DD/MM/YYYY format common in India)
- price: amount paid in INR as numeric string without currency symbol or commas
- store_name: retailer/shop name
- warranty_months: warranty duration in months if stated (null if not mentioned)
- confidence: "high" if 4+ fields found, "medium" if 2-3 fields found, "low" if <2 fields found

Return null for any field not found. Example:
{"brand":"Samsung","product_name":"Galaxy S24","model_number":"SM-S921B","serial_number":null,"purchase_date":"2024-11-14","price":"74999","store_name":"Reliance Digital","warranty_months":12,"confidence":"high"}`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: prompt },
                { inline_data: { mime_type, data: image_base64 } },
              ],
            }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 512,
              responseMimeType: "application/json",
            },
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        try {
          const parsed = JSON.parse(raw) as OCRResult;
          return NextResponse.json({ ok: true, data: parsed, method: "vision" });
        } catch {
          console.error("[ocr] Gemini returned non-JSON text:", String(raw).slice(0, 200));
          // JSON parse failed — fall through to regex
        }
      } else {
        // Diagnostic: surface WHY Gemini failed (403 API disabled, 404 model,
        // 400 bad request, 429 quota, etc.) instead of silently falling back.
        const errTxt = await response.text().catch(() => "");
        console.error(`[ocr] Gemini non-OK status=${response.status} model=${GEMINI_MODEL} body=${errTxt.slice(0, 400)}`);
      }
    } catch (e) {
      console.error("[ocr] Gemini fetch threw:", String(e));
    }
  }

  // ── Regex fallback — extract text from base64 for any OCR we can do server side
  // Note: without a dedicated OCR library we can only tell the client to try regex client-side
  // We return a flag so the client knows to run local text extraction if available
  return NextResponse.json({
    ok: true,
    data: { brand: null, product_name: null, model_number: null, serial_number: null,
            purchase_date: null, price: null, store_name: null, warranty_months: null,
            confidence: "low" },
    method: "fallback",
    hint: "AI vision unavailable. Please fill fields manually or ensure ANTHROPIC_API_KEY is set.",
  });
}
