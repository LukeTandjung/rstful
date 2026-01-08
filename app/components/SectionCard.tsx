import type { ReactNode } from "react";

interface SectionCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}

export function SectionCard({
  icon,
  title,
  description,
  children,
  className = "",
  action,
}: SectionCardProps) {
  return (
    <div className={`bg-background-alt flex flex-col gap-3.5 p-6 rounded-lg w-full ${className}`}>
      <div className="flex flex-col gap-2.5">
        <div className="flex gap-2.5 items-center justify-between">
          <div className="flex gap-2.5 items-center font-medium text-xl leading-8 text-text font-header">
            {icon}
            {title}
          </div>
          {action}
        </div>
        <div className="flex w-full font-light text-base leading-7 text-text-alt">
          {description}
        </div>
      </div>

      {children}
    </div>
  );
}
