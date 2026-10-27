import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-md space-y-6 rounded-3xl bg-white p-6 shadow-sm">
      <h1 className="font-display text-3xl text-moss">Create account</h1>
      <p className="text-sm text-ink/70">
        Your name, phone, and hostel appear when someone taps your NFC plate.
      </p>
      <AuthForm mode="register" />
      <p className="text-sm text-ink/60">
        Already registered?{" "}
        <Link href="/login" className="text-moss underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
