# HSTS (HTTP Strict Transport Security) Configuration

## Overview

This document describes the HSTS (HTTP Strict Transport Security) header configuration implemented in `next.config.ts` to enhance the security of the ozaMenu platform.

## What is HSTS?

HTTP Strict Transport Security (HSTS) is a web security policy mechanism that helps protect against protocol downgrade attacks and cookie hijacking. When enabled, it forces browsers to interact with the server exclusively over HTTPS connections.

## Configuration Details

### Location
The HSTS header is configured in `next.config.ts` within the `headers()` function.

### Header Value
```
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

### Directives Explained

- **max-age=31536000**: Instructs browsers to remember that this site should only be accessed via HTTPS for 31,536,000 seconds (1 year). This is the industry-standard duration.
- **includeSubDomains**: Applies the HSTS policy to all subdomains of the current domain, providing comprehensive protection.

### Implementation

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains'
          }
        ]
      }
    ]
  }
}

export default nextConfig
```

The configuration applies to all routes (`/:path*`) ensuring comprehensive coverage across the entire application.

## Security Benefits

1. **Prevents Protocol Downgrade Attacks**: Ensures that all communication happens over HTTPS, preventing man-in-the-middle attacks that attempt to force HTTP connections.

2. **Protects Against Cookie Hijacking**: Prevents attackers from intercepting authentication cookies over insecure HTTP connections.

3. **Critical for SaaS Applications**: Particularly important for ozaMenu as it handles:
   - User authentication and session management
   - Sensitive restaurant business data
   - Payment and subscription information

## Verification

### Important Note About HTTPS Requirement

**HSTS headers only work over HTTPS connections.** The header will not appear in local development environments using HTTP (http://localhost:3000).

### Local Development

In local development (HTTP), the HSTS header is configured but won't be visible in responses:

```bash
# This will NOT show the HSTS header in local dev
curl -I http://localhost:3000 | grep -i strict-transport-security
```

This is expected behavior and not a configuration error.

### Production Verification

Once deployed to production on Vercel (which provides automatic HTTPS), you can verify the HSTS header:

```bash
# Replace 'your-domain.com' with your actual production domain
curl -I https://your-domain.com | grep -i strict-transport-security
```

**Expected Output:**
```
strict-transport-security: max-age=31536000; includeSubDomains
```

### Browser DevTools Verification

You can also verify the header using browser developer tools:

1. Open your production website
2. Open Developer Tools (F12)
3. Go to the Network tab
4. Reload the page
5. Click on the main document request
6. Look for `strict-transport-security` in the Response Headers section

### Vercel Deployment

When deployed on Vercel:
- Vercel automatically provides HTTPS for all deployments
- The HSTS header will be included in all HTTPS responses
- Browsers will remember the HSTS policy for 1 year after the first visit
- All subsequent visits will automatically upgrade to HTTPS, even if users type http://

## Testing Checklist

- [ ] Configuration added to `next.config.ts`
- [ ] Build completes without errors (`npm run build`)
- [ ] Deployed to production with HTTPS
- [ ] HSTS header visible in production responses
- [ ] Header includes both `max-age=31536000` and `includeSubDomains`
- [ ] Header applies to all routes

## Maintenance Notes

### When to Update

- If security policies change, adjust the `max-age` value
- Consider adding `preload` directive only after careful consideration and when ready to submit to the HSTS preload list

### Preload Directive (Not Currently Included)

The `preload` directive is intentionally not included in the current configuration. Adding it requires:

1. Submitting your domain to the HSTS preload list (hstspreload.org)
2. Ensuring you can maintain HTTPS forever (removal is difficult)
3. Having HTTPS working on all subdomains

Only add `preload` if you're certain you can commit to permanent HTTPS for all subdomains.

## References

- [MDN: Strict-Transport-Security](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security)
- [OWASP: HTTP Strict Transport Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Strict_Transport_Security_Cheat_Sheet.html)
- [Next.js Headers Documentation](https://nextjs.org/docs/app/api-reference/next-config-js/headers)
- [HSTS Preload List](https://hstspreload.org/)

## Troubleshooting

### Issue: Header not showing in production

**Possible Causes:**
1. Not accessing via HTTPS (check URL starts with https://)
2. Caching issues (clear browser cache or test in incognito mode)
3. Build not deployed (verify latest build is live)

### Issue: Build fails after adding configuration

**Possible Causes:**
1. TypeScript syntax errors in next.config.ts
2. Next.js version compatibility (requires Next.js 9.5+)
3. Invalid configuration structure

**Solution:** Review the configuration syntax and ensure it matches the implementation shown in this document.

## Conclusion

The HSTS configuration is a critical security enhancement for the ozaMenu platform. It ensures that all user traffic is encrypted and protected from common attack vectors. Full verification requires production deployment over HTTPS, but the configuration is now in place and ready to protect users once deployed.
