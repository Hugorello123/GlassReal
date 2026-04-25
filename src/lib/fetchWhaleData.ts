// Live whale transfer data fetcher using BitQuery API
const BITQUERY_ENDPOINT = "https://graphql.bitquery.io";
const API_TOKEN = "ory_at_Ziuvk73gMEHGVOwCYp-HJInx97twmuB-wR8nZ3Gn0aA.v9xGicu6TRmz3-8r8u4t0cW-984nPxT7idyP3ApQSFM";

export async function fetchWhaleTransfers() {
  const query = `
    query GetWhaleTransfers($limit: Int!, $minAmount: Float!) {
      ethereum {
        transfers(
          options: { limit: $limit, desc: "amount" }
          amount: { gt: $minAmount }
          currency: { in: ["ETH", "USDT", "USDC"] }
        ) {
          amount
          currency {
            symbol
          }
          sender {
            address
          }
          receiver {
            address
          }
          transaction {
            hash
          }
        }
      }
    }
  `;

  const response = await fetch(BITQUERY_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_TOKEN}`,
      "X-API-KEY": API_TOKEN,
    },
    body: JSON.stringify({
      query,
      variables: {
        limit: 10,
        minAmount: 50000, // lowered to catch more whale activity
      },
    }),
  });

  const json = await response.json();
  console.log("🐋 Whale JSON Response:", json);

  // Handle any errors from BitQuery
  if (!json.data || !json.data.ethereum || !json.data.ethereum.transfers) {
    console.error("Whale data structure unexpected:", json);
    return [];
  }

  return json.data.ethereum.transfers;
}
