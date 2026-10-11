const BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

export type Campaign = {
  id: number;
  campaign_no: string;
  title: string;
  target_amount: string;
  raised_amount: string;
  currency: "SOL" | "USDC";
  receiver_address: string;
  status: "active" | "completed";
  created_at: string;
  updated_at: string;
};

export type Contribution = {
  id: number;
  campaign_id: number;
  tx_hash: string;
  from_address: string;
  amount: string;
  block_time?: string;
  created_at: string;
};

export type ApiResponse<T> = {
  message: string;
  data: T;
  error?: string;
  details?: string;
  contributions?: Contribution[];
  total?: number;
  new?: number;
};

export function campaignProgress(c: Campaign): number {
  const target = parseFloat(c.target_amount);
  const raised = parseFloat(c.raised_amount);
  if (!target || isNaN(target) || isNaN(raised)) return 0;
  return Math.min(100, (raised / target) * 100);
}

export async function createCampaign(req: {
  title: string;
  target_amount: string;
  currency: "SOL" | "USDC";
  receiver_address: string;
}): Promise<ApiResponse<Campaign>> {
  const res = await fetch(`${BASE}/api/campaigns`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  return (await res.json()) as ApiResponse<Campaign>;
}

export async function listCampaigns(): Promise<ApiResponse<Campaign[]>> {
  const res = await fetch(`${BASE}/api/campaigns`);
  return (await res.json()) as ApiResponse<Campaign[]>;
}

export async function getCampaign(id: string): Promise<ApiResponse<Campaign>> {
  const res = await fetch(`${BASE}/api/campaigns/${id}`);
  return (await res.json()) as ApiResponse<Campaign>;
}

export async function syncCampaign(id: string): Promise<ApiResponse<Campaign>> {
  const res = await fetch(`${BASE}/api/campaigns/${id}/sync`, { method: "POST" });
  return (await res.json()) as ApiResponse<Campaign>;
}

// Demo mode: record a simulated contribution without an on-chain transfer
export async function demoContribute(
  id: string,
  fromAddress: string,
  amount: string
): Promise<ApiResponse<Campaign>> {
  const res = await fetch(`${BASE}/api/campaigns/${id}/contribute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ from_address: fromAddress, amount }),
  });
  return (await res.json()) as ApiResponse<Campaign>;
}
