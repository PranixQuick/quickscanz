"use client";

import { useState, useEffect, useTransition } from "react";
import { getSmartDevices, addSmartDevice, deleteSmartDevice, logDeviceService } from "@/lib/actions/smartdevices";
import type { SmartDevice } from "@/lib/actions/smartdevices";
import toast from "react-hot-toast";

const DEVICE_TYPES = [
  { value: "ac", label: "Air Conditioner", icon: "❄️", tip: "Service every 6 months", setupGuide: "1. Download the brand app (e.g. Voltas, LG ThinQ, Daikin)\n2. Enable Wi-Fi on the AC\n3. Connect via app and set schedules\n4. Book professional service every 6 months" },
  { value: "washing_machine", label: "Washing Machine", icon: "🫧", tip: "Clean drum monthly", setupGuide: "1. Download brand app if smart model\n2. Enable Wi-Fi and add to app\n3. Set monthly drum-clean reminder\n4. Check inlet filters every 3 months" },
  { value: "refrigerator", label: "Refrigerator", icon: "🧊", tip: "Clean coils yearly", setupGuide: "1. Pair with brand app (Samsung SmartThings, LG ThinQ)\n2. Set temperature alerts\n3. Clean rear coils once a year\n4. Check door seals every 6 months" },
  { value: "tv", label: "Smart TV", icon: "📺", tip: "Update firmware regularly", setupGuide: "1. Connect to home Wi-Fi in TV settings\n2. Enable auto firmware updates\n3. Download brand app for remote control\n4. Clean vents every 3 months" },
  { value: "water_heater", label: "Water Heater", icon: "🚿", tip: "Check anode rod yearly", setupGuide: "1. Connect smart models to brand app\n2. Set heating schedule for efficiency\n3. Annual professional servicing recommended\n4. Check pressure relief valve yearly" },
  { value: "air_purifier", label: "Air Purifier", icon: "💨", tip: "Replace filter every 6–12 months", setupGuide: "1. Download brand app (Dyson, Xiaomi, etc.)\n2. Enable auto mode and schedule\n3. Replace HEPA filter every 6-12 months\n4. Clean pre-filter monthly" },
  { value: "router", label: "Wi-Fi Router", icon: "📡", tip: "Restart monthly, update firmware", setupGuide: "1. Access admin panel via 192.168.0.1\n2. Enable auto firmware updates\n3. Restart monthly for performance\n4. Change default password immediately" },
  { value: "smart_speaker", label: "Smart Speaker", icon: "🔊", tip: "Update firmware for security", setupGuide: "1. Setup via Alexa / Google Home app\n2. Enable auto updates\n3. Wipe and re-pair if moving to new network\n4. Clean mesh cover gently every month" },
  { value: "security_camera", label: "Security Camera", icon: "📷", tip: "Clean lens quarterly", setupGuide: "1. Mount at 8-10 ft height for best coverage\n2. Connect via brand app (CP Plus, Hikvision)\n3. Set motion alerts\n4. Clean lens with microfiber cloth quarterly" },
  { value: "robot_vacuum", label: "Robot Vacuum", icon: "🤖", tip: "Clean brushes weekly", setupGuide: "1. Connect via brand app (Roborock, iRobot)\n2. Map your home on first run\n3. Empty dustbin after every run\n4. Clean main brush weekly, replace filters monthly" },
  { value: "smart_bulb", label: "Smart Bulb", icon: "💡", tip: "Check app updates for new features", setupGuide: "1. Screw in and pair via app (Philips Hue, Syska)\n2. Create scenes and schedules\n3. Check app updates for new features\n4. Average lifespan 25,000 hours" },
  { value: "smart_plug", label: "Smart Plug", icon: "🔌", tip: "Monitor energy usage in the app", setupGuide: "1. Plug in and add to app (TP-Link Tapo, Mi)\n2. Set timers and schedules\n3. Monitor energy usage for savings\n4. Do not overload beyond rated wattage" },
  { value: "other", label: "Other Smart Device", icon: "📦", tip: "", setupGuide: "1. Check the brand's official app\n2. Follow setup wizard in the app\n3. Enable auto-updates\n4. Bookmark the brand's support page" },
];

const ENERGY_RATINGS = ["1 Star", "2 Star", "3 Star", "4 Star", "5 Star", "BEE 5 Star", "A+", "A++"];

function ServiceBadge({ daysUntil }: { daysUntil: number }) {
  if (daysUntil < 0) return <span className="text-[10px] bg-blush-100 text-blush-600 px-2 py-0.5 rounded-full font-medium">Overdue</span>;
  if (daysUntil <= 7) return <span className="text-[10px] bg-blush-100 text-blush-600 px-2 py-0.5 rounded-full animate-pulse font-medium">Due in {daysUntil}d</span>;
  if (daysUntil <= 30) return <span className="text-[10px] bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full font-medium">Due in {daysUntil}d</span>;
  return <span className="text-[10px] bg-sage-100 text-sage-600 px-2 py-0.5 rounded-full">Due in {daysUntil}d</span>;
}

