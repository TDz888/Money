import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import LoginForm from "@/components/auth/LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const me = await getCurrentUser();
  if (me) redirect("/chat");
  return (
    <main className="relative min-h-screen flex items-center justify-center px-6 py-12">
      <div className="relative z-10 w-full max-w-md">
        <Link href="/" className="inline-flex items-center gap-2 mb-8 text-text-secondary hover:text-text-primary">
          <span className="text-electric-purple text-2xl font-black">⌬</span>
          <span className="text-h3 font-bold text-text-primary">Lux Cipher</span>
        </Link>
        <div className="rounded-generous border border-border-light bg-surface-elevated p-8 shadow-level-4">
          <h1 className="text-h1 font-extrabold text-text-primary mb-2">Welcome back</h1>
          <p className="text-body-small text-text-secondary mb-6">Sign in to continue chatting.</p>
          <LoginForm />
        </div>
        <p className="text-body-small text-text-secondary text-center mt-6">
          New here?{" "}
          <Link href="/register" className="text-electric-purple hover:text-purple-glow">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
