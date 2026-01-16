# Gotchas & Pitfalls

Things to watch out for in this codebase.

## [2026-01-15 11:33]
Repository contains only documentation files, no actual Next.js application code (package.json, src/, app/, etc.) exists

_Context: Attempting to update dependencies for spec 017. The planner found version information (esbuild 0.21.5, vitest 2.0.0) but the actual code doesn't exist in this repository or worktree. Need to locate or create the actual application code before proceeding with dependency updates._
