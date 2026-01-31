# Create User with platform_admin Role

## Option 1: Use Admin Dashboard UI (Recommended)

1. Log into the admin dashboard at `http://localhost:5174`
2. Navigate to "Users" page
3. Click "+ Add User" button
4. Fill in the form:
   - Email: `cativo23.kt@gmail.com`
   - Full Name: `Carlos Cativo`
   - Role: `Platform Admin`
   - Password: `Cacpac2323$`
5. Click "Create User"

The system will automatically:
- Create the user in Kratos
- Assign them to the platform_admin role in Keto
- Grant all platform_admin permissions

## Option 2: Browser Console (While Logged In)

1. Log into the admin dashboard at `http://localhost:5174`
2. Open browser console (F12)
3. Paste and run this code:

```javascript
const { createUser } = await import('/src/composables/useAuth.js');

try {
  const user = await createUser(
    {
      email: 'cativo23.kt@gmail.com',
      full_name: 'Carlos Cativo',
      role: 'platform_admin'
    },
    'Cacpac2323$'
  );
  console.log('✓ User created successfully!', user);
} catch (error) {
  console.error('✗ Error:', error);
}
```

## Option 3: Direct API Call (Requires Authentication)

If you have a valid session cookie, you can use curl:

```bash
./scripts/create-user-via-api.sh cativo23.kt@gmail.com "Carlos Cativo" platform_admin "Cacpac2323$"
```

Note: This requires authentication cookies from a logged-in session.

## Verification

After creating the user, verify they have platform_admin permissions:

1. Log out and log back in with the new user credentials
2. You should have access to all admin features
3. Check the Users page – you should be able to view, add, edit, and delete users

## Assign platform_admin to Existing User

```bash
./scripts/assign-platform-admin-to-user.sh cativo23.kt@gmail.com
```

Prerequisites: Expose Kratos Admin (4434) and Keto Read/Write (4466, 4467) in docker-compose, then run `./scripts/setup-all-permissions.sh` first.
