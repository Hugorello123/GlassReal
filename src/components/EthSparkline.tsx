import { Sparklines, SparklinesLine } from "react-sparklines";
import { useLiveData } from "../hooks/useLiveData";

export default function EthSparkline() {
  const { data } = useLiveData();
  const { change, sparklineData } = data.eth;
  const isPositive = !change.startsWith("-");

  return (
    <div className="mt-2">
      <Sparklines data={sparklineData} width={120} height={30}>
        <SparklinesLine color="#22c55e" style={{ strokeWidth: 2, fill: "none" }} />
      </Sparklines>
      <div className={`text-xs text-center mt-1 ${isPositive ? "text-green-400" : "text-red-400"}`}>{change} 24h</div>
    </div>
  );
}
