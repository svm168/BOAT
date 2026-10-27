import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md space-y-6 rounded-3xl bg-white p-6 shadow-sm">
      <h1 className="font-display text-3xl text-moss">Sign in</h1>
      <AuthForm mode="login" />
      <p className="text-sm text-ink/60">
        New here?{" "}
        <Link href="/register" className="text-moss underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
