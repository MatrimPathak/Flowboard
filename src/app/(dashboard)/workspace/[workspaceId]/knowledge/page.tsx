import { redirect } from "next/navigation";
import { getCurrent } from "@/features/auth/queries";

export default async function KnowledgePage() {
  const user = await getCurrent();
  if (!user) redirect("/sign-in");

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-white">Knowledge Dashboard</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {['Most viewed docs', 'Recently edited', 'Related projects', 'Knowledge graph', 'Decision records', 'Architecture timeline', 'Project evolution'].map((card) => (
          <div key={card} className="rounded-xl border border-white/10 bg-[#0A0F1A] p-4 text-white/75">{card}</div>
        ))}
      </div>
      <p className="text-sm text-white/45">Insight: Authentication work repeatedly appears across projects.</p>
    </div>
  );
}
