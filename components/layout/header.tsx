import Link from "next/link";
import type { Session } from "next-auth";

export function Header({ session }: { session: Session | null }) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-neutral-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 h-16">
        <Link href="/" className="text-xl font-bold text-neutral-900">
          AppIconMock
        </Link>
        <nav className="flex items-center gap-4">
          {session?.user ? (
            <>
              <Link href="/projects" className="text-sm text-neutral-600 hover:text-neutral-900">
                My Projects
              </Link>
              <Link href="/settings" className="text-sm text-neutral-600 hover:text-neutral-900">
                Settings
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm text-neutral-600 hover:text-neutral-900">
                Sign In
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
              >
                Get Started
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
