Build, test, push to main, deploy to Vercel, verify live site.

Steps:
1. `npm run build` — must pass with no errors
2. `npm test` — must pass with no failures
3. `npx tsc --noEmit` — must pass with no type errors
4. `git add -A && git commit -m "<describe changes>" && git push origin main`
5. Wait for Vercel deploy to complete (check via Vercel dashboard or `vercel ls`)
6. Verify the live URL loads and the expected changes are visible
