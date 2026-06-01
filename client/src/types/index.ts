export type Priority = "high" | "medium" | "low";
export type Status = "todo" | "in-progress" | "done";

export interface User {
  id: string;
  email: string;
  name: string;
  plan: "free" | "pro";
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  status: Status;
  createdAt: string;
}

export interface Column {
  id: Status;
  title: string;
  tasks: Task[];
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}
