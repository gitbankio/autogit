import { useState, useEffect, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { PROVIDERS } from "@/components/ProviderLogos";
import ProjectSidebar from "@/components/ProjectSidebar";

const LS_PROVIDER = "autogit_provider";
const LS_MODEL = "autogit_model";
const LS_KEY = "autogit_api_key";

interface ScaffoldFile { path: string; content: string; }
interface Session { id: string; prompt: string; status: string; files: ScaffoldFile[]; repoUrl: string | null; pagesUrl: string | null; }
interface ChatMessage { role: "user" | "assistant"; content: string; }

function FileTree({ files, selected, onSelect }: { files: ScaffoldFile[]; selected: string; onSelect: (p: string) => void }) {
  const dirs = new Map<string, ScaffoldFile[]>();
  for (const f of files) {
    const parts = f.path.split("/");
    const dir = parts.length > 1 ? parts.slice(0, -1).join("/") : "";
    if (!dirs.has(dir)) dirs.set(dir, []);
    dirs.get(dir)!.push(f);
  }
  const sorted = Array.from(dirs.entries()).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="py-2">
      {sorted.map(([dir, dirFiles]) => (
        <div key={dir}>
          {dir && (
            <div className="px-3 py-1 text-xs text-muted-foreground font-medium flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              {dir}
            </div>
          )}
          {dirFiles.map(f => {
            const name = f.path.split("/").pop()!;
            const isSelected = selected === f.path;
            return (
              <button
                key={f.path}
                onClick={() => onSelect(f.path)}
                className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition-colors ${
                  isSelected ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                } ${dir ? "pl-6" : ""}`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5 shrink-0">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <span className="truncate">{name}</span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

type GHRepo = { name: string; url: string; private: boolean };

function DeployModal({ onDeploy, onClose }: { onDeploy: (name: string) => void; onClose: () => void }) {
  const [repos, setRepos] = useState<GHRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string>("");

  useEffect(() => {
    fetch("/api/autogit/repos", { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then((data: GHRepo[]) => { setRepos(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = repos.filter(r => r.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md space-y-4">
        <div>
          <h2 className="text-base font-semibold">Deploy to GitHub</h2>
          <p className="text-sm text-muted-foreground mt-1">Pick a repo. Gitbank pushes all generated files and enables GitHub Pages.</p>
        </div>

        <div className="space-y-2">
          <input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search repos..."
            className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary transition-colors"
          />
          <div className="border border-border rounded-lg overflow-hidden max-h-52 overflow-y-auto">
            {loading && (
              <div className="px-3 py-4 text-sm text-muted-foreground text-center">Loading repos...</div>
            )}
            {!loading && repos.length === 0 && (
              <div className="px-4 py-5 text-center space-y-2">
                <p className="text-sm text-foreground font-medium">No repos connected</p>
                <p className="text-xs text-muted-foreground">Install the gitbank bot on a repo first, then come back here.</p>
                <a
                  href="https://github.com/apps/gitbankbot/installations/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-1 text-xs text-primary underline underline-offset-2"
                >
                  Install gitbank bot on GitHub
                </a>
              </div>
            )}
            {!loading && repos.length > 0 && filtered.length === 0 && (
              <div className="px-3 py-4 text-sm text-muted-foreground text-center">No repos match</div>
            )}
            {!loading && filtered.map(r => (
              <button
                key={r.name}
                onClick={() => setSelected(r.name)}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-sm text-left border-b border-border last:border-0 transition-colors ${
                  selected === r.name ? "bg-primary/10 text-primary" : "hover:bg-muted/60"
                }`}
              >
                <span className="font-mono truncate">{r.name}</span>
                <span className={`text-xs shrink-0 ml-2 px-1.5 py-0.5 rounded ${r.private ? "bg-muted text-muted-foreground" : "bg-green-500/10 text-green-600"}`}>
                  {r.private ? "private" : "public"}
                </span>
              </button>
            ))}
          </div>
          {selected && (
            <p className="text-xs text-muted-foreground">Files will be pushed to <span className="font-mono text-foreground">{selected}</span>. Existing files will be overwritten.</p>
          )}
        </div>

        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-accent transition-colors">Cancel</button>
          <button
            onClick={() => selected && onDeploy(selected)}
            disabled={!selected}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            Deploy
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Editor() {
  const [, params] = useRoute("/editor/:sessionId");
  const [, navigate] = useLocation();
  const sessionId = params?.sessionId ?? "";

  const [session, setSession] = useState<Session | null>(null);
  const [files, setFiles] = useState<ScaffoldFile[]>([]);
  const [selectedFile, setSelectedFile] = useState("");
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genStatus, setGenStatus] = useState("");
  const [loadingSession, setLoadingSession] = useState(true);
  const [showDeploy, setShowDeploy] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState<{ repoUrl: string; pagesUrl: string | null } | null>(null);
  const [pushing, setPushing] = useState(false);
  const [pushDone, setPushDone] = useState(false);
  const [filesDirty, setFilesDirty] = useState(false);
  const [error, setError] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const provider = (localStorage.getItem(LS_PROVIDER) || "openai") as string;
  const model = localStorage.getItem(LS_MODEL) || "gpt-4o";
  const apiKey = localStorage.getItem(LS_KEY) || "";

  useEffect(() => {
    if (!sessionId) return;
    fetch(`/api/autogit/sessions/${sessionId}`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then((data: Session | null) => {
        if (data) {
          setSession(data);
          setFiles(data.files || []);
          if (data.files?.length) setSelectedFile(data.files[0].path);
          setChat([{ role: "assistant", content: `Generated ${data.files?.length ?? 0} files for: "${data.prompt}"` }]);
          if (data.repoUrl) setDeployResult({ repoUrl: data.repoUrl, pagesUrl: data.pagesUrl });
        }
        setLoadingSession(false);
      })
      .catch(() => setLoadingSession(false));
  }, [sessionId]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chat]);

  async function improve() {
    if (!input.trim() || generating) return;
    const instruction = input.trim();
    setInput("");
    setChat(c => [...c, { role: "user", content: instruction }]);
    setGenerating(true);
    setGenStatus("Sending to AI...");

    try {
      const resp = await fetch("/api/autogit/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sessionId, instruction, apiKey, provider, model }),
      });

      if (!resp.ok) {
        const e = await resp.json().catch(() => ({ error: "Unknown error" }));
        setChat(c => [...c, { role: "assistant", content: `Error: ${(e as { error: string }).error}` }]);
        setGenerating(false);
        return;
      }

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let newFiles: ScaffoldFile[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop()!;
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6)) as { type: string; message?: string; files?: ScaffoldFile[]; path?: string };
            if (data.type === "status" && data.message) setGenStatus(data.message);
            else if (data.type === "done" && data.files) newFiles = data.files;
            else if (data.type === "error" && data.message) {
              setChat(c => [...c, { role: "assistant", content: `Error: ${data.message}` }]);
            }
          } catch { /* skip */ }
        }
      }

      if (newFiles.length) {
        setFiles(newFiles);
        setSelectedFile(prev => newFiles.find(f => f.path === prev) ? prev : newFiles[0].path);
        setChat(c => [...c, { role: "assistant", content: `Updated ${newFiles.length} files.` }]);
        if (deployResult) { setFilesDirty(true); setPushDone(false); }
      }
    } catch (e) {
      setChat(c => [...c, { role: "assistant", content: `Network error: ${e instanceof Error ? e.message : "Unknown"}` }]);
    } finally {
      setGenerating(false);
      setGenStatus("");
    }
  }

  async function pushUpdate() {
    setPushing(true);
    setError("");
    try {
      const resp = await fetch("/api/autogit/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sessionId }),
      });
      const data = await resp.json() as { pushed?: number; total?: number; error?: string };
      if (!resp.ok) { setError(data.error || "Push failed"); }
      else {
        setFilesDirty(false);
        setPushDone(true);
        setChat(c => [...c, { role: "assistant", content: `Pushed ${data.pushed}/${data.total} files to GitHub. GitHub Actions will rebuild and redeploy automatically.` }]);
        setTimeout(() => setPushDone(false), 4000);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setPushing(false);
    }
  }

  async function deploy(repoName: string) {
    setShowDeploy(false);
    setDeploying(true);
    setError("");
    try {
      const resp = await fetch("/api/autogit/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sessionId, repoName, enablePages: true }),
      });
      const data = await resp.json() as { repoUrl?: string; pagesUrl?: string | null; error?: string };
      if (!resp.ok) { setError(data.error || "Deploy failed"); }
      else { setDeployResult({ repoUrl: data.repoUrl!, pagesUrl: data.pagesUrl ?? null }); }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setDeploying(false);
    }
  }

  const selectedContent = files.find(f => f.path === selectedFile)?.content ?? "";
  const providerInfo = PROVIDERS.find(p => p.id === provider);

  if (loadingSession) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          Loading session...
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background text-foreground flex flex-row overflow-hidden">
      <ProjectSidebar activeSessionId={sessionId} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
      <header className="h-12 border-b border-border flex items-center px-4 gap-3 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <img src="/autogit/logo.png" alt="Gitbank" className="w-5 h-5 rounded object-contain shrink-0 md:hidden" />
          <span className="text-sm font-medium truncate">{session?.prompt?.slice(0, 60) ?? "Generating..."}</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {providerInfo && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-2 py-1 rounded border border-border">
              <providerInfo.Logo className="w-3.5 h-3.5" />
              {providerInfo.name}
            </div>
          )}
          {deployResult ? (
            <div className="flex items-center gap-2">
              {filesDirty && (
                <button
                  onClick={pushUpdate}
                  disabled={pushing}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {pushing ? (
                    <>
                      <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                      Pushing...
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5"><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /><path d="M20 21H4" /></svg>
                      Push update
                    </>
                  )}
                </button>
              )}
              {pushDone && !filesDirty && (
                <span className="flex items-center gap-1.5 text-xs text-green-700 px-2 py-1.5">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5"><polyline points="20 6 9 17 4 12" /></svg>
                  Pushed
                </span>
              )}
              <a href={deployResult.repoUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-accent transition-colors text-muted-foreground">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                  <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                </svg>
                Repo
              </a>
              <a href={deployResult.pagesUrl ?? deployResult.repoUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                Live
              </a>
            </div>
          ) : (
            <button
              onClick={() => setShowDeploy(true)}
              disabled={deploying || !files.length}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {deploying ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Deploying...
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                    <polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" />
                  </svg>
                  Deploy to GitHub
                </>
              )}
            </button>
          )}
        </div>
      </header>

      {error && (
        <div className="border-b border-destructive/30 bg-destructive/10 text-destructive px-4 py-2 text-xs flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 shrink-0">
            <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
          </svg>
          {error}
          <button onClick={() => setError("")} className="ml-auto hover:opacity-70">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <div className="w-72 border-r border-border flex flex-col shrink-0">
          <div className="h-10 border-b border-border flex items-center px-3 gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-muted-foreground">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span className="text-xs font-medium text-muted-foreground">Chat</span>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-3">
            {chat.map((msg, i) => (
              <div key={i} className={`text-xs leading-relaxed ${msg.role === "user" ? "text-foreground" : "text-muted-foreground"}`}>
                <span className={`font-medium ${msg.role === "user" ? "text-primary" : "text-muted-foreground"}`}>
                  {msg.role === "user" ? "You" : "AI"}
                </span>
                <p className="mt-0.5 whitespace-pre-wrap">{msg.content}</p>
              </div>
            ))}
            {generating && (
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <svg className="w-3.5 h-3.5 animate-spin shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                {genStatus || "Thinking..."}
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <div className="border-t border-border p-3">
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); improve(); } }}
                placeholder="Ask for changes..."
                rows={2}
                className="flex-1 bg-muted/40 border border-border rounded-lg px-3 py-2 text-xs resize-none outline-none focus:border-primary transition-colors placeholder:text-muted-foreground leading-relaxed"
              />
              <button
                onClick={improve}
                disabled={generating || !input.trim()}
                className="px-2.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity self-end pb-2"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                  <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">Enter to send, Shift+Enter for newline</p>
          </div>
        </div>

        <div className="w-44 border-r border-border flex flex-col shrink-0">
          <div className="h-10 border-b border-border flex items-center px-3 gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-muted-foreground">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            <span className="text-xs font-medium text-muted-foreground">Files</span>
            <span className="ml-auto text-xs text-muted-foreground">{files.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {files.length === 0 ? (
              <div className="p-3 text-xs text-muted-foreground">No files yet</div>
            ) : (
              <FileTree files={files} selected={selectedFile} onSelect={setSelectedFile} />
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedFile ? (
            <>
              <div className="h-10 border-b border-border flex items-center px-4 gap-2 shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4 text-muted-foreground shrink-0">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <span className="text-xs text-muted-foreground font-mono">{selectedFile}</span>
                <button
                  onClick={() => navigator.clipboard.writeText(selectedContent)}
                  className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-accent"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  Copy
                </button>
              </div>
              <div className="flex-1 overflow-auto scrollbar-thin">
                <pre className="p-4 text-xs font-mono leading-relaxed text-foreground whitespace-pre">{selectedContent}</pre>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center space-y-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-10 h-10 mx-auto opacity-30">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <p className="text-sm">Select a file to view</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {showDeploy && <DeployModal onDeploy={deploy} onClose={() => setShowDeploy(false)} />}
      </div>
    </div>
  );
}
