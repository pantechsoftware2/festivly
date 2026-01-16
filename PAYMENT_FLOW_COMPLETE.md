# Complete Payment & Upgrade Flow ✅

## Flow Summary

### 1️⃣ User Hits Generation Limit
- **Location:** `/editor` (Editor Page)
- **Trigger:** 2nd generation attempt
- **Action:** Backend returns `402 Payment Required` with `error: "UPGRADE_REQUIRED"`
- **Result:** Frontend shows pricing modal ✅

```
Frontend Code: editor/page.tsx line 191-198
if (response.status === 402) {
  setShowUpgradeModal(true)  ← Popup appears ✅
  return
}
```

### 2️⃣ User Sees Pricing Modal
- **Component:** `upgrade-modal.tsx`
- **Show Condition:** `isOpen={showUpgradeModal}` when true
- **Button:** "🚀 Upgrade Now"
- **Action:** Calls `router.push('/pricing')`

```typescript
onUpgradeClick={() => {
  setShowUpgradeModal(false)
  router.push('/pricing')  ← Redirects to pricing page ✅
}}
```

### 3️⃣ User Arrives at Pricing Page
- **URL:** `/pricing`
- **File:** `src/app/pricing/page.tsx`
- **Component:** `<PricingSection />`
- **Shows:** 3 pricing tiers (Free, Pro, Pro Plus)

```tsx
<PricingSection />  ← Renders pricing cards ✅
```

### 4️⃣ User Selects Plan
- **Pro Plan:** ₹99/month
- **Pro Plus Plan:** ₹199/month
- **Action:** Click "Upgrade Now" button
- **Calls:** `handleUpgrade(tier)` function

### 5️⃣ Create Payment Order
- **API:** `POST /api/create-order`
- **Body:** `{ amount: 99*100, planName: "Pro" }` (in paise)
- **Response:** `{ orderId: "order_xxx" }`
- **Integration:** Razorpay

```typescript
const response = await fetch('/api/create-order', {
  method: 'POST',
  body: JSON.stringify({
    amount: tier.price * 100,  // ₹99 → 9900 paise ✅
    planName: tier.name,
  }),
})
```

### 6️⃣ Open Razorpay Checkout
- **SDK:** Razorpay Checkout v1
- **Script:** `https://checkout.razorpay.com/v1/checkout.js`
- **Options:**
  - `key`: NEXT_PUBLIC_RAZORPAY_KEY_ID ✅
  - `order_id`: From create-order API ✅
  - `amount`: Tier price in paise ✅
  - `name`: "Festivly"
  - `description`: "Upgrade to Pro Plan"

```typescript
const razorpay = new window.Razorpay({
  key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
  order_id: data.orderId,
  amount: tier.price * 100,
  currency: 'INR',
  ...
})
razorpay.open()  ← Opens payment modal ✅
```

### 7️⃣ User Completes Payment
- **Payment Method:** Credit/Debit Card, UPI, Wallet
- **Verification:** Razorpay signature verification
- **Response Data:**
  - `razorpay_payment_id`: Payment identifier
  - `razorpay_signature`: Signature for verification

### 8️⃣ Verify Payment & Update Subscription
- **API:** `POST /api/verify-payment`
- **Body:**
  ```json
  {
    "orderId": "order_xxx",
    "paymentId": "pay_xxx",
    "signature": "signature_xxx",
    "planName": "Pro"
  }
  ```
- **Backend Actions:**
  1. Verify Razorpay signature ✅
  2. Update profiles table: `subscription_plan = 'pro'` ✅
  3. Set `subscription_status = 'active'` ✅
  4. Return success response

```typescript
// From verify-payment/route.ts
const { error: updateError } = await supabase
  .from('profiles')
  .update({
    subscription_plan: planName.toLowerCase(),  // 'pro' ✅
    subscription_status: 'active',
  })
  .eq('id', session.user.id)
```

