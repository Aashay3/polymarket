"use client";

import { useState } from "react";
import { BitsTabs } from "@/components/ui/bits/BitsTabs";
import { BitsButton } from "@/components/ui/bits/BitsButton";
import { MessageSquare, Users, Activity, Heart, CornerDownRight, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/app/context/ToastContext";

interface Comment {
  id: string;
  user: string;
  text: string;
  time: string;
  likes: number;
  liked: boolean;
  parentId?: string;
}

const INITIAL_COMMENTS: Comment[] = [
  { id: "1", user: "AlphaTrader", text: "Fundamentals looking strong for December. Bullish on YES.", time: "2h ago", likes: 12, liked: false },
  { id: "2", user: "MacroWhale",  text: "Rate decisions are already priced in. NO is the play here.", time: "5h ago", likes: 8,  liked: false },
];

export function SocialSection() {
  const [activeTab, setActiveTab] = useState("Comments");
  const [comments, setComments] = useState<Comment[]>(INITIAL_COMMENTS);
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const { toast } = useToast();

  const tabs = [
    { id: "Comments", label: "Comments", icon: <MessageSquare className="w-3.5 h-3.5" /> },
    { id: "Positions", label: "Positions", icon: <Users className="w-3.5 h-3.5" /> },
    { id: "Activity", label: "Activity", icon: <Activity className="w-3.5 h-3.5" /> },
  ];

  const handlePost = () => {
    const text = draft.trim();
    if (!text) {
      toast({ type: "error", title: "Empty comment", description: "Write something before posting." });
      return;
    }
    const newComment: Comment = {
      id: Math.random().toString(36).slice(2, 9),
      user: "You",
      text,
      time: "just now",
      likes: 0,
      liked: false,
    };
    setComments((prev) => [newComment, ...prev]);
    setDraft("");
    toast({ type: "success", title: "Comment posted" });
  };

  const handleReply = (parentId: string) => {
    const text = replyDraft.trim();
    if (!text) return;
    const newReply: Comment = {
      id: Math.random().toString(36).slice(2, 9),
      user: "You",
      text,
      time: "just now",
      likes: 0,
      liked: false,
      parentId,
    };
    setComments((prev) => [...prev, newReply]);
    setReplyDraft("");
    setReplyTo(null);
    toast({ type: "success", title: "Reply posted" });
  };

  const toggleLike = (id: string) => {
    setComments((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, liked: !c.liked, likes: c.likes + (c.liked ? -1 : 1) } : c
      )
    );
  };

  const topLevel = comments.filter((c) => !c.parentId);
  const repliesFor = (id: string) => comments.filter((c) => c.parentId === id);

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
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                    e.preventDefault();
                    handlePost();
                  }
                }}
                placeholder="Contribute to the discussion…"
                aria-label="Write a comment"
                className="w-full bg-white/[0.03] border border-white/5 rounded-2xl p-4 pr-28 text-sm text-white focus:outline-none focus:border-primary/40 transition-all resize-none min-h-[100px]"
              />
              <BitsButton
                variant="primary"
                onClick={handlePost}
                disabled={!draft.trim()}
                className="absolute bottom-4 right-4 h-9 px-5 rounded-xl font-bold text-[11px] uppercase tracking-widest flex items-center gap-1.5"
              >
                <Send className="w-3 h-3" /> Post
              </BitsButton>
            </div>

            {/* List */}
            <div className="space-y-4">
              {topLevel.map((comment) => (
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
                    <button
                      onClick={() => toggleLike(comment.id)}
                      aria-pressed={comment.liked}
                      aria-label={comment.liked ? "Unlike comment" : "Like comment"}
                      className={`flex items-center gap-1.5 text-[10px] font-bold transition-colors ${comment.liked ? "text-red-400" : "text-muted-foreground hover:text-red-400"}`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${comment.liked ? "fill-current" : ""}`} /> {comment.likes}
                    </button>
                  </div>
                  <p className="text-sm text-neutral-400 leading-relaxed pl-1 pt-1 border-l-2 border-white/5 ml-4">
                    {comment.text}
                  </p>
                  <div className="flex items-center gap-4 mt-4 ml-4">
                    <button
                      onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                      aria-expanded={replyTo === comment.id}
                      className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1 hover:text-white transition-colors"
                    >
                      <CornerDownRight className="w-3 h-3" /> Reply
                    </button>
                  </div>

                  {/* Reply input */}
                  {replyTo === comment.id && (
                    <div className="mt-4 ml-4 flex items-start gap-2">
                      <input
                        value={replyDraft}
                        onChange={(e) => setReplyDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleReply(comment.id);
                          }
                        }}
                        placeholder={`Reply to ${comment.user}…`}
                        aria-label={`Reply to ${comment.user}`}
                        autoFocus
                        className="flex-1 bg-white/[0.03] border border-white/5 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/40 transition-colors"
                      />
                      <BitsButton
                        variant="primary"
                        onClick={() => handleReply(comment.id)}
                        disabled={!replyDraft.trim()}
                        className="h-9 px-4 rounded-lg text-[11px] font-bold"
                      >
                        Reply
                      </BitsButton>
                    </div>
                  )}

                  {/* Replies */}
                  {repliesFor(comment.id).map((reply) => (
                    <div key={reply.id} className="mt-4 ml-8 pl-4 border-l border-white/5">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-6 h-6 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-[9px] font-bold text-white">
                          {reply.user[0]}
                        </div>
                        <p className="text-[11px] font-bold text-white">{reply.user}</p>
                        <p className="text-[10px] text-muted-foreground">{reply.time}</p>
                      </div>
                      <p className="text-sm text-neutral-400 leading-relaxed ml-1">{reply.text}</p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </motion.div>
        )}

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
