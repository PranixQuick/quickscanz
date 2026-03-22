"use client";

import { useState, useEffect, useTransition } from "react";
import { createFamilyGroup, getMyFamilyGroup, joinFamilyGroup, leaveFamilyGroup, getFamilyMembers } from "@/lib/actions/family";
import type { FamilyGroup, FamilyMember } from "@/lib/actions/family";
import toast from "react-hot-toast";

export default function FamilyVaultPage() {
  const [group, setGroup] = useState<FamilyGroup | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [newGroupName, setNewGroupName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      const g = await getMyFamilyGroup();
      setGroup(g);
      if (g) {
        const m = await getFamilyMembers(g.id);
        setMembers(m);
      }
      setLoading(false);
    }
    load();
  }, []);

  function handleCreate() {
    if (!newGroupName.trim()) return;
    startTransition(async () => {
      const result = await createFamilyGroup(newGroupName.trim());
      if (result.success && result.group) {
        setGroup(result.group);
        setNewGroupName("");
        toast.success("Family vault created!");
        const m = await getFamilyMembers(result.group.id);
        setMembers(m);
      } else {
        toast.error(result.error || "Failed to create");
      }
    });
  }

  function handleJoin() {
    if (!inviteCode.trim()) return;
    startTransition(async () => {
      const result = await joinFamilyGroup(inviteCode.trim());
      if (result.success) {
        toast.success("Joined family vault!");
        const g = await getMyFamilyGroup();
        setGroup(g);
        if (g) { const m = await getFamilyMembers(g.id); setMembers(m); }
        setInviteCode("");
      } else {
        toast.error(result.error || "Failed to join");
      }
    });
  }

  function handleCopyCode() {
    if (!group?.invite_code) return;
    navigator.clipboard.writeText(group.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-cream-200 rounded-xl" />
        <div className="h-32 bg-cream-200 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="font-display text-2xl font-light text-ink-900">Family Vault</h1>
        <p className="text-sm text-ink-400 mt-1">Share warranty tracking with your family</p>
      </div>

      {!group ? (
        <div className="space-y-4">
          {/* Create group */}
          <div className="card p-5">
            <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-3">Create a Family Vault</p>
            <p className="text-sm text-ink-500 mb-4 leading-relaxed">
              Create a shared vault for your family. Everyone can see and add products. Perfect for managing 50+ products across your household.
            </p>
            <div className="flex gap-2">
              <input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="e.g. Sharma Family"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                className="flex-1 px-3 py-2.5 bg-cream-100 border border-cream-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sand-300"
              />
              <button onClick={handleCreate} disabled={isPending || !newGroupName.trim()}
                className="btn-primary text-sm px-5 py-2.5 disabled:opacity-40">
                {isPending ? "Creating..." : "Create"}
              </button>
            </div>
          </div>

          {/* Join group */}
          <div className="card p-5">
            <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-3">Join a Family Vault</p>
            <div className="flex gap-2">
              <input
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="Enter 8-character invite code"
                maxLength={8}
                className="flex-1 px-3 py-2.5 bg-cream-100 border border-cream-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sand-300"
              />
              <button onClick={handleJoin} disabled={isPending || inviteCode.length < 6}
                className="btn-primary text-sm px-5 py-2.5 disabled:opacity-40">
                {isPending ? "Joining..." : "Join"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Group card */}
          <div className="card p-5 bg-ink-900 border-ink-800">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">👨‍👩‍👧</span>
                  <h2 className="font-display text-lg font-light text-cream-100">{group.name}</h2>
                </div>
                <p className="text-xs text-cream-400">{members.length} member{members.length !== 1 ? "s" : ""}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-cream-500 uppercase tracking-wider mb-1">Invite Code</p>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-lg font-bold text-cream-100 tracking-widest">{group.invite_code}</span>
                  <button onClick={handleCopyCode}
                    className="text-[11px] bg-white/10 hover:bg-white/20 text-cream-300 px-2 py-1 rounded-lg transition-colors">
                    {copied ? "✓ Copied" : "Copy"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Members */}
          <div className="card p-5">
            <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-3">Members</p>
            <div className="space-y-2">
              {members.map((m, i) => (
                <div key={m.id} className="flex items-center gap-3 py-2">
                  <div className="w-8 h-8 rounded-full bg-cream-200 flex items-center justify-center text-sm font-medium text-ink-600">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-ink-700">Member {i + 1}</p>
                    <p className="text-xs text-ink-400">{m.role}</p>
                  </div>
                  {m.role !== "owner" && (
                    <span className="text-[10px] bg-cream-100 text-ink-400 px-2 py-0.5 rounded-full">Member</span>
                  )}
                  {m.role === "owner" && (
                    <span className="text-[10px] bg-sand-100 text-sand-700 px-2 py-0.5 rounded-full">Owner</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Share instructions */}
          <div className="card p-4 bg-sage-50/50 border-sage-200">
            <p className="text-xs font-medium text-sage-700 mb-1">📤 Invite family members</p>
            <p className="text-xs text-sage-600 leading-relaxed">
              Share the invite code <span className="font-mono font-bold">{group.invite_code}</span> with family members. They can join at quickscanz.com → Family Vault → Join.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
