"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useEffect, useState } from "react";

const LIVE_TRADES = [
  { id: 1, user: "0x12..9fa", market: "Bitcoin $100k", type: "YES", amount: "$500" },
  { id: 2, user: "0xab..32c", market: "SpaceX Mars", type: "NO", amount: "$150" },
  { id: 3, user: "0x78..11d", market: "Fed Cut", type: "YES", amount: "$2,400" },
];

export function MobileLiveTicker() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % LIVE_TRADES.length);
    }, 4000); // Rotate every 4 seconds
    return () => clearInterval(timer);
  }, []);

  const trade = LIVE_TRADES[currentIndex];

  return (
    <div className="fixed top-16 left-0 right-0 z-40 sm:hidden pointer-events-none flex justify-center p-2">
      <AnimatePresence mode="wait">
        <motion.div
          key={trade.id}
          initial={{ y: -20, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -20, opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          className="bg-black/80 backdrop-blur-md border border-white/10 rounded-full px-4 py-2 flex items-center gap-3 shadow-xl pointer-events-auto max-w-[90vw]"
        >
          <div className="flex items-center gap-1 w-full text-xs">
            <span className="font-mono text-muted-foreground mr-1">{trade.user}</span>
            <span className="text-white truncate max-w-[100px]">{trade.market}</span>
            <span className={`font-bold ml-auto flex items-center ${trade.type === 'YES' ? 'text-green-500' : 'text-red-500'}`}>
              {trade.amount} {trade.type === 'YES' ? <ArrowUpRight className="w-3 h-3 ml-0.5" /> : <ArrowDownRight className="w-3 h-3 ml-0.5" />}
            </span>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
