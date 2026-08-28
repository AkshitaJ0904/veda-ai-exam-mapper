"use client";

import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { SidebarNavContent } from "@/components/Sidebar";
import { useState } from "react";

export function MobileSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open navigation menu"
        className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>
      <SheetContent side="left" className="flex flex-col gap-0 px-5 py-6">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <SheetDescription className="sr-only">VedaAI navigation menu</SheetDescription>
        <div className="flex items-center gap-2 px-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-900 text-white font-bold text-lg">
            V
          </div>
          <span className="text-lg font-bold text-neutral-900">VedaAI</span>
        </div>
        <div className="mt-6 flex flex-1 flex-col">
          <SidebarNavContent />
        </div>
      </SheetContent>
    </Sheet>
  );
}
