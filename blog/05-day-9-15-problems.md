# Day 9-15: The Problem-Solving Marathon

**Date**: January 23-29, 2026  
**Time**: Many, many sessions  
**Mood**: Frustrated → Determined → Relieved → Exhausted

---

## Day 9: The Path Stripping Investigation

### The Problem

I was worried about path stripping. Oathkeeper needs to route `/kratos-public/self-service/login/api` to Kratos, but Kratos expects `/self-service/login/api` (without the prefix).

I thought we'd need proxy services. I was already planning to build them.

### The Discovery

Before building anything, I checked the Oathkeeper documentation one more time.

**Turns out**: Oathkeeper v25.4.0 DOES support `strip_path` in access rules!

```yaml
- id: "keto-read"
  upstream:
    strip_path: "/keto/read"
    url: "http://keto:4466"
```

I was worried for nothing. Oathkeeper handles it natively. No proxy services needed.

**Lesson**: Always check if a feature exists before building a workaround.

## Day 10: The Email Delivery Saga

### The Initial Problem

Emails weren't being sent. Users couldn't recover passwords. This is critical functionality.

### The Investigation

**Step 1**: Checked Kratos logs
```bash
docker-compose logs kratos | grep courier
```
Nothing. No errors, but no activity either.

**Step 2**: Checked Mailpit
Opened `http://localhost:8025`. Empty. No emails.

**Step 3**: Checked configuration
SMTP URI looked correct: `smtp://mailpit:1025`

### The First Fix: Courier Worker

Found out Kratos has a separate courier worker. You need `--watch-courier` flag!

```yaml
command: serve -c /etc/config/kratos/kratos.config.yaml --dev --watch-courier
```

Added the flag. Still no emails.

### The Second Fix: STARTTLS

Checked logs again. Found this error:
```
MandatoryStartTLS required, but SMTP server does not support STARTTLS
```

Mailpit doesn't support STARTTLS. Need to disable it.

**Fix**: Added `?disable_starttls=true` to the connection URI:
```yaml
courier:
  smtp:
    connection_uri: smtp://mailpit:1025/?disable_starttls=true
```

Still no emails.

### The Third Discovery: Kratos Security Feature

Tested with a non-existent email address. No email sent.

**Research**: Found out this is by design. Kratos doesn't send recovery emails for non-existent addresses to prevent user enumeration attacks.

**Test**: Used an existing user. Email sent! ✅

**Lesson**: Sometimes the "bug" is actually a security feature.

## Day 11: The CSRF Nightmare

### The Problem

Mixing API and browser flows caused CSRF errors:
```
"The HTTP Request Header included the "Origin" key, indicating that this request 
was made as part of an AJAX request in a Browser. The flow however was initiated 
as an API request."
```

This was confusing. What's the difference between API and browser flows?

### The Research

Kratos has two types of flows:
- **Browser flows**: `/self-service/login/browser` - for web apps
- **API flows**: `/self-service/login/api` - for mobile apps, programmatic access

You can't mix them. If you start a browser flow, you must submit it as a browser flow.

### The Solution

For user-facing operations (login, registration, recovery):
- Always use browser flows
- Let the frontend handle form submission
- Cookies are set automatically

For admin-triggered actions:
- Use admin API endpoints
- Generate codes/links
- User completes self-service flow

This makes sense. Browser flows handle CSRF automatically. API flows don't.

## Day 12: The Password Reset That Didn't Reset

### The Bug Report

"Changed my password, but I can't log in with the new one. Old password still works."

This is bad. Password reset is broken.

### The Investigation

**Step 1**: Checked Kratos logs
```bash
docker-compose logs kratos | grep "flow_method"
```
Found: `"flow_method":"profile"` instead of `"flow_method":"password"`

**Step 2**: Checked request payload
Opened browser DevTools → Network tab. Looked at the request.

**Found**: We were sending profile fields (email, name, rank) along with password fields.

### The Root Cause

Kratos determines the flow type based on:
1. The `method` field
2. Which fields are present

If you send profile fields, it becomes a profile update, not a password update.

### The Fix

Only send password-related fields:

```javascript
const passwordFormData = new FormData()
passwordFormData.set('method', 'password')
passwordFormData.set('password', passwordValue.value)
passwordFormData.set('password_confirm', passwordConfirm.value)
passwordFormData.set('csrf_token', csrfToken)
// Don't include profile fields!
```

This was a subtle bug. Easy to miss, but critical.

## Day 13: The Permission Check 403 Problem

### The Issue

Frontend was checking permissions, but getting 403 errors. Treated them as failures.

### The Realization

Keto returns HTTP 403 with `{"allowed": false}` for denied permissions. This is a **valid** response, not an error!

We need to parse the JSON and check the `allowed` field:

```javascript
const response = await fetch(url)
const data = await response.json() // Works even on 403

if (data.hasOwnProperty('allowed')) {
  return data.allowed === true // Valid permission check
}
```

This was a "duh" moment. Of course denied permissions return 403. That's how HTTP works.

## Day 14: The General User Access Denied

### The Bug

"General user can't manage users."

