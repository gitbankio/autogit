import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { PROVIDERS, type ProviderId } from "@/components/ProviderLogos";
import ProjectSidebar from "@/components/ProjectSidebar";

const TEMPLATES = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 21V9" />
      </svg>
    ),
    label: "Vault Dashboard",
    prompt: "Build a Web3 vault dashboard that shows token balances (ETH, USDC, WETH), recent transactions with status badges, and a deposit/withdraw form. Dark theme with blue accents.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    label: "Token Analytics",
    prompt: "Build a token analytics dashboard with price charts (line chart), volume bars, market cap stats, and top holders table. Include a search bar to filter by token symbol.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4l3 3" />
      </svg>
    ),
    label: "Bounty Board",
    prompt: "Build a GitHub bounty board app showing open issues with USDC reward amounts, difficulty tags, and claimant count. Include filters by label and min reward. Cards show repo, issue title, and a Claim button.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
        <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </svg>
    ),
    label: "Agent Wallet",
    prompt: "Build an AI agent wallet UI where you can see the agent's on-chain address, balance, recent signed transactions, and approved spending limits per dApp. Include a revoke button per approval.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
    label: "Project Tracker",
    prompt: "Build a project management status page showing sprint progress bars, task lists grouped by assignee, budget used vs total, and a timeline. Use a clean kanban-style layout with done/in-progress/todo columns.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
    label: "Surprise me",
    prompt: "Build something creative and impressive: a beautiful Web3 app with animations, a unique layout, and a wow factor. Surprise me with something I haven't seen before.",
  },
];

const LS_PROVIDER = "autogit_provider";
const LS_MODEL = "autogit_model";
const LS_KEY = "autogit_api_key";

