import { useEffect, useState } from "react";
import { onKernelProgress, getOC, loadKernel } from "@/kernel/init";

export function KernelStatus() {
  const [progress, setProgress] = useState(getOC() ? 1 : 0);
  const [msg, setMsg] = useState(getOC() ? "Kernel ready" : "Loading kernel...");

  useEffect(() => {
    loadKernel().catch(() => { /* error surfaced via msg */ });
    const off = onKernelProgress((p, m) => {
      setProgress(p);
      setMsg(m);
    });
    return () => { off(); };
  }, []);

  if (progress >= 1) return null;

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#D4D4D4]/80 backdrop-blur-sm" data-testid="kernel-loading">
      <div className="w-80 rounded-lg border border-[#A8A8A8] bg-[#FFFFFF] p-5 text-center">
        <div className="mb-3 text-[10px] uppercase tracking-[0.2em] text-[#0066CC]">OpenCascade B-Rep Kernel</div>
        <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-[#D4D4D4]">
          <div
            className="h-full bg-gradient-to-r from-[#0066CC] to-[#E5C155] transition-all duration-300"
            style={{ width: `${Math.max(5, progress * 100)}%` }}
          />
        </div>
        <div className="text-xs text-zinc-400">{msg}</div>
        <div className="mt-2 text-[10px] text-zinc-400">First load may take 10-30s — kernel is cached after</div>
      </div>
    </div>
  );
}
