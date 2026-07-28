import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage() {
  const session = await auth();
  if (session) redirect("/projects");

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-bold text-neutral-900 mb-1">Welcome back</h1>
      <p className="text-sm text-neutral-500 mb-6">Sign in to your account</p>
      <LoginForm />
    </div>
  );
}
