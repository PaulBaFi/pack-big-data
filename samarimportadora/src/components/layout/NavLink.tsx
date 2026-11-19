import type { ReactNode } from "react";

export function NavLink({
  href,
  icon,
  text,
  isActive,
}: {
  href: string;
  icon: ReactNode;
  text: string;
  isActive?: boolean;
}) {
  return (
    <a
      href={href}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
        isActive
          ? "bg-emerald-800 text-white font-medium shadow-sm"
          : "text-emerald-100 hover:bg-emerald-900 hover:text-white"
      }`}
    >
      {icon}
      {text}
    </a>
  );
}