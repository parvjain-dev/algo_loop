import { createServerSupabase } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TodayClient } from "./TodayClient";

export default async function TodayPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  // Fetch all non-completed problems, filter client-side same as dashboard
  const { data: problems } = await supabase
    .from("problems")
    .select("*")
    .eq("user_id", user.id)
    .eq("completed", false)
    .order("next_revision", { ascending: true });

  // Filter: due today or overdue (next_revision <= end of today)
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  const dueProblems = (problems || []).filter(
    (p) => new Date(p.next_revision) <= endOfToday
  );

  return <TodayClient problems={dueProblems} />;
}
