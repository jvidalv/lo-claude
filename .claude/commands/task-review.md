Review all code changes made during the current task. Go through every modified file and check for the following issues. Fix anything you find.

## Type Safety
- No `as` type casts or type assertions — refactor to use proper types, generics, or type guards
- No `any` types — use `unknown`, generics, or specific types
- No `!` non-null assertions — add proper null checks
- No `// @ts-ignore` or `// @ts-expect-error` — fix the underlying type issue

## Code Quality
- No duplicated code — extract shared logic into functions
- No dead code — remove unused variables, imports, functions, and commented-out code
- No magic numbers or strings — use named constants
- No overly long functions — break down into smaller, focused functions
- No deeply nested logic — use early returns, guard clauses

## Naming
- Functions describe what they do (verb + noun)
- Variables describe what they hold
- Boolean variables use `is`, `has`, `should` prefixes
- No abbreviations unless universally understood (`url`, `id`, `html`)

## Error Handling
- Async functions have proper try/catch where needed
- Errors include meaningful messages
- No swallowed errors (empty catch blocks)

## Consistency
- Follows existing patterns in the codebase
- Same style as surrounding code (formatting, naming, structure)
- Imports use the project's path aliases (`#core/`, `#modules/`)

## Security
- **CRITICAL: This is a public repo.** Never commit secrets, credentials, tokens, API keys, or passwords
- Verify no hardcoded credentials in code, config files, or comments
- Check that `.gitignore` covers all sensitive files (`credentials.json`, `token.json`, `cookies.txt`, `.env`)
- No secrets in commit messages, error messages, or log output
- Run `git diff --staged` before committing and scan for anything sensitive

## Build & Lint
- Run `npm run build` — must compile with zero errors
- No TypeScript warnings

## Final Check
- Re-read every changed file top to bottom
- Verify no leftover TODOs, debug logs, or temporary code
- Confirm the feature works as intended
