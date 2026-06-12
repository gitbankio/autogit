# Contributing to AutoGit

Thanks for your interest in contributing.

## Before you start

- Open an issue first for non-trivial changes
- For bugs, include steps to reproduce and expected vs actual behavior

## Development setup

```bash
pnpm install
pnpm dev
```

## Conventions

### AI providers

Supported providers are defined in `src/components/ProviderLogos.tsx`. To add a new provider,
add an entry to the `PROVIDERS` array with its API base URL, model list, and logo component.

### Styling

- Tailwind v4 utility classes only
- Framer Motion for animations
- All new components go in `src/components/`

## Type checking

```bash
pnpm run typecheck
```

Must pass with zero errors before opening a PR.

## Pull requests

- One concern per PR
- Clear description of what changed and why
- Reference related issues with `Closes #<number>`

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
