# Day 6-8: Frontend Development

**Date**: January 20-22, 2026  
**Time**: Multiple sessions  
**Mood**: Excited → Frustrated → Satisfied

---

## Day 6, Morning: Setting Up Vue 3

### The Setup

Vue 3 + Vite. Should be straightforward, right?

Actually, it was. Vite is fast. The dev server starts instantly. HMR works perfectly. No complaints here.

### The Theme: Tokyo Night

I wanted a dark theme. Tokyo Night is beautiful - dark background, high contrast, easy on the eyes.

Spent some time configuring Tailwind with the Tokyo Night colors. Added both `tokyo-*` and `cyber-*` classes for backward compatibility (we had some `cyber-*` classes already).

### The Logo

Created a simple star/nova icon. Minimal, recognizable. Used SVG directly in the navigation. No image file needed.

## Day 6, Afternoon: Working with Kratos UI Nodes

### The Challenge

Kratos returns forms as "UI nodes" - structured JSON that describes form fields. This is actually pretty cool - we can render forms dynamically without hardcoding.

But it's also annoying. The structure is complex, and we need utility functions to extract values.

### The Solution

Created `uiNodes.js` with helper functions:
- `getNodeName(node)` - Get field name
- `getNodeType(node)` - Get field type
- `getNodeValue(node)` - Get field value
- `getNodeLabel(node)` - Get field label
- etc.

These make working with UI nodes bearable.

### The Dynamic Form

Rendered forms dynamically using `v-for` over the nodes. This works, but it's verbose. Lots of `v-if` conditions for different field types.

## Day 7, Morning: The Password Validation Requirement

### The Request

Users wanted:
- Password confirmation field
- Real-time validation (length, uppercase, lowercase, number, special char)
- Visual checklist
- Checkmark when passwords match

This is a lot of work, but it's good UX.

### The Implementation

Created computed properties for password rules:
```javascript
const passwordRules = computed(() => [
  { label: 'At least 8 characters', valid: passwordValue.value.length >= 8 },
  { label: 'One uppercase letter', valid: /[A-Z]/.test(passwordValue.value) },
  // ... more rules
])
```

And a computed property for password match:
```javascript
const passwordsMatch = computed(() => {
  return passwordValue.value && 
         passwordConfirm.value && 
         passwordValue.value === passwordConfirm.value
})
```

The template shows checkmarks (✓) or circles (○) for each rule, and a match indicator.

This works well. Users get immediate feedback.

## Day 7, Afternoon: The Form Field Clearing Nightmare

### The Problem

When typing in password fields, other form fields (email, name, rank) were being cleared. This was infuriating.

### The Debugging

Spent hours on this. Checked Vue reactivity. Checked form bindings. Checked everything.

**Root Cause**: Vue was re-rendering the form when `node.attributes.value` changed. Password input triggered a re-render, which reset other fields that weren't properly bound to reactive state.

### The Solution

Store all field values in a reactive object:

```javascript
const fieldValues = reactive({})

onMounted(() => {
  flow.value?.ui?.nodes?.forEach(node => {
    const name = getNodeName(node)
    fieldValues[name] = getNodeValue(node) || ''
  })
})
```

Then bind inputs to `fieldValues[name]` instead of `getNodeValue(node)`.

**Key Insight**: Separate form state from Kratos flow nodes. The nodes are for submission, but the form state is for the UI.

This fixed it. But it was a frustrating afternoon.

## Day 7, Evening: Permission-Based UI

### The Implementation

Made buttons and links show/hide based on permissions:

```vue
<button v-if="permissions.canAdd" @click="showAddUser = true">
  Add User
</button>
```

This is straightforward. Get permissions on mount, store in reactive ref, use in template.

### Rank Colors

Added color coding for ranks. Each rank has a distinct color. Makes it easy to see who's who at a glance.

## Day 8, Morning: The Professional Login Page

### The Design

Wanted a professional-looking login page. Not just a form - something that looks good.

Added:
- Logo/icon section at the top
- Welcome message
- Input icons (email, password)
- Eye button to toggle password visibility
- Loading states
- Error messages
- Links to recovery and registration

This took longer than expected, but it looks good now.

## Day 8, Afternoon: The Password Visibility Toggle Problem

### The Bug

Clicking the eye icon to toggle password visibility cleared the password value. Users were typing their password, clicking the eye, and losing everything.

**This was bad.**

### The Root Cause

Vue re-rendered the input when the `type` attribute changed from `password` to `text`. The re-render lost the value.

### The Solution

Store password value in a ref:

```javascript
const passwordValue = ref('')

const updatePasswordValue = (event) => {
  passwordValue.value = event.target.value
  // Also update node for submission
  const passwordNode = flow.value?.ui?.nodes?.find(n => getNodeType(n) === 'password')
  if (passwordNode?.attributes) {
    passwordNode.attributes.value = event.target.value
  }
}
```

Bind the input to `passwordValue` instead of `getNodeValue(node)`.

This works. But it's another case where we need to manage state separately from Kratos nodes.

## Day 8, Evening: The Submit Button Text Problem

### The Issue

Kratos provides a submit button with `value="password"`. This was showing as the button text, which looks unprofessional.

### The Fix

Override the label while keeping the value:

```vue
<button
  type="submit"
  :name="getNodeName(node)"
  :value="getNodeValue(node)"
>
  {{ loading ? 'Signing in...' : 'Sign In' }}
</button>
```

Simple fix, but it makes a big difference.

## End of Day 6-8 Thoughts

Frontend is mostly done. It looks good, works well, and handles permissions correctly.

**What I Learned**:
1. Kratos UI nodes are powerful but verbose
2. Vue reactivity requires careful state management
3. Form state should be separate from Kratos nodes
4. Real-time validation improves UX significantly
5. Small UI details matter (loading states, error messages, etc.)

**Problems We Hit**:
- Form fields clearing on re-render (fixed with fieldValues store)
- Password value lost on visibility toggle (fixed with passwordValue ref)
- Submit button showing "password" (fixed by overriding label)

**Tomorrow**: We'll probably hit more problems. That's when the real fun begins.

---

**Next**: [Day 9-15: The Problem-Solving Marathon](./05-day-9-15-problems.md)
