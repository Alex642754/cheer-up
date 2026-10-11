"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import {
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferCheckedInstruction,
} from "@solana/spl-token";
import {
  getCampaign,
  syncCampaign,
  demoContribute,
  campaignProgress,
  Campaign,
  Contribution,
} from "@/lib/api";
import { QRCodeSVG } from "qrcode.react";
import {
  DoodleBalloon, DoodleParty, DoodleSparkles, DoodlePizza,
  DoodleFriends, DoodleGift, DoodleSprout, DoodleCoin, DoodleLink,
} from "@/components/Doodles";

const SHORT = (s: string, n = 6) =>
  s.length > n * 2 ? s.slice(0, n) + "..." + s.slice(-n) : s;

const USDC_MINT = "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr"; // devnet
const USDC_DECIMALS = 6;

// Fee model: free under 10, 0.1% above 10
const FEE_THRESHOLD = 10;
const FEE_RATE = 0.001;
const FEE_RECEIVER =
  process.env.NEXT_PUBLIC_FEE_RECEIVER ||
  "ChipFee11111111111111111111111111111111111111";

const calcFee = (amt: number) =>
  amt > FEE_THRESHOLD ? Math.ceil(amt * FEE_RATE * 1e6) / 1e6 : 0;

// Demo mode: skip the real on-chain transfer, just simulate sign + success
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export default function FundPage({ params }: { params: { id: string } }) {
  const id = params.id;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [payAmount, setPayAmount] = useState("");
  const [payStage, setPayStage] = useState<"idle" | "signing" | "confirming">("idle");
  const [payError, setPayError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [justPaid, setJustPaid] = useState(false);

  const { connection } = useConnection();
  const wallet = useWallet();

  const load = async () => {
    try {
      const r = await getCampaign(id);
      if (r.error) throw new Error(r.error);
      setCampaign(r.data);
      setContributions(r.contributions || []);
    } catch (e: any) {
      setError(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // Auto-refresh progress every 4 seconds (on-chain contributions are written by the backend scanner)
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [id]);

  const progress = campaign ? campaignProgress(campaign) : 0;
  const completed = campaign?.status === "completed";

  // QR codes: page link (any camera) + Solana Pay URI (wallet app direct scan)
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const pageUrl = origin && campaign ? `${origin}/fund/${campaign.campaign_no}` : "";
  const solanaUrl = campaign
    ? `solana:${campaign.receiver_address}` +
      (campaign.currency === "USDC" ? `?spl-token=${USDC_MINT}` : "")
    : "";

  const copyAddress = async () => {
    if (!campaign) return;
    try {
      await navigator.clipboard.writeText(campaign.receiver_address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { }
  };

  const onContribute = async () => {
    if (!campaign || !wallet.publicKey || !wallet.sendTransaction) return;
    const amt = parseFloat(payAmount);
    if (isNaN(amt) || amt <= 0) {
      setPayError("Please enter a valid amount");
      return;
    }
    setPayError(null);
    setPayStage("signing");
    try {
      // Demo mode: simulate wallet signing + confirmation, record contribution directly
      if (DEMO_MODE) {
        await new Promise((r) => setTimeout(r, 1200)); // fake signing delay
        setPayStage("confirming");
        const r = await demoContribute(id, wallet.publicKey.toBase58(), amt.toString());
        if (r.error) throw new Error(r.error);
        await new Promise((r) => setTimeout(r, 800)); // fake confirmation delay
        await load();
        setPayAmount("");
        setJustPaid(true);
        setTimeout(() => setJustPaid(false), 6000);
        return;
      }

      const { blockhash } = await connection.getLatestBlockhash("finalized");
      const tx = new Transaction();
      tx.recentBlockhash = blockhash;
      tx.feePayer = wallet.publicKey!;

      const to = new PublicKey(campaign.receiver_address);
      const fee = calcFee(amt);

      if (campaign.currency === "SOL") {
        tx.add(
          SystemProgram.transfer({
            fromPubkey: wallet.publicKey!,
            toPubkey: to,
            lamports: Math.floor(amt * LAMPORTS_PER_SOL),
          })
        );
        if (fee > 0) {
          tx.add(
            SystemProgram.transfer({
              fromPubkey: wallet.publicKey!,
              toPubkey: new PublicKey(FEE_RECEIVER),
              lamports: Math.floor(fee * LAMPORTS_PER_SOL),
            })
          );
        }
      } else {
        const mintPub = new PublicKey(USDC_MINT);
        const senderATA = await getAssociatedTokenAddress(mintPub, wallet.publicKey!);
        const receiverATA = await getAssociatedTokenAddress(mintPub, to);
        const receiverAcc = await connection.getAccountInfo(receiverATA);
        if (!receiverAcc) {
          tx.add(
            createAssociatedTokenAccountInstruction(wallet.publicKey!, receiverATA, to, mintPub)
          );
        }
        tx.add(
          createTransferCheckedInstruction(
            senderATA,
            mintPub,
            receiverATA,
            wallet.publicKey!,
            BigInt(Math.floor(amt * 10 ** USDC_DECIMALS)),
            USDC_DECIMALS
          )
        );
        if (fee > 0) {
          const feeATA = await getAssociatedTokenAddress(mintPub, new PublicKey(FEE_RECEIVER));
          const feeAcc = await connection.getAccountInfo(feeATA);
          if (!feeAcc) {
            tx.add(
              createAssociatedTokenAccountInstruction(
                wallet.publicKey!,
                feeATA,
                new PublicKey(FEE_RECEIVER),
                mintPub
              )
            );
          }
          tx.add(
            createTransferCheckedInstruction(
              senderATA,
              mintPub,
              feeATA,
              wallet.publicKey!,
              BigInt(Math.floor(fee * 10 ** USDC_DECIMALS)),
              USDC_DECIMALS
            )
          );
        }
      }

      const sig = await wallet.sendTransaction(tx, connection, {
        preflightCommitment: "confirmed",
      });
      setPayStage("confirming");
      try {
        const latest = await connection.getLatestBlockhash("confirmed");
        await connection.confirmTransaction(
          { signature: sig, blockhash: latest.blockhash, lastValidBlockHeight: latest.lastValidBlockHeight },
          "confirmed"
        );
      } catch { }

      // Trigger immediate backend sync so the progress updates instantly
      try {
        await syncCampaign(id);
        await load();
      } catch { }
      setPayAmount("");
    } catch (e: any) {
      const msg = e?.message || String(e);
      setPayError(
        msg.includes("User rejected") || msg.includes("cancelled")
          ? "You cancelled the signature"
          : "Transfer failed: " + msg
      );
    } finally {
      setPayStage("idle");
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-neutral-400">Loading…</div>
      </main>
    );
  }

  if (error || !campaign) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-white px-6">
        <div className="max-w-md w-full text-center">
          <div className="text-6xl mb-6">·</div>
          <h1 className="text-3xl font-bold tracking-tight mb-3">Campaign not found</h1>
          <p className="text-neutral-500 mb-8">{error || "Please check the link and try again."}</p>
          <Link href="/" className="inline-block px-6 py-3 rounded-full bg-neutral-900 text-white font-medium hover:bg-neutral-800 transition">
            Back home
          </Link>
        </div>
      </main>
    );
  }

  const inputCls =
    "w-full rounded-2xl border-2 border-amber-200/60 px-4 py-3.5 text-neutral-900 bg-white/80 focus:outline-none focus:border-purple-300 focus:ring-4 focus:ring-purple-100 transition";

  const amt = parseFloat(payAmount) || 0;
  const fee = calcFee(amt);
  const total = amt + fee;

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50/60 via-orange-50/30 to-rose-50/40">
      {/* Floating decorations */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-24 left-[8%] opacity-40 text-purple-400 float" style={{ animationDelay: "0s" }}><DoodleBalloon className="w-12 h-12" /></div>
        <div className="absolute top-40 right-[10%] opacity-40 text-emerald-500 float" style={{ animationDelay: "1s" }}><DoodleParty className="w-10 h-10" /></div>
        <div className="absolute bottom-32 left-[12%] opacity-30 text-amber-500 float" style={{ animationDelay: "2s" }}><DoodleSparkles className="w-10 h-10" /></div>
        <div className="absolute top-1/2 right-[6%] opacity-30 text-rose-400 float" style={{ animationDelay: "0.5s" }}><DoodlePizza className="w-9 h-9" /></div>
      </div>

      {/* Navbar */}
      <nav className="sticky top-0 z-40 backdrop-blur-xl bg-white/70 border-b border-amber-100">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-cute font-extrabold text-xl tracking-tight">
            Cheer Up
          </Link>
          <Link href="/merchant/campaigns" className="text-sm text-neutral-600 hover:text-neutral-900 transition font-medium">
            My Campaigns
          </Link>
        </div>
      </nav>

      <div className="relative z-10 max-w-2xl mx-auto px-6 py-12 space-y-6">
        {/* Header */}
        <div className="rounded-[2rem] border-2 border-amber-200/50 bg-white/90 p-8 shadow-lg shadow-amber-100/50">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="min-w-0">
              <p className="text-xs font-mono text-amber-500 mb-1.5">{campaign.campaign_no}</p>
              <h1 className="text-3xl font-cute font-bold tracking-tight truncate">{campaign.title}</h1>
            </div>
            {completed && (
              <span className="px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold shrink-0 wiggle">
                Goal Reached!
              </span>
            )}
          </div>

          <div className="flex items-baseline justify-between mb-3">
            <span className="text-4xl font-cute font-bold tracking-tight">
              {campaign.raised_amount}
              <span className="text-lg font-normal text-neutral-400 ml-1.5">
                / {campaign.target_amount} {campaign.currency}
              </span>
            </span>
            <span className="text-2xl font-cute font-bold gradient-text">
              {progress.toFixed(0)}%
            </span>
          </div>
          <div className="h-4 rounded-full bg-amber-100/70 overflow-hidden p-0.5">
            <div
              className="progress-fill h-full rounded-full"
              style={{
                width: `${progress}%`,
                background: "linear-gradient(90deg, #14F195, #9945FF)",
              }}
            />
          </div>
          <p className="text-sm text-neutral-500 mt-3 font-medium">
            <DoodleFriends className="w-5 h-5 inline-block mr-1 text-neutral-500" />
            {contributions.length} {contributions.length === 1 ? "friend" : "friends"} chipped in · updates every few seconds
          </p>
        </div>

        {/* Payment */}
        {!completed && (
          <div className="rounded-[2rem] border-2 border-amber-200/50 bg-white/90 p-8 shadow-lg shadow-amber-100/50">
            <h2 className="text-xl font-cute font-bold tracking-tight mb-6">Chip in for the gang</h2>
            <div className="flex gap-3 mb-5">
              <div className="relative flex-1">
                <input
                  className={inputCls}
                  placeholder="How much?"
                  inputMode="decimal"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-neutral-400 font-medium">
                  {campaign.currency}
                </span>
              </div>
              <div className="shrink-0 [&>button]:!h-full [&>button]:!rounded-2xl [&>button]:!px-5">
                <WalletMultiButton />
              </div>
            </div>

            {/* Fee breakdown */}
            {amt > 0 && (
              <div className="mb-5 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/60 p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">Your contribution</span>
                  <span className="font-semibold">{amt} {campaign.currency}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">
                    Platform fee
                    <span className="ml-1 text-xs text-amber-500">
                      {fee === 0 ? "(free under 10)" : "(0.1%)"}
                    </span>
                  </span>
                  <span className={`font-semibold ${fee === 0 ? "text-emerald-600" : "text-neutral-700"}`}>
                    {fee === 0 ? "Free!" : `${fee} ${campaign.currency}`}
                  </span>
                </div>
                <div className="border-t border-amber-200/50 pt-2 flex justify-between">
                  <span className="font-medium text-neutral-700">You pay total</span>
                  <span className="font-bold text-neutral-900">{total.toFixed(6)} {campaign.currency}</span>
                </div>
              </div>
            )}

            {justPaid && (
              <div className="rounded-2xl bg-emerald-50 border-2 border-emerald-200 text-emerald-700 text-sm px-4 py-3 mb-5 font-bold pop-in">
                Payment received! Your contribution is now live on the progress bar.
              </div>
            )}

            {payError && (
              <div className="rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 mb-5 font-medium">
                {payError}
              </div>
            )}

            <button
              onClick={onContribute}
              disabled={!wallet.connected || payStage !== "idle"}
              className="w-full py-4 rounded-full bg-gradient-to-r from-[#14F195] to-[#9945FF] text-white font-bold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-lg shadow-purple-200"
            >
              {!wallet.connected
                ? "Connect Phantom first"
                : payStage === "signing"
                ? "✍️ Sign in wallet…"
                : payStage === "confirming"
                ? "Confirming…"
                : `Send ${amt > 0 ? total.toFixed(6) : ""} `}
            </button>

            <div className="mt-6 rounded-2xl bg-amber-50/60 border border-dashed border-amber-300 p-5">
              <p className="text-xs text-neutral-600 leading-relaxed mb-3 font-medium">
                <DoodleCoin className="w-4 h-4 inline-block mr-1" /> Or send directly from any wallet:
                <br />
                No need to open this page — every on-chain transfer counts automatically!
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs font-mono text-neutral-700 bg-white rounded-xl px-3 py-2.5 border border-amber-200 break-all">
                  {campaign.receiver_address}
                </code>
                <button
                  onClick={copyAddress}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#14F195] to-[#9945FF] text-white text-xs font-bold hover:opacity-90 transition shrink-0"
                >
                  {copied ? "✓" : "Copy"}
                </button>
              </div>
            </div>

            {/* Scan to chip in: two QR codes for mobile friends */}
            {!completed && (
              <div className="mt-4 rounded-2xl bg-white/80 border-2 border-amber-100 p-5">
                <p className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                  <DoodleLink className="w-4 h-4" /> Scan to chip in
                </p>
                <div className="flex gap-6">
                  <div className="text-center">
                    <div className="rounded-xl border-2 border-amber-100 bg-white p-2 inline-block">
                      {pageUrl ? (
                        <QRCodeSVG value={pageUrl} size={112} marginSize={2} />
                      ) : (
                        <div className="w-[112px] h-[112px] bg-amber-50 rounded animate-pulse" />
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-500 font-medium mt-2 leading-snug">
                      Open this page
                      <br />
                      <span className="text-neutral-400">any camera app</span>
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="rounded-xl border-2 border-purple-100 bg-white p-2 inline-block">
                      <QRCodeSVG value={solanaUrl} size={112} marginSize={2} fgColor="#9945FF" />
                    </div>
                    <p className="text-[11px] text-neutral-500 font-medium mt-2 leading-snug">
                      Wallet app scan
                      <br />
                      <span className="text-neutral-400">Phantom / Solflare</span>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Contribution History */}
        <div className="rounded-[2rem] border-2 border-amber-200/50 bg-white/90 p-8 shadow-lg shadow-amber-100/50">
          <h2 className="text-xl font-cute font-bold tracking-tight mb-6">
            Who chipped in
            {contributions.length > 0 && (
              <span className="ml-2 text-sm font-normal text-neutral-400">{contributions.length} people</span>
            )}
          </h2>
          {contributions.length === 0 ? (
            <div className="text-center py-10 text-neutral-400">
              <div className="text-5xl mb-3"><DoodleSprout className="w-14 h-14 text-emerald-400" /></div>
              <p className="text-sm font-medium">No one has chipped in yet — be the first!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {contributions.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-amber-50/50 to-orange-50/30 px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="font-mono text-sm text-neutral-800">
                      {c.from_address ? SHORT(c.from_address) : "Anonymous"}
                    </div>
                    <a
                      href={`https://explorer.solana.com/tx/${c.tx_hash}?cluster=devnet`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-neutral-400 hover:text-purple-500 font-mono"
                    >
                      {SHORT(c.tx_hash, 10)} ↗
                    </a>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold tracking-tight">
                      +{c.amount} <span className="text-xs font-medium text-neutral-400">{campaign.currency}</span>
                    </div>
                    <div className="text-xs text-neutral-400">
                      {new Date(c.block_time || c.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="text-center pt-4 pb-8">
          <Link href="/" className="text-sm text-neutral-400 hover:text-neutral-700 transition font-medium">
            ← Back home
          </Link>
        </div>
      </div>
    </main>
  );
}
