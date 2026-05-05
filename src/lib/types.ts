export type Problem = {
  id: string;
  user_id: string;
  name: string;
  description: string;
  link: string;
  pattern: string;
  effort: "low" | "medium" | "high";
  revision_count: number;
  next_revision: string;
  completed: boolean;
  created_at: string;
};

export type Revision = {
  id: string;
  problem_id: string;
  user_id: string;
  completed_at: string;
  reflection: string | null;
};

export type Notification = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  problem_id: string | null;
};
