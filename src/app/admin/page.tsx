import { createServerSupabase } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { format } from "date-fns";

const ADMIN_USERNAME = "parvjain-dev"; // Your GitHub username

export default async function AdminPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  // Only allow admin
  const username = user.user_metadata?.user_name || "";
  if (username !== ADMIN_USERNAME) redirect("/dashboard");

  // Admin can read all feedback using service role isn't available,
  // so we use a direct query with RLS bypass via SQL function or just read own.
  // For simplicity, we'll use a workaround: the admin policy.
  // You need to run this SQL in Supabase after getting your user ID:
  // create policy "Admin can view all feedback" on public.feedback for select using (auth.uid() = 'YOUR_USER_ID');

  const { data: feedback } = await supabase
    .from("feedback")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin — All Feedback</h1>
      {!feedback?.length ? (
        <p className="text-gray-500">No feedback yet.</p>
      ) : (
        <div className="space-y-3">
          {feedback.map((f: { id: string; user_name: string; message: string; created_at: string }) => (
            <div key={f.id} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-green-400">@{f.user_name}</p>
                <span className="text-xs text-gray-500">{format(new Date(f.created_at), "MMM d, yyyy h:mm a")}</span>
              </div>
              <p className="text-sm text-gray-300">{f.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
