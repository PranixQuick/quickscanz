import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createBasicClient } from "@supabase/supabase-js";

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
    const { data: { user: sessionUser } } = await supabase.auth.getUser();
    user = sessionUser;
  }

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { category, budget, preferences = "" } = body;
  if (!category || !budget) {
    return NextResponse.json({ error: "category and budget are required" }, { status: 400 });
  }

  const prompt = `Search for the best ${category} options in India under a budget of Rs. ${budget} (INR). User preferences: ${preferences}. Return the top 3 best real options with their current market prices in INR, standard manufacturer warranty, a short summary of honest reviews from open web sources, and direct citations. Format your response strictly as JSON with the following structure (do NOT include markdown formatting or backticks, return a raw JSON object):
{
  "recommendations": [
    {
      "name": "Product Name (e.g. OnePlus 12R)",
      "brand": "Brand Name (e.g. OnePlus)",
      "price": "Rs. X,XXX",
      "warrantyMonths": 12,
      "avgLifespanYears": 3,
      "whyRecommended": "Reason based on preferences",
      "pros": ["Pro 1", "Pro 2"],
      "cons": ["Con 1", "Con 2"],
      "whereToCheck": ["https://www.amazon.in/s?k=...", "https://www.flipkart.com/search?q=..."]
    }
  ],
  "summary": "Overall comparison summary...",
  "citations": ["Citation source name or URL 1", "Citation source name or URL 2"]
}`;

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (GEMINI_API_KEY) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            tools: [{ googleSearch: {} }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.2,
            },
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text.trim());
          return NextResponse.json({ ok: true, data: parsed, method: "gemini-grounding" });
        }
      }
    } catch (e) {
      console.error("[buying-assistant] Gemini search error:", e);
    }
  }

  // Fallback to OpenRouter if Gemini grounding is not configured/fails
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
  if (OPENROUTER_API_KEY) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.0-flash",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          temperature: 0.2,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const text = data?.choices?.[0]?.message?.content;
        if (text) {
          const parsed = JSON.parse(text.trim());
          return NextResponse.json({ ok: true, data: parsed, method: "openrouter-fallback" });
        }
      }
    } catch (e) {
      console.error("[buying-assistant] OpenRouter error:", e);
    }
  }

  // Fallback to offline rule-based if all API calls fail
  const bestName = `Standard ${category}`;
  const fallbackData = {
    recommendations: [
      {
        name: `Best Pick under ₹${budget}`,
        brand: category,
        price: `₹${budget}`,
        warrantyMonths: 12,
        avgLifespanYears: 5,
        whyRecommended: `Generic recommendation for ${category} matching your preferences.`,
        pros: ["Standard features", "Under budget"],
        cons: ["No real-time prices"],
        whereToCheck: [
          `https://www.amazon.in/s?k=${encodeURIComponent(category)}`,
          `https://www.flipkart.com/search?q=${encodeURIComponent(category)}`
        ]
      }
    ],
    summary: "Could not retrieve real-time grounded suggestions. Showing catalog-based fallback links.",
    citations: ["Internal Database"]
  };

  return NextResponse.json({ ok: true, data: fallbackData, method: "rule-fallback" });
}
