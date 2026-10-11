"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listCampaigns, campaignProgress, Campaign } from "@/lib/api";
import {
  DoodleTarget, DoodleCoin, DoodleTrophy, DoodleSprout, DoodleCheers,
  DoodleBalloon, DoodleParty, DoodleSparkles, DoodlePizza, DoodleCake,
  DoodleGift, DoodleRocket, DoodleFriends,
} from "@/components/Doodles";

const SHORT = (s: string, n = 8) =>
  s.length > n * 2 ? s.slice(0, n) + "..." + s.slice(-n) : s;

// Party doodle assigned per campaign card — every collection gets its own cute logo
const PARTY_ICONS = [DoodleBalloon, DoodleParty, DoodlePizza, DoodleCake, DoodleGift, DoodleRocket, DoodleFriends, DoodleSparkles];
const PARTY_COLORS = ["text-amber-500", "text-purple-400", "text-emerald-500", "text-rose-400", "text-orange-400"];

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const r = await listCampaigns();
      setCampaigns(r.data || []);
    } catch {}
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  const stats = {
    total: campaigns.length,
    active: campaigns.filter((c) => c.status === "active").length,
    completed: campaigns.filter((c) => c.status === "completed").length,
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-50/60 to-rose-50/40">
        <div className="text-neutral-400 font-cute text-2xl">Loading…</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50/60 via-orange-50/30 to-rose-50/40 relative">
      {/* Floating decorations */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-24 left-[5%] opacity-30 text-purple-400 float" style={{ animationDelay: "0s" }}><DoodleTarget className="w-12 h-12" /></div>
        <div className="absolute top-40 right-[7%] opacity-30 text-amber-500 float" style={{ animationDelay: "1s" }}><DoodleTrophy className="w-10 h-10" /></div>
        <div className="absolute bottom-32 left-[8%] opacity-25 text-emerald-500 float" style={{ animationDelay: "2s" }}><DoodleCoin className="w-10 h-10" /></div>
        <div className="absolute top-1/3 left-[3%] opacity-30 text-rose-400 float" style={{ animationDelay: "0.5s" }}><DoodleBalloon className="w-11 h-11" /></div>
        <div className="absolute top-1/2 right-[4%] opacity-25 text-purple-500 float" style={{ animationDelay: "1.5s" }}><DoodleParty className="w-10 h-10" /></div>
        <div className="absolute bottom-48 right-[10%] opacity-25 text-amber-400 float" style={{ animationDelay: "2.5s" }}><DoodlePizza className="w-9 h-9" /></div>
        <div className="absolute bottom-20 right-[5%] opacity-25 text-rose-300 float" style={{ animationDelay: "0.8s" }}><DoodleCake className="w-9 h-9" /></div>
        <div className="absolute top-64 left-[7%] opacity-20 text-emerald-400 float" style={{ animationDelay: "1.8s" }}><DoodleSparkles className="w-9 h-9" /></div>
      </div>

      {/* Navbar */}
      <nav className="sticky top-0 z-40 backdrop-blur-xl bg-white/70 border-b border-amber-100">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-cute font-extrabold text-xl tracking-tight">
            Cheer Up
          </Link>
          <Link
            href="/merchant/new"
            className="text-sm px-4 py-2 rounded-full bg-gradient-to-r from-[#14F195] to-[#9945FF] text-white font-bold hover:opacity-90 transition shadow-md shadow-purple-200"
          >
            + New campaign
          </Link>
        </div>
      </nav>

      <div className="relative z-10 max-w-3xl mx-auto px-6 py-16">
        <div className="mb-12">
          <p className="text-sm font-bold text-amber-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            Your campaigns
            <DoodleSparkles className="w-4 h-4 text-amber-400" />
          </p>
          <h1 className="font-cute text-5xl font-extrabold tracking-tight mb-3 flex items-center gap-4">
            All collections!
            <DoodleCheers className="w-12 h-12 text-amber-400 wiggle inline-block" />
          </h1>
          <p className="text-lg text-neutral-500 flex items-center gap-2">
            <DoodleFriends className="w-5 h-5 text-emerald-500" />
            Live progress, auto-refreshes every 5 seconds.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-12">
          {[
            { label: "Total", value: stats.total, icon: <DoodleFriends className="w-10 h-10 text-neutral-700" />, bg: "bg-white/80" },
            { label: "Active", value: stats.active, icon: <DoodleBalloon className="w-10 h-10 text-amber-500" />, bg: "bg-amber-50/80" },
            { label: "Completed", value: stats.completed, icon: <DoodleTrophy className="w-10 h-10 text-emerald-500" />, bg: "bg-emerald-50/80" },
          ].map((s, i) => (
            <div key={i} className={`rounded-3xl border-2 border-amber-100 p-6 text-center ${s.bg}`}>
              <div className="text-3xl mb-2">{s.icon}</div>
              <div className="text-4xl font-cute font-bold tracking-tight text-neutral-900">{s.value}</div>
              <div className="text-xs text-neutral-400 mt-2 font-bold">{s.label}</div>
            </div>
          ))}
        </div>

        {campaigns.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-amber-200 rounded-[2rem] bg-white/50">
            <div className="text-6xl mb-4"><DoodleSprout className="w-14 h-14 text-emerald-400" /></div>
            <p className="text-neutral-400 mb-6 font-medium">No campaigns yet. Start your first one!</p>
            <Link
              href="/merchant/new"
              className="inline-block px-6 py-3 rounded-full bg-gradient-to-r from-[#14F195] to-[#9945FF] text-white font-bold hover:opacity-90 transition shadow-lg shadow-purple-200"
            >
              Start your first collection 
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {campaigns.map((c) => {
              const progress = campaignProgress(c);
              const completed = c.status === "completed";
              const PartyIcon = completed
                ? DoodleTrophy
                : PARTY_ICONS[c.id % PARTY_ICONS.length];
              const partyColor = completed
                ? "text-emerald-500"
                : PARTY_COLORS[c.id % PARTY_COLORS.length];
              return (
                <Link
                  key={c.id}
                  href={`/fund/${c.campaign_no}`}
                  className="group block rounded-[2rem] border-2 border-amber-200/50 bg-white/90 p-6 hover:border-purple-300 hover:shadow-lg hover:shadow-purple-100 transition"
                >
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div
                      className={`shrink-0 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-100 p-2.5 ${partyColor} transition-transform group-hover:-rotate-6 group-hover:scale-110`}
                    >
                      <PartyIcon className="w-9 h-9" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="font-cute font-bold text-neutral-900 truncate tracking-tight">{c.title}</span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold shrink-0 ${
                            completed
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {completed ? "Completed" : "Active"}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-amber-500 font-medium">
                        <span className="font-mono">{SHORT(c.campaign_no, 12)}</span>
                        <span>{new Date(c.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xl font-cute font-bold tracking-tight">
                        {c.raised_amount}
                        <span className="text-sm font-normal text-neutral-400"> / {c.target_amount} {c.currency}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-3 rounded-full bg-amber-100 overflow-hidden p-0.5">
                      <div
                        className="progress-fill h-full rounded-full"
                        style={{
                          width: `${progress}%`,
                          background: "linear-gradient(90deg, #14F195, #9945FF)",
                        }}
                      />
                    </div>
                    <span className="text-xs font-bold gradient-text w-10 text-right">
                      {progress.toFixed(0)}%
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
