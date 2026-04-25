// BitQuery API service for real blockchain data
import { BITQUERY_TOKEN } from "./config";

const BITQUERY_ENDPOINT = 'https://streaming.bitquery.io/graphql';
const HAS_TOKEN = !!BITQUERY_TOKEN;

interface WhaleTransfer {
  hash: string;
  from: string;
  to: string;
  amount: string;
  currency: string;
  timestamp: string;
  usdValue: number;
}

export class BitQueryService {
  private apiToken: string;

  constructor() {
    this.apiToken = BITQUERY_TOKEN;
  }

  private async query(query: string, variables: Record<string, unknown> = {}) {
    if (!this.apiToken) throw new Error('BitQuery token not configured');
    const response = await fetch(BITQUERY_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiToken}`,
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      throw new Error(`BitQuery API error: ${response.status}`);
    }

    return response.json();
  }

  async getWhaleTransfers(): Promise<WhaleTransfer[]> {
    if (!HAS_TOKEN) return [];
    const query = `
      query GetWhaleTransfers($limit: Int!, $minAmount: String!) {
        ethereum {
          transfers(
            options: { limit: $limit, desc: "block.timestamp.time" }
            amount: { gt: $minAmount }
            currency: { in: ["ETH", "USDT", "USDC", "BTC"] }
          ) {
            transaction { hash }
            sender { address }
            receiver { address }
            amount
            currency { symbol }
            block { timestamp { time } }
          }
        }
      }
    `;

    try {
      const result = await this.query(query, { limit: 10, minAmount: "1000000" });
      return result.data?.ethereum?.transfers?.map((t: any) => ({
        hash: t.transaction.hash,
        from: t.sender.address,
        to: t.receiver.address,
        amount: parseFloat(t.amount).toFixed(2),
        currency: t.currency.symbol,
        timestamp: t.block.timestamp.time,
        usdValue: this.estimateUSDValue(t.amount, t.currency.symbol)
      })) || [];
    } catch {
      return [];
    }
  }

  private estimateUSDValue(amount: string, currency: string): number {
    const amt = parseFloat(amount);
    switch (currency) {
      case 'ETH': return amt * 3600;
      case 'BTC': return amt * 95000;
      case 'USDT': case 'USDC': return amt;
      default: return amt * 100;
    }
  }
}

export const bitqueryService = new BitQueryService();
