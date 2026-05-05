import { createServerSupabase } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TodayClient } from "./TodayClient";

export default async function TodayPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  // Get all problems due today or overdue (not completed/mastered)
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const { data: problems } = await supabase
    .from("problems")
    .select("*")
    .eq("user_id", user.id)
    .eq("completed", false)
    .lte("next_revision", today.toISOString())
    .order("next_revision", { ascending: true });

  return <TodayClient problems={problems || []} />;
}
