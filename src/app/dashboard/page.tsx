import { createServerSupabase } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardClient } from "./DashboardClient";
import { format } from "date-fns";

export default async function DashboardPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: problems } = await supabase
    .from("problems")
    .select("*")
    .eq("user_id", user.id)
    .order("next_revision", { ascending: true });

  // Every revision date (all years, for the year picker). Supabase returns at most
  // 1000 rows per request, so page through them.
  const revisions: { completed_at: string }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await supabase
      .from("revisions")
      .select("completed_at")
      .eq("user_id", user.id)
      .order("completed_at", { ascending: false })
      .range(from, from + 999);
    if (!data?.length) break;
    revisions.push(...data);
    if (data.length < 1000) break;
  }

  // Count reschedules today (notifications with "Rescheduled" title from today)
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const { count: rescheduledToday } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("title", "Rescheduled")
    .gte("created_at", `${todayStr}T00:00:00`)
    .lte("created_at", `${todayStr}T23:59:59`);

  return <DashboardClient problems={problems || []} revisions={revisions} rescheduledToday={rescheduledToday || 0} />;
}