### 9️⃣ Success & Reload
- **Alert:** "✅ Payment successful! Your account has been upgraded."
- **Action:** `window.location.reload()`
- **Result:** Page refreshes with updated subscription

```typescript
alert('✅ Payment successful! Your account has been upgraded.')
window.location.reload()  ← User sees updated profile ✅
```

### 🔟 User Can Now Generate Unlimited
- **Check:** Frontend queries `subscription_plan` from profiles
- **Result:** User has `subscription_plan = 'pro'` (not 'free')
- **Benefit:** 
  - ✅ Unlimited generations (no hard block at line 154)
  - ✅ No 402 response from backend
  - ✅ HD quality prompts applied automatically
  - ✅ No pricing modal shown

```typescript
// From editor/page.tsx line 154-159
if (limitInfo.imagesGenerated >= 1 && limitInfo.subscription === 'free') {
  // ← This check is FALSE now (subscription is 'pro') ✅
  // ← User can generate unlimited times ✅
}
```

---

## File Structure Verification

✅ **Frontend:**
- `src/app/editor/page.tsx` - Popup trigger (402 handler)
- `src/components/upgrade-modal.tsx` - Pricing modal component
- `src/app/pricing/page.tsx` - Pricing page
- `src/components/pricing-section.tsx` - Pricing cards & payment handler

✅ **Backend:**
- `src/app/api/create-order/route.ts` - Razorpay order creation
- `src/app/api/verify-payment/route.ts` - Payment verification & subscription update
- `src/app/api/generateImage/route.ts` - Limit enforcement (402 response)

✅ **Database:**
- `profiles` table columns:
  - `subscription_plan: 'free' | 'pro' | 'pro plus'`
  - `subscription_status: 'inactive' | 'active'`
  - `free_images_generated: integer`

✅ **Environment:**
- `NEXT_PUBLIC_RAZORPAY_KEY_ID` - Frontend key
- `RAZORPAY_KEY_SECRET` - Backend secret (for verification)

---

## Complete Flow Checklist

- ✅ **Step 1:** User tries 2nd generation
- ✅ **Step 2:** Backend returns 402 + UPGRADE_REQUIRED
- ✅ **Step 3:** Frontend popup shows automatically
- ✅ **Step 4:** User clicks "Upgrade Now"
- ✅ **Step 5:** Redirects to `/pricing` page
- ✅ **Step 6:** Shows Pro (₹99) and Pro Plus (₹199) plans
- ✅ **Step 7:** User clicks "Upgrade Now" on desired plan
- ✅ **Step 8:** Creates payment order with Razorpay
- ✅ **Step 9:** Opens Razorpay checkout modal
- ✅ **Step 10:** User enters payment details
- ✅ **Step 11:** Razorpay processes payment
- ✅ **Step 12:** Payment success handler called
- ✅ **Step 13:** Backend verifies signature
- ✅ **Step 14:** Updates `subscription_plan` to 'pro'
- ✅ **Step 15:** Page reloads with success message
- ✅ **Step 16:** User can now generate unlimited images
- ✅ **Step 17:** No more pricing popups shown

---

## Troubleshooting

**If pricing page doesn't show:**
1. Check URL: Should be `http://localhost:3000/pricing`
2. Check console for errors in pricing-section.tsx
3. Verify `NEXT_PUBLIC_RAZORPAY_KEY_ID` is set in .env.local

**If payment fails:**
1. Check Razorpay dashboard for API credentials
2. Verify `RAZORPAY_KEY_SECRET` is correct in .env
3. Check `/api/create-order` response for `orderId`

**If popup doesn't show:**
1. Check Network tab for 402 response from `/api/generateImage`
2. Check React DevTools: `showUpgradeModal` state should be `true`
3. Check browser console for: `"⚠️ Upgrade required (402)"`

---

**Status: ✅ COMPLETE - All components in place and ready**
