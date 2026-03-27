"use client";

import { useState } from "react";
import { HelpCircle, MessageCircle, FileText, Send, ChevronDown, CheckCircle2 } from "lucide-react";
import { BitsCard } from "@/components/ui/bits/BitsCard";
import { BitsButton } from "@/components/ui/bits/BitsButton";

export default function SupportPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [submitted, setSubmitted] = useState(false);

  const FAQs = [
    { q: "How are markets resolved?", a: "Markets are resolved based on the specific outcome criteria defined in the market description. We use a combination of verified news sources and official records." },
    { q: "What is the platform fee?", a: "Nexora charges a minimal 0.5% fee on each trade to maintain the AMM liquidity and platform infrastructure." },
    { q: "Is my wallet secure?", a: "Yes, Nexora uses industry-standard encryption and non-custodial logic for trade execution. Your funds are managed through secure smart-contract protocols." },
    { q: "How long does payout take?", a: "Once a market is resolved, payouts are typically processed instantly. In some high-volume scenarios, it may take up to 15 minutes." }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 5000);
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">Help & Support</h1>
        <p className="text-sm text-muted-foreground mt-1.5 font-medium">Find answers to common questions or reach out to our dedicated support team</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* FAQ Section */}
        <div className="space-y-6">
          <h2 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-primary" /> Frequently Asked Questions
          </h2>
          <div className="space-y-3">
            {FAQs.map((faq, idx) => (
              <BitsCard key={idx} className="overflow-hidden">
                <button 
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full p-5 flex items-center justify-between hover:bg-white/2 transition-colors"
                >
                  <span className="text-15px font-bold text-white text-left">{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${openFaq === idx ? "rotate-180" : ""}`} />
                </button>
                {openFaq === idx && (
                  <div className="px-5 pb-5 pt-1 text-sm text-neutral-400 leading-relaxed animate-in slide-in-from-top-1 duration-300">
                    {faq.a}
                  </div>
                )}
              </BitsCard>
            ))}
          </div>
          
          <BitsCard className="p-6 border-blue-500/10 bg-blue-500/2">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Documentation</p>
                <p className="text-[11px] text-muted-foreground font-medium">Read our full guide on trading and market logic</p>
              </div>
              <BitsButton variant="secondary" className="ml-auto h-8 px-4 text-[11px] rounded-lg">View Docs</BitsButton>
            </div>
          </BitsCard>
        </div>

        {/* Contact Form */}
        <div className="space-y-6">
          <h2 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-green-400" /> Contact Support
          </h2>
          <BitsCard className="p-8">
            {submitted ? (
              <div className="py-12 flex flex-col items-center text-center animate-in zoom-in-95 duration-500">
                <div className="w-16 h-16 rounded-full bg-yes/20 flex items-center justify-center text-yes mb-6">
                    <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Message Received</h3>
                <p className="text-sm text-muted-foreground max-w-xs">Our team will review your request and get back to you within 24 hours.</p>
                <BitsButton 
                    variant="ghost" 
                    onClick={() => setSubmitted(false)} 
                    className="mt-8 text-neutral-400"
                >
                    Send another message
                </BitsButton>
              </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Your Name</label>
                            <input 
                                required
                                type="text"
                                className="w-full bg-white/3 border border-white/5 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-primary/40 transition-colors"
                                placeholder="Aashay"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Email Address</label>
                            <input 
                                required
                                type="email"
                                className="w-full bg-white/3 border border-white/5 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-primary/40 transition-colors"
                                placeholder="name@example.com"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Category</label>
                        <select className="w-full bg-white/3 border border-white/5 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-primary/40 transition-colors appearance-none">
                            <option>Trade Issue</option>
                            <option>Market Resolution</option>
                            <option>Account & Security</option>
                            <option>Other</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Message</label>
                        <textarea 
                            required
                            rows={4}
                            className="w-full bg-white/3 border border-white/5 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-primary/40 transition-colors resize-none"
                            placeholder="Describe your issue in detail..."
                        />
                    </div>
                    <BitsButton variant="primary" type="submit" className="w-full h-12 rounded-xl">
                        <Send className="w-4 h-4 mr-2" />
                        Send Message
                    </BitsButton>
                </form>
            )}
          </BitsCard>
        </div>
      </div>
    </div>
  );
}
