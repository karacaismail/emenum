# ⚠️ MANUAL ACTION REQUIRED

## Subtask 1-3: Update package-lock.json

**Status:** BLOCKED - Requires manual npm command execution

---

## Current Situation

✅ **Completed:**
- package.json has been updated with:
  - vitest: ^4.0.17 (was ^2.0.0)
  - @vitejs/plugin-react: ^5.1.2 (was ^4.3.0)
- Changes committed to git

❌ **Blocked:**
- package-lock.json still shows esbuild 0.21.5 (VULNERABLE)
- Need esbuild >=0.24.3 to fix CVE GHSA-67mh-4wv8-2f99
- npm commands are restricted in auto-claude environment

---

## Required Action

Please run this command in your terminal:

```bash
cd /Users/karaca/Desktop/ozon/.worktrees/017-update-vulnerable-development-dependencies-esbuild
npm install
```

### What this will do:
1. Install the updated dependency versions from package.json
2. Update package-lock.json with new dependency tree
3. Pull in esbuild >=0.24.3 (transitively via vitest/vite)

---

## Verification

After running `npm install`, verify it worked:

```bash
grep -A 3 '"node_modules/esbuild"' package-lock.json | grep '"version"'
```

**Expected output:**
```
      "version": "0.24.3",
```
or higher (0.24.4, 0.25.x, etc.)

---

## Next Steps

After npm install succeeds and verification passes:

1. **Subtask 1-4:** Run test suite
   ```bash
   npm test -- --run
   ```
   Expected: All tests pass

2. **Subtask 1-5:** Verify production build
   ```bash
   npm run build
   ```
   Expected: Build completes successfully

3. **Commit the changes**
   ```bash
   git add package-lock.json
   git commit -m "auto-claude: subtask-1-3 - Update package-lock.json with esbuild >=0.24.3"
   ```

4. **Resume auto-claude** to mark subtask as completed and continue

---

## Troubleshooting

If npm install fails:
- Check node version: `node --version` (needs >=20.9)
- Try clearing node_modules: `rm -rf node_modules && npm install`
- Check npm version: `npm --version`
- Look for error messages about peer dependencies or version conflicts

---

## Context

**CVE:** GHSA-67mh-4wv8-2f99
**Severity:** Moderate (dev dependencies only)
**Impact:** Allows any website to send requests to dev server and read responses
**Fix:** Update esbuild from 0.21.5 to >=0.24.3
