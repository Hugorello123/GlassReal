import { Sparklines, SparklinesLine } from "react-sparklines";

export default function BnbSparkline() {
  const bnbData = [
    658, 662, 665, 663, 668, 670, 672, 669, 666, 671, 673, 675, 672, 670, 668, 672
  ];

  return (
    <div className="mt-1">
      <Sparklines data={bnbData} width={80} height={20}>
        <SparklinesLine color="#facc15" style={{ strokeWidth: 1.5, fill: "none" }} />
      </Sparklines>
    </div>
  );
}