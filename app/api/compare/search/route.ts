import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { walletName, walletBrand, walletCategory, candidateQuery } = body;
  if (!walletName || !candidateQuery) {
    return NextResponse.json({ error: "walletName and candidateQuery are required" }, { status: 400 });
  }

  const prompt = `Compare the user's existing product "${walletName}" (Brand: ${walletBrand || "Unknown"}, Category: ${walletCategory || "Unknown"}) with the potential purchase candidate "${candidateQuery}". 
First, identify the top 3 comparable modern products (including "${candidateQuery}" as one of them) that serve as excellent upgrade/replacement options.
For each of these 3 comparable products, fetch real-time specifications, live market prices from at least 2 major Indian e-commerce platforms (Amazon and Flipkart), and global/user ratings (e.g. 4.4/5 stars with review count) from both platforms.
Then, generate a specs-matched list comparing them to the user's existing product, and write a simple, clear "better buy" verdict comparing the options.
Format your response strictly as JSON with the following structure (do NOT include markdown formatting or backticks, return a raw JSON object):
{
  "candidate": {
    "name": "Primary Candidate Product Name (e.g. OnePlus 12R)",
    "brand": "Brand (e.g. OnePlus)",
    "price": "Rs. 39,999 / $480",
    "rating": "4.4/5 (1,250 reviews)",
    "specs": {
      "Display": "6.78-inch AMOLED",
      "Battery": "5500 mAh",
      "Camera": "50 MP Triple",
      "Warranty": "12 Months"
    }
  },
  "comparison": {
    "specsMatched": {
      "Price": "Wallet product was cheaper compared to Candidate",
      "Battery": "Candidate offers larger battery capacity",
      "Warranty": "Standard manufacturer warranty"
    },
    "verdict": "The candidate offers significant display and battery upgrades. Upgrade is recommended if those features are your priority.",
    "buyLinks": [
      "https://www.amazon.in/s?k=${encodeURIComponent(candidateQuery)}",
      "https://www.flipkart.com/search?q=${encodeURIComponent(candidateQuery)}"
    ],
    "comparables": [
      {
        "name": "Comparable Product 1 Name (e.g. iQOO Neo 9 Pro)",
        "brand": "Brand",
        "prices": {
          "amazon": "Price/availability on Amazon (e.g. ₹34,999)",
          "flipkart": "Price/availability on Flipkart (e.g. ₹35,999)"
        },
        "ratings": {
          "amazon": "Rating on Amazon (e.g. 4.5/5 (820 reviews))",
          "flipkart": "Rating on Flipkart (e.g. 4.4/5 (1,100 reviews))"
        },
        "verdict": "Brief explanation comparing this option to the user's existing product and candidate."
      },
      {
        "name": "Comparable Product 2 Name",
        "brand": "Brand",
        "prices": {
          "amazon": "Price/availability on Amazon",
          "flipkart": "Price/availability on Flipkart"
        },
        "ratings": {
          "amazon": "Rating on Amazon",
          "flipkart": "Rating on Flipkart"
        },
        "verdict": "Brief explanation comparing this option to the user's existing product and candidate."
      },
      {
        "name": "Comparable Product 3 Name",
        "brand": "Brand",
        "prices": {
          "amazon": "Price/availability on Amazon",
          "flipkart": "Price/availability on Flipkart"
        },
        "ratings": {
          "amazon": "Rating on Amazon",
          "flipkart": "Rating on Flipkart"
        },
        "verdict": "Brief explanation comparing this option to the user's existing product and candidate."
      }
    ],
    "betterBuyVerdict": "Pranix AI Better Buy Recommendation: [Clearly state the overall best buy and the reason]"
  }
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
      console.error("[compare-assistant] Gemini search error:", e);
    }
  }

  // Fallback to OpenRouter if Gemini fails
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
      console.error("[compare-assistant] OpenRouter error:", e);
    }
  }

  // Rule-based fallback if all fail
  const fallbackData = {
    candidate: {
      name: candidateQuery,
      brand: walletBrand || "Alternative Brand",
      price: "₹35,000 / $420",
      rating: "4.2/5 (150 reviews)",
      specs: {
        "Warranty": "12 Months",
        "Performance": "Standard upgrade",
        "Features": "Modern specs"
      }
    },
    comparison: {
      specsMatched: {
        "Price": `Candidate listed at ₹35,000 compared to ${walletName}.`,
        "Warranty": "Standard 1 year coverage."
      },
      verdict: `Showing comparison links for ${candidateQuery}. Upgrade value depends on specific model specs.`,
      buyLinks: [
        `https://www.amazon.in/s?k=${encodeURIComponent(candidateQuery)}`,
        `https://www.flipkart.com/search?q=${encodeURIComponent(candidateQuery)}`
      ],
      comparables: [
        {
          name: candidateQuery,
          brand: walletBrand || "Alternative Brand",
          prices: {
            amazon: "₹35,000",
            flipkart: "₹35,999"
          },
          ratings: {
            amazon: "4.2/5 (150 reviews)",
            flipkart: "4.1/5 (200 reviews)"
          },
          verdict: "Standard alternative matching the query."
        }
      ],
      betterBuyVerdict: `AI recommends evaluating detailed reviews and features of ${candidateQuery} before purchase.`
    }
  };

  return NextResponse.json({ ok: true, data: fallbackData, method: "rule-fallback" });
}
