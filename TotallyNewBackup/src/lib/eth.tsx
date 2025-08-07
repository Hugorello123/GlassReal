import { Sparklines, SparklinesLine } from "react-sparklines";
import { useLiveData } from "../hooks/useLiveData";

const EthPrice = () => {
  const { data, loading } = useLiveData();
  const { price, change, sparklineData } = data.eth;
  const isPositive = !change.startsWith("-");

  return (
    <div className="bg-gray-800 p-4 rounded-xl shadow-md text-white text-center">
      <h3 className="text-lg font-semibold">ETH Price {loading && "🔄"}</h3>
      <p className="text-2xl">${price}</p>
      <p className={`text-sm ${isPositive ? "text-green-400" : "text-red-400"}`}>{change} 24h</p>
      
      <div className="mt-2">
        <Sparklines data={sparklineData}>
          <SparklinesLine color="#22c55e" />
        </Sparklines>
      </div>
    </div>
  );
};

export default EthPrice;
