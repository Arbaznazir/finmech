"use client";

import { Suspense } from "react";
import { FaqChatWidget } from "@/components/FaqChatWidget";

function FaqChatWidgetFallback() {
  return (
    <div className="fixed bottom-6 right-6 z-[90]">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/80 shadow-lg">
        <span className="sr-only">Loading FAQ</span>
      </div>
    </div>
  );
}

export function FaqChatWidgetLoader() {
  return (
    <Suspense fallback={<FaqChatWidgetFallback />}>
      <FaqChatWidget />
    </Suspense>
  );
}
