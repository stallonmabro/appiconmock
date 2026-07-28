import Link from "next/link";

interface ToolCardProps {
  title: string;
  description: string;
  href: string;
  icon: string;
  cta: string;
}

export function ToolCard({ title, description, href, icon, cta }: ToolCardProps) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm transition-all hover:shadow-lg hover:border-neutral-300 hover:-translate-y-1"
    >
      <div className="text-4xl mb-4">{icon}</div>
      <h2 className="text-2xl font-semibold text-neutral-900 mb-2">{title}</h2>
      <p className="text-neutral-600 mb-6 leading-relaxed">{description}</p>
      <span className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 group-hover:gap-3 transition-all">
        {cta} <span aria-hidden="true">&rarr;</span>
      </span>
    </Link>
  );
}
