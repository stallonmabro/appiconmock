import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { RegisterForm } from "@/components/auth/register-form";

export default async function RegisterPage() {
  const session = await auth();
  if (session) redirect("/projects");

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-bold text-neutral-900 mb-1">Create account</h1>
      <p className="text-sm text-neutral-500 mb-6">Start creating in seconds</p>
      <RegisterForm />
    </div>
  );
}
