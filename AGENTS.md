<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:commit-rules -->
# Before every commit

**ALWAYS run the unit tests before committing. No exceptions.**

```powershell
npm run test:ci
```

Only commit if all tests pass. If tests fail, fix them first.
<!-- END:commit-rules -->
