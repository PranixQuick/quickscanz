"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import { getEnergySummary, simulateTelemetry, getDeviceEnergyHistory, getTelemetryHistory } from "@/lib/actions/iot";
import { getSmartDevices } from "@/lib/actions/smartdevices";
import type { EnergySummary, EnergyDaily, TelemetryReading } from "@/lib/actions/iot";
import type { SmartDevice } from "@/lib/actions/smartdevices";
import toast from "react-hot-toast";
import Link from "next/link";

const INR_PER_KWH = 8.5;

const DEVICE_ICONS: Record<string, string> = {
  ac: "❄️", tv: "📺", washing_machine: "🫧", refrigerator: "🧊",
  water_heater: "🚿", air_purifier: "💨", router: "📡",
  smart_speaker: "🔊", security_camera: "📷", robot_vacuum: "🤖",
  smart_bulb: "💡", smart_plug: "🔌", other: "📦",
};

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="h-1.5 bg-cream-200 rounded-full overflow-hidden w-full">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%`, transition: "width 0.6s ease" }} />
    </div>
  );
}

function LiveBadge({ watts }: { watts: number | null }) {
  if (!watts) return <span className="text-[10px] text-ink-300">No data</span>;
  const color = watts > 1000 ? "text-blush-500" : watts > 300 ? "text-amber-500" : "text-sage-500";
  return (
    <span className={`text-xs font-mono font-medium ${color} flex items-center gap-1`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
      {watts.toFixed(0)}W
    </span>
  );
}

function SparkLine({ readings }: { readings: TelemetryReading[] }) {
  if (readings.length < 2) return <div className="h-8 flex items-center text-[10px] text-ink-300">No history</div>;
  const watts = readings.map((r) => r.power_watts || 0);
  const max = Math.max(...watts);
  const min = Math.min(...watts);
  const range = max - min || 1;
  const w = 80, h = 32;
  const pts = watts.map((v, i) => {
    const x = (i / (watts.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <polyline points={pts} fill="none" stroke="#7aa67a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function EnergyDashboardClient() {
  const [devices, setDevices] = useState<SmartDevice[]>([]);
  const [summary, setSummary] = useState<EnergySummary[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [history, setHistory] = useState<EnergyDaily[]>([]);
  const [liveReadings, setLiveReadings] = useState<Record<string, TelemetryReading | null>>({});
  const [sparkData, setSparkData] = useState<Record<string, TelemetryReading[]>>({});
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [simulating, setSimulating] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [devs, summ] = await Promise.all([getSmartDevices(), getEnergySummary(days)]);
    setDevices(devs);
    setSummary(summ);
    setLoading(false);
  }, [days]);

  useEffect(() => { load(); }, [load]);

  async function runSimulation(device: SmartDevice) {
    setSimulating(device.id);
    startTransition(async () => {
      const result = await simulateTelemetry(device.id, device.device_type);
      if (result.success) {
        toast.success(`📡 ${device.device_name} reading captured`);
        // refresh spark + summary
        const [newSumm, spark] = await Promise.all([
          getEnergySummary(days),
          getTelemetryHistory(device.id, 2),
        ]);
        setSummary(newSumm);
        setSparkData((p) => ({ ...p, [device.id]: spark }));
      } else {
        toast.error(result.error || "Failed");
      }
      setSimulating(null);
    });
  }

  async function loadDeviceDetail(deviceId: string) {
    setSelected(deviceId);
    const [hist, spark] = await Promise.all([
      getDeviceEnergyHistory(deviceId, 30),
      getTelemetryHistory(deviceId, 24),
    ]);
    setHistory(hist);
    setSparkData((p) => ({ ...p, [deviceId]: spark }));
  }

  // Totals
  const totalKwh = summary.reduce((s, d) => s + Number(d.total_kwh), 0);
  const totalCost = summary.reduce((s, d) => s + Number(d.total_cost_inr), 0);
  const maxKwh = Math.max(...summary.map((d) => Number(d.total_kwh)), 0.001);
  const selectedDevice = devices.find((d) => d.id === selected);
  const selectedSummary = summary.find((s) => s.device_id === selected);

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-48 bg-cream-200 rounded-xl" />
      <div className="grid grid-cols-3 gap-3">{[1,2,3].map(i=><div key={i} className="h-20 bg-cream-200 rounded-2xl"/>)}</div>
      <div className="h-48 bg-cream-200 rounded-2xl" />
    </div>
  );

  return (
    <div className="space-y-5 animate-fade-up">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-light text-ink-900">Energy Monitor</h1>
          <p className="text-sm text-ink-400 mt-1">Real-time power usage · ₹{INR_PER_KWH}/unit</p>
        </div>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))}
          className="text-xs bg-cream-100 border border-cream-200 rounded-xl px-3 py-2 focus:outline-none">
          <option value={7}>7 days</option>
          <option value={14}>14 days</option>
          <option value={30}>30 days</option>
        </select>
      </div>

      {devices.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-3xl mb-3">⚡</p>
          <p className="text-sm font-medium text-ink-800 mb-1">No smart devices yet</p>
          <p className="text-xs text-ink-400 mb-4">Add devices in Smart Devices to track energy</p>
          <Link href="/smart-devices" className="btn-primary text-sm px-5 py-2.5">Add Smart Devices</Link>
        </div>
      ) : (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="card p-4 text-center">
              <p className="font-display text-xl font-light text-ink-900">{totalKwh.toFixed(1)}</p>
              <p className="text-[10px] text-ink-400 mt-0.5 uppercase tracking-wider">kWh used</p>
            </div>
            <div className="card p-4 text-center">
              <p className="font-display text-xl font-light text-ink-900">₹{totalCost.toFixed(0)}</p>
              <p className="text-[10px] text-ink-400 mt-0.5 uppercase tracking-wider">Est. cost</p>
            </div>
            <div className="card p-4 text-center">
              <p className="font-display text-xl font-light text-ink-900">{devices.length}</p>
              <p className="text-[10px] text-ink-400 mt-0.5 uppercase tracking-wider">Devices</p>
            </div>
          </div>

          {/* Device energy cards */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider">By Device</p>
            {devices.map((device) => {
              const s = summary.find((x) => x.device_id === device.id);
              const spark = sparkData[device.id] || [];
              const kwh = s ? Number(s.total_kwh) : 0;
              const cost = s ? Number(s.total_cost_inr) : 0;
              const isSimulating = simulating === device.id;

              return (
                <div key={device.id}
                  className={`card p-4 cursor-pointer transition-all ${selected === device.id ? "border-sand-400 bg-sand-50/30" : "hover:border-sand-300"}`}
                  onClick={() => loadDeviceDetail(device.id)}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-cream-100 flex items-center justify-center text-lg flex-shrink-0">
                      {DEVICE_ICONS[device.device_type] || "📦"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <p className="text-sm font-medium text-ink-900 truncate">{device.device_name}</p>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <LiveBadge watts={spark[spark.length - 1]?.power_watts || null} />
                          <button
                            onClick={(e) => { e.stopPropagation(); runSimulation(device); }}
                            disabled={isSimulating || isPending}
                            className="text-[10px] bg-sage-50 hover:bg-sage-100 text-sage-700 border border-sage-200 px-2 py-1 rounded-lg transition-colors disabled:opacity-40"
                          >
                            {isSimulating ? "📡..." : "📡 Read"}
                          </button>
                        </div>
                      </div>
                      <MiniBar value={kwh} max={maxKwh} color={
                        kwh / maxKwh > 0.7 ? "bg-blush-300" :
                        kwh / maxKwh > 0.4 ? "bg-amber-300" : "bg-sage-300"
                      } />
                      <div className="flex items-center justify-between mt-1.5">
                        <p className="text-[10px] text-ink-400">{kwh.toFixed(2)} kWh</p>
                        <p className="text-[10px] font-medium text-ink-600">₹{cost.toFixed(0)}</p>
                      </div>
                    </div>
                    {spark.length > 0 && (
                      <div className="flex-shrink-0 opacity-60">
                        <SparkLine readings={spark} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Device detail panel */}
          {selected && selectedDevice && (
            <div className="card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{DEVICE_ICONS[selectedDevice.device_type] || "📦"}</span>
                  <div>
                    <p className="text-sm font-medium text-ink-900">{selectedDevice.device_name}</p>
                    <p className="text-xs text-ink-400">{selectedDevice.brand}</p>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className="text-ink-300 hover:text-ink-500">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3 3l8 8M11 3L3 11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>

              {/* 30-day chart */}
              {history.length > 0 ? (
                <div>
                  <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-3">30-day Usage (kWh)</p>
                  <div className="flex items-end gap-1 h-20">
                    {history.slice(-30).map((day, i) => {
                      const maxDay = Math.max(...history.map((d) => Number(d.kwh_used)), 0.001);
                      const pct = (Number(day.kwh_used) / maxDay) * 100;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                          <div className="w-full bg-sage-200 hover:bg-sage-300 rounded-t transition-all"
                            style={{ height: `${Math.max(pct, 4)}%` }} />
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-ink-900 text-cream-100 text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap">
                            {day.date}: {Number(day.kwh_used).toFixed(2)}kWh
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between mt-1">
                    <p className="text-[9px] text-ink-300">{history[0]?.date}</p>
                    <p className="text-[9px] text-ink-300">{history[history.length - 1]?.date}</p>
                  </div>
                </div>
              ) : (
                <div className="py-4 text-center">
                  <p className="text-xs text-ink-400 mb-2">No energy data yet. Press &quot;Read&quot; to capture a reading.</p>
                  <button onClick={() => runSimulation(selectedDevice)}
                    disabled={isPending}
                    className="btn-primary text-xs px-4 py-2 disabled:opacity-40">
                    📡 Capture Reading
                  </button>
                </div>
              )}

              {/* Stats */}
              {selectedSummary && (
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Total kWh", value: Number(selectedSummary.total_kwh).toFixed(2) },
                    { label: "Est. cost", value: `₹${Number(selectedSummary.total_cost_inr).toFixed(0)}` },
                    { label: "Avg/day", value: `${Number(selectedSummary.avg_daily_kwh).toFixed(2)}kWh` },
                  ].map((s) => (
                    <div key={s.label} className="bg-cream-100 rounded-xl p-3 text-center">
                      <p className="text-sm font-medium text-ink-800">{s.value}</p>
                      <p className="text-[10px] text-ink-400 mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Monthly projection */}
              {selectedSummary && Number(selectedSummary.avg_daily_kwh) > 0 && (
                <div className="px-3 py-2.5 bg-sand-50 border border-sand-200 rounded-xl">
                  <p className="text-xs font-medium text-sand-700">
                    📈 Monthly projection: {(Number(selectedSummary.avg_daily_kwh) * 30).toFixed(1)} kWh
                    · ₹{(Number(selectedSummary.avg_daily_kwh) * 30 * INR_PER_KWH).toFixed(0)}/month
                  </p>
                </div>
              )}
            </div>
          )}

          {/* How readings work */}
          <div className="card p-4 bg-gradient-to-r from-ink-900 to-ink-800 border-ink-700">
            <p className="text-xs font-medium text-cream-200 mb-1">📡 About readings</p>
            <p className="text-xs text-cream-400 leading-relaxed">
              Press &quot;Read&quot; to capture a simulated reading based on typical power values for each device type.
              For real readings, connect a smart plug (Wipro/Tuya) or smart meter to your device.
              Full MQTT/Matter integration unlocks automatic live monitoring.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
