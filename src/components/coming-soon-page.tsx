"use client";

interface ComingSoonPageProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  cta?: string;
}

export const ComingSoonPage = ({
  title,
  description,
  icon,
  cta = "Notify me",
}: ComingSoonPageProps) => {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-6"
    >
      <div
        className="flex items-center justify-center size-20 rounded-2xl"
        style={{
          background: "rgba(79,124,255,0.08)",
          border: "1px solid rgba(79,124,255,0.15)",
        }}
      >
        <div style={{ color: "#4F7CFF" }} className="size-9">
          {icon}
        </div>
      </div>

      <div className="flex flex-col gap-2 max-w-md">
        <h2 className="text-2xl font-bold tracking-tight text-white">{title}</h2>
        <p className="text-base leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
          {description}
        </p>
      </div>

      <button
        type="button"
        className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-btn transition-all duration-150"
        style={{
          background: "rgba(79,124,255,0.12)",
          border: "1px solid rgba(79,124,255,0.25)",
          color: "#4F7CFF",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(79,124,255,0.2)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(79,124,255,0.12)";
        }}
      >
        {cta}
      </button>
    </div>
  );
};
