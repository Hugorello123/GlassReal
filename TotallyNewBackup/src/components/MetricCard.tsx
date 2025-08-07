import React from "react";

interface MetricCardProps {
  title: string;
  value: string;
  icon?: React.ReactNode;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon }) => (
  <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl shadow-lg w-full max-w-xs text-center border border-white/20">
    {icon && <div className="mb-2 text-2xl">{icon}</div>}
    <h3 className="text-sm text-gray-400">{title}</h3>
    <p className="text-xl font-semibold text-white">{value}</p>
  </div>
);

export default MetricCard;
