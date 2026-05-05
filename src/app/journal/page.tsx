import { createServerSupabase } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { JournalClient } from "./JournalClient";

export default async function JournalPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: revisions } = await supabase
    .from("revisions")
    .select("*, problems(name, pattern)")
    .eq("user_id", user.id)
    .order("completed_at", { ascending: false });

  return <JournalClient revisions={revisions || []} />;
}
