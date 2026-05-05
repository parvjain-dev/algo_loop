import { createServerSupabase } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TodayClient } from "./TodayClient";
import { startOfDay, addDays } from "date-fns";

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

  // Filter: due today or overdue (next_revision < start of tomorrow)
  const startOfTomorrow = startOfDay(addDays(new Date(), 1));
  const dueProblems = (problems || []).filter(
    (p) => new Date(p.next_revision) < startOfTomorrow
  );

  return <TodayClient problems={dueProblems} />;
}
