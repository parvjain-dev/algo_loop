import { createServerSupabase } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ContestClient } from "./ContestClient";

export default async function ContestPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  // The contest draws from ALL of the user's problems, whatever their status
  const { data: problems } = await supabase
    .from("problems")
    .select("id, name, link, pattern, difficulty")
    .eq("user_id", user.id);

  const { data: attempts } = await supabase
    .from("contest_attempts")
    .select("*")
    .eq("user_id", user.id)
    .order("week_start", { ascending: false })
    .limit(104);

  return <ContestClient problems={problems || []} attempts={attempts || []} />;
}
