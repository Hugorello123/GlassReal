import { useState, useEffect } from 'react';

interface LivePrice {
  price: string;
  change: string;
  sparklineData: number[];
}

interface LiveData {
  eth: LivePrice;
  btc: LivePrice;
}

export function useLiveData() {
  const [data, setData] = useState<LiveData>({
    eth: { price: "3,627.83", change: "+4.2%", sparklineData: [3480, 3520, 3580, 3560, 3590, 3610, 3625, 3628] },
    btc: { price: "77,000.00", change: "-1.8%", sparklineData: [78400, 77900, 77500, 77200, 77000, 77100, 77000] }
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchLiveData = async () => {
      try {
        setLoading(true);
        
        // Primary source: backend consolidated prices endpoint.
        // Fallback keeps compatibility with older proxy setups.
        let apiData: any = null;
        const response = await fetch("/api/prices");
        if (response.ok) {
          apiData = await response.json();
          apiData = apiData?.prices || apiData;
        } else {
          const cgFallback = await fetch(
            "/api/cg/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true"
          );
          if (cgFallback.ok) apiData = await cgFallback.json();
        }

        if (apiData) {
          
          // Generate realistic sparkline data based on current price and change
          const ethPrice = Number(apiData?.eth ?? apiData?.ethereum?.usd);
          const ethChange = Number(apiData?.ethCh ?? apiData?.ethereum?.usd_24h_change);
          const btcPrice = Number(apiData?.btc ?? apiData?.bitcoin?.usd);
          const btcChange = Number(apiData?.btcCh ?? apiData?.bitcoin?.usd_24h_change);

          if (!Number.isFinite(ethPrice) || !Number.isFinite(btcPrice)) return;
          
          const ethStartPrice = ethPrice * (1 - ethChange / 100);
          const btcStartPrice = btcPrice * (1 - btcChange / 100);
          
          const ethSparkline = Array.from({ length: 8 }, (_, i) => 
            ethStartPrice + (ethPrice - ethStartPrice) * (i / 7) + (Math.random() - 0.5) * 20
          );
          
          const btcSparkline = Array.from({ length: 8 }, (_, i) => 
            btcStartPrice + (btcPrice - btcStartPrice) * (i / 7) + (Math.random() - 0.5) * 120
          );
          
          setData({
            eth: {
              price: ethPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
              change: `${ethChange >= 0 ? '+' : ''}${ethChange.toFixed(1)}%`,
              sparklineData: ethSparkline
            },
            btc: {
              price: btcPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
              change: `${btcChange >= 0 ? '+' : ''}${btcChange.toFixed(1)}%`,
              sparklineData: btcSparkline
            }
          });
        }
      } catch (error) {
        console.log('Using static data');
      } finally {
        setLoading(false);
      }
    };

    fetchLiveData();
    const interval = setInterval(fetchLiveData, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, []);

  return { data, loading };
}