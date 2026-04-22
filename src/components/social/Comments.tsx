"use client";

import { useState } from "react";
import { Send } from "lucide-react";

const DUMMY_COMMENTS = [
  { id: 1, user: "0xWhale", text: "This is a sure thing! Accumulating YES.", time: "2m ago" },
  { id: 2, user: "CryptoNerd", text: "Volume is suspiciously low today.", time: "15m ago" },
  { id: 3, user: "TraderJoe", text: "I'm holding out for a better entry on NO.", time: "1h ago" },
];

export function Comments() {
  const [comment, setComment] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment) return;
    setComment("");
    // Handle submission logic
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-4 mb-4">
        {DUMMY_COMMENTS.map((c) => (
          <div key={c.id} className="bg-black/40 p-3 rounded-xl border border-white/5 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-primary">{c.user}</span>
              <span className="text-muted-foreground">{c.time}</span>
            </div>
            <p className="text-sm text-foreground/90">{c.text}</p>
          </div>
        ))}
      </div>
      
      <form onSubmit={handleSubmit} className="mt-auto relative">
        <input 
          type="text" 
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Add a comment..."
          className="w-full bg-accent border border-white/10 rounded-xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:border-primary/50 transition-colors"
        />
        <button 
          type="submit" 
          disabled={!comment}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-primary text-primary-foreground rounded-lg disabled:opacity-50 transition-opacity"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
