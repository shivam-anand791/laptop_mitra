const fs = require('fs');
const path = require('path');

const checkoutPath = path.resolve(__dirname, '../../../apps/web/app/checkout/page.tsx');
let content = fs.readFileSync(checkoutPath, 'utf8');

// 1. Extract guestLogin from useAuth()
content = content.replace(
  'const { user, firebaseUser, isVerificationRequired, isLoading: authLoading } = useAuth();',
  'const { user, firebaseUser, isVerificationRequired, isLoading: authLoading, guestLogin } = useAuth();'
);

// 2. Add guestLogin before order creation and add cartItems to orderPayload
const oldSubmitStart = `    setIsSubmitting(true);

    try {`;

const newSubmitStart = `    setIsSubmitting(true);

    try {
      let activeUser = user;
      if (!activeUser && typeof guestLogin === 'function') {
        try {
          activeUser = await guestLogin();
        } catch (guestErr) {
          console.warn('[checkout] Guest login fallback notice:', guestErr);
        }
      }`;

content = content.replace(oldSubmitStart, newSubmitStart);

// 3. Add cartItems to orderPayload
const oldPayload = `        notes: formData.gstin ? \`GSTIN: \${formData.gstin} | Company: \${formData.companyName} | \${formData.notes}\` : formData.notes,
      };`;

const newPayload = `        notes: formData.gstin ? \`GSTIN: \${formData.gstin} | Company: \${formData.companyName} | \${formData.notes}\` : formData.notes,
        cartItems: items.map((it) => ({
          productId: it.productId,
          variantId: it.variantId || undefined,
          quantity: it.quantity,
          purchaseMode: (it.purchaseMode || 'sell') as 'sell' | 'lease',
          configuration: it.configuration || 'default',
          hasWarranty: !!it.hasWarranty,
          tenureMonths: it.tenureMonths || undefined,
        })),
      };`;

content = content.replace(oldPayload, newPayload);

fs.writeFileSync(checkoutPath, content, 'utf8');
console.log('Successfully patched apps/web/app/checkout/page.tsx!');

