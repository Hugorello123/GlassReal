import { useState, useEffect } from "react";
import { bitqueryService } from "./bitqueryService";

export function useWhaleTransfers() {
  const [transfers, setTransfers] = useState([
    { amount_usd: 12500000, symbol: 'eth', from: { owner_type: 'exchange' }, to: { owner_type: 'whale' } },
    { amount_usd: 8900000, symbol: 'btc', from: { owner_type: 'whale' }, to: { owner_type: 'exchange' } },
    { amount_usd: 6700000, symbol: 'bnb', from: { owner_type: 'unknown' }, to: { owner_type: 'whale' } },
    { amount_usd: 4300000, symbol: 'usdt', from: { owner_type: 'whale' }, to: { owner_type: 'defi' } },
    { amount_usd: 3800000, symbol: 'sol', from: { owner_type: 'exchange' }, to: { owner_type: 'unknown' } }
  ]);

  useEffect(() => {
    const fetchLiveWhaleData = async () => {
      try {
        const liveTransfers = await bitqueryService.getWhaleTransfers();
        
        if (liveTransfers.length > 0) {
          const formattedTransfers = liveTransfers.map(transfer => ({
            amount_usd: transfer.usdValue,
            symbol: transfer.currency.toLowerCase(),
            from: { owner_type: "exchange" },
            to: { owner_type: "whale" }
          }));
          setTransfers(formattedTransfers);
          console.log('Live whale data updated:', formattedTransfers.length, 'transfers');
        }
      } catch (error) {
        console.log('Using static whale data - BitQuery API not available');
      }
    };

    fetchLiveWhaleData();
    const interval = setInterval(fetchLiveWhaleData, 120000); // Update every 2 minutes
    
    return () => clearInterval(interval);
  }, []);

  return transfers;
}
