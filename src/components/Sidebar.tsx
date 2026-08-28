"use client";

import Image from "next/image";
import {
  ChevronsRight,
  ClipboardList,
  FileText,
  LayoutGrid,
  PanelLeft,
  PieChart,
  Presentation,
  Settings,
  Sparkles,
} from "lucide-react";

const NAV_ITEMS = [
  { icon: LayoutGrid, label: "Home" },
  { icon: Presentation, label: "My Classroom" },
  { icon: FileText, label: "Assignments" },
  { icon: ClipboardList, label: "Exams", active: true },
  { icon: PieChart, label: "My Library" },
];

export function SidebarNavContent() {
  return (
    <>
      <button className="flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-neutral-900 to-neutral-800 px-4 py-3 text-sm font-medium text-white shadow-sm border-2 border-orange-400">
        <Sparkles className="h-4 w-4 text-white" />
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
          <div className="relative h-9 w-9 shrink-0 rounded-full bg-emerald-50">
            <Image src="/dps-logo.png" alt="Delhi Public School" fill sizes="36px" className="object-contain p-1" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-neutral-900">Delhi Public School</p>
            <p className="truncate text-xs text-neutral-500">Bokaro Steel City</p>
          </div>
        </div>
      </div>
    </>
  );
}

export function Sidebar({
  className = "",
  collapsed = false,
  onExpand,
  onCollapse,
}: {
  className?: string;
  collapsed?: boolean;
  onExpand?: () => void;
  onCollapse?: () => void;
}) {
  if (collapsed) {
    return (
      <aside
        className={`hidden lg:flex w-[76px] shrink-0 flex-col items-center gap-2 bg-white border-r border-neutral-200 py-6 ${className}`}
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-900 text-white font-bold text-lg">
          V
        </div>

        <div className="mt-4 flex h-10 w-10 items-center justify-center rounded-full border-2 border-orange-400 bg-neutral-900">
          <Sparkles className="h-[18px] w-[18px] text-white" />
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

        <div
          className="relative flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50"
          title="Delhi Public School"
        >
          <Image src="/dps-logo.png" alt="Delhi Public School" fill sizes="36px" className="object-contain p-1" />
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
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-900 text-white font-bold text-lg">
            V
          </div>
          <span className="text-lg font-bold text-neutral-900">VedaAI</span>
        </div>
        <button
          onClick={onCollapse}
          aria-label="Collapse sidebar"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-50 hover:text-neutral-700"
        >
          <PanelLeft className="h-[18px] w-[18px]" />
        </button>
      </div>

      <div className="mt-6 flex flex-1 flex-col">
        <SidebarNavContent />
      </div>
    </aside>
  );
}
