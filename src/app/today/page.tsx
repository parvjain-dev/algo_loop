import { createServerSupabase } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TodayClient } from "./TodayClient";

export default async function TodayPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  // Fetch all non-completed problems. "Due today" is decided in the browser (user's time zone).
  const { data: problems } = await supabase
    .from("problems")
    .select("*")
    .eq("user_id", user.id)
    .eq("completed", false)
    .order("next_revision", { ascending: true });

  return <TodayClient problems={problems || []} />;
}
