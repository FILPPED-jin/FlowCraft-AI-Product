import { useEffect, useId, useState } from "react";

export default function AppleLogo({ onClick }: { onClick: () => void }) {
  const [phase, setPhase] = useState<"apple" | "eating" | "seed" | "growing">("apple");
  const [bites, setBites] = useState(0);
  const maskId = useId().replace(/:/g, "");

  useEffect(() => {
    if (phase !== "eating" && phase !== "growing") return;
    const timer = window.setTimeout(() => {
      if (phase === "growing") {
        setPhase("apple");
      } else if (bites < 5) {
        setBites(current => current + 1);
      } else {
        setPhase("seed");
      }
    }, phase === "growing" ? 450 : 240);
    return () => window.clearTimeout(timer);
  }, [phase, bites]);

  function activate() {
    if (phase === "eating" || phase === "growing") return;
    onClick();
    setBites(0);
    setPhase(phase === "seed" ? "growing" : "eating");
  }

  const seedVisible = phase === "seed";
  return <button type="button" onClick={activate}
    aria-label={seedVisible ? "Grow apple" : "Logo"}
    title={seedVisible ? "Grow an apple" : "Take a bite"}
    className="rounded-lg p-2 transition-colors hover:bg-gray-200/70 dark:hover:bg-zinc-800 lg:mb-2 lg:p-1">
    <span className="relative inline-flex h-8 w-8 shrink-0 items-center justify-center" aria-hidden="true">
      <svg viewBox="0 0 100 100" className={`absolute inset-0 h-full w-full ${phase === "growing" ? "apple-logo-grow" : ""}`}
        style={{ opacity: seedVisible ? 0 : 1, transition: "opacity 160ms" }}>
        <defs><mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
          <rect width="100" height="100" fill="white" />
          {[[85, 34, 24], [82, 68, 29], [18, 70, 30], [21, 35, 28], [50, 56, 44]].map(([cx, cy, radius], index) =>
            <circle key={index} cx={cx} cy={cy} r={bites > index ? radius : 0} fill="black" style={{ transition: "r 180ms ease-out" }} />
          )}
        </mask></defs>
        <image href="/favicon/flowcraft-apple.png" width="100" height="100" mask={`url(#${maskId})`} />
      </svg>
      <span className={`apple-logo-seed ${seedVisible ? "apple-logo-seed-visible" : ""}`} />
    </span>
    <span className="flowcraft-wordmark">FlowCraft</span>
  </button>;
}
