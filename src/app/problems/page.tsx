import { createServerSupabase } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProblemsClient } from "./ProblemsClient";

export default async function ProblemsPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: problems } = await supabase
    .from("problems")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return <ProblemsClient problems={problems || []} />;
}
