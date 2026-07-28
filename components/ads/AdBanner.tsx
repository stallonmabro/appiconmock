"use client";

import { useEffect, useState } from "react";

interface AdBannerProps {
  placement: "editor_top" | "export_modal" | "landing";
  className?: string;
}

export function AdBanner({ placement, className = "" }: AdBannerProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    fetch("/api/ads/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ placement }),
    }).catch(() => {});
    setShow(true);
  }, [placement]);

  if (!show) return null;

  return (
    <div className={`rounded-lg border border-neutral-200 bg-neutral-50 text-center overflow-hidden ${className}`}>
      <ins className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID}
        data-ad-slot="auto"
        data-ad-format="auto"
        data-full-width-responsive="true" />
    </div>
  );
}
