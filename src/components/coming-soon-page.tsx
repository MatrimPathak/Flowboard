"use client";

interface ComingSoonPageProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  cta?: string;
  onCtaClick?: () => void;
}

export const ComingSoonPage = ({
  title,
  description,
  icon,
  cta = "Notify me",
  onCtaClick,
}: ComingSoonPageProps) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-6">
      <div className="flex items-center justify-center size-20 rounded-2xl bg-primary/10 border border-primary/20">
        <div className="size-9 text-primary">
          {icon}
        </div>
      </div>

      <div className="flex flex-col gap-2 max-w-md">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">{title}</h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>

      <button
        type="button"
        onClick={onCtaClick}
        disabled={!onCtaClick}
        aria-disabled={!onCtaClick}
        className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-btn transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20"
      >
        {cta}
      </button>
    </div>
  );
};