This shouldn't be possible. General has all permissions.

### The Investigation

**Step 1**: Checked user's rank in Kratos
```bash
curl http://localhost:4455/admin/identities | jq '.[] | select(.traits.email == "general@example.com")'
```
Result: `rank: "General"` ✅

**Step 2**: Checked rank membership in Keto
```bash
curl http://localhost:4455/keto/read/relation-tuples?namespace=ranks&subject_id=user:123
```
Result: No membership relation ❌

**Ah!** The user had `rank: "General"` in Kratos, but wasn't assigned to `rank:General` in Keto.

### The Root Cause

When we create a user, we set their rank in Kratos. But we don't automatically assign them to the rank in Keto.

### The Fix

Created `syncRankPermissions()` function that:
1. Gets current rank membership
2. Removes from old rank (if any)
3. Assigns to new rank

Now it's called automatically when creating or updating users.

Also created a diagnostic script to verify permissions. Wish I had it earlier.

## Day 15: The Keto Direct Access Security Issue

### The Discovery

I realized the frontend was directly accessing Keto APIs (`http://localhost:4466`). This violates Zero Trust!

**Security Risk**: Anyone who knows the Keto URLs could read/write permissions without authentication.

### The Fix

**Step 1**: Added Oathkeeper access rules for Keto:
```yaml
- id: "keto-read"
  upstream:
    strip_path: "/keto/read"
    url: "http://keto:4466"
  match:
    url: "<(http|https)://localhost:4455/keto/read/.*>"
  authenticators:
    - handler: cookie_session
```

**Step 2**: Updated frontend to use Oathkeeper URLs:
```javascript
// Before: Direct access (INSECURE)
const ketoReadUrl = 'http://localhost:4466'

// After: Route through Oathkeeper (SECURE)
const oathkeeperUrl = 'http://localhost:4455'
const ketoReadUrl = `${oathkeeperUrl}/keto/read`
```

Now all Keto requests go through Oathkeeper, get authenticated, and receive identity headers.

**This is how Zero Trust should work.**

## Day 15, Afternoon: The CORS Conflict

### The Problem

After routing Keto through Oathkeeper, we got CORS errors. But:
- Oathkeeper was adding CORS headers ✅
- Requests were reaching Keto ✅
- Server logs showed 200 OK ✅

But the browser showed CORS errors. What?

### The Investigation

**Step 1**: Checked Oathkeeper logs
CORS headers were present.

**Step 2**: Checked Keto logs
Requests were being received.

**Step 3**: Tested with curl
CORS headers were in the response.

**Step 4**: Realized
Keto was STILL sending CORS headers even though we removed the `cors:` section!

### The Fix

Actually, we hadn't fully removed it. There was still a `cors:` section with `enabled: false`.

**Solution**: Remove the entire `cors:` section. Don't just set `enabled: false`. Remove it completely.

```yaml
serve:
  read:
    port: 4466
    # CORS section removed - Oathkeeper handles all CORS
```

This fixed it. In Zero Trust, only the gateway should send CORS headers.

## Day 15, Evening: The OPTIONS Method Error

### The Error

Oathkeeper failed to start:
```
serve.proxy.cors.allowed_methods.5: OPTIONS
value must be one of "GET", "HEAD", "POST", "PUT", "DELETE", "CONNECT", "TRACE", "PATCH"
```

### The Fix

Oathkeeper v25.4.0 doesn't allow `OPTIONS` in `allowed_methods`. But it handles OPTIONS automatically when CORS is enabled.

**Solution**: Remove `OPTIONS` from the list. Oathkeeper handles it automatically.

## Day 15, Late Night: The Unnecessary Preflight

### The Problem

GET requests were triggering CORS preflight. This is unnecessary and causes delays.

### The Root Cause

Frontend was sending `Content-Type: application/json` header with GET requests. This triggers preflight.

### The Fix

Remove `Content-Type` header from GET requests. GET requests don't have a body, so they don't need it.

```javascript
// Before: Triggers preflight
const response = await fetch(url, {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'  // ❌ Unnecessary
  }
})

// After: No preflight
const response = await fetch(url, {
  method: 'GET'
  // No Content-Type header
})
```

## End of Day 9-15 Thoughts

This was a marathon. So many problems, but we solved them all.

**What I Learned**:
1. Always check documentation before building workarounds
2. CORS is still a pain, even in Zero Trust
3. Security features can look like bugs
4. Separate concerns: gateway handles CORS, backend services don't
5. GET requests don't need Content-Type headers
6. Debugging takes time, but it's worth it

**Problems We Solved**:
- Path stripping (Oathkeeper handles it)
- Email delivery (courier worker + STARTTLS)
- CSRF (browser vs API flows)
- Password reset (method field)
- Permission checks (403 parsing)
- Rank sync (automatic sync function)
- Keto security (route through Oathkeeper)
- CORS conflicts (remove from backend)
- OPTIONS method (automatic handling)
- Unnecessary preflight (remove Content-Type)

**Tomorrow**: Assess production readiness. See what's missing.

---

**Next**: [Day 16: Looking Forward](./06-day-16-future.md)
