import { createServerSupabase } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AnalyticsClient } from "./AnalyticsClient";

export default async function AnalyticsPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: problems } = await supabase.from("problems").select("*").eq("user_id", user.id);
  const { data: revisions } = await supabase.from("revisions").select("*").eq("user_id", user.id).order("completed_at", { ascending: false });

  return <AnalyticsClient problems={problems || []} revisions={revisions || []} />;
}
