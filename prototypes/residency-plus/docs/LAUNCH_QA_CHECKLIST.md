# Residency+ Launch QA Checklist

Use this checklist before launch. Test on **production** (https://www.residencysolutions.net) in an incognito or clean profile unless noted.

---

## 1. Signed-out test

- [ ] Top bar shows **Sign In** button (no empty slot).
- [ ] Click **Sign In** → modal opens with email, password, "Forgot password?", and "Sign Up" link.
- [ ] Close modal → button still visible.
- [ ] No console errors; no localhost or wrong-host references in network/redirects.

---

## 2. Sign-up test

- [ ] Open Sign In → click **Sign Up** → title is "Create Account".
- [ ] Enter email + password → **Continue** → "Check your email to confirm" and **Resend confirmation email** link.
- [ ] **Resend confirmation email** → success message; no error.
- [ ] Close modal and reopen → sign-in form shows (no stuck confirmation view).

---

## 3. Email confirmation test

- [ ] Use confirmation link from sign-up email (must use production redirect; no localhost).
- [ ] After confirming, land on production; signed in (Account shows email and plan).
- [ ] Account modal shows correct **Plan: Free** and **Upgrade to RESIDENCY+** (not stale).

---

## 4. Sign-in test

- [ ] Sign out if needed; open Sign In → enter email + password → **Continue**.
- [ ] Modal closes and user is signed in; top bar shows **Account**.
- [ ] Open **Account** → modal title is **Account** (not "Sign In"); email, Plan: Free, Upgrade CTA, Manage subscription hidden.

## 4b. Sign-out test

- [ ] While signed in, open **Account** → click **Sign Out**.
- [ ] Modal closes; top bar shows **Sign In** (not "Account").
- [ ] Open **Account** again → sign-in form and title "Sign In" (not signed-in state).

---

## 5. Tutorial test

- [ ] New/clean storage: open app → tutorial overlay appears (first-run).
- [ ] **Skip** → overlay closes; does not reappear on refresh (or reappears only if "Don't show again" was unchecked).
- [ ] **Don't show again** checked + **Finish** or **Skip** → tutorial does not auto-show on next visit.
- [ ] Top-right **⋯** → **Tutorial** → tutorial opens.
- [ ] **Account** → **Show tutorial** → tutorial opens.

---

## 6. Free-limit test

- [ ] Signed in as Free: hit vibe preset limit (or history/crate limit) → upgrade message; no crash.
- [ ] Account modal always shows **Upgrade to RESIDENCY+** for Free (never Manage subscription).

---

## 7. Paid-upgrade test (requires BILLING_ENABLED=true and Stripe env in Netlify)

- [ ] As Free user, click **Upgrade to RESIDENCY+** → redirects to Stripe Checkout (not "Billing is currently unavailable").
- [ ] No redirect to localhost; success_url/cancel_url point to production.
- [ ] If "Billing is currently unavailable" appears: set BILLING_ENABLED=true, STRIPE_SECRET_KEY, STRIPE_PRICE_RESIDENCY_PLUS in Netlify env.

---

## 8. Checkout success test

- [ ] Complete Stripe Checkout (use test card if needed) → redirect to production with `?checkout=success`.
- [ ] Page loads; URL is cleaned (no `checkout=success` left in address bar after a moment if we strip it).
- [ ] Open **Account** → **Plan: Residency+**, **Manage subscription** visible, Upgrade hidden.
- [ ] Refresh page → still shows Residency+ and Manage subscription.

---

## 9. Checkout cancel test

- [ ] Start upgrade → on Stripe Checkout click back/cancel → redirect to production with `?checkout=cancel`.
- [ ] Page loads; no crash; still signed in; Plan remains Free.
- [ ] URL cleaned (no `checkout=cancel` left if we strip it).

---

## 10. Portal test

- [ ] As paid user, click **Manage subscription** → redirects to Stripe Customer Portal.
- [ ] In portal, click return/cancel → back to production (same tab).
- [ ] Open **Account** → plan and subscription state correct (e.g. still Residency+ or updated if changed in portal).

---

## 11. Sign-out / refresh regression test

- [ ] Signed-in paid user → **Sign Out**.
- [ ] Open **Account** again (should show sign-in form, not signed-in state).
- [ ] Sign in again → **Account** shows correct plan after load (Free or Residency+).
- [ ] Full page refresh while signed in → **Account** still shows correct plan and CTAs (no stale paid/Free state).

---

## 12. Auth recovery (forgot / reset password)

- [ ] **Forgot password?** → enter email → **Send reset link** → "Check your email for the reset link."
- [ ] **Back to sign in** → sign-in form visible again.
- [ ] Use reset link from email → land on production; **Set new password** form appears (recovery hash).
- [ ] Set new password → success message; hash cleared; can sign in with new password.
- [ ] No localhost or wrong-host in reset or confirmation links.

---

## Sign-off

- [ ] All items above passed.
- [ ] No blockers remaining (see project docs for any known issues).

**Date:** _______________  
**Tester:** _______________
