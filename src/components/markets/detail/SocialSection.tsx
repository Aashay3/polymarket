"use client";

import { useState } from "react";
import { BitsTabs } from "@/components/ui/bits/BitsTabs";
import { BitsButton } from "@/components/ui/bits/BitsButton";
import { MessageSquare, Users, Activity, Heart, CornerDownRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function SocialSection() {
  const [activeTab, setActiveTab] = useState("Comments");

  const tabs = [
    { id: "Comments", label: "Comments", icon: <MessageSquare className="w-3.5 h-3.5" /> },
    { id: "Positions", label: "Positions", icon: <Users className="w-3.5 h-3.5" /> },
    { id: "Activity", label: "Activity", icon: <Activity className="w-3.5 h-3.5" /> },
  ];

  const mockComments = [
    { id: "1", user: "AlphaTrader", text: "Fundamentals looking strong for December. Bullish on YES.", time: "2h ago", likes: 12 },
    { id: "2", user: "MacroWhale", text: "Rate decisions are already priced in. NO is the play here.", time: "5h ago", likes: 8 },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4 border-b border-white/5 pb-1">
        <BitsTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "Comments" && (
          <motion.div
            key="comments"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Input */}
            <div className="relative">
                <textarea 
                    placeholder="Contribute to the discussion..."
                    className="w-full bg-white/[0.03] border border-white/5 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-primary/40 transition-all resize-none min-h-[100px]"
                />
                <BitsButton 
                    variant="primary" 
                    className="absolute bottom-4 right-4 h-9 px-6 rounded-xl font-bold text-[11px] uppercase tracking-widest"
                >
                    Post
                </BitsButton>
            </div>

            {/* List */}
            <div className="space-y-4">
               {mockComments.map(comment => (
                   <div key={comment.id} className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl group hover:border-white/10 transition-colors">
                       <div className="flex items-center justify-between mb-3">
                           <div className="flex items-center gap-3">
                               <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                                   {comment.user[0]}
                               </div>
                               <div>
                                   <p className="text-xs font-bold text-white">{comment.user}</p>
                                   <p className="text-[10px] text-muted-foreground font-medium">{comment.time}</p>
                               </div>
                           </div>
                           <button className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground hover:text-red-400 transition-colors">
                               <Heart className="w-3.5 h-3.5" /> {comment.likes}
                           </button>
                       </div>
                       <p className="text-sm text-neutral-400 leading-relaxed pl-1 pt-1 border-l-2 border-white/5 ml-4">
                           {comment.text}
                       </p>
                       <div className="flex items-center gap-4 mt-4 ml-4">
                            <button className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1 hover:text-white transition-colors">
                                <CornerDownRight className="w-3 h-3" /> Reply
                            </button>
                       </div>
                   </div>
               ))}
            </div>
          </motion.div>
        )}

        {/* Other tabs simplified for mockup */}
        {activeTab !== "Comments" && (
            <motion.div
                key="other"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="py-12 flex flex-col items-center justify-center text-center text-muted-foreground"
            >
                <Users className="w-8 h-8 opacity-20 mb-4" />
                <p className="text-xs font-bold uppercase tracking-widest">{activeTab} Feed Coming Soon</p>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
