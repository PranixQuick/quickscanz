export interface ProductIntelligenceData {
  category: string;
  categoryIcon: string;
  estimatedLifespanYears: string;
  warrantyType: string;
  tipWhenWorking: string;
  tipWhenBroken: string;
}

type CategoryRule = {
  keywords: string[];
  category: string;
  categoryIcon: string;
  estimatedLifespanYears: string;
  warrantyType: string;
  tipWhenWorking: string;
  tipWhenBroken: string;
};

const CATEGORY_RULES: CategoryRule[] = [
  {
    keywords: ["iphone","phone","mobile","smartphone","oneplus","pixel","galaxy s","redmi","realme","poco","oppo","vivo","nokia"],
    category: "Smartphone",
    categoryIcon: "📱",
    estimatedLifespanYears: "3–5 years",
    warrantyType: "Manufacturer warranty",
    tipWhenWorking: "Keep software updated and use a protective case.",
    tipWhenBroken: "Contact brand service center. Carry purchase invoice and IMEI number.",
  },
  {
    keywords: ["macbook","laptop","notebook","chromebook","thinkpad","inspiron","pavilion","vivobook","zenbook","surface"],
    category: "Laptop",
    categoryIcon: "💻",
    estimatedLifespanYears: "4–6 years",
    warrantyType: "Manufacturer warranty",
    tipWhenWorking: "Clean vents every 6 months. Avoid overcharging.",
    tipWhenBroken: "Backup data first. Contact authorized service center with original invoice.",
  },
  {
    keywords: ["ipad","tablet","tab "],
    category: "Tablet",
    categoryIcon: "📟",
    estimatedLifespanYears: "4–5 years",
    warrantyType: "Manufacturer warranty",
    tipWhenWorking: "Use screen protector and update OS regularly.",
    tipWhenBroken: "Contact brand support. Serial number is usually on the back or in Settings.",
  },
  {
    keywords: ["tv","television","qled","oled","4k","smart tv","bravia","crystal"],
    category: "Television",
    categoryIcon: "📺",
    estimatedLifespanYears: "7–10 years",
    warrantyType: "Manufacturer warranty",
    tipWhenWorking: "Avoid standby mode for long periods. Clean screen gently.",
    tipWhenBroken: "Note model number from the back panel. Brand engineers usually visit home.",
  },
  {
    keywords: ["ac","air conditioner","split ac","window ac","inverter ac","daikin","voltas","hitachi ac","carrier","bluestar"],
    category: "Air Conditioner",
    categoryIcon: "❄️",
    estimatedLifespanYears: "8–12 years",
    warrantyType: "Compressor + parts warranty",
    tipWhenWorking: "Service every 6 months. Clean filters monthly in summer.",
    tipWhenBroken: "Most AC brands have dedicated service hotlines. Compressor may have extended warranty — check invoice.",
  },
  {
    keywords: ["fridge","refrigerator","double door","side by side","frost free"],
    category: "Refrigerator",
    categoryIcon: "🧊",
    estimatedLifespanYears: "10–15 years",
    warrantyType: "Compressor + parts warranty",
    tipWhenWorking: "Keep 4–6 inches of clearance on sides. Don't overload.",
    tipWhenBroken: "Compressor failures are common. Check if compressor has extended 5–10 year warranty separately.",
  },
  {
    keywords: ["washing machine","washer","front load","top load","semi automatic"],
    category: "Washing Machine",
    categoryIcon: "🫧",
    estimatedLifespanYears: "8–12 years",
    warrantyType: "Motor + parts warranty",
    tipWhenWorking: "Clean drum monthly. Don't overload.",
    tipWhenBroken: "Motor failures are covered under extended warranty. Have model number ready.",
  },
  {
    keywords: ["microwave","oven","otg","convection"],
    category: "Kitchen Appliance",
    categoryIcon: "🍽️",
    estimatedLifespanYears: "8–10 years",
    warrantyType: "Manufacturer warranty",
    tipWhenWorking: "Clean after every use. Never run empty.",
    tipWhenBroken: "Contact brand service. Door seals and magnetron are common failure points.",
  },
  {
    keywords: ["mixer","grinder","blender","juicer","toaster"],
    category: "Small Appliance",
    categoryIcon: "🔌",
    estimatedLifespanYears: "5–8 years",
    warrantyType: "Manufacturer warranty",
    tipWhenWorking: "Don't run longer than recommended duty cycle.",
    tipWhenBroken: "Most service centers repair in 1–3 days. Bring the full unit.",
  },
  {
    keywords: ["camera","dslr","mirrorless","gopro","dashcam","webcam"],
    category: "Camera",
    categoryIcon: "📷",
    estimatedLifespanYears: "5–8 years",
    warrantyType: "Manufacturer warranty",
    tipWhenWorking: "Keep lens cap on. Store in dry bag with silica gel.",
    tipWhenBroken: "Shutter count and sensor damage may not be covered. Check warranty terms carefully.",
  },
  {
    keywords: ["headphone","earphone","earbuds","airpod","speaker","soundbar","wearable"],
    category: "Audio / Wearable",
    categoryIcon: "🎧",
    estimatedLifespanYears: "3–5 years",
    warrantyType: "Manufacturer warranty",
    tipWhenWorking: "Avoid water exposure unless rated IP67+.",
    tipWhenBroken: "Physical damage is usually not covered. Software issues and manufacturing defects are.",
  },
  {
    keywords: ["printer","scanner","router","modem","hard disk","ssd","keyboard","mouse","monitor"],
    category: "Computer Peripheral",
    categoryIcon: "🖨️",
    estimatedLifespanYears: "4–7 years",
    warrantyType: "Manufacturer warranty",
    tipWhenWorking: "Keep drivers updated. Avoid dusty environments.",
    tipWhenBroken: "Most brands offer advance replacement for peripherals — check brand website.",
  },
  {
    keywords: ["watch","smartwatch","fitness band","tracker"],
    category: "Wearable",
    categoryIcon: "⌚",
    estimatedLifespanYears: "3–5 years",
    warrantyType: "Manufacturer warranty",
    tipWhenWorking: "Clean straps weekly. Charge fully before storage.",
    tipWhenBroken: "Screen and battery are common issues. Battery replacement may not be covered post-warranty.",
  },
  {
    keywords: ["geyser","water heater","heater","fan","ceiling fan"],
    category: "Home Appliance",
    categoryIcon: "🏠",
    estimatedLifespanYears: "6–10 years",
    warrantyType: "Manufacturer warranty",
    tipWhenWorking: "Service annually. Check for rust or scale buildup.",
    tipWhenBroken: "Heating elements are the most common repair. Have model and serial number ready.",
  },
];

const DEFAULT_INTELLIGENCE: ProductIntelligenceData = {
  category: "Electronics",
  categoryIcon: "📦",
  estimatedLifespanYears: "3–7 years",
  warrantyType: "Manufacturer warranty",
  tipWhenWorking: "Store invoice and keep device in good condition.",
  tipWhenBroken: "Contact the brand's customer care with your invoice and purchase date.",
};

export function getProductIntelligence(name: string, brand: string): ProductIntelligenceData {
  const searchText = `${name} ${brand}`.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((kw) => searchText.includes(kw))) {
      return rule;
    }
  }
  return DEFAULT_INTELLIGENCE;
      }
