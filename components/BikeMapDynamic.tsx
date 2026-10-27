"use client";

import dynamic from "next/dynamic";
import type { BikeMapProps } from "./BikeMap";

const Inner = dynamic(() => import("./BikeMap").then((m) => m.BikeMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center rounded-2xl bg-mist text-sm text-ink/60">
      Loading map…
    </div>
  ),
});

export function BikeMapDynamic(props: BikeMapProps) {
  return <Inner {...props} />;
}