function SetupGuideModal({ type, onClose }: { type: typeof DEVICE_TYPES[0]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-ink-900/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
      onClick={onClose}>
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{type.icon}</span>
          <div>
            <p className="text-sm font-semibold text-ink-900">{type.label} Setup Guide</p>
            <p className="text-xs text-ink-400">Quick setup steps</p>
          </div>
          <button onClick={onClose} className="ml-auto text-ink-300 hover:text-ink-600">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        <div className="bg-cream-50 rounded-2xl p-4">
          {type.setupGuide.split("\n").map((step, i) => (
            <p key={i} className="text-xs text-ink-600 leading-relaxed mb-1.5">{step}</p>
          ))}
        </div>
        {type.tip && (
          <div className="flex items-start gap-2 p-3 bg-sand-50 border border-sand-200 rounded-xl">
            <span className="text-sm">💡</span>
            <p className="text-xs text-sand-700">{type.tip}</p>
          </div>
        )}
        <button onClick={onClose} className="w-full btn-primary py-2.5 text-sm">Got it</button>
      </div>
    </div>
  );
}

export default function SmartDevicesClient() {
  const [devices, setDevices] = useState<SmartDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [setupGuideType, setSetupGuideType] = useState<typeof DEVICE_TYPES[0] | null>(null);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    device_name: "", brand: "", device_type: "ac",
    model_number: "", purchase_date: "",
    service_interval_months: "12", daily_usage_hours: "",
    energy_rating: "", has_wifi: "true", has_app: "true", app_name: "", notes: "",
  });

  async function reload() {
    const d = await getSmartDevices();
    setDevices(d);
    setLoading(false);
  }

  useEffect(() => { reload(); }, []);

  function set(k: string, v: string) { setForm((p) => ({ ...p, [k]: v })); }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.device_name || !form.brand) { toast.error("Name and brand required"); return; }
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    startTransition(async () => {
      const result = await addSmartDevice(fd);
      if (result.success) {
        toast.success("Smart device added!");
        setShowAdd(false);
        setForm({ device_name: "", brand: "", device_type: "ac", model_number: "", purchase_date: "", service_interval_months: "12", daily_usage_hours: "", energy_rating: "", has_wifi: "true", has_app: "true", app_name: "", notes: "" });
        reload();
      } else {
        toast.error(result.error || "Failed to add");
      }
    });
  }

  const selectedType = DEVICE_TYPES.find((t) => t.value === form.device_type)!;

  const overdueCount = devices.filter((d) => {
    if (!d.next_service_due) return false;
    return new Date(d.next_service_due) <= new Date();
  }).length;

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-light text-ink-900">Smart Devices</h1>
          <p className="text-sm text-ink-400 mt-1">
            {devices.length} device{devices.length !== 1 ? "s" : ""}
            {overdueCount > 0 && <span className="text-blush-500"> · {overdueCount} service overdue</span>}
          </p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          Add
        </button>
      </div>

      {/* Explainer banner */}
      <div className="card p-4 bg-gradient-to-br from-ink-900 to-ink-800 border-ink-700">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🏠</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-cream-100">What is Smart Devices?</p>
            <p className="text-xs text-cream-400 mt-0.5 leading-relaxed">
              Track home appliances for <strong className="text-cream-200">service schedules</strong>, energy usage &amp; app controls — not warranty claims. Add those to Products instead.
            </p>
            <button
              onClick={() => setShowOnboarding(true)}
              className="mt-2 text-xs text-sand-300 hover:text-sand-200 underline underline-offset-2"
            >
              Products vs Smart Devices — what&apos;s different? →
            </button>
          </div>
        </div>
      </div>

      {/* Onboarding modal */}
      {showOnboarding && (
        <div className="fixed inset-0 z-50 bg-ink-900/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          onClick={() => setShowOnboarding(false)}>
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-semibold text-ink-900">Products vs Smart Devices</p>
            <div className="space-y-3">
              <div className="p-3 bg-sage-50 border border-sage-200 rounded-xl">
                <p className="text-xs font-semibold text-sage-700 mb-1">📦 Products — Warranty Tracker</p>
                <p className="text-xs text-ink-600">Add any purchase. We track warranty expiry, invoice, and help you file claims. You get alerts before your warranty expires.</p>
              </div>
              <div className="p-3 bg-sand-50 border border-sand-200 rounded-xl">
                <p className="text-xs font-semibold text-sand-700 mb-1">🏠 Smart Devices — Service Tracker</p>
                <p className="text-xs text-ink-600">Track service due dates (e.g. AC service every 6 months), daily energy usage, app name, and Wi-Fi connectivity.</p>
              </div>
              <div className="p-3 bg-cream-100 rounded-xl">
                <p className="text-xs text-ink-500">💡 <strong>Tip:</strong> Add the same device to both — Products for warranty, Smart Devices for service scheduling.</p>
              </div>
            </div>
            <button onClick={() => setShowOnboarding(false)} className="w-full btn-primary py-2.5 text-sm">Got it</button>
          </div>
        </div>
      )}

      {/* Add form */}
      {showAdd && (
        <form onSubmit={handleSubmit} className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider">Add Smart Device</p>
            <button
              type="button"
              onClick={() => setSetupGuideType(selectedType)}
              className="text-[11px] text-sand-600 hover:text-sand-500 bg-sand-50 border border-sand-200 px-2.5 py-1 rounded-lg transition-colors"
            >
              📖 Setup guide
            </button>
          </div>

          <div>
            <label className="block text-xs text-ink-500 mb-2">Device Type</label>
            <div className="grid grid-cols-4 gap-1.5">
              {DEVICE_TYPES.map((t) => (
                <button key={t.value} type="button" onClick={() => set("device_type", t.value)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-center transition-all ${
                    form.device_type === t.value ? "bg-ink-900 border-ink-900 text-cream-50" : "bg-cream-100 border-cream-200 text-ink-600"
                  }`}>
                  <span>{t.icon}</span>
                  <span className="text-[9px] leading-tight">{t.label}</span>
                </button>
              ))}
            </div>
            {selectedType?.tip && (
              <p className="text-[11px] text-sand-600 mt-1.5">💡 {selectedType.tip}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-ink-500 mb-1.5">Device Name *</label>
              <input value={form.device_name} onChange={(e) => set("device_name", e.target.value)} placeholder="e.g. Living Room AC" required
                className="w-full px-3 py-2.5 bg-cream-100 border border-cream-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sand-300" />
            </div>
            <div>
              <label className="block text-xs text-ink-500 mb-1.5">Brand *</label>
              <input value={form.brand} onChange={(e) => set("brand", e.target.value)} placeholder="e.g. Voltas" required
                className="w-full px-3 py-2.5 bg-cream-100 border border-cream-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sand-300" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-ink-500 mb-1.5">Purchase Date</label>
              <input type="date" value={form.purchase_date} onChange={(e) => set("purchase_date", e.target.value)}
                max={new Date().toISOString().split("T")[0]}
                className="w-full px-3 py-2.5 bg-cream-100 border border-cream-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sand-300" />
            </div>
            <div>
              <label className="block text-xs text-ink-500 mb-1.5">Service Every</label>
              <select value={form.service_interval_months} onChange={(e) => set("service_interval_months", e.target.value)}
                className="w-full px-3 py-2.5 bg-cream-100 border border-cream-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sand-300">
                {[1,3,6,12,18,24].map((m) => <option key={m} value={m}>{m} month{m !== 1 ? "s" : ""}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-ink-500 mb-1.5">Daily Usage (hours)</label>
              <input type="number" value={form.daily_usage_hours} onChange={(e) => set("daily_usage_hours", e.target.value)}
                placeholder="e.g. 8" min="0" max="24" step="0.5"
                className="w-full px-3 py-2.5 bg-cream-100 border border-cream-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sand-300" />
            </div>
            <div>
              <label className="block text-xs text-ink-500 mb-1.5">Energy Rating</label>
              <select value={form.energy_rating} onChange={(e) => set("energy_rating", e.target.value)}
                className="w-full px-3 py-2.5 bg-cream-100 border border-cream-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sand-300">
                <option value="">Select</option>
                {ENERGY_RATINGS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          <div className="p-3 bg-cream-50 border border-cream-200 rounded-xl space-y-3">
            <p className="text-xs font-medium text-ink-500">Connectivity</p>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-ink-600 cursor-pointer">
                <input type="checkbox" checked={form.has_wifi === "true"} onChange={(e) => set("has_wifi", e.target.checked ? "true" : "false")} className="rounded" />
                <span>📡 Has Wi-Fi</span>
              </label>
              <label className="flex items-center gap-2 text-sm text-ink-600 cursor-pointer">
                <input type="checkbox" checked={form.has_app === "true"} onChange={(e) => set("has_app", e.target.checked ? "true" : "false")} className="rounded" />
                <span>📱 Has App</span>
              </label>
            </div>
            <p className="text-[11px] text-ink-400">
              {form.has_wifi === "true" && form.has_app === "true"
                ? "We'll remind you to update the app and check connectivity during service."
                : form.has_wifi === "true"
                ? "We'll include Wi-Fi connectivity in service reminders."
                : form.has_app === "true"
                ? "We'll remind you to check the app during service."
                : "No connectivity — we'll track service dates only."}
            </p>
          </div>

          {form.has_app === "true" && (
            <div>
              <label className="block text-xs text-ink-500 mb-1.5">App Name</label>
              <input value={form.app_name} onChange={(e) => set("app_name", e.target.value)} placeholder="e.g. Voltas App, Mi Home, LG ThinQ"
                className="w-full px-3 py-2.5 bg-cream-100 border border-cream-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sand-300" />
            </div>
          )}

          <div className="flex gap-2">
            <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary flex-1 py-2.5 text-sm">Cancel</button>
            <button type="submit" disabled={isPending} className="flex-1 btn-primary py-2.5 text-sm disabled:opacity-40">
              {isPending ? "Saving..." : "Add Device"}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="space-y-3">{[1,2].map((i) => <div key={i} className="h-24 bg-cream-200 rounded-2xl animate-pulse" />)}</div>
      ) : devices.length === 0 && !showAdd ? (
        <div className="card p-10 text-center">
          <p className="text-3xl mb-3">🏠</p>
          <p className="text-sm font-medium text-ink-800 mb-1">No smart devices yet</p>
          <p className="text-xs text-ink-400 mb-4 max-w-xs mx-auto">Add your AC, washing machine, TV, or any connected appliance to track service schedules and energy usage</p>
          <button onClick={() => setShowAdd(true)} className="btn-primary text-sm px-5 py-2.5">Add your first device</button>
        </div>
      ) : (
        <div className="space-y-3">
          {devices.map((device) => {
            const typeInfo = DEVICE_TYPES.find((t) => t.value === device.device_type) || DEVICE_TYPES.slice(-1)[0];
            const daysUntilService = device.next_service_due
              ? Math.floor((new Date(device.next_service_due).getTime() - Date.now()) / 86400000)
              : null;
            const monthlyEstCost = device.daily_usage_hours && device.energy_rating
              ? (device.daily_usage_hours * 30 * 0.5 * 8).toFixed(0)
              : null;

            return (
              <div key={device.id} className="card p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cream-100 flex items-center justify-center text-xl flex-shrink-0">
                    {typeInfo.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-ink-900">{device.device_name}</p>
                        <p className="text-xs text-ink-400">{device.brand}{device.model_number ? ` · ${device.model_number}` : ""}</p>
                      </div>
                      {daysUntilService !== null && <ServiceBadge daysUntil={daysUntilService} />}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {device.has_wifi && (
                        <span className="flex items-center gap-1 text-[10px] text-sand-600 bg-sand-50 px-2 py-0.5 rounded-full">📡 Wi-Fi</span>
                      )}
                      {device.has_app && device.app_name && (
                        <span className="flex items-center gap-1 text-[10px] text-sage-600 bg-sage-50 px-2 py-0.5 rounded-full">📱 {device.app_name}</span>
                      )}
                      {device.energy_rating && (
                        <span className="flex items-center gap-1 text-[10px] text-ink-500 bg-cream-100 px-2 py-0.5 rounded-full">⭐ {device.energy_rating}</span>
                      )}
                      {device.daily_usage_hours && (
                        <span className="text-[10px] text-ink-400 bg-cream-100 px-2 py-0.5 rounded-full">
                          {device.daily_usage_hours}h/day{monthlyEstCost ? ` · ~₹${monthlyEstCost}/mo` : ""}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-3 pt-3 border-t border-cream-100">
                  <button
                    onClick={() => {
                      startTransition(async () => {
                        const r = await logDeviceService(device.id, "Routine service");
                        if (r.success) { toast.success("Service logged!"); reload(); }
                        else toast.error(r.error || "Failed");
                      });
                    }}
                    disabled={isPending}
                    className="flex-1 text-xs py-2 bg-sage-50 hover:bg-sage-100 text-sage-700 rounded-xl transition-colors border border-sage-200 font-medium"
                  >
                    ✓ Mark Serviced
                  </button>
                  <button
                    onClick={() => setSetupGuideType(typeInfo)}
                    className="flex-1 text-xs py-2 bg-sand-50 hover:bg-sand-100 text-sand-700 rounded-xl transition-colors border border-sand-200 font-medium"
                  >
                    📖 Guide
                  </button>
                  <button
                    onClick={() => {
                      if (!confirm(`Remove ${device.device_name}?`)) return;
                      startTransition(async () => {
                        const r = await deleteSmartDevice(device.id);
                        if (r.success) { toast.success("Device removed"); reload(); }
                      });
                    }}
                    className="px-3 py-2 text-xs text-ink-300 hover:text-blush-500 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {setupGuideType && (
        <SetupGuideModal type={setupGuideType} onClose={() => setSetupGuideType(null)} />
      )}
    </div>
  );
}