export default function Landing() {
  const [, navigate] = useLocation();
  const [prompt, setPrompt] = useState("");
  const [provider, setProvider] = useState<ProviderId>(() => (localStorage.getItem(LS_PROVIDER) as ProviderId) || "openai");
  const [model, setModel] = useState<string>(() => localStorage.getItem(LS_MODEL) || "gpt-4o");
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem(LS_KEY) || "");
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const selectedProvider = PROVIDERS.find(p => p.id === provider)!;

  useEffect(() => {
    localStorage.setItem(LS_PROVIDER, provider);
    const firstModel = PROVIDERS.find(p => p.id === provider)?.models[0]?.id ?? "";
    const saved = localStorage.getItem(LS_MODEL);
    const modelBelongs = PROVIDERS.find(p => p.id === provider)?.models.some(m => m.id === saved);
    if (!modelBelongs) {
      setModel(firstModel);
      localStorage.setItem(LS_MODEL, firstModel);
    }
  }, [provider]);

  useEffect(() => { localStorage.setItem(LS_MODEL, model); }, [model]);
  useEffect(() => { localStorage.setItem(LS_KEY, apiKey); }, [apiKey]);

  async function generate() {
    if (!prompt.trim()) { setError("Describe what you want to build."); return; }
    if (!apiKey.trim()) { setError("Enter your API key first."); return; }
    setError("");
    setLoading(true);
    setStatus("Connecting...");

    try {
      const resp = await fetch("/api/autogit/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ prompt: prompt.trim(), apiKey, provider, model }),
      });

      if (resp.status === 401) {
        setError("You need to be signed in. Please sign in via Gitbank first.");
        setLoading(false);
        return;
      }

      if (!resp.ok) {
        const e = await resp.json().catch(() => ({ error: "Unknown error" }));
        setError((e as { error: string }).error || "Request failed");
        setLoading(false);
        return;
      }

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let sessionId = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop()!;
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6)) as { type: string; sessionId?: string; message?: string; files?: unknown[] };
            if (data.type === "session" && data.sessionId) {
              sessionId = data.sessionId;
            } else if (data.type === "status" && data.message) {
              setStatus(data.message);
            } else if (data.type === "done") {
              navigate(`/editor/${sessionId}`);
            } else if (data.type === "error" && data.message) {
              setError(data.message);
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  function selectTemplate(tmplPrompt: string) {
    setPrompt(tmplPrompt);
    textareaRef.current?.focus();
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-row">
      <ProjectSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">

      <main className="flex-1 flex flex-col items-center px-4 py-12 max-w-2xl mx-auto w-full">

        {/* Install banner */}
        <div className="w-full mb-8 rounded-xl border border-border bg-muted/40 px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-primary">
              <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-foreground">Install Gitbank on your repo to deploy</p>
            <p className="text-[12px] text-muted-foreground">The bot creates the repo and pushes to GitHub Pages on your behalf. Free to install now.</p>
          </div>
          <a
            href="https://github.com/apps/gitbankbot/installations/new"
            target="_blank"
            rel="noreferrer"
            className="shrink-0 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-[12px] font-semibold hover:opacity-90 transition-opacity"
          >
            Install
          </a>
        </div>

        {/* Hero */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-3">
            Describe an app, get working code
          </h1>
          <p className="text-[15px] text-muted-foreground leading-relaxed mb-4">
            Pick an AI provider (OpenAI, Anthropic, Gemini, DeepSeek, or Groq), describe what you want to build, iterate via chat, then gitbankbot automatically creates the repo and pushes it to GitHub Pages for you.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {[
              { icon: "🔑", text: "Your API key, stored locally" },
              { icon: "🤖", text: "5 AI providers supported" },
              { icon: "🚀", text: "gitbankbot auto-pushes to GitHub Pages" },
            ].map(f => (
              <span key={f.text} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-border bg-muted/50 text-[12px] text-muted-foreground">
                <span>{f.icon}</span>{f.text}
              </span>
            ))}
          </div>
        </div>

        <div className="w-full space-y-3">
          {/* Prompt box */}
          <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-all">
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) generate(); }}
              placeholder="A vault dashboard showing USDC and WETH balances with a transaction history table..."
              rows={4}
              className="w-full bg-transparent px-4 pt-4 pb-3 text-[14px] resize-none outline-none placeholder:text-muted-foreground leading-relaxed text-foreground"
            />
            <div className="px-4 pb-3 flex items-center justify-between gap-3 border-t border-border/50">
              <span className="text-[12px] text-muted-foreground">Cmd+Enter to generate</span>
              <button
                onClick={generate}
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold hover:opacity-90 active:opacity-80 transition-opacity disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    {status || "Generating..."}
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                    </svg>
                    Generate
                  </>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 text-destructive px-4 py-3 text-[13px] flex items-start gap-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 mt-0.5 shrink-0">
                <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
              </svg>
              {error}
            </div>
          )}

          {/* AI Provider config */}
          <div className="rounded-xl border border-border bg-white shadow-sm p-4 space-y-4">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">AI Provider</p>

            <div className="flex flex-wrap gap-2">
              {PROVIDERS.map(p => {
                const isSelected = p.id === provider;
                return (
                  <button
                    key={p.id}
                    onClick={() => setProvider(p.id as ProviderId)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[13px] font-medium transition-all ${
                      isSelected
                        ? "border-primary bg-accent text-primary"
                        : "border-border bg-muted/40 text-muted-foreground hover:border-border hover:text-foreground"
                    }`}
                  >
                    <p.Logo className="w-3.5 h-3.5" />
                    {p.name}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[12px] text-muted-foreground font-medium">Model</label>
                <select
                  value={model}
                  onChange={e => setModel(e.target.value)}
                  className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-[13px] outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors text-foreground"
                >
                  {selectedProvider.models.map(m => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[12px] text-muted-foreground font-medium">API Key</label>
                  <a
                    href={selectedProvider.keyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[12px] text-primary hover:underline font-medium"
                  >
                    Get key
                  </a>
                </div>
                <div className="relative">
                  <input
                    type={showKey ? "text" : "password"}
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder={selectedProvider.placeholder}
                    className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 pr-9 text-[13px] outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors font-mono text-foreground"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(v => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showKey ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">Stored locally, never sent to our servers</p>
              </div>
            </div>
          </div>
        </div>

        {/* Templates */}
        <div className="w-full mt-10">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Start from a template</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {TEMPLATES.map(t => (
              <button
                key={t.label}
                onClick={() => selectTemplate(t.prompt)}
                className="flex flex-col items-start gap-2.5 p-3.5 rounded-xl border border-border bg-white hover:border-primary/40 hover:bg-accent/30 transition-all text-left group shadow-sm"
              >
                <span className="text-muted-foreground group-hover:text-primary transition-colors">{t.icon}</span>
                <span className="text-[13px] font-medium text-foreground">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* About section - REMOVED */}
        <div className="hidden">

          {/* Work in progress banner */}
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-amber-600 mt-0.5 shrink-0">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <div>
              <p className="text-[13px] font-semibold text-amber-800">AutoGit is under active development</p>
              <p className="text-[12px] text-amber-700 mt-0.5 leading-relaxed">
                Core generation and deploy pipeline is functional. Some features listed below are being built out incrementally. Expect rough edges and breaking changes during this phase.
              </p>
            </div>
          </div>

          {/* What is AutoGit */}
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-4">What is AutoGit</p>
            <p className="text-[14px] text-foreground leading-relaxed mb-3">
              AutoGit is a browser-based AI code studio built on top of the Gitbank infrastructure. You describe an application in plain English, an AI model of your choice generates a complete, working React component, and you can iterate on it through a chat interface until it is exactly what you want.
            </p>
            <p className="text-[14px] text-muted-foreground leading-relaxed mb-3">
              When you are happy with the result, the Gitbank bot handles the entire deployment for you: it creates the GitHub repository, builds the project, and publishes it to GitHub Pages under your account. No CLI, no CI/CD setup, no manual git push. The only prerequisite is having the Gitbank GitHub App installed on your account.
            </p>
            <p className="text-[14px] text-muted-foreground leading-relaxed">
              Your API key is stored locally in your browser and is never sent to our servers. All AI generation calls go directly from your browser to the AI provider you choose. We never see your key, your prompts, or the generated code.
            </p>
          </div>

          {/* Use cases */}
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-4">What you can build with it</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  title: "Web3 dashboards",
                  desc: "Vault balance monitors, token portfolio trackers, on-chain transaction explorers, and DAO voting interfaces that read from public RPC endpoints.",
                },
                {
                  title: "Internal team tools",
                  desc: "Sprint trackers, bounty boards, budget dashboards, and project status pages for teams that run their workflow on GitHub Issues and PRs.",
                },
                {
                  title: "Data visualization apps",
                  desc: "Charts, tables, and live feeds built from any JSON API or on-chain data. Great for displaying analytics, leaderboards, and protocol metrics.",
                },
                {
                  title: "Prototypes and MVPs",
                  desc: "Quickly validate a product idea with a fully rendered React UI hosted on GitHub Pages before committing to a full build.",
                },
                {
                  title: "Landing pages",
                  desc: "Single-page marketing sites, project announcements, or token launch pages. Generated in seconds, deployed in one click.",
                },
                {
                  title: "Agent-facing interfaces",
                  desc: "UI shells that expose structured controls and status feeds for AI agents running on-chain operations through Gitbank vaults.",
                },
              ].map(item => (
                <div key={item.title} className="rounded-xl border border-border bg-muted/30 p-4">
                  <p className="text-[13px] font-semibold text-foreground mb-1">{item.title}</p>
                  <p className="text-[12px] text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* How it works */}
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-4">How it works</p>
            <ol className="space-y-4">
              {[
                { step: "1", title: "Describe", desc: "Type what you want to build in the prompt box above. Be as specific or as vague as you like. The more detail you give, the closer the first result will be to what you have in mind." },
                { step: "2", title: "Generate", desc: "Your chosen AI model (GPT-4o, Claude, Gemini, DeepSeek, or Groq) generates a complete self-contained React component. No external dependencies. Everything renders in a sandboxed iframe instantly." },
                { step: "3", title: "Iterate", desc: "Use the chat panel in the editor to request changes. The AI keeps your previous code as context and applies only the diff you describe. You can iterate as many times as you want before deploying." },
                { step: "4", title: "Deploy", desc: "Click Deploy. The Gitbank bot creates a GitHub repo under your account (or an org you choose), commits the built output, and enables GitHub Pages. Your app is live at a public URL within seconds." },
              ].map(item => (
                <li key={item.step} className="flex gap-4">
                  <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[12px] font-bold text-primary">{item.step}</span>
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-foreground mb-0.5">{item.title}</p>
                    <p className="text-[13px] text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* What's being built */}
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-4">Currently in progress</p>
            <div className="space-y-2.5">
              {[
                { label: "Multi-file project support", status: "planned", desc: "Right now AutoGit generates a single self-contained component. Multi-file React projects with routing, context, and separate component files are coming next." },
                { label: "Private repo deploy", status: "planned", desc: "Choose between a public GitHub Pages deploy or a private repo deploy. Useful for internal tools and dashboards that should not be publicly accessible." },
                { label: "Custom domain support", status: "planned", desc: "Point your own domain to the deployed GitHub Pages site. AutoGit will guide you through the DNS configuration and handle the CNAME file automatically." },
                { label: "Persistent sessions", status: "in progress", desc: "Editor sessions are currently ephemeral. We are adding server-side session persistence so you can close the tab and return to your project later." },
                { label: "Version history", status: "planned", desc: "Every iteration you make in the editor will be saved as a named checkpoint. Roll back to any previous version at any time without losing forward history." },
                { label: "Team collaboration", status: "planned", desc: "Share a live editor session with your team. Multiple people can comment, suggest edits, and iterate on the same project simultaneously." },
              ].map(item => (
                <div key={item.label} className="flex items-start gap-3 rounded-lg border border-border bg-white p-3.5">
                  <span className={`mt-0.5 shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
                    item.status === "in progress"
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {item.status === "in progress" ? "Building" : "Planned"}
                  </span>
                  <div>
                    <p className="text-[13px] font-semibold text-foreground">{item.label}</p>
                    <p className="text-[12px] text-muted-foreground leading-relaxed mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer note */}
          <div className="pb-8 text-center">
            <p className="text-[12px] text-muted-foreground">
              AutoGit is part of the{" "}
              <a href="/" className="text-primary hover:underline font-medium">Gitbank</a>
              {" "}ecosystem, the on-chain bank inside your GitHub.
            </p>
          </div>

        </div>
      </main>
      </div>
    </div>
  );
}
