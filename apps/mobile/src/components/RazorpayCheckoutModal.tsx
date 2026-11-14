import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { nativePaymentsSupported } from '../utils/capabilities';

function getRazorpayCheckout() {
  if (!nativePaymentsSupported) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const rz = require('react-native-razorpay');
    return rz?.default || rz;
  } catch {
    return null;
  }
}

export interface RazorpayCheckoutData {
  orderId: string;
  orderNumber?: string;
  type: 'purchase' | 'rental';
  razorpayOrderId?: string;
  razorpaySubscriptionId?: string;
  amountInPaise: number;
  currency: string;
  keyId: string;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  description?: string;
}

interface RazorpayCheckoutModalProps {
  visible: boolean;
  checkoutData: RazorpayCheckoutData | null;
  onSuccess: (result: {
    orderId: string;
    razorpayOrderId?: string;
    razorpaySubscriptionId?: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }) => void;
  onFailure: (error: { code?: string | number; description?: string }) => void;
  onClose: () => void;
}

export default function RazorpayCheckoutModal({
  visible,
  checkoutData,
  onSuccess,
  onFailure,
  onClose,
}: RazorpayCheckoutModalProps) {
  const activeCheckout = useRef<string | null>(null);
  const callbacks = useRef({ onSuccess, onFailure, onClose });
  callbacks.current = { onSuccess, onFailure, onClose };

  useEffect(() => {
    if (!visible || !checkoutData) {
      activeCheckout.current = null;
      return;
    }

    const checkoutId =
      checkoutData.type === 'purchase'
        ? checkoutData.razorpayOrderId
        : checkoutData.razorpaySubscriptionId;
    if (!checkoutId || activeCheckout.current === checkoutId) return;
    activeCheckout.current = checkoutId;

    let active = true;
    const options = {
      key: checkoutData.keyId,
      name: 'LaptopMitra',
      description: checkoutData.description || `Order ${checkoutData.orderNumber || ''}`,
      ...(checkoutData.type === 'purchase'
        ? {
            order_id: checkoutId,
            amount: checkoutData.amountInPaise,
            currency: checkoutData.currency,
          }
        : { subscription_id: checkoutId }),
      prefill: {
        name: checkoutData.customer.name,
        email: checkoutData.customer.email,
        contact: checkoutData.customer.phone,
      },
      theme: { color: '#2563eb' },
    };

    const RazorpayCheckout = getRazorpayCheckout();
    if (!RazorpayCheckout || typeof RazorpayCheckout.open !== 'function') {
      Alert.alert(
        'Development Build Required',
        'Push notifications and in-app payments need the full app build.',
      );
      callbacks.current.onFailure({
        code: -1,
        description: 'Push notifications and in-app payments need the full app build',
      });
      return;
    }

    RazorpayCheckout.open(options)
      .then((response: any) => {
        if (!active) return;
        if (
          !response.razorpay_payment_id ||
          !response.razorpay_signature ||
          (checkoutData.type === 'purchase' && !response.razorpay_order_id) ||
          (checkoutData.type === 'rental' && !response.razorpay_subscription_id)
        ) {
          callbacks.current.onFailure({
            code: -1,
            description: 'Razorpay returned an incomplete payment response.',
          });
          return;
        }
        callbacks.current.onSuccess({
          orderId: checkoutData.orderId,
          ...(response.razorpay_order_id ? { razorpayOrderId: response.razorpay_order_id } : {}),
          ...(response.razorpay_subscription_id
            ? { razorpaySubscriptionId: response.razorpay_subscription_id }
            : {}),
          razorpayPaymentId: response.razorpay_payment_id,
          razorpaySignature: response.razorpay_signature,
        });
      })
      .catch((error: { code?: string | number; description?: string }) => {
        if (!active) return;
        if (error.code === 0 || error.code === '0') {
          callbacks.current.onClose();
        } else {
          callbacks.current.onFailure(error);
        }
      });

    return () => {
      active = false;
    };
  }, [visible, checkoutData]);

  return null;
}
