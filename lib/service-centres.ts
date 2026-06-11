/**
 * service-centres.ts
 * India brand service centre contact database.
 * Toll-free numbers verified June 2026.
 * Used by ServiceCentreQuickCall component and ProductDetailClient.
 */

export interface ServiceCentre {
  brand: string;
  toll_free: string;        // 1800-xxx-xxxx format
  alternate?: string;       // paid number if toll-free unavailable
  whatsapp?: string;        // WhatsApp service number
  email?: string;
  portal?: string;          // self-service portal URL
  hours: string;            // service hours IST
  languages: string[];      // supported languages
}

export const SERVICE_CENTRES: ServiceCentre[] = [
  // ── Mobile & Electronics ───────────────────────────────────────────────
  { brand: "Samsung",   toll_free: "1800-5-726786",  whatsapp: "+918130000333", portal: "https://www.samsung.com/in/support/",         hours: "8am–8pm Mon–Sun", languages: ["Hindi","English","Tamil","Telugu","Kannada","Malayalam","Bengali","Marathi"] },
  { brand: "Apple",     toll_free: "1800-108-4357",  portal: "https://getsupport.apple.com",                                              hours: "24x7",            languages: ["English","Hindi"] },
  { brand: "Redmi",     toll_free: "1800-103-6286",  portal: "https://www.mi.com/in/service/",                                            hours: "9am–6pm Mon–Sat",  languages: ["Hindi","English"] },
  { brand: "Mi",        toll_free: "1800-103-6286",  portal: "https://www.mi.com/in/service/",                                            hours: "9am–6pm Mon–Sat",  languages: ["Hindi","English"] },
  { brand: "Xiaomi",    toll_free: "1800-103-6286",  portal: "https://www.mi.com/in/service/",                                            hours: "9am–6pm Mon–Sat",  languages: ["Hindi","English"] },
  { brand: "OnePlus",   toll_free: "1800-102-8411",  portal: "https://www.oneplus.in/support",                                           hours: "9am–9pm Mon–Sun",  languages: ["Hindi","English"] },
  { brand: "Realme",    toll_free: "1800-102-2777",  portal: "https://www.realme.com/in/support",                                        hours: "9am–6pm Mon–Sat",  languages: ["Hindi","English"] },
  { brand: "Vivo",      toll_free: "1800-102-3388",  portal: "https://www.vivo.com/in/support",                                          hours: "9am–9pm Mon–Sun",  languages: ["Hindi","English","Tamil","Telugu"] },
  { brand: "OPPO",      toll_free: "1800-103-2777",  portal: "https://www.oppo.com/en/support/",                                         hours: "9am–6pm Mon–Sat",  languages: ["Hindi","English"] },
  { brand: "iQOO",      toll_free: "1800-102-3388",  portal: "https://www.iqoo.com/in/support",                                          hours: "9am–6pm Mon–Sat",  languages: ["English"] },
  { brand: "Motorola",  toll_free: "1800-102-2344",  portal: "https://www.motorola.in/support",                                          hours: "9am–6pm Mon–Fri",  languages: ["Hindi","English"] },
  { brand: "Nokia",     toll_free: "1800-123-4000",  portal: "https://www.nokia.com/phones/en_in/support",                               hours: "9am–6pm Mon–Sat",  languages: ["Hindi","English"] },

  // ── Laptops & Computers ───────────────────────────────────────────────
  { brand: "HP",        toll_free: "1800-108-4747",  portal: "https://support.hp.com/in-en",                                             hours: "24x7",            languages: ["English","Hindi"] },
  { brand: "Dell",      toll_free: "1800-108-4272",  portal: "https://www.dell.com/support/home/en-in",                                  hours: "24x7",            languages: ["English","Hindi"] },
  { brand: "Lenovo",    toll_free: "1800-419-7555",  portal: "https://support.lenovo.com",                                               hours: "24x7",            languages: ["English","Hindi"] },
  { brand: "ASUS",      toll_free: "1800-2090-365",  portal: "https://www.asus.com/in/support/",                                         hours: "9am–6pm Mon–Sat",  languages: ["English"] },

  // ── Home Appliances ──────────────────────────────────────────────────
  { brand: "LG",        toll_free: "1800-180-9999",  portal: "https://www.lg.com/in/support",                                            hours: "8am–8pm Mon–Sun",  languages: ["Hindi","English","Tamil","Telugu","Kannada","Malayalam"] },
  { brand: "Whirlpool", toll_free: "1800-208-1800",  portal: "https://www.whirlpool.co.in/support",                                      hours: "8am–8pm Mon–Sun",  languages: ["Hindi","English"] },
  { brand: "Godrej",    toll_free: "1800-209-5511",  portal: "https://godrejofficeplusappliances.com/customer-support",                  hours: "9am–6pm Mon–Sat",  languages: ["Hindi","English","Marathi"] },
  { brand: "Haier",     toll_free: "1800-209-1800",  portal: "https://www.haier.com/in/support/",                                        hours: "9am–6pm Mon–Sat",  languages: ["Hindi","English"] },
  { brand: "Voltas",    toll_free: "1800-209-0000",  portal: "https://www.voltaslimited.com/service-support/",                           hours: "8am–8pm Mon–Sun",  languages: ["Hindi","English","Tamil","Telugu"] },
  { brand: "Daikin",    toll_free: "1800-102-9300",  portal: "https://www.daikinindia.com/support",                                      hours: "8am–8pm Mon–Sun",  languages: ["Hindi","English"] },
  { brand: "Blue Star", toll_free: "1800-209-1177",  portal: "https://www.bluestarindia.com/customer-care",                              hours: "9am–6pm Mon–Sat",  languages: ["Hindi","English"] },
  { brand: "Carrier",   toll_free: "1800-180-1218",  portal: "https://www.carrier.com/residential/en/in/",                               hours: "9am–6pm Mon–Sat",  languages: ["English"] },
  { brand: "Bosch",     toll_free: "1800-266-1880",  portal: "https://www.bosch-home.com/in/service-and-support.html",                   hours: "9am–6pm Mon–Sat",  languages: ["English","Hindi"] },
  { brand: "IFB",       toll_free: "1860-425-5678",  alternate: "033-39895678",                                                          hours: "9am–6pm Mon–Sat",  languages: ["Hindi","English","Bengali"] },
  { brand: "Siemens",   toll_free: "1800-209-3478",  portal: "https://www.siemens-home.bsh-group.com/in/",                               hours: "9am–6pm Mon–Sat",  languages: ["English"] },
  { brand: "Panasonic", toll_free: "1800-103-1333",  portal: "https://www.panasonic.com/in/consumer/support.html",                       hours: "9am–6pm Mon–Sat",  languages: ["Hindi","English"] },
  { brand: "Sony",      toll_free: "1800-103-7799",  portal: "https://www.sony.co.in/support",                                           hours: "9am–6pm Mon–Sat",  languages: ["Hindi","English","Tamil","Telugu"] },

  // ── Kitchen & Water ───────────────────────────────────────────────────
  { brand: "Philips",   toll_free: "1800-102-2929",  portal: "https://www.philips.co.in/c-w/support",                                    hours: "9am–6pm Mon–Sat",  languages: ["Hindi","English"] },
  { brand: "Prestige",  toll_free: "1800-102-7771",  portal: "https://www.ttk.co.in/prestige-service-centre",                            hours: "9am–6pm Mon–Sat",  languages: ["Hindi","English","Tamil","Kannada"] },
  { brand: "Kent",      toll_free: "1800-1031-652",  portal: "https://www.kent.co.in/service-request.aspx",                              hours: "9am–6pm Mon–Sat",  languages: ["Hindi","English"] },
  { brand: "Aquaguard", toll_free: "1800-1025-111",  portal: "https://www.eurekaforbes.com/schedule-amc.aspx",                           hours: "8am–8pm Mon–Sun",  languages: ["Hindi","English","Tamil","Telugu","Kannada"] },
  { brand: "HUL Pureit",toll_free: "1860-210-1000",  portal: "https://www.pureitwater.com/IN/services",                                  hours: "8am–8pm Mon–Sun",  languages: ["Hindi","English"] },
  { brand: "Usha",      toll_free: "1800-180-8742",  portal: "https://www.usha.com/customer-care",                                       hours: "9am–6pm Mon–Sat",  languages: ["Hindi","English"] },

  // ── Consumer Electronics ──────────────────────────────────────────────
  { brand: "boAt",      toll_free: "1860-500-2628",  portal: "https://www.boat-lifestyle.com/pages/support",                             hours: "9am–6pm Mon–Sat",  languages: ["English","Hindi"] },
  { brand: "JBL",       toll_free: "1800-102-0525",  portal: "https://in.harman.com/support",                                            hours: "9am–6pm Mon–Fri",  languages: ["English"] },
  { brand: "Dyson",     toll_free: "1800-123-4968",  portal: "https://www.dyson.in/support",                                             hours: "8am–8pm Mon–Sun",  languages: ["English","Hindi"] },

  // ── Two-Wheelers ──────────────────────────────────────────────────────
  { brand: "Honda",     toll_free: "1800-891-1313",  portal: "https://www.honda2wheelersindia.com/service-support",                      hours: "9am–6pm Mon–Sat",  languages: ["Hindi","English"] },
  { brand: "TVS",       toll_free: "1800-258-4530",  portal: "https://www.tvsmotor.com/service-support",                                 hours: "9am–6pm Mon–Sat",  languages: ["Tamil","Hindi","English","Telugu"] },
  { brand: "Hero",      toll_free: "1800-266-0018",  portal: "https://www.heromotocorp.com/en-in/find-service-centre",                   hours: "9am–6pm Mon–Sat",  languages: ["Hindi","English"] },
];

/** Lookup by brand name (case-insensitive, fuzzy). */
export function getServiceCentre(brand: string): ServiceCentre | null {
  const b = brand.toLowerCase().trim();
  return SERVICE_CENTRES.find(sc =>
    sc.brand.toLowerCase() === b ||
    sc.brand.toLowerCase().includes(b) ||
    b.includes(sc.brand.toLowerCase())
  ) ?? null;
}
