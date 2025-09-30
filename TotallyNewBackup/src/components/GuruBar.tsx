import React from "react";
import GuruGoldChip from "./GuruGoldChip";

export default function GuruBar() {
  return (
    <div className="sticky top-0 z-30 -mx-4 mb-4 px-4 pt-3 pb-2
                    bg-gradient-to-b from-black/40 to-transparent
                    backdrop-blur supports-[backdrop-filter]:backdrop-blur">
      <div className="flex items-center gap-3">
        <GuruGoldChip />
        {/* Add more chips later, e.g. <GuruBTCChip /> */}
      </div>
    </div>
  );
}
