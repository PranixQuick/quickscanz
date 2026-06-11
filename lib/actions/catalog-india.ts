/**
 * catalog-india.ts
 * Top-50 best-selling consumer electronics & appliances in India.
 * Used by AddProductForm barcode scanner to auto-fill brand, name,
 * category, and default warranty duration.
 *
 * Data sourced from Flipkart/Amazon IN bestseller lists (June 2026).
 * Warranty durations are standard manufacturer warranties.
 */

export interface CatalogEntry {
  brand: string;
  name: string;
  category: string;
  warranty_years: number;
  avg_price_inr: number;
  keywords: string[]; // for fuzzy text-match if barcode fails
}

export const INDIA_CATALOG: CatalogEntry[] = [
  // ─── Smartphones ─────────────────────────────────────────────
  { brand: "Samsung",  name: "Galaxy S24",           category: "Smartphone",    warranty_years: 1, avg_price_inr: 74999,  keywords: ["samsung","s24","galaxy"] },
  { brand: "Samsung",  name: "Galaxy M34 5G",         category: "Smartphone",    warranty_years: 1, avg_price_inr: 18999,  keywords: ["samsung","m34","galaxy"] },
  { brand: "Redmi",    name: "Note 13 Pro 5G",        category: "Smartphone",    warranty_years: 1, avg_price_inr: 23999,  keywords: ["redmi","note 13","xiaomi"] },
  { brand: "Realme",   name: "Narzo 60 Pro",          category: "Smartphone",    warranty_years: 1, avg_price_inr: 19999,  keywords: ["realme","narzo 60"] },
  { brand: "OnePlus",  name: "Nord CE 3 Lite",        category: "Smartphone",    warranty_years: 1, avg_price_inr: 17999,  keywords: ["oneplus","nord ce 3"] },
  { brand: "Apple",    name: "iPhone 15",             category: "Smartphone",    warranty_years: 1, avg_price_inr: 79900,  keywords: ["apple","iphone 15"] },
  { brand: "Apple",    name: "iPhone 14",             category: "Smartphone",    warranty_years: 1, avg_price_inr: 69900,  keywords: ["apple","iphone 14"] },
  { brand: "Vivo",     name: "V29e 5G",               category: "Smartphone",    warranty_years: 1, avg_price_inr: 21999,  keywords: ["vivo","v29e"] },
  { brand: "OPPO",     name: "A78 5G",                category: "Smartphone",    warranty_years: 1, avg_price_inr: 16999,  keywords: ["oppo","a78"] },
  { brand: "iQOO",     name: "Z7 Pro",                category: "Smartphone",    warranty_years: 1, avg_price_inr: 22999,  keywords: ["iqoo","z7 pro"] },

  // ─── Televisions ─────────────────────────────────────────────
  { brand: "Samsung",  name: "Crystal 4K 55\" UHD",   category: "Television",    warranty_years: 1, avg_price_inr: 54990,  keywords: ["samsung","crystal 4k","55"] },
  { brand: "LG",       name: "55\" UHD 4K Smart TV",  category: "Television",    warranty_years: 1, avg_price_inr: 52990,  keywords: ["lg","uhd","4k","55"] },
  { brand: "Sony",     name: "Bravia X75L 55\"",       category: "Television",    warranty_years: 1, avg_price_inr: 69990,  keywords: ["sony","bravia","x75l"] },
  { brand: "Mi",       name: "5X 55\" QLED",           category: "Television",    warranty_years: 1, avg_price_inr: 39999,  keywords: ["mi","xiaomi","5x","qled"] },
  { brand: "Vu",       name: "GloLED 43\" Smart TV",   category: "Television",    warranty_years: 2, avg_price_inr: 21999,  keywords: ["vu","gloled","43"] },

  // ─── Laptops ─────────────────────────────────────────────────
  { brand: "HP",       name: "Pavilion 15",           category: "Laptop",        warranty_years: 1, avg_price_inr: 54999,  keywords: ["hp","pavilion","15"] },
  { brand: "Dell",     name: "Inspiron 15 3520",      category: "Laptop",        warranty_years: 1, avg_price_inr: 52990,  keywords: ["dell","inspiron","3520"] },
  { brand: "Lenovo",   name: "IdeaPad Slim 3",        category: "Laptop",        warranty_years: 1, avg_price_inr: 39999,  keywords: ["lenovo","ideapad","slim 3"] },
  { brand: "ASUS",     name: "VivoBook 15",           category: "Laptop",        warranty_years: 1, avg_price_inr: 44999,  keywords: ["asus","vivobook","15"] },
  { brand: "Apple",    name: "MacBook Air M2",         category: "Laptop",        warranty_years: 1, avg_price_inr: 114900, keywords: ["apple","macbook","m2"] },

  // ─── Refrigerators ───────────────────────────────────────────
  { brand: "LG",       name: "260L Frost-Free Double Door", category: "Refrigerator", warranty_years: 1, avg_price_inr: 28990, keywords: ["lg","260l","double door","frost free"] },
  { brand: "Samsung",  name: "253L RT28 Double Door", category: "Refrigerator", warranty_years: 1, avg_price_inr: 27490,  keywords: ["samsung","253l","rt28"] },
  { brand: "Whirlpool",name: "184L DirectCool Single Door", category: "Refrigerator", warranty_years: 1, avg_price_inr: 14990, keywords: ["whirlpool","184l","single door"] },
  { brand: "Godrej",   name: "221L Edge Pro Double Door", category: "Refrigerator", warranty_years: 1, avg_price_inr: 22490, keywords: ["godrej","edge pro","221l"] },
  { brand: "Haier",    name: "195L HRD-1952BS",       category: "Refrigerator", warranty_years: 1, avg_price_inr: 15490,  keywords: ["haier","195l","hrd"] },

  // ─── Washing Machines ────────────────────────────────────────
  { brand: "LG",       name: "7kg Front Load FHM1207ZDL", category: "Washing Machine", warranty_years: 2, avg_price_inr: 34990, keywords: ["lg","7kg","front load"] },
  { brand: "Samsung",  name: "7kg Top Load WA70T4262GS", category: "Washing Machine", warranty_years: 2, avg_price_inr: 19990, keywords: ["samsung","7kg","top load"] },
  { brand: "Bosch",    name: "7kg WAJ2846SIN",         category: "Washing Machine", warranty_years: 2, avg_price_inr: 36990, keywords: ["bosch","7kg","waj"] },
  { brand: "Whirlpool",name: "7kg 360 BW Pro Plus",   category: "Washing Machine", warranty_years: 2, avg_price_inr: 17990, keywords: ["whirlpool","360","bw pro"] },
  { brand: "IFB",      name: "7kg Senator WSS",        category: "Washing Machine", warranty_years: 2, avg_price_inr: 32990, keywords: ["ifb","senator","wss"] },

  // ─── Air Conditioners ────────────────────────────────────────
  { brand: "Daikin",   name: "1.5 Ton 5 Star FTKF50UV16V", category: "Air Conditioner", warranty_years: 1, avg_price_inr: 42990, keywords: ["daikin","1.5 ton","ftkf"] },
  { brand: "LG",       name: "1.5 Ton 5 Star KS-Q18YNXA", category: "Air Conditioner", warranty_years: 1, avg_price_inr: 40990, keywords: ["lg","1.5 ton","ks-q18"] },
  { brand: "Voltas",   name: "1.5 Ton 3 Star 183V Vectra", category: "Air Conditioner", warranty_years: 1, avg_price_inr: 33990, keywords: ["voltas","vectra","183v"] },
  { brand: "Blue Star",name: "1.5 Ton 5 Star IC518DATU",  category: "Air Conditioner", warranty_years: 1, avg_price_inr: 41990, keywords: ["blue star","ic518","1.5 ton"] },
  { brand: "Carrier",  name: "1.5 Ton 3 Star ESKO Split", category: "Air Conditioner", warranty_years: 1, avg_price_inr: 32990, keywords: ["carrier","esko","1.5 ton"] },

  // ─── Kitchen Appliances ──────────────────────────────────────
  { brand: "Philips",  name: "HL7756 750W Mixer Grinder", category: "Mixer Grinder", warranty_years: 2, avg_price_inr: 3299, keywords: ["philips","hl7756","mixer"] },
  { brand: "Butterfly",name: "Jet Elite 750W Mixer",  category: "Mixer Grinder", warranty_years: 2, avg_price_inr: 2999,   keywords: ["butterfly","jet elite","mixer"] },
  { brand: "Prestige", name: "Iris Plus 750W Mixer",   category: "Mixer Grinder", warranty_years: 2, avg_price_inr: 2799,   keywords: ["prestige","iris plus","mixer"] },
  { brand: "Bosch",    name: "TrueMixx Pro 1000W",    category: "Mixer Grinder", warranty_years: 2, avg_price_inr: 6299,    keywords: ["bosch","truemixx","1000w"] },
  { brand: "Usha",     name: "Impress 750W Mixer",    category: "Mixer Grinder", warranty_years: 2, avg_price_inr: 2299,    keywords: ["usha","impress","mixer"] },

  // ─── Water Purifiers ─────────────────────────────────────────
  { brand: "Kent",     name: "Grand Plus RO+UV+UF",   category: "Water Purifier", warranty_years: 1, avg_price_inr: 14999, keywords: ["kent","grand plus","ro"] },
  { brand: "Aquaguard",name: "Aura NXT RO+UV",        category: "Water Purifier", warranty_years: 1, avg_price_inr: 17490, keywords: ["aquaguard","aura","eureka"] },
  { brand: "HUL Pureit",name: "Eco Water Saver RO+UV", category: "Water Purifier", warranty_years: 1, avg_price_inr: 11999, keywords: ["pureit","eco","hul"] },
  { brand: "Blue Star",name: "Aristo AR4BLAM01",       category: "Water Purifier", warranty_years: 1, avg_price_inr: 8999,  keywords: ["blue star","aristo","ar4"] },

  // ─── Two-Wheelers & Accessories ──────────────────────────────
  { brand: "Honda",    name: "Activa 6G Scooter",     category: "Two-Wheeler",   warranty_years: 2, avg_price_inr: 74500,  keywords: ["honda","activa","scooter"] },
  { brand: "TVS",      name: "Jupiter Classic Scooter", category: "Two-Wheeler", warranty_years: 2, avg_price_inr: 75000,  keywords: ["tvs","jupiter","scooter"] },

  // ─── Audio ───────────────────────────────────────────────────
  { brand: "boAt",     name: "Rockerz 450 Wireless Headphones", category: "Headphones", warranty_years: 1, avg_price_inr: 1499, keywords: ["boat","rockerz","450","headphones"] },
  { brand: "Sony",     name: "WH-CH520 Wireless",     category: "Headphones",    warranty_years: 1, avg_price_inr: 3490,   keywords: ["sony","wh-ch520","wireless"] },
];

/**
 * Find a catalog entry by fuzzy keyword match.
 * Used when barcode lookup returns no result — falls back to text search
 * against the product name typed by the user.
 */
export function findCatalogEntry(query: string): CatalogEntry | null {
  const q = query.toLowerCase().trim();
  if (!q) return null;

  // Score each entry by number of matching keywords
  let best: { entry: CatalogEntry; score: number } | null = null;

  for (const entry of INDIA_CATALOG) {
    const score = entry.keywords.filter((kw) => q.includes(kw) || kw.includes(q)).length;
    if (score > 0 && (!best || score > best.score)) {
      best = { entry, score };
    }
  }

  // Also try brand+name direct match
  for (const entry of INDIA_CATALOG) {
    const combined = `${entry.brand} ${entry.name}`.toLowerCase();
    if (combined.includes(q) || q.includes(entry.brand.toLowerCase())) {
      const score = 10; // direct match wins
      if (!best || score > best.score) best = { entry, score };
    }
  }

  return best ? best.entry : null;
}
