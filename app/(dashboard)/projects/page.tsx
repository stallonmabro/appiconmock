"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

interface Project {
  id: string; name: string; type: "icon" | "mockup"; thumbnailUrl: string | null; updatedAt: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/projects")
      .then(r => r.json())
      .then(d => setProjects(d.projects || []))
      .catch(() => toast.error("Failed to load projects"))
      .finally(() => setLoading(false));
  }, []);

  async function deleteProject(id: string) {
    await fetch("/api/projects", {
      method: "DELETE",
      body: JSON.stringify({ id }),
      headers: { "Content-Type": "application/json" },
    });
    setProjects(p => p.filter(x => x.id !== id));
    toast.success("Project deleted");
  }

  if (loading) return <div className="p-8 text-sm text-neutral-400">Loading...</div>;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Projects</h1>
        <div className="flex gap-2">
          <Link href="/icon-maker"
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800">
            New Icon
          </Link>
          <Link href="/mockup-maker"
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
            New Mockup
          </Link>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-neutral-500 mb-2">No projects yet</p>
          <p className="text-sm text-neutral-400">Create your first icon or mockup</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {projects.map((p) => (
            <div key={p.id} className="rounded-xl border border-neutral-200 bg-white p-4 group hover:shadow-md transition-shadow">
              <div className="aspect-square rounded-lg bg-neutral-100 mb-3 flex items-center justify-center text-3xl">
                {p.thumbnailUrl ? <img src={p.thumbnailUrl} alt="" className="w-full h-full object-cover rounded-lg" /> : (p.type === "icon" ? "🎨" : "📱")}
              </div>
              <h3 className="text-sm font-medium text-neutral-900 truncate">{p.name}</h3>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-neutral-400">{new Date(p.updatedAt).toLocaleDateString()}</span>
                <button onClick={() => deleteProject(p.id)}
                  className="text-xs text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-600">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
