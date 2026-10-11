"use client";

import { useState } from "react";
import Link from "next/link";
import { createCampaign, Campaign } from "@/lib/api";
import {
  DoodleBalloon, DoodleGift, DoodleSparkles, DoodleCheers,
  DoodleTarget, DoodleCoin, DoodleWallet, DoodleRocket, DoodleEye,
} from "@/components/Doodles";

export default function NewCampaignPage() {
  const [title, setTitle] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currency, setCurrency] = useState<"SOL" | "USDC">("USDC");
  const [receiverAddress, setReceiverAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Campaign | null>(null);
  const [copied, setCopied] = useState(false);

  const fundLink = created ? `${window.location.origin}/fund/${created.campaign_no}` : "";

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const amt = parseFloat(targetAmount);
    if (!title.trim()) return setError("Please enter a title");
    if (isNaN(amt) || amt <= 0) return setError("Target amount must be greater than 0");
    if (!receiverAddress.trim()) return setError("Please enter the receiver address");

    setSubmitting(true);
    try {
      const r = await createCampaign({
        title: title.trim(),
        target_amount: targetAmount,
        currency,
        receiver_address: receiverAddress.trim(),
      });
      if (r.error) throw new Error(r.details || r.error);
      setCreated(r.data);
    } catch (e: any) {
      setError(e.message || "Creation failed");
    } finally {
      setSubmitting(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(fundLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const inputCls =
    "w-full rounded-2xl border-2 border-amber-200/60 px-4 py-3.5 text-neutral-900 bg-white/80 focus:outline-none focus:border-purple-300 focus:ring-4 focus:ring-purple-100 transition";

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50/60 via-orange-50/30 to-rose-50/40 relative">
      {/* Floating doodles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-24 left-[6%] opacity-35 text-purple-400 float" style={{ animationDelay: "0s" }}>
          <DoodleBalloon className="w-12 h-12" />
        </div>
        <div className="absolute top-40 right-[8%] opacity-35 text-amber-500 float" style={{ animationDelay: "1s" }}>
          <DoodleGift className="w-10 h-10" />
        </div>
        <div className="absolute bottom-32 left-[10%] opacity-30 text-emerald-500 float" style={{ animationDelay: "2s" }}>
          <DoodleSparkles className="w-10 h-10" />
        </div>
      </div>

      {/* Navbar */}
      <nav className="sticky top-0 z-40 backdrop-blur-xl bg-white/70 border-b border-amber-100">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-cute font-extrabold text-xl tracking-tight">
            Cheer Up
          </Link>
          <Link href="/merchant/campaigns" className="text-sm text-neutral-600 hover:text-purple-500 transition font-medium">
            My Campaigns
          </Link>
        </div>
      </nav>

      <div className="relative z-10 max-w-2xl mx-auto px-6 py-16">
        <Link href="/" className="inline-flex items-center text-sm text-neutral-400 hover:text-neutral-700 mb-10 transition font-medium">
          ← Back
        </Link>

        <div className="mb-12">
          <p className="text-sm font-bold text-amber-500 uppercase tracking-widest mb-3">New campaign</p>
          <h1 className="font-cute text-5xl font-extrabold tracking-tight mb-3">Start a collection!</h1>
          <p className="text-lg text-neutral-500">Set a target. Share the link. Chip in together.</p>
        </div>

        {!created ? (
          <form onSubmit={onSubmit} className="space-y-8">
            <div>
              <label className="block text-sm font-bold text-neutral-700 mb-2">Title</label>
              <input
                className={inputCls}
                placeholder="e.g. Team dinner split, birthday gift fund"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-5 gap-4">
              <div className="col-span-3">
                <label className="block text-sm font-bold text-neutral-700 mb-2">Target Amount</label>
                <input
                  className={inputCls}
                  placeholder="100"
                  inputMode="decimal"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-bold text-neutral-700 mb-2">Currency</label>
                <select
                  className={inputCls}
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as "SOL" | "USDC")}
                >
                  <option value="USDC">USDC</option>
                  <option value="SOL">SOL</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-neutral-700 mb-2">Receiver Address</label>
              <input
                className={`${inputCls} font-mono text-sm`}
                placeholder="Your Solana wallet address"
                value={receiverAddress}
                onChange={(e) => setReceiverAddress(e.target.value)}
              />
              <p className="mt-2 text-xs text-amber-600 font-medium">
                Any transfer to this address counts toward the progress automatically.
              </p>
            </div>

            {error && (
              <div className="rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 rounded-full bg-gradient-to-r from-[#14F195] to-[#9945FF] text-white font-bold hover:opacity-90 disabled:opacity-40 transition shadow-lg shadow-purple-200"
            >
              {submitting ? "Creating…" : "Start collection"}
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="rounded-[2rem] border-2 border-amber-200/50 bg-white/90 p-8 text-center shadow-lg shadow-amber-100/50">
              <div className="mb-4 wiggle inline-block text-purple-500"><DoodleCheers className="w-16 h-16" /></div>
              <h2 className="font-cute text-2xl font-extrabold tracking-tight mb-2">Collection created!</h2>
              <p className="text-neutral-500">
                Target <span className="font-bold">{created.target_amount} {created.currency}</span>. Share the link with your friends! 
              </p>
            </div>

            <div>
              <label className="block text-sm font-bold text-neutral-700 mb-2">🔗 Collection link</label>
              <div className="flex gap-2">
                <input
                  readOnly
                  className={`${inputCls} font-mono text-xs text-neutral-600 bg-amber-50/50`}
                  value={fundLink}
                />
                <button
                  onClick={copyLink}
                  className="px-5 rounded-2xl bg-gradient-to-r from-[#14F195] to-[#9945FF] text-white text-sm font-bold hover:opacity-90 transition shrink-0"
                >
                  {copied ? "✓" : "Copy"}
                </button>
              </div>
            </div>

            <div className="rounded-2xl bg-amber-50/60 border border-dashed border-amber-300 px-5 py-4 text-sm text-neutral-600 font-medium">
              Friends can pay with Phantom by opening the link — or transfer directly to the address. Either way, the progress updates automatically!
            </div>

            <div className="flex gap-3">
              <Link
                href={`/fund/${created.campaign_no}`}
                className="flex-1 text-center py-3.5 rounded-full bg-gradient-to-r from-[#14F195] to-[#9945FF] text-white font-bold hover:opacity-90 transition shadow-lg shadow-purple-200"
              >
                View campaign 
              </Link>
              <Link
                href="/merchant/campaigns"
                className="flex-1 text-center py-3.5 rounded-full bg-white border-2 border-amber-200 text-neutral-700 font-bold hover:bg-amber-50 transition"
              >
                My campaigns
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
