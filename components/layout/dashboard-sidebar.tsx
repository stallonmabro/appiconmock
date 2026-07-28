"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const links = [
  { href: "/projects", label: "My Projects", icon: "📁" },
  { href: "/icon-maker", label: "New Icon", icon: "🎨" },
  { href: "/mockup-maker", label: "New Mockup", icon: "📱" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-56 border-r border-neutral-200 bg-white flex flex-col">
      <Link href="/" className="px-4 py-5 text-lg font-bold text-neutral-900 border-b border-neutral-100">AppIconMock</Link>
      <nav className="flex-1 p-3 space-y-1">
        {links.map((l) => (
          <Link key={l.href} href={l.href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors
              ${pathname === l.href ? "bg-neutral-100 text-neutral-900 font-medium" : "text-neutral-600 hover:bg-neutral-50"}`}>
            <span>{l.icon}</span> {l.label}
          </Link>
        ))}
      </nav>
      <div className="p-3 border-t border-neutral-100">
        <button onClick={() => signOut({ callbackUrl: "/" })}
          className="w-full text-left px-3 py-2 rounded-lg text-sm text-neutral-500 hover:bg-neutral-50">
          Sign Out
        </button>
      </div>
    </aside>
  );
}
