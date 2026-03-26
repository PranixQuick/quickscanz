"use client";

import { useState, useEffect, useTransition } from "react";
import { getVoiceIntegrations, addVoiceIntegration, getMatterDevices, addMatterDevice } from "@/lib/actions/iot";
import { getSmartDevices } from "@/lib/actions/smartdevices";
import type { VoiceIntegration, MatterDevice } from "@/lib/actions/iot";
import type { SmartDevice } from "@/lib/actions/smartdevices";
import toast from "react-hot-toast";

const PLATFORMS = [
  { id: "alexa", label: "Amazon Alexa", icon: "🔵", color: "bg-blue-50 border-blue-200",
    skillUrl: "https://www.amazon.in/dp/B09B8V1LZ3",
    steps: ["Open Alexa app on your phone", "Tap More → Skills & Games", 'Search "QuickScanZ"', "Enable skill → Link account"],
    available: true },
  { id: "google_home", label: "Google Home", icon: "🟢", color: "bg-green-50 border-green-200",
    skillUrl: "https://home.google.com",
    steps: ["Open Google Home app", "Tap + → Set up device", "Works with Google", 'Search "QuickScanZ"'],
    available: true },
  { id: "siri", label: "Apple Siri / HomeKit", icon: "⚪", color: "bg-gray-50 border-gray-200",
    skillUrl: "https://www.apple.com/in/home-app/",
    steps: ["Open Apple Home app", "Add Accessory → Scan QR", "Requires HomeKit hub (HomePod)"],
    available: false },
];

const PROTOCOLS = [
  { id: "matter", label: "Matter", icon: "🔗", desc: "Universal smart home standard" },
  { id: "tuya", label: "Tuya / Smart Life", icon: "📱", desc: "Tuya ecosystem (Wipro, Atomberg etc.)" },
  { id: "smartthings", label: "SmartThings", icon: "🏠", desc: "Samsung ecosystem" },
  { id: "zigbee", label: "Zigbee", icon: "📶", desc: "Low-power mesh protocol" },
  { id: "zwave", label: "Z-Wave", icon: "🌊", desc: "900MHz mesh protocol" },
  { id: "thread", label: "Thread", icon: "🧵", desc: "IP-based mesh for Matter" },
];

