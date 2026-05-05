"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Notification } from "@/lib/types";
import { Bell, CheckCheck } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export function NotificationsClient({ notifications: initial }: { notifications: Notification[] }) {
  const [notifications, setNotifications] = useState(initial);

  const markAllRead = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
  };

  const markRead = async (id: string) => {
    const supabase = createClient();
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications(notifications.map((n) => n.id === id ? { ...n, read: true } : n));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bell size={24} /> Notification Center
          {unreadCount > 0 && <span className="bg-red-500 text-xs px-2 py-0.5 rounded-full">{unreadCount}</span>}
        </h1>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300">
            <CheckCheck size={16} /> Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <p className="text-gray-500">No notifications yet.</p>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => !n.read && markRead(n.id)}
              className={cn(
                "bg-gray-900 border rounded-lg p-4 cursor-pointer transition-colors",
                n.read ? "border-gray-800" : "border-blue-800 bg-blue-950/20"
              )}
            >
              <div className="flex items-center justify-between">
                <p className="font-medium text-sm">{n.title}</p>
                <span className="text-xs text-gray-500">{format(new Date(n.created_at), "MMM d, h:mm a")}</span>
              </div>
              <p className="text-sm text-gray-400 mt-1">{n.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
