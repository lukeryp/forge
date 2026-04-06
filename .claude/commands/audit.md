Run full quality audit on this project.

Steps:
1. `npm run build` — check for build errors
2. `npm test` — check for test failures
3. `npx tsc --noEmit` — check for type errors
4. `grep -r "TODO\|FIXME" --include="*.ts" --include="*.tsx" src/ app/ lib/ components/ 2>/dev/null` — list outstanding todos
5. `grep -r "console\.log" --include="*.ts" --include="*.tsx" src/ app/ lib/ components/ 2>/dev/null` — find debug logs left in code
6. Check bundle size: `npm run build 2>&1 | grep -E "Route|kB|MB"` — flag any route over 500kB
7. Report a summary: pass/fail for each step, count of TODOs, count of console.logs, largest bundle routes
