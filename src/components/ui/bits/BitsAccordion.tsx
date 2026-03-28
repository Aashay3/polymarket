"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

interface AccordionItem {
  id: string;
  title: string;
  content: string;
}

interface BitsAccordionProps {
  items: AccordionItem[];
}

export function BitsAccordion({ items }: BitsAccordionProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div 
          key={item.id} 
          className="border border-white/5 bg-[#121217] rounded-xl overflow-hidden transition-all duration-200 hover:border-white/10"
        >
          <button
            onClick={() => setOpenId(openId === item.id ? null : item.id)}
            className="w-full p-4 flex items-center justify-between text-left group"
          >
            <span className="text-sm font-bold text-white group-hover:text-primary transition-colors">
              {item.title}
            </span>
            <ChevronDown 
              className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${
                openId === item.id ? "rotate-180 text-white" : ""
              }`} 
            />
          </button>
          
          <AnimatePresence initial={false}>
            {openId === item.id && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                <div className="p-4 pt-0 text-sm text-muted-foreground leading-relaxed border-t border-white/5 mt-0.5">
                  {item.content}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}
