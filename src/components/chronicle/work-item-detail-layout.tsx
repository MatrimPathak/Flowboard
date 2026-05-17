import * as React from "react";

interface WorkItemDetailLayoutProps {
  header: React.ReactNode;
  metadata: React.ReactNode;
  mainContent: React.ReactNode;
  sidebar?: React.ReactNode;
}

export function WorkItemDetailLayout({
  header,
  metadata,
  mainContent,
  sidebar,
}: WorkItemDetailLayoutProps) {
  return (
    <div className="flex flex-col gap-y-4">
      {header}
      <div className={sidebar ? "grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6" : "grid grid-cols-1 gap-6"}>
        <div className="flex flex-col gap-y-4">
          {metadata}
          {mainContent}
        </div>
        {sidebar && (
          <div className="flex flex-col gap-y-4">
            {sidebar}
          </div>
        )}
      </div>
    </div>
  );
}
