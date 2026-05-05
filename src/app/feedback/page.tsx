"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MessageSquarePlus, Send, CheckCircle } from "lucide-react";

export default function FeedbackPage() {
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setLoading(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("feedback").insert({
      user_id: user.id,
      user_name: user.user_metadata?.user_name || user.user_metadata?.full_name || user.email,
      message: message.trim(),
    });

    setMessage("");
    setSubmitted(true);
    setLoading(false);
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <MessageSquarePlus size={24} /> Feedback
      </h1>
      <p className="text-gray-400 text-sm">
        Got a suggestion, bug report, or feature request? Let me know!
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Your feedback or suggestion..."
          required
          rows={4}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-green-500"
        />
        <button
          type="submit"
          disabled={loading || !message.trim()}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Send size={14} /> Submit Feedback
        </button>
      </form>

      {submitted && (
        <div className="flex items-center gap-2 text-green-400 text-sm">
          <CheckCircle size={16} /> Thanks for your feedback!
        </div>
      )}
    </div>
  );
}
