"use client";

import {
  ChevronsRight,
  ClipboardList,
  FileText,
  ImageIcon,
  LayoutGrid,
  PieChart,
  Settings,
  Sparkles,
} from "lucide-react";

const NAV_ITEMS = [
  { icon: LayoutGrid, label: "Home" },
  { icon: ImageIcon, label: "My Classroom" },
  { icon: FileText, label: "Assignments" },
  { icon: ClipboardList, label: "Exams", active: true },
  { icon: PieChart, label: "My Library" },
];

export function Sidebar({
  className = "",
  collapsed = false,
  onExpand,
}: {
  className?: string;
  collapsed?: boolean;
  onExpand?: () => void;
}) {
  if (collapsed) {
    return (
      <aside
        className={`hidden lg:flex w-[76px] shrink-0 flex-col items-center gap-2 bg-white border-r border-neutral-200 py-6 ${className}`}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-900">
          <Sparkles className="h-[18px] w-[18px] text-orange-400" />
        </div>

        <nav className="mt-4 flex flex-1 flex-col items-center gap-2">
          {NAV_ITEMS.map(({ icon: Icon, label, active }) => (
            <a
              key={label}
              href="#"
              title={label}
              aria-label={label}
              className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
                active ? "bg-neutral-100 text-neutral-900" : "text-neutral-400 hover:bg-neutral-50 hover:text-neutral-700"
              }`}
            >
              <Icon className="h-[18px] w-[18px]" />
            </a>
          ))}
        </nav>

        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700">
          DPS
        </div>
        <button
          onClick={onExpand}
          aria-label="Expand sidebar"
          className="mt-1 flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-50 hover:text-neutral-700"
        >
          <ChevronsRight className="h-4 w-4" />
        </button>
      </aside>
    );
  }

  return (
    <aside
      className={`hidden lg:flex w-[280px] shrink-0 flex-col bg-white border-r border-neutral-200 px-5 py-6 ${className}`}
    >
      <div className="flex items-center gap-2 px-1">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-900 text-white font-bold text-lg">
          V
        </div>
        <span className="text-lg font-bold text-neutral-900">VedaAI</span>
      </div>

      <button className="mt-6 flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-neutral-900 to-neutral-800 px-4 py-3 text-sm font-medium text-white shadow-sm border border-orange-400/40">
        <Sparkles className="h-4 w-4 text-orange-400" />
        AI Teacher&apos;s Toolkit
      </button>

      <nav className="mt-8 flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map(({ icon: Icon, label, active }) => (
          <a
            key={label}
            href="#"
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "bg-neutral-100 text-neutral-900"
                : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800"
            }`}
          >
            <Icon className="h-[18px] w-[18px]" />
            {label}
          </a>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-3">
        <a
          href="#"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-neutral-500 hover:bg-neutral-50"
        >
          <Settings className="h-[18px] w-[18px]" />
          Settings
        </a>
        <div className="flex items-center gap-3 rounded-xl bg-neutral-50 px-3 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700">
            DPS
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-neutral-900">Delhi Public School</p>
            <p className="truncate text-xs text-neutral-500">Bokaro Steel City</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
