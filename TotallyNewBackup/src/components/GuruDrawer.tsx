// src/components/GuruDrawer.tsx
import React from "react";

interface Props {
  topic: string | null;
  onClose: () => void;
}

const GuruDrawer: React.FC<Props> = ({ topic, onClose }) => {
  return (
    <div className="fixed top-0 right-0 h-full w-80 bg-black text-white shadow-lg z-50 p-4">
      <button onClick={onClose} className="mb-4 text-sm text-purple-400">
        Close
      </button>
      <h2 className="text-xl font-bold mb-2">🧠 AI Guru</h2>
      {topic ? (
        <p>
          Here's what I know about: <strong>{topic}</strong>
        </p>
      ) : (
        <p>Click a headline to get insights.</p>
      )}
    </div>
  );
};

export default GuruDrawer;
