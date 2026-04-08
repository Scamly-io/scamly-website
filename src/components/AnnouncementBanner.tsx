"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Info, OctagonAlert, X } from "lucide-react";
import { supabase } from "../integrations/supabase/client";
import { cn } from "../lib/utils";

export type AnnouncementBannerData = {
  style: "info" | "warning" | "error";
  content: string;
};

const styleConfig = {
  info: {
    wrap: "border-sky-500/25 bg-sky-500/[0.08] text-sky-950 shadow-sm dark:text-sky-100",
    iconWrap: "text-sky-600 dark:text-sky-400",
    Icon: Info,
  },
  warning: {
    wrap: "border-amber-500/30 bg-amber-500/[0.1] text-amber-950 shadow-sm dark:text-amber-100",
    iconWrap: "text-amber-600 dark:text-amber-400",
    Icon: AlertTriangle,
  },
  error: {
    wrap: "border-red-500/25 bg-red-500/[0.1] text-red-950 shadow-sm dark:text-red-100",
    iconWrap: "text-red-600 dark:text-red-400",
    Icon: OctagonAlert,
  },
} as const;

/** Fixed slot height avoids layout shift when the message is dismissed (matches up to 2 lines of text). */
const SLOT_MIN_HEIGHT = "min-h-[4rem]";

function normalizeRow(row: {
  style: string | null;
  content: string | null;
  is_active: boolean | null;
}): AnnouncementBannerData | null {
  if (!row.is_active) return null;
  const content = row.content?.trim();
  if (!content) return null;
  const raw = row.style?.toLowerCase().trim();
  const style: AnnouncementBannerData["style"] =
    raw === "warning" || raw === "error" || raw === "info" ? raw : "info";
  return { style, content };
}

type Props = {
  /** Fired after each fetch completes: true if an active banner is shown (including after dismiss, while the slot remains). */
  onFetchResolved?: (hasActiveBanner: boolean) => void;
};

export function AnnouncementBanner({ onFetchResolved }: Props) {
  const [data, setData] = useState<AnnouncementBannerData | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const onResolvedRef = useRef(onFetchResolved);
  onResolvedRef.current = onFetchResolved;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data: rows, error } = await supabase
        .from("announcement_banner")
        .select("style, content, is_active")
        .eq("is_active", true)
        .limit(1);

      if (cancelled) return;

      if (error || !rows?.[0]) {
        setData(null);
        onResolvedRef.current?.(false);
        return;
      }

      const next = normalizeRow(rows[0]);
      setData(next);
      onResolvedRef.current?.(next != null);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!data) return null;

  const cfg = styleConfig[data.style];
  const { Icon } = cfg;

  return (
    <div
      className={cn(
        "flex items-center rounded-2xl border backdrop-blur-md px-3 py-2 sm:px-4 sm:py-2.5 box-border transition-[background-color,border-color,box-shadow]",
        SLOT_MIN_HEIGHT,
        dismissed
          ? "border-transparent bg-transparent shadow-none pointer-events-none"
          : cfg.wrap,
      )}
    >
      {!dismissed ? (
        <div className="flex w-full items-center justify-center gap-2 sm:gap-3 text-sm">
          <Icon className={cn("h-4 w-4 shrink-0 self-start mt-0.5", cfg.iconWrap)} aria-hidden />
          <p className="min-w-0 flex-1 text-center text-pretty font-medium leading-snug line-clamp-2 [text-wrap:balance]">
            {data.content}
          </p>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className={cn(
              "shrink-0 self-start rounded-full p-1 transition-colors -mr-0.5 mt-0.5",
              "text-current/60 hover:text-current hover:bg-black/5",
            )}
            aria-label="Dismiss announcement"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
