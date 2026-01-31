# Day 4-5: Building the Authorization System

**Date**: January 18-19, 2026  
**Time**: Multiple sessions  
**Mood**: Confused → Excited → Frustrated → Relieved

---

## Day 4, Morning: Designing the Permission System

### The Requirement

We need a Role-Based Access Control (RBAC) system. But what should the permissions look like?

I decided to use a military-style rank hierarchy:
- General (full access)
- Colonel (almost full, but can't delete)
- Major (can edit, but can't delete)
- Captain, Lieutenant, Sergeant (view only)
- Corporal, Private (no access)

### The Permission Matrix

Spent way too long designing this matrix. But it's important to get it right.

| Rank | View | Add | Edit | Delete | Change Perms | Manage Perms |
|------|------|-----|------|--------|--------------|--------------|
| General | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Colonel | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ |
| Major | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ |
| ... | ... | ... | ... | ... | ... | ... |

This gives us fine-grained control. Each rank has exactly the permissions it needs, nothing more.

## Day 4, Afternoon: Discovering Keto Subject Sets

### The Research

I knew Keto supported RBAC, but I wasn't sure how. Started reading the documentation.

**Discovery**: Keto has something called "subject sets" - this is the magic!

### How Subject Sets Work

Instead of granting permissions directly to users:
```
users:management#view_users@user:123
users:management#add_users@user:123
... (many more)
```

You grant permissions to roles, and then assign users to roles:
```
users:management#view_users@rank:General#member
rank:General#member@user:123
```

**The Magic**: When you check if `user:123` can `view_users`, Keto automatically:
1. Checks if `user:123` is a member of `rank:General`
2. Checks if `rank:General` has `view_users`
3. Returns `allowed: true` if both are true

This is brilliant! Change a user's rank, and all their permissions update automatically.

### Why This Matters

**Before**: Change rank = update 10+ permission tuples  
**After**: Change rank = update 1 membership tuple

This scales. This is what we need.

## Day 4, Evening: Implementing the Setup Script

### The Script

Created `setup-all-permissions.sh` to:
1. Grant permissions to rank roles
2. Assign existing users to their ranks

This was tedious. Lots of curl commands. But it works.

### The First Test

Ran the script. Checked if a General user could view users.

**Result**: `allowed: false` ❌

**Why?** The user wasn't assigned to the rank yet. Fixed the script, ran it again.

**Result**: `allowed: true` ✅

Success! But there's more...

## Day 5, Morning: The Permission Check Problem

### The 403 Error

Frontend was checking permissions, but getting 403 errors. Treated them as failures.

**Problem**: Keto returns HTTP 403 with `{"allowed": false}` for denied permissions. This is a **valid** response, not an error!

**Solution**: Parse the JSON response even on 403 status:

```javascript
const response = await fetch(url)
const data = await response.json() // Works even on 403

if (data.hasOwnProperty('allowed')) {
  return data.allowed === true // Valid permission check
}
```

This was a "duh" moment. Of course denied permissions return 403. That's how HTTP works.

## Day 5, Afternoon: The Caching Problem

### The Decision

I initially cached permission checks for 5 minutes. But then I realized: what if a user's rank changes? The UI would show wrong permissions for 5 minutes.

**That's a security issue.**

**Decision**: Remove caching. Make all checks real-time.

**Trade-off**: More API calls, but always accurate. For admin operations, accuracy is more important than performance.

### The Implementation

Removed all caching logic. Every permission check is now a real API call.

This works, but it's slower. We'll optimize later if needed.

## Day 5, Evening: The General User Problem

### The Bug Report

"General user can't manage users."

**What?** That shouldn't be possible. General has all permissions.

### The Investigation

1. Checked user's rank in Kratos: `rank: "General"` ✅
2. Checked rank membership in Keto: No membership ❌

**Ah!** The user had `rank: "General"` in Kratos, but wasn't assigned to `rank:General` in Keto.

### The Root Cause

When we create a user, we set their rank in Kratos. But we don't automatically assign them to the rank in Keto.

**Solution**: Created `syncRankPermissions()` function that:
1. Gets current rank membership
2. Removes from old rank (if any)
3. Assigns to new rank

Now it's called automatically when:
- Creating a new user
- Updating a user's rank

### The Diagnostic Script

Created `check-user-permissions.sh` to verify:
- User is assigned to rank
- Permissions are correct

This is useful for debugging. Wish I had it earlier.

## End of Day 4-5 Thoughts

RBAC is working! Subject sets are amazing. The automatic permission resolution is exactly what we needed.

**What I Learned**:
1. Subject sets are powerful - use them
2. 403 responses can be valid (not errors)
3. Caching permissions is risky - prefer accuracy
4. Always sync rank membership when rank changes
5. Diagnostic tools are essential

**Problems We Hit**:
- Permission checks returning 403 (fixed by parsing JSON)
- Caching causing stale permissions (fixed by removing cache)
- Rank membership not syncing (fixed by sync function)

**Tomorrow**: Start on the frontend. That's going to be a different kind of challenge.

---

**Next**: [Day 6-8: Frontend Development](./04-day-6-8-frontend.md)
