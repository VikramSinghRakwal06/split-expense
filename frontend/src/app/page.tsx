import { redirect } from "next/navigation";

// Just sends the visitor to /login, which proxy.ts then bounces to /groups
// if they already have a session.
export default function Home() {
  redirect("/login");
}
