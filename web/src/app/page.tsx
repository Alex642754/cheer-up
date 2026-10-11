"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listCampaigns, campaignProgress, Campaign } from "@/lib/api";
import {
  DoodleBalloon, DoodleParty, DoodleSparkles, DoodlePizza, DoodleCake,
  DoodleTarget, DoodleCoin, DoodleTrophy, DoodleLink, DoodleChart,
  DoodleShield, DoodleCheers, DoodleSprout,
} from "@/components/Doodles";

const SHORT = (s: string, n = 6) =>
  s.length > n * 2 ? s.slice(0, n) + "..." + s.slice(-n) : s;

export default function LandingPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    listCampaigns()
      .then((r) => setCampaigns(r.data || []))
      .catch(() => {});
    const t = setInterval(() => {
      listCampaigns()
        .then((r) => setCampaigns(r.data || []))
        .catch(() => {});
    }, 8000);
    return () => clearInterval(t);
  }, []);

  const totalRaised = campaigns.reduce((sum, c) => sum + parseFloat(c.raised_amount || "0"), 0);
  const featured =
    campaigns.find((c) => c.status === "active" && parseFloat(c.raised_amount || "0") > 0) ||
    campaigns.find((c) => c.status === "completed") ||
    campaigns[0];

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/40 via-orange-50/20 to-rose-50/30 text-neutral-900 relative overflow-hidden">
      {/* Floating party doodles */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-32 left-[5%] opacity-40 text-purple-400 float" style={{ animationDelay: "0s" }}>
          <DoodleBalloon className="w-14 h-14" />
        </div>
        <div className="absolute top-60 right-[8%] opacity-40 text-emerald-500 float" style={{ animationDelay: "1.2s" }}>
          <DoodleParty className="w-12 h-12" />
        </div>
        <div className="absolute top-[45%] left-[3%] opacity-30 text-amber-500 float" style={{ animationDelay: "0.6s" }}>
          <DoodleSparkles className="w-10 h-10" />
        </div>
        <div className="absolute bottom-40 right-[5%] opacity-30 text-rose-400 float" style={{ animationDelay: "1.8s" }}>
          <DoodlePizza className="w-12 h-12" />
        </div>
        <div className="absolute bottom-20 left-[10%] opacity-30 text-purple-400 float" style={{ animationDelay: "2.4s" }}>
          <DoodleCake className="w-10 h-10" />
        </div>
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-white/70 border-b border-amber-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-cute font-extrabold text-xl tracking-tight">
            Cheer Up
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm text-neutral-600 font-medium">
            <a href="#features" className="hover:text-purple-500 transition">Features</a>
            <a href="#how" className="hover:text-purple-500 transition">How it works</a>
            <a href="#live" className="hover:text-purple-500 transition">Live demo</a>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/merchant/campaigns"
              className="text-sm text-neutral-600 hover:text-neutral-900 transition font-medium"
            >
              My Campaigns
            </Link>
            <Link
              href="/merchant/new"
              className="text-sm px-4 py-2 rounded-full bg-gradient-to-r from-[#14F195] to-[#9945FF] text-white hover:opacity-90 transition font-bold shadow-md shadow-purple-200"
            >
              Start collecting
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-40 pb-24 px-6 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(20,241,149,0.08), transparent 70%), radial-gradient(ellipse 40% 40% at 80% 20%, rgba(153,69,255,0.06), transparent 70%)",
          }}
        />
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div
            className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/80 border border-amber-200 text-amber-700 text-xs font-bold mb-8 ${mounted ? "reveal" : ""}`}
            style={{ animationDelay: "0ms" }}
          >
            <span className="w-2 h-2 rounded-full bg-[#14F195] animate-pulse" />
            Powered by Solana · Devnet
          </div>
          <h1
            className={`font-cute text-6xl md:text-8xl font-extrabold tracking-tight leading-[0.95] mb-6 ${mounted ? "reveal" : ""}`}
            style={{ animationDelay: "80ms" }}
          >
            Chip in together,<br />
            <span className="gradient-text">on-chain.</span>
          </h1>
          <p
            className={`text-xl md:text-2xl text-neutral-500 max-w-2xl mx-auto mb-10 leading-relaxed ${mounted ? "reveal" : ""}`}
            style={{ animationDelay: "160ms" }}
          >
            Set a target. Share a link. Watch every friend's contribution land — straight from the blockchain.
          </p>
          <div
            className={`flex flex-col sm:flex-row gap-3 justify-center ${mounted ? "reveal" : ""}`}
            style={{ animationDelay: "240ms" }}
          >
            <Link
              href="/merchant/new"
              className="px-7 py-3.5 rounded-full bg-gradient-to-r from-[#14F195] to-[#9945FF] text-white font-bold hover:opacity-90 transition shadow-lg shadow-purple-200"
            >
              Start a collection
            </Link>
            <a
              href="#how"
              className="px-7 py-3.5 rounded-full bg-white/80 border-2 border-amber-200 text-neutral-700 font-bold hover:bg-white transition"
            >
              See how it works
            </a>
          </div>
        </div>

        {/* Stats bar */}
        <div className="max-w-4xl mx-auto mt-20 grid grid-cols-3 gap-6">
          {[
              { icon: <DoodleTarget className="w-10 h-10" />, label: "Campaigns created", value: campaigns.length || "—" },
              { icon: <DoodleCoin className="w-10 h-10" />, label: "Raised so far", value: totalRaised > 0 ? totalRaised.toFixed(3) : "—" },
              { icon: <DoodleTrophy className="w-10 h-10" />, label: "Goals reached", value: campaigns.filter((c) => c.status === "completed").length || "—" },
            ].map((s, i) => (
              <div key={i} className="text-center rounded-3xl bg-white/70 border-2 border-amber-100 py-8 px-4">
                <div className="flex justify-center mb-2 text-purple-500">{s.icon}</div>
              <div className="text-4xl md:text-5xl font-cute font-bold tracking-tight">{s.value}</div>
              <div className="text-sm text-neutral-500 mt-2 font-medium">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-y border-amber-100 bg-white/50 py-8">
        <div className="max-w-5xl mx-auto px-6 flex flex-wrap items-center justify-center gap-x-12 gap-y-4 text-sm text-neutral-400 font-bold">
          <span className="text-neutral-700">◎ Solana</span>
          <span>Go</span>
          <span>Next.js</span>
          <span>Phantom</span>
          <span>USDC · SOL</span>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-28 px-6 relative z-10">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-bold text-amber-500 uppercase tracking-widest mb-4">Features</p>
            <h2 className="font-cute text-4xl md:text-5xl font-extrabold tracking-tight">
              Built for friends,<br />powered by crypto.
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: <DoodleLink className="w-12 h-12" />,
                title: "One link, zero friction",
                desc: "Create a campaign, get a shareable link. No more retyping amounts or addresses for every friend.",
              },
              {
                icon: <DoodleChart className="w-12 h-12" />,
                title: "Live on-chain progress",
                desc: "A background scanner checks the blockchain every 5 seconds. Your progress bar moves itself!",
              },
              {
                icon: <DoodleShield className="w-12 h-12" />,
                title: "Direct transfers count too",
                desc: "We scan the receiver address, not the link. Send from any wallet — it still shows up.",
              },
            ].map((f, i) => (
              <div key={i} className="p-8 rounded-[2rem] border-2 border-amber-200/50 bg-white/80 hover:border-purple-300 hover:shadow-lg hover:shadow-purple-100 transition group">
                <div className="mb-6 text-emerald-500 group-hover:scale-110 group-hover:-rotate-6 transition-transform">{f.icon}</div>
                <h3 className="text-xl font-cute font-bold mb-3 tracking-tight">{f.title}</h3>
                <p className="text-neutral-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-28 px-6 bg-white/40 border-y border-amber-100 relative z-10">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-bold text-amber-500 uppercase tracking-widest mb-4">How it works</p>
            <h2 className="font-cute text-4xl md:text-5xl font-extrabold tracking-tight">Four easy steps!</h2>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { n: "1", icon: <DoodleTarget className="w-11 h-11" />, t: "Set a target", d: "Enter title, amount, and your wallet address." },
              { n: "2", icon: <DoodleLink className="w-11 h-11" />, t: "Share the link", d: "Send the campaign page to everyone chipping in." },
              { n: "3", icon: <DoodleCoin className="w-11 h-11" />, t: "Pay any way", d: "Through the page with Phantom, or directly to the address." },
              { n: "4", icon: <DoodleChart className="w-11 h-11" />, t: "Watch it grow", d: "Progress updates live. Every contribution is recorded." },
            ].map((s, i) => (
              <div key={i} className="relative text-center p-6 rounded-[2rem] bg-white/70 border-2 border-amber-100">
                <div className="flex justify-center mb-3 text-amber-500">{s.icon}</div>
                <div className="text-xs font-bold text-purple-500 mb-2">STEP {s.n}</div>
                <h3 className="text-lg font-cute font-bold mb-2 tracking-tight">{s.t}</h3>
                <p className="text-neutral-500 text-sm leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live demo */}
      <section id="live" className="py-28 px-6 relative z-10">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-bold text-amber-500 uppercase tracking-widest mb-4">Live demo</p>
            <h2 className="font-cute text-4xl md:text-5xl font-extrabold tracking-tight">
              Progress you can <span className="gradient-text">actually trust</span>.
            </h2>
            <p className="text-neutral-500 mt-4 text-lg">
              Real campaigns, real on-chain data. Refreshes every 8 seconds.
            </p>
          </div>

          {featured ? (
            <div className="max-w-2xl mx-auto p-8 md:p-10 rounded-[2rem] border-2 border-amber-200/50 bg-white/90 shadow-xl shadow-amber-100/50">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-cute font-bold tracking-tight">{featured.title}</h3>
                  <p className="text-sm text-amber-500 font-mono mt-1">{SHORT(featured.campaign_no, 12)}</p>
                </div>
                <span
                  className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                    featured.status === "completed"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {featured.status === "completed" ? "Completed" : "Active"}
                </span>
              </div>
              <div className="flex justify-between items-baseline mb-3">
                <span className="text-3xl font-cute font-bold tracking-tight">
                  {featured.raised_amount}
                  <span className="text-lg font-normal text-neutral-400 ml-1">
                    / {featured.target_amount} {featured.currency}
                  </span>
                </span>
                <span className="text-lg font-bold gradient-text">
                  {campaignProgress(featured).toFixed(0)}%
                </span>
              </div>
              <div className="h-4 rounded-full bg-amber-100 overflow-hidden p-0.5">
                <div
                  className="progress-fill h-full rounded-full"
                  style={{
                    width: `${campaignProgress(featured)}%`,
                    background: "linear-gradient(90deg, #14F195, #9945FF)",
                  }}
                />
              </div>
              <div className="mt-8 flex justify-between">
                <Link
                  href={`/fund/${featured.campaign_no}`}
                  className="text-sm font-bold text-neutral-900 underline underline-offset-4 hover:text-purple-500"
                >
                  View campaign →
                </Link>
                <Link
                  href="/merchant/new"
                  className="text-sm font-bold text-neutral-400 hover:text-purple-500 transition"
                >
                  Start your own
                </Link>
              </div>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto text-center py-20 border-2 border-dashed border-amber-200 rounded-[2rem] bg-white/50">
              <div className="flex justify-center mb-4 text-emerald-400"><DoodleSprout className="w-14 h-14" /></div>
              <p className="text-neutral-400">No campaigns yet. Create the first one!</p>
            </div>
          )}

          {campaigns.length > 1 && (
            <div className="mt-12 grid md:grid-cols-2 gap-4 max-w-2xl mx-auto">
              {campaigns.slice(1, 5).map((c) => (
                <Link
                  key={c.id}
                  href={`/fund/${c.campaign_no}`}
                  className="p-5 rounded-2xl border-2 border-amber-100 bg-white/70 hover:border-purple-300 transition"
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-cute font-bold truncate">{c.title}</span>
                    <span className="text-xs text-neutral-400 font-bold">{c.currency}</span>
                  </div>
                  <div className="flex justify-between text-sm text-neutral-500 mb-2 font-medium">
                    <span>{c.raised_amount} / {c.target_amount}</span>
                    <span className="gradient-text font-bold">{campaignProgress(c).toFixed(0)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-amber-100 overflow-hidden">
                    <div
                      className="progress-fill h-full rounded-full"
                      style={{
                        width: `${campaignProgress(c)}%`,
                        background: "linear-gradient(90deg, #14F195, #9945FF)",
                      }}
                    />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-28 px-6 bg-gradient-to-br from-purple-500 via-purple-600 to-emerald-500 relative z-10">
        <div className="max-w-3xl mx-auto text-center text-white">
          <div className="mb-6 text-white wiggle inline-block"><DoodleCheers className="w-16 h-16" /></div>
          <h2 className="font-cute text-4xl md:text-6xl font-extrabold tracking-tight mb-6">
            Start collecting<br />in seconds!
          </h2>
          <p className="text-white/80 text-xl mb-10">
            No signup. Free under 10. Just a link and a wallet.
          </p>
          <Link
            href="/merchant/new"
            className="inline-block px-8 py-4 rounded-full bg-white text-purple-600 font-extrabold hover:bg-white/90 transition shadow-xl"
          >
            Start a collection →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-amber-100 bg-white/60">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="font-cute font-extrabold text-lg tracking-tight">
            Cheer Up
          </div>
          <div className="flex gap-6 text-sm text-neutral-400 font-medium">
            <Link href="/merchant/new" className="hover:text-purple-500 transition">New campaign</Link>
            <Link href="/merchant/campaigns" className="hover:text-purple-500 transition">My campaigns</Link>
            <a href="#features" className="hover:text-purple-500 transition">Features</a>
          </div>
          <p className="text-sm text-neutral-400">© 2026 · Built on Solana Devnet</p>
        </div>
      </footer>
    </div>
  );
}
