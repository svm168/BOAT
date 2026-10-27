import Link from "next/link";
import type { User } from "@/lib/types";
import { LogoutButton } from "./LogoutButton";

export function Navbar({ user }: { user: User | null }) {
  return (
    <header className="border-b border-ink/10 bg-sand/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link href={user ? "/dashboard" : "/"} className="font-display text-2xl text-moss">
          BOAT
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {user ? (
            <>
              <span className="hidden text-ink/70 sm:inline">{user.display_name}</span>
              <Link href="/dashboard" className="hover:text-moss">
                Dashboard
              </Link>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href="/login" className="hover:text-moss">
                Sign in
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-moss px-3 py-1.5 text-sand hover:bg-leaf"
              >
                Register
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
