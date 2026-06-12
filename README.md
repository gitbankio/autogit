# AutoGit

AI app scaffolding framework. Connect your own API key (OpenAI, Anthropic, Gemini, Groq), generate a full React codebase, and deploy to GitHub Pages automatically.

## How it works

1. Describe the app you want to build in plain language
2. AutoGit generates a complete React + Vite + TypeScript + Tailwind codebase using your AI provider
3. Connect your GitHub repo (gitbankbot must be installed)
4. Click Deploy — gitbankbot commits every file and triggers GitHub Pages automatically

No terminal required. No git commands. No deployment config.

## Supported AI providers

- OpenAI (GPT-4o, GPT-4o-mini)
- Anthropic (Claude 3.5 Haiku, Claude 3.5 Sonnet)
- Gemini (Gemini 2.0 Flash, Gemini 1.5 Flash)
- Groq (Llama 3.3 70B, Llama 3.1 8B)
- DeepSeek (DeepSeek Chat)

You bring your own API key. AutoGit does not store or proxy your key beyond the current session.

## Prerequisites

- Node.js 20+
- pnpm 10+
- A GitHub repo with gitbankbot installed (free): https://github.com/apps/gitbankbot/installations/new

## Install

```bash
pnpm install
```

## Run (development)

```bash
pnpm dev
```

## Environment variables

AutoGit is a frontend-only app. No backend env vars required for the scaffolding UI.
The deploy pipeline runs through the Gitbank API server — see gitbank/server for backend setup.

## Generated app stack

Every generated project uses a fixed, known-good stack:

- React 18 + Vite 5 + TypeScript 5
- Tailwind CSS v3 with PostCSS
- GitHub Pages deployment via Actions (actions/deploy-pages@v4)

Infrastructure files (package.json, tsconfig.json, postcss.config.js, tailwind.config.js, deploy.yml)
are injected server-side with pinned versions to guarantee reliable CI builds.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT. See [LICENSE](LICENSE).
