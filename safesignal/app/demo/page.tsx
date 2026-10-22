import { redirect } from "next/navigation";

// The single-page demo moved into the /dashboard app; keep old links working.
export default function DemoRedirect() {
  redirect("/dashboard");
}
