import { Sparklines, SparklinesLine } from "react-sparklines";
import { useLiveData } from "../hooks/useLiveData";

const EthPrice = () => {
  const { data, loading } = useLiveData();

  const price = data?.eth?.price ?? null;

  // change may be a string like "+1.23%" in your hook; guard either way
  const changeRaw = data?.eth?.change;
  const change =
    typeof changeRaw === "string"
      ? changeRaw
      : changeRaw == null
      ? "…"
      : String(changeRaw);

  const spark = Array.isArray(data?.eth?.sparklineData)
    ? data.eth.sparklineData
    : [];

  const isPositive =
    typeof change === "string" ? !change.startsWith("-") : Number(changeRaw) >= 0;

  return (
    <div className="bg-gray-800 p-4 rounded-xl shadow-md text-white text-center">
      <h3 className="text-lg font-semibold">ETH Price {loading && "🔄"}</h3>
      <p className="text-2xl">{price != null ? `$${price}` : "…"}</p>
      <p className={`text-sm ${isPositive ? "text-green-400" : "text-red-400"}`}>
        {change} 24h
      </p>

      <div className="mt-2">
        <Sparklines data={spark}>
          <SparklinesLine color="#22c55e" />
        </Sparklines>
      </div>
    </div>
  );
};

export default EthPrice;
