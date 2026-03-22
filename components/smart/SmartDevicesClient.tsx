"use client";

import { useState, useEffect, useTransition } from "react";
import { getSmartDevices, addSmartDevice, deleteSmartDevice, logDeviceService } from "@/lib/actions/smartdevices";
import type { SmartDevice } from "@/lib/actions/smartdevices";
import toast from "react-hot-toast";

const DEVICE_TYPES = [
  { value: "ac", label: "Air Conditioner", icon: "❄️", tip: "Service every 6 months" },
  { value: "washing_machine", label: "Washing Machine", icon: "🫧", tip: "Clean drum monthly" },
  { value: "refrigerator", label: "Refrigerator", icon: "🧊", tip: "Clean coils yearly" },
  { value: "tv", label: "Smart TV", icon: "📺", tip: "Update firmware regularly" },
  { value: "water_heater", label: "Water Heater", icon: "🚿", tip: "Check anode rod yearly" },
  { value: "air_purifier", label: "Air Purifier", icon: "💨", tip: "Replace filter every 6-12 months" },
  { value: "router", label: "Wi-Fi Router", icon: "📡", tip: "Restart monthly" },
  { value: "smart_speaker", label: "Smart Speaker", icon: "🔊", tip: "Update firmware" },
  { value: "security_camera", label: "Security Camera", icon: "📷", tip: "Clean lens quarterly" },
  { value: "robot_vacuum", label: "Robot Vacuum", icon: "🤖", tip: "Clean brushes weekly" },
  { value: "smart_bulb", label: "Smart Bulb", icon: "💡", tip: "Check app updates" },
  { value: "smart_plug", label: "Smart Plug", icon: "🔌", tip: "Monitor energy usage" },
  { value: "other", label: "Other", icon: "📦", tip: "" },
];

const ENERGY_RATINGS = ["1 Star", "2 Star", "3 Star", "4 Star", "5 Star", "BEE 5 Star", "A+", "A++"];

function ServiceBadge({ daysUntil }: { daysUntil: number }) {
  if (daysUntil < 0) return <span className="text-[10px] bg-blush-100 text-blush-600 px-2 py-0.5 rounded-full">Overdue</span>;
  if (daysUntil <= 7) return <span className="text-[10px] bg-blush-100 text-blush-600 px-2 py-0.5 rounded-full animate-pulse">Due in {daysUntil}d</span>;
  if (daysUntil <= 30) return <span className="text-[10px] bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full">Due in {daysUntil}d</span>;
  return <span className="text-[10px] bg-sage-100 text-sage-600 px-2 py-0.5 rounded-full">Due in {daysUntil}d</span>;
}

export default function SmartDevicesClient() {
  const [devices, setDevices] = useState<SmartDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
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

  const selectedType = DEVICE_TYPES.find((t) => t.value === form.device_type);

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

      {/* IoT explanation banner */}
      <div className="card p-4 bg-gradient-to-r from-ink-900 to-ink-800 border-ink-700">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🏠</span>
          <div>
            <p className="text-sm font-medium text-cream-100">Smart Home Intelligence</p>
            <p className="text-xs text-cream-400 mt-0.5 leading-relaxed">
              Track your connected devices — service schedules, energy usage, app controls, and maintenance reminders all in one place.
            </p>
          </div>
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <form onSubmit={handleSubmit} className="card p-5 space-y-4">
          <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider">Add Smart Device</p>

          {/* Device type picker */}
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
              <label className="block text-xs text-ink-500 mb-1.5">Service Every (months)</label>
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

          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-ink-600 cursor-pointer">
              <input type="checkbox" checked={form.has_wifi === "true"} onChange={(e) => set("has_wifi", e.target.checked ? "true" : "false")} className="rounded" />
              Has Wi-Fi
            </label>
            <label className="flex items-center gap-2 text-sm text-ink-600 cursor-pointer">
              <input type="checkbox" checked={form.has_app === "true"} onChange={(e) => set("has_app", e.target.checked ? "true" : "false")} className="rounded" />
              Has App
            </label>
          </div>

          {form.has_app === "true" && (
            <div>
              <label className="block text-xs text-ink-500 mb-1.5">App Name</label>
              <input value={form.app_name} onChange={(e) => set("app_name", e.target.value)} placeholder="e.g. Voltas AC, Mi Home"
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

      {/* Device list */}
      {loading ? (
        <div className="space-y-3">{[1,2].map((i) => <div key={i} className="h-24 bg-cream-200 rounded-2xl animate-pulse" />)}</div>
      ) : devices.length === 0 && !showAdd ? (
        <div className="card p-10 text-center">
          <p className="text-3xl mb-3">🏠</p>
          <p className="text-sm font-medium text-ink-800 mb-1">No smart devices yet</p>
          <p className="text-xs text-ink-400 mb-4">Add your AC, TV, washing machine, and other smart devices to track service schedules</p>
          <button onClick={() => setShowAdd(true)} className="btn-primary text-sm px-5 py-2.5">Add Device</button>
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
                        <span className="flex items-center gap-1 text-[10px] text-sand-600 bg-sand-50 px-2 py-0.5 rounded-full">
                          📡 Wi-Fi
                        </span>
                      )}
                      {device.has_app && device.app_name && (
                        <span className="flex items-center gap-1 text-[10px] text-sage-600 bg-sage-50 px-2 py-0.5 rounded-full">
                          📱 {device.app_name}
                        </span>
                      )}
                      {device.energy_rating && (
                        <span className="flex items-center gap-1 text-[10px] text-ink-500 bg-cream-100 px-2 py-0.5 rounded-full">
                          ⭐ {device.energy_rating}
                        </span>
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
                  {device.app_name && (
                    <button
                      onClick={() => toast.success(`Open ${device.app_name} on your phone`)}
                      className="flex-1 text-xs py-2 bg-sand-50 hover:bg-sand-100 text-sand-700 rounded-xl transition-colors border border-sand-200 font-medium"
                    >
                      📱 Open App
                    </button>
                  )}
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
    </div>
  );
      }
