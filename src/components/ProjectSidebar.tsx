import { useState, useEffect } from "react";
import { useLocation } from "wouter";

interface SessionItem {
  id: string;
  prompt: string;
  status: string;
  createdAt: string;
  repoUrl?: string | null;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

const SIDEBAR_W = 220;

export default function ProjectSidebar({ activeSessionId }: { activeSessionId?: string }) {
  const [, navigate] = useLocation();
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/autogit/sessions", { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then((data: SessionItem[]) => { setSessions(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [activeSessionId]);

  const content = (
    <div className="flex flex-col h-full bg-sidebar border-r border-border" style={{ width: SIDEBAR_W }}>
      <div className="px-3 py-3 border-b border-border/60 flex items-center gap-2">
        <img src="/autogit/logo.png" alt="AutoGit" className="w-5 h-5 rounded object-contain shrink-0" />
        <span className="text-[13px] font-semibold text-foreground">AutoGit</span>
      </div>

      <div className="px-2 py-2 border-b border-border/60">
        <button
          onClick={() => { navigate("/"); setOpen(false); }}
          className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[12px] font-medium bg-primary/10 text-primary hover:bg-primary/15 transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5 shrink-0">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New project
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {loading && (
          <div className="px-3 py-4 text-[11px] text-muted-foreground text-center">Loading...</div>
        )}
        {!loading && sessions.length === 0 && (
          <div className="px-3 py-4 text-[11px] text-muted-foreground text-center">No projects yet</div>
        )}
        {!loading && sessions.map(s => {
          const isActive = s.id === activeSessionId;
          const isDeployed = s.status === "deployed";
          return (
            <button
              key={s.id}
              onClick={() => { navigate(`/editor/${s.id}`); setOpen(false); }}
              className={`w-full text-left px-3 py-2.5 flex flex-col gap-0.5 transition-colors border-b border-border/30 last:border-0 ${
                isActive ? "bg-primary/8 border-l-2 border-l-primary" : "hover:bg-accent/50"
              }`}
            >
              <span className={`text-[12px] font-medium leading-snug line-clamp-2 ${isActive ? "text-primary" : "text-foreground"}`}>
                {s.prompt.slice(0, 80)}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                {isDeployed ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                )}
                <span className="text-[10px] text-muted-foreground">{isDeployed ? "deployed" : "ready"}</span>
                <span className="text-[10px] text-muted-foreground/50 ml-auto">{relativeTime(s.createdAt)}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden md:flex flex-col shrink-0 h-screen sticky top-0" style={{ width: SIDEBAR_W }}>
        {content}
      </aside>

      {/* Mobile toggle button */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden fixed top-3 left-3 z-50 p-2 rounded-lg bg-sidebar border border-border shadow-sm"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-foreground">
          <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative z-10 h-full" style={{ width: SIDEBAR_W }}>
            <button
              onClick={() => setOpen(false)}
              className="absolute top-2 right-2 z-10 p-1.5 rounded-md hover:bg-accent/50"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-muted-foreground">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            {content}
          </div>
        </div>
      )}
    </>
  );
}