export default function IoTHubClient() {
  const [tab, setTab] = useState<"voice" | "matter">("voice");
  const [voices, setVoices] = useState<VoiceIntegration[]>([]);
  const [matters, setMatters] = useState<MatterDevice[]>([]);
  const [devices, setDevices] = useState<SmartDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [expandedPlatform, setExpandedPlatform] = useState<string | null>(null);
  const [showMatterForm, setShowMatterForm] = useState(false);
  const [matterForm, setMatterForm] = useState({ deviceId: "", protocol: "matter", pairingCode: "", ip: "" });

  useEffect(() => {
    Promise.all([getVoiceIntegrations(), getMatterDevices(), getSmartDevices()])
      .then(([v, m, d]) => { setVoices(v); setMatters(m); setDevices(d); setLoading(false); });
  }, []);

  function handleLinkVoice(platformId: string) {
    startTransition(async () => {
      const result = await addVoiceIntegration(platformId, null, `QuickScanZ ${platformId}`);
      if (result.success) {
        toast.success("Integration saved!");
        const v = await getVoiceIntegrations();
        setVoices(v);
      } else {
        toast.error(result.error || "Failed");
      }
    });
  }

  function handleAddMatter(e: React.FormEvent) {
    e.preventDefault();
    if (!matterForm.deviceId) { toast.error("Select a device"); return; }
    startTransition(async () => {
      const result = await addMatterDevice(matterForm.deviceId, matterForm.protocol, matterForm.pairingCode, matterForm.ip);
      if (result.success) {
        toast.success("Device registered!");
        setShowMatterForm(false);
        const m = await getMatterDevices();
        setMatters(m);
      } else toast.error(result.error || "Failed");
    });
  }

  if (loading) return <div className="space-y-4 animate-pulse">{[1,2,3].map(i=><div key={i} className="h-20 bg-cream-200 rounded-2xl"/>)}</div>;

  return (
    <div className="space-y-5 animate-fade-up">
      <div>
        <h1 className="font-display text-2xl font-light text-ink-900">IoT Hub</h1>
        <p className="text-sm text-ink-400 mt-1">Connect voice assistants and smart home protocols</p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-cream-100 p-1 rounded-2xl">
        {(["voice", "matter"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 text-sm font-medium rounded-xl transition-all ${tab === t ? "bg-white text-ink-900 shadow-sm" : "text-ink-400"}`}>
            {t === "voice" ? "🎤 Voice" : "🔗 Protocols"}
          </button>
        ))}
      </div>

      {/* VOICE TAB */}
      {tab === "voice" && (
        <div className="space-y-3">
          <p className="text-xs text-ink-400">Connect QuickScanZ to your voice assistant to ask about warranties, get service reminders, and control smart devices hands-free.</p>

          {PLATFORMS.map((p) => {
            const linked = voices.some((v) => v.platform === p.id && v.is_active);
            const expanded = expandedPlatform === p.id;
            return (
              <div key={p.id} className={`card border ${p.color}`}>
                <div className="p-4 flex items-center gap-3 cursor-pointer"
                  onClick={() => setExpandedPlatform(expanded ? null : p.id)}>
                  <span className="text-2xl">{p.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-ink-900">{p.label}</p>
                    {linked ? (
                      <p className="text-xs text-sage-600 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-sage-400" /> Connected
                      </p>
                    ) : (
                      <p className="text-xs text-ink-400">{p.available ? "Tap to connect" : "Coming soon"}</p>
                    )}
                  </div>
                  {p.available && (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
                      className={`text-ink-300 transition-transform ${expanded ? "rotate-180" : ""}`}>
                      <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                    </svg>
                  )}
                </div>

                {expanded && p.available && (
                  <div className="px-4 pb-4 space-y-3 border-t border-current/10 pt-3">
                    <div className="space-y-2">
                      <p className="text-[11px] font-medium text-ink-600">Setup steps:</p>
                      {p.steps.map((step, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className="w-5 h-5 rounded-full bg-cream-200 text-[10px] font-bold text-ink-500 flex items-center justify-center flex-shrink-0 mt-0.5">{i+1}</span>
                          <p className="text-xs text-ink-600">{step}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      {!linked ? (
                        <button onClick={() => handleLinkVoice(p.id)} disabled={isPending}
                          className="flex-1 btn-primary text-xs py-2.5 disabled:opacity-40">
                          {isPending ? "Saving..." : `Link ${p.label}`}
                        </button>
                      ) : (
                        <div className="flex-1 text-center py-2.5 text-xs text-sage-600 bg-sage-50 rounded-xl border border-sage-200">
                          ✓ Linked successfully
                        </div>
                      )}
                      <a href={p.skillUrl} rel="noopener noreferrer"
                        className="btn-secondary text-xs px-4 py-2.5">
                        Open App →
                      </a>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* What you can say */}
          <div className="card p-4 bg-cream-50">
            <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-3">What you can ask</p>
            <div className="space-y-2">
              {[
                '"Alexa, ask QuickScanZ when my TV warranty expires"',
                '"Hey Google, is my Samsung fridge under warranty?"',
                '"Alexa, remind me to service my AC next month"',
                '"Hey Google, what\'s my most expensive product?"',
              ].map((q, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-sand-400 text-sm">›</span>
                  <p className="text-xs text-ink-500 italic">{q}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MATTER / PROTOCOLS TAB */}
      {tab === "matter" && (
        <div className="space-y-4">
          <p className="text-xs text-ink-400 leading-relaxed">
            Register your smart home devices by protocol. Matter and Thread are the new universal standards — once your device is registered here, QuickScanZ can track its service history and integrate with energy monitoring.
          </p>

          {/* Protocol cards */}
          <div className="grid grid-cols-2 gap-2">
            {PROTOCOLS.map((proto) => (
              <div key={proto.id} className="card p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{proto.icon}</span>
                  <p className="text-xs font-medium text-ink-800">{proto.label}</p>
                </div>
                <p className="text-[11px] text-ink-400 leading-relaxed">{proto.desc}</p>
              </div>
            ))}
          </div>

          {/* Registered matter devices */}
          {matters.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-2">Registered Devices</p>
              <div className="space-y-2">
                {matters.map((m) => {
                  const dev = devices.find((d) => d.id === m.smart_device_id);
                  return (
                    <div key={m.id} className="card p-3 flex items-center gap-3">
                      <span className="text-lg">{PROTOCOLS.find((p) => p.id === m.protocol)?.icon || "🔗"}</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-ink-800">{dev?.device_name || "Unknown device"}</p>
                        <p className="text-xs text-ink-400">{m.protocol}{m.ip_address ? ` · ${m.ip_address}` : ""}</p>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${m.is_paired ? "bg-sage-100 text-sage-600" : "bg-amber-100 text-amber-600"}`}>
                        {m.is_paired ? "Paired" : "Pending"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Add device form */}
          {showMatterForm ? (
            <form onSubmit={handleAddMatter} className="card p-4 space-y-3">
              <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider">Register Device</p>
              <div>
                <label className="block text-xs text-ink-500 mb-1.5">Smart Device</label>
                <select value={matterForm.deviceId} onChange={(e) => setMatterForm(p => ({...p, deviceId: e.target.value}))} required
                  className="w-full px-3 py-2.5 bg-cream-100 border border-cream-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sand-300">
                  <option value="">Select device...</option>
                  {devices.map((d) => <option key={d.id} value={d.id}>{d.device_name} ({d.brand})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-ink-500 mb-1.5">Protocol</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {PROTOCOLS.map((p) => (
                    <button key={p.id} type="button" onClick={() => setMatterForm(prev => ({...prev, protocol: p.id}))}
                      className={`px-2 py-2 rounded-xl border text-xs text-center transition-all ${matterForm.protocol === p.id ? "bg-ink-900 border-ink-900 text-cream-50" : "bg-cream-100 border-cream-200 text-ink-600"}`}>
                      {p.icon} {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-ink-500 mb-1.5">Pairing Code</label>
                  <input value={matterForm.pairingCode} onChange={(e) => setMatterForm(p => ({...p, pairingCode: e.target.value}))}
                    placeholder="e.g. 12345678" className="w-full px-3 py-2.5 bg-cream-100 border border-cream-200 rounded-xl text-sm font-mono focus:outline-none"/>
                </div>
                <div>
                  <label className="block text-xs text-ink-500 mb-1.5">IP Address</label>
                  <input value={matterForm.ip} onChange={(e) => setMatterForm(p => ({...p, ip: e.target.value}))}
                    placeholder="192.168.1.x" className="w-full px-3 py-2.5 bg-cream-100 border border-cream-200 rounded-xl text-sm font-mono focus:outline-none"/>
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowMatterForm(false)} className="flex-1 btn-secondary py-2.5 text-sm">Cancel</button>
                <button type="submit" disabled={isPending} className="flex-1 btn-primary py-2.5 text-sm disabled:opacity-40">
                  {isPending ? "Saving..." : "Register"}
                </button>
              </div>
            </form>
          ) : (
            <button onClick={() => setShowMatterForm(true)} className="w-full card p-4 flex items-center justify-center gap-2 text-sm text-ink-400 hover:text-ink-600 hover:border-sand-300 transition-all">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              Register a device protocol
            </button>
          )}

          {/* MQTT note */}
          <div className="card p-4 bg-gradient-to-r from-ink-900 to-ink-800 border-ink-700">
            <p className="text-xs font-medium text-cream-200 mb-2">🔧 Advanced: MQTT Integration</p>
            <p className="text-xs text-cream-400 leading-relaxed">
              For real-time telemetry from Tuya, SmartThings, or custom MQTT brokers, configure your device to publish to:
            </p>
            <code className="block mt-2 text-[11px] font-mono bg-ink-800 text-sage-300 px-3 py-2 rounded-lg">
              quickscanz/{"{user_id}"}/{"{device_id}"}/telemetry
            </code>
            <p className="text-[11px] text-cream-500 mt-1.5">Full MQTT bridge coming in the next release.</p>
          </div>
        </div>
      )}
    </div>
  );
                }
