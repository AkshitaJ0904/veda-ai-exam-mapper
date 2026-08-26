"use client";

import { Sparkles } from "lucide-react";

export function LoadingScreen({ message }: { message: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-20">
      <Sparkles className="h-14 w-14 animate-pulse text-orange-500" />
      <p className="text-xl font-bold text-neutral-900">{message}</p>
      <p className="text-sm text-neutral-400">This may take a while</p>
    </div>
  );
}
