"use client";

import { ArrowLeft, Bell, ClipboardList, HelpCircle, Sparkles } from "lucide-react";
import { MobileSidebar } from "@/components/MobileSidebar";

export function TopBar({ onBack }: { onBack?: () => void }) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-neutral-200 bg-white/80 px-4 backdrop-blur sm:px-6">
      <div className="flex items-center gap-3 text-neutral-500">
        <button
          onClick={onBack}
          className="rounded-full p-1.5 hover:bg-neutral-100 disabled:opacity-40"
          disabled={!onBack}
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <ClipboardList className="h-4 w-4" />
        <span className="text-sm font-medium">Exams</span>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        <HelpCircle className="hidden h-5 w-5 text-neutral-400 sm:block" />
        <div className="relative">
          <Bell className="h-5 w-5 text-neutral-400" />
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-orange-500" />
        </div>
        <Sparkles className="hidden h-5 w-5 text-orange-500 sm:block" />
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-800 text-xs font-semibold text-white">
            MR
          </div>
          <span className="hidden text-sm font-medium text-neutral-800 md:inline">Madhur Rastogi</span>
        </div>
        <MobileSidebar />
      </div>
    </header>
  );
}
