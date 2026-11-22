"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface MacLaptopScreenProps {
  width?: number | string;
  height?: number | string;
  rounded?: boolean;
  shadow?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export default function MacLaptopScreen({
  width = "700px",
  height = "450px",
  rounded = true,
  shadow = true,
  className,
  children,
}: MacLaptopScreenProps) {
  return (
    <div
      className={cn(
        "relative bg-[var(--bg-surface)]",
        rounded ? "rounded-[var(--radius-xl)]" : "rounded-none",
        shadow ? "shadow-2xl shadow-black/40" : "",
        "flex flex-col overflow-hidden border border-[var(--border-default)]",
        className
      )}
      style={{ width, height }}
    >
      {/* Top Bezel */}
      <div className="relative h-6 bg-[var(--bg-elevated)] border-b border-[var(--border-subtle)] flex items-center px-3 shrink-0">
        <div className="flex gap-1.5 items-center">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56] cursor-pointer hover:opacity-80 transition-opacity" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e] cursor-pointer hover:opacity-80 transition-opacity" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f] cursor-pointer hover:opacity-80 transition-opacity" />
        </div>
        {/* Camera dot */}
        <div className="absolute left-1/2 transform -translate-x-1/2 w-2 h-2 rounded-full bg-[var(--text-muted)] opacity-60" />
      </div>

      {/* Screen Content */}
      <div className="flex-1 bg-[var(--bg-deep)] relative overflow-hidden flex flex-col">{children}</div>

      {/* Bottom Bezel */}
      <div className="h-3.5 bg-[var(--bg-elevated)] border-t border-[var(--border-subtle)] rounded-b-[var(--radius-xl)] flex items-center justify-center shrink-0">
        <div className="w-12 h-1 rounded-full bg-[var(--text-muted)] opacity-20" />
      </div>
    </div>
  );
}
