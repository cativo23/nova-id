# Day 2-3: Setting Up the Infrastructure

**Date**: January 16-17, 2026  
**Time**: Multiple sessions  
**Mood**: Frustrated → Relieved

---

## Day 2, Morning: Docker Compose Hell

Started with Docker Compose. Should be simple, right? Wrong.

### The First Problem: Service Communication

I wanted services to communicate via Docker hostnames (`http://kratos:4433`), not localhost. This enforces Zero Trust - services can't be accessed directly from the host.

But then I realized: Oathkeeper needs to route to these services. How does that work?

**Solution**: Oathkeeper routes to internal Docker hostnames. The gateway (Oathkeeper) is the only thing exposed to the host. Everything else is internal.

### The Second Problem: Database Initialization

We need three separate databases:
- `kratos` for identity
- `hydra` for OAuth
- `keto` for permissions

**Why separate?** Isolation. If one service has issues, it doesn't affect the others. Plus, we can scale them independently.

Created `create-dbs.sql` and `create-users.sh` scripts. Each service gets its own user with its own password. Security 101.

### The Third Problem: Migrations

Ory services need to run migrations before they start. But Docker Compose doesn't have a great way to do this.

**Solution**: Separate migration containers that run before the main services. They depend on the database being healthy, then the main services depend on migrations completing.

This works, but it's a bit clunky. Maybe there's a better way, but for now, it works.

## Day 2, Afternoon: Kratos Configuration

### The Email Problem

Kratos needs to send emails. For development, we're using Mailpit (a local SMTP server). But getting it configured was a pain.

**First attempt**: Used MailHog. But Kratos kept complaining about STARTTLS.

**Second attempt**: Switched to Mailpit. Still had STARTTLS issues.

**Solution**: Added `?disable_starttls=true` to the SMTP connection URI. Mailpit doesn't support STARTTLS, so we need to disable it.

```yaml
courier:
  smtp:
    connection_uri: smtp://mailpit:1025/?disable_starttls=true
```

But wait, there's more...

### The Courier Worker Problem

Emails still weren't sending. Checked the logs - nothing. No errors, but no emails either.

**Discovery**: Kratos has a separate courier worker process. You need to run it with `--watch-courier` flag!

```yaml
command: serve -c /etc/config/kratos/kratos.config.yaml --dev --watch-courier
```

That was the missing piece. Once I added that flag, emails started working.

## Day 2, Evening: Hydra Configuration

### The URL Problem

Hydra needs URLs for login, consent, etc. I tried to use command-line flags like `--urls.self.issuer`, but Hydra v25.4.0 doesn't support that.

**Error**: `unknown flag: --urls.self.issuer`

**Solution**: Configure URLs directly in `hydra.config.yaml`. No environment variable substitution, no command-line flags. Just hardcode them in the config file.

This is annoying, but it works. For production, we'll need to generate the config file with the right URLs.

## Day 3, Morning: Keto Configuration

### The CORS Problem (First Encounter)

Keto has CORS configuration. But in a Zero Trust architecture, only the gateway (Oathkeeper) should handle CORS. Backend services shouldn't send CORS headers.

**First attempt**: Set `cors.enabled: false` in Keto config.

**Problem**: Keto was still sending CORS headers! Even with `enabled: false`.

**Solution**: Remove the entire `cors:` section from the config. If the section doesn't exist, Keto won't send CORS headers.

This makes sense - in Zero Trust, backend services are only accessed through the gateway. They don't need CORS.

## Day 3, Afternoon: Oathkeeper Configuration

### The Path Stripping Discovery

I was worried about path stripping. Oathkeeper needs to route `/kratos-public/self-service/login/api` to Kratos, but Kratos expects `/self-service/login/api` (without the prefix).

**Research**: Checked Oathkeeper v25.4.0 documentation.

**Discovery**: Oathkeeper DOES support `strip_path` in access rules! I was worried for nothing.

```yaml
- id: "keto-read"
  upstream:
    strip_path: "/keto/read"
    url: "http://keto:4466"
```

This works perfectly. Oathkeeper strips the prefix before forwarding. No proxy services needed.

### The Access Rules

Spent a lot of time writing access rules. Each service needs rules:
- Public endpoints (no auth)
- Protected endpoints (require auth)
- Frontend routes

The regex patterns are tricky. Got them wrong a few times, but eventually got it working.

## Day 3, Evening: Testing Everything

### The Verification Process

Tested each service:
1. Oathkeeper health check ✅
2. Kratos public API ✅
3. Protected API (should require auth) ✅
4. Mailpit Web UI ✅

Everything works! Well, mostly...

### The CORS Problem (Again)

Even though I removed CORS from Keto, I was still getting CORS errors in the browser.

**Investigation**: 
- Checked Oathkeeper logs - CORS headers were being added ✅
- Checked browser console - CORS errors ❌
- Tested with curl - CORS headers present ✅

**Realization**: Keto was STILL sending CORS headers even with the section removed. Or maybe it was a caching issue?

**Solution**: Restarted all services, cleared browser cache. That fixed it. But I'm still not 100% sure what the issue was.

## End of Day 2-3 Thoughts

Infrastructure is mostly working. There were more problems than I expected, but we got through them. The path stripping thing was a relief - I thought we'd need proxy services, but Oathkeeper handles it natively.

**What I Learned**:
1. Always check if a feature exists before building a workaround
2. CORS is still a pain, even in 2026
3. Email configuration is more complex than it should be
4. Docker Compose dependency management is clunky but works

**Tomorrow**: Start working on the authorization system. That's going to be fun.

---

**Next**: [Day 4-5: Building the Authorization System](./03-day-4-5-authorization.md)
