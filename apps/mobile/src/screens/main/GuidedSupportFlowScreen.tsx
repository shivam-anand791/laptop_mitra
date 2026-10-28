import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Switch,
  Modal,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { MainStackParamList, MainStackNavigationProp } from '../../navigation/types';
import {
  useOrders,
  useSupportConfig,
  useCreateTicket,
  useCreateReturnRequest,
} from '../../hooks/useApi';
import { useAuth } from '../../providers/AuthProvider';
import { colors, spacing, radius, shadows } from '../../theme/tokens';
import { SUPPORT_PHONE_DISPLAY } from '../../config';

type GuidedRouteProp = RouteProp<MainStackParamList, 'GuidedSupportFlow'>;

interface AttachmentItem {
  id: string;
  name: string;
  type: 'image' | 'video';
  sizeBytes: number;
  durationSec?: number;
}

export default function GuidedSupportFlowScreen() {
  const route = useRoute<GuidedRouteProp>();
  const navigation = useNavigation<MainStackNavigationProp>();
  const { isAuthenticated } = useAuth();

  const prefilledOrderId = route.params?.orderId;
  const prefilledCategory = route.params?.category;

  const [currentStep, setCurrentStep] = useState<number>(1);

  // Queries
  const { data: orders = [], isLoading: loadingOrders } = useOrders();
  const orderList: any[] = Array.isArray(orders) ? orders : ((orders as any)?.orders || []);
  const { data: config } = useSupportConfig();
  const createTicketMutation = useCreateTicket();
  const createReturnMutation = useCreateReturnRequest();

  // Selections
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isNotOrderRelated, setIsNotOrderRelated] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedIssue, setSelectedIssue] = useState<string>('');
  const [selectedOrderItemId, setSelectedOrderItemId] = useState<string>('');

  // Ticket Form state
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [callbackRequested, setCallbackRequested] = useState(false);
  const [callbackPhone, setCallbackPhone] = useState('');
  const [callbackSlot, setCallbackSlot] = useState('Morning (10:00 AM - 1:00 PM)');
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [isAttachModalOpen, setIsAttachModalOpen] = useState(false);

  // Return Form state
  const [isReturnMode, setIsReturnMode] = useState(false);
  const [returnType, setReturnType] = useState<'REFUND' | 'REPLACEMENT'>('REFUND');
  const [returnReason, setReturnReason] = useState('');
  const [refundMethod, setRefundMethod] = useState<'SOURCE' | 'BANK' | 'UPI'>('SOURCE');
  const [bankDetails, setBankDetails] = useState({
    accountNumber: '',
    confirmAccountNumber: '',
    ifscCode: '',
    accountHolderName: '',
    upiId: '',
  });

  // Handle prefill
  useEffect(() => {
    if (prefilledOrderId && orderList.length > 0) {
      const match = orderList.find(
        (o: any) => o.id === prefilledOrderId || o.orderNumber === prefilledOrderId,
      );
      if (match) {
        setSelectedOrder(match);
        setIsNotOrderRelated(false);
        if (match.items && match.items.length > 0) {
          setSelectedOrderItemId(match.items[0].id);
        }
        setCurrentStep(2);
      }
    }
    if (prefilledCategory) {
      setSelectedCategory(prefilledCategory);
    }
  }, [prefilledOrderId, prefilledCategory, orderList]);

  // Categories & Issues list from config or fallback
  const categoriesList = config?.categories || [
    {
      id: 'ORDER_DELIVERY',
      label: 'Order & Delivery',
      issues: [
        { id: 'DELAYED_DELIVERY', label: 'Delivery is delayed beyond promised date' },
        { id: 'INCORRECT_ADDRESS', label: 'Need to update delivery address or contact number' },
        { id: 'DELIVERED_NOT_RECEIVED', label: 'Package marked delivered but not received' },
      ],
    },
    {
      id: 'RETURN_REFUND',
      label: 'Return, Replacement & Refund',
      issues: [
        { id: 'DEFECTIVE_PRODUCT', label: 'Laptop has a technical or hardware defect' },
        { id: 'DAMAGED_IN_TRANSIT', label: 'Packaging or laptop damaged during transit' },
        { id: 'WRONG_SPECIFICATION', label: 'Specifications received differ from listing' },
        { id: 'REFUND_NOT_CREDITED', label: 'Refund not credited within expected timeline' },
      ],
    },
    {
      id: 'WARRANTY_REPAIR',
      label: 'Warranty & Protection Claim',
      issues: [
        { id: 'SCREEN_BATTERY_ISSUE', label: 'Screen flickering, lines or battery drain' },
        { id: 'CHARGER_KEYBOARD', label: 'Adapter, keyboard or touchpad not responding' },
        { id: 'CLAIM_EXTENDED_WARRANTY', label: 'Claim 1-year Mitra Extended Warranty' },
      ],
    },
    {
      id: 'PAYMENT',
      label: 'Payment & Invoicing',
      issues: [
        { id: 'PAYMENT_FAILED_DEBITED', label: 'Amount debited but order not confirmed' },
        { id: 'GST_INVOICE_REQUIRED', label: 'Need GST tax invoice with company details' },
      ],
    },
    {
      id: 'BUYBACK',
      label: 'Buyback Guarantee Claim',
      issues: [
        { id: 'BUYBACK_ESTIMATE', label: 'Calculate assured buyback value for my laptop' },
        { id: 'BUYBACK_PAYOUT', label: 'Payment inquiry for completed buyback pickup' },
      ],
    },
    {
      id: 'OTHER',
      label: 'Other Assistance',
      issues: [
        { id: 'TECHNICAL_SUPPORT', label: 'Driver installation or OS assistance' },
        { id: 'GENERAL_INQUIRY', label: 'General inquiry or feedback' },
      ],
    },
  ];

  const activeCategoryObj = categoriesList.find((c: any) => c.id === selectedCategory);
  const issuesList = activeCategoryObj?.issues || [];

  // Check 7-day return eligibility
  const checkReturnEligibility = () => {
    if (!selectedOrder) return { eligible: false, daysLeft: 0 };
    const date = new Date(selectedOrder.deliveredAt || selectedOrder.createdAt);
    const diffDays = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
    const eligible = diffDays <= 7 && selectedOrder.status === 'DELIVERED';
    return { eligible, daysLeft: Math.max(0, 7 - diffDays), daysPast: diffDays };
  };

  const returnEligibility = checkReturnEligibility();

  // Attachment Handler with size & duration validation
  const handleAddAttachment = (sample: { name: string; type: 'image' | 'video'; sizeBytes: number; durationSec?: number }) => {
    // Validation
    if (sample.type === 'image' && sample.sizeBytes > 10 * 1024 * 1024) {
      Alert.alert('File Too Large', 'Image size must be less than 10MB.');
      return;
    }
    if (sample.type === 'video') {
      if (sample.sizeBytes > 50 * 1024 * 1024) {
        Alert.alert('File Too Large', 'Video size must be less than 50MB.');
        return;
      }
      if (sample.durationSec && sample.durationSec > 30) {
        Alert.alert('Video Too Long', 'Video duration must not exceed 30 seconds.');
        return;
      }
    }

    setAttachments((prev) => [
      ...prev,
      {
        id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        ...sample,
      },
    ]);
    setIsAttachModalOpen(false);
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  // Submit Ticket
  const handleSubmitTicket = () => {
    if (!ticketMessage.trim()) {
      Alert.alert('Validation Error', 'Please describe your query or problem in detail.');
      return;
    }

    const payload: any = {
      subject: ticketSubject || `${activeCategoryObj?.label || 'Support'} Inquiry`,
      category: selectedCategory || 'OTHER',
      message: ticketMessage.trim(),
    };
    if (selectedIssue) payload.issueType = selectedIssue;
    if (selectedOrder?.id) payload.orderId = selectedOrder.id;
    if (selectedOrderItemId) payload.orderItemId = selectedOrderItemId;
    if (callbackRequested && callbackPhone) payload.callbackPhone = callbackPhone;
    if (callbackRequested && callbackSlot) payload.callbackSlot = callbackSlot;
    if (attachments.length > 0) payload.attachments = attachments.map((a) => a.name);

    createTicketMutation.mutate(payload, {
      onSuccess: (ticket: any) => {
        Alert.alert('Ticket Raised Successfully', `Ticket #${ticket.ticketNumber || ticket.id} has been created.`);
        navigation.navigate('TicketDetail', { ticketId: ticket.id, isNew: true });
      },
      onError: (err: any) => {
        Alert.alert('Submission Failed', err?.message || 'Could not raise ticket.');
      },
    });
  };

  // Submit Return
  const handleSubmitReturn = () => {
    if (!selectedOrder) return;
    if (!returnReason.trim()) {
      Alert.alert('Validation Error', 'Please provide a detailed reason for the return.');
      return;
    }

    if (refundMethod === 'BANK') {
      if (!bankDetails.accountNumber || !bankDetails.confirmAccountNumber) {
        Alert.alert('Validation Error', 'Please enter and confirm your bank account number.');
        return;
      }
      if (bankDetails.accountNumber !== bankDetails.confirmAccountNumber) {
        Alert.alert('Validation Error', 'Bank account numbers do not match.');
        return;
      }
      if (!bankDetails.ifscCode || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bankDetails.ifscCode.toUpperCase())) {
        Alert.alert('Validation Error', 'Invalid IFSC format (e.g. HDFC0001234).');
        return;
      }
      if (!bankDetails.accountHolderName.trim()) {
        Alert.alert('Validation Error', 'Account holder name is required.');
        return;
      }
    } else if (refundMethod === 'UPI') {
      if (!bankDetails.upiId.includes('@')) {
        Alert.alert('Validation Error', 'Please enter a valid UPI ID (e.g. name@okhdfcbank).');
        return;
      }
    }

    const payload: any = {
      orderId: selectedOrder.id,
      type: returnType,
      reason: returnReason.trim(),
      refundMethod,
      items: selectedOrder.items?.map((item: any) => ({
        orderItemId: item.id,
        quantity: item.quantity || 1,
      })) || [],
      attachments: attachments.map((a) => a.name),
      ...(refundMethod === 'BANK'
        ? {
            bankDetails: {
              accountNumber: bankDetails.accountNumber,
              ifscCode: bankDetails.ifscCode.toUpperCase(),
              accountHolderName: bankDetails.accountHolderName.trim(),
            },
          }
        : {}),
      ...(refundMethod === 'UPI' ? { upiId: bankDetails.upiId.trim() } : {}),
    };

    createReturnMutation.mutate(payload, {
      onSuccess: (ret: any) => {
        Alert.alert('Return Request Submitted', `Return #${ret.returnNumber || ret.id} created.`);
        navigation.navigate('ReturnDetail', { returnId: ret.id, isNew: true });
      },
      onError: (err: any) => {
        Alert.alert('Submission Failed', err?.message || 'Could not initiate return.');
      },
    });
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.centered}>
        <Ionicons name="lock-closed-outline" size={48} color={colors.primary} />
        <Text style={styles.authGateTitle}>Sign In for Guided Support</Text>
        <Text style={styles.authGateDesc}>
          To check orders, claim warranty, or file returns, please sign in with your verified account.
        </Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('MainTabs')}>
          <Text style={styles.primaryButtonText}>Go to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Step Progress Tracker */}
      <View style={styles.stepProgressRow}>
        {[1, 2, 3, 4].map((stepNum) => {
          const isActive = currentStep === stepNum;
          const isDone = currentStep > stepNum;
          return (
            <View key={stepNum} style={styles.stepIndicatorWrapper}>
              <View
                style={[
                  styles.stepIndicatorCircle,
                  isActive && styles.stepCircleActive,
                  isDone && styles.stepCircleDone,
                ]}
              >
                {isDone ? (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                ) : (
                  <Text style={[styles.stepNumText, isActive && styles.stepNumTextActive]}>{stepNum}</Text>
                )}
              </View>
              {stepNum < 4 && (
                <View style={[styles.stepLine, isDone && styles.stepLineDone]} />
              )}
            </View>
          );
        })}
      </View>

      {/* STEP 1: SELECT ORDER */}
      {currentStep === 1 && (
        <View>
          <Text style={styles.stepHeading}>Step 1: What is this request regarding?</Text>
          <Text style={styles.stepSubheading}>Select a recent order or continue for general assistance.</Text>

          {loadingOrders ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 20 }} />
          ) : (
            <View style={styles.ordersList}>
              {orderList.map((ord: any) => {
                const isSelected = selectedOrder?.id === ord.id;
                return (
                  <TouchableOpacity
                    key={ord.id}
                    style={[styles.orderSelectCard, isSelected && styles.orderCardSelected]}
                    onPress={() => {
                      setSelectedOrder(ord);
                      setIsNotOrderRelated(false);
                      if (ord.items?.[0]) setSelectedOrderItemId(ord.items[0].id);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.orderHeaderRow}>
                      <Text style={styles.orderNumberText}>Order #{ord.orderNumber || ord.id.slice(-8)}</Text>
                      <View style={styles.statusPill}>
                        <Text style={styles.statusPillText}>{ord.status}</Text>
                      </View>
                    </View>
                    <Text style={styles.orderItemsText}>
                      {ord.items?.map((i: any) => i.product?.name || 'Refurbished Laptop').join(', ')}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                style={[styles.noOrderOption, isNotOrderRelated && styles.noOrderOptionSelected]}
                onPress={() => {
                  setSelectedOrder(null);
                  setIsNotOrderRelated(true);
                }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isNotOrderRelated ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={isNotOrderRelated ? colors.primary : colors.textMuted}
                />
                <Text style={styles.noOrderText}>My issue is not about a specific order</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={[styles.primaryButton, (!selectedOrder && !isNotOrderRelated) && styles.buttonDisabled]}
            disabled={!selectedOrder && !isNotOrderRelated}
            onPress={() => setCurrentStep(2)}
          >
            <Text style={styles.primaryButtonText}>Continue to Issue Selection</Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* STEP 2: CATEGORY & ISSUE */}
      {currentStep === 2 && (
        <View>
          <View style={styles.stepBackHeader}>
            <TouchableOpacity onPress={() => setCurrentStep(1)} style={styles.backLink}>
              <Ionicons name="arrow-back" size={18} color={colors.primary} />
              <Text style={styles.backLinkText}>Change Order</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.stepHeading}>Step 2: Choose Category & Specific Issue</Text>
          <Text style={styles.stepSubheading}>Select what best describes what you are experiencing.</Text>

          {/* Category Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {categoriesList.map((cat: any) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.categoryPill, isSelected && styles.categoryPillSelected]}
                  onPress={() => {
                    setSelectedCategory(cat.id);
                    setSelectedIssue('');
                  }}
                >
                  <Text style={[styles.categoryPillText, isSelected && styles.categoryPillTextSelected]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Issues List */}
          {selectedCategory ? (
            <View style={styles.issuesContainer}>
              <Text style={styles.fieldLabel}>Select Specific Issue:</Text>
              {issuesList.map((iss: any) => {
                const isSelected = selectedIssue === iss.id;
                return (
                  <TouchableOpacity
                    key={iss.id}
                    style={[styles.issueCard, isSelected && styles.issueCardSelected]}
                    onPress={() => {
                      setSelectedIssue(iss.id);
                      setTicketSubject(`${activeCategoryObj?.label}: ${iss.label}`);
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                      size={20}
                      color={isSelected ? colors.primary : colors.textMuted}
                    />
                    <Text style={styles.issueLabelText}>{iss.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <Text style={styles.hintText}>Please select a category above to view related issues.</Text>
          )}

          <TouchableOpacity
            style={[styles.primaryButton, !selectedIssue && styles.buttonDisabled]}
            disabled={!selectedIssue}
            onPress={() => setCurrentStep(3)}
          >
            <Text style={styles.primaryButtonText}>View Instant Solutions</Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* STEP 3: SELF-SERVE SOLUTIONS */}
      {currentStep === 3 && (
        <View>
          <View style={styles.stepBackHeader}>
            <TouchableOpacity onPress={() => setCurrentStep(2)} style={styles.backLink}>
              <Ionicons name="arrow-back" size={18} color={colors.primary} />
              <Text style={styles.backLinkText}>Change Issue</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.stepHeading}>Step 3: Instant Self-Serve Options</Text>
          <Text style={styles.stepSubheading}>Most inquiries can be resolved right away without waiting.</Text>

          {/* Solution 1: Courier Tracking */}
          {selectedOrder && (
            <View style={styles.solutionCard}>
              <View style={styles.solutionCardHeader}>
                <Ionicons name="airplane-outline" size={22} color={colors.primary} />
                <Text style={styles.solutionCardTitle}>Real-Time Courier Tracking</Text>
              </View>
              <Text style={styles.solutionCardDesc}>
                Order #{selectedOrder.orderNumber || selectedOrder.id.slice(-8)} is currently{' '}
                <Text style={{ fontWeight: '700' }}>{selectedOrder.status}</Text>.
              </Text>
              <TouchableOpacity
                style={styles.outlineButton}
                onPress={() => navigation.navigate('OrderDetail', { orderId: selectedOrder.id })}
              >
                <Text style={styles.outlineButtonText}>Open Live Tracking</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Solution 2: 7-Day Mitra Guarantee & Returns */}
          {selectedOrder && (
            <View style={styles.solutionCard}>
              <View style={styles.solutionCardHeader}>
                <Ionicons name="shield-checkmark" size={22} color={colors.green} />
                <Text style={styles.solutionCardTitle}>7-Day Mitra Replacement & Return</Text>
              </View>
              {returnEligibility.eligible ? (
                <View>
                  <Text style={styles.solutionCardDesc}>
                    Your laptop was delivered recently and has{' '}
                    <Text style={{ fontWeight: '700', color: colors.green }}>
                      {returnEligibility.daysLeft} day(s) left
                    </Text>{' '}
                    in the Mitra return window.
                  </Text>
                  <TouchableOpacity
                    style={[styles.primaryButton, { backgroundColor: colors.green, marginTop: 8 }]}
                    onPress={() => {
                      setIsReturnMode(true);
                      setCurrentStep(4);
                    }}
                  >
                    <Text style={styles.primaryButtonText}>Initiate Return / Replacement</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={styles.solutionCardDesc}>
                  The 7-day return window has closed. Your device remains fully covered under the 1-Year Mitra
                  Warranty for parts and technical repair.
                </Text>
              )}
            </View>
          )}

          {/* Solution 3: Hotline Call */}
          <View style={styles.solutionCard}>
            <View style={styles.solutionCardHeader}>
              <Ionicons name="call-outline" size={22} color={colors.navy} />
              <Text style={styles.solutionCardTitle}>Speak with a Hardware Technician</Text>
            </View>
            <Text style={styles.solutionCardDesc}>
              Our diagnostics engineers are available from 10:00 AM to 7:00 PM (Mon-Sat).
            </Text>
            <TouchableOpacity
              style={[styles.outlineButton, { borderColor: colors.navy }]}
              onPress={() => navigation.navigate('HelpHome')}
            >
              <Text style={[styles.outlineButtonText, { color: colors.navy }]}>
                Call {SUPPORT_PHONE_DISPLAY}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Continue to Ticket */}
          <TouchableOpacity
            style={[styles.primaryButton, { marginTop: spacing.md }]}
            onPress={() => {
              setIsReturnMode(false);
              setCurrentStep(4);
            }}
          >
            <Text style={styles.primaryButtonText}>None of these helped? Raise a Ticket</Text>
            <Ionicons name="chatbubbles" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* STEP 4: RAISE TICKET OR RETURN */}
      {currentStep === 4 && (
        <View>
          <View style={styles.stepBackHeader}>
            <TouchableOpacity onPress={() => setCurrentStep(3)} style={styles.backLink}>
              <Ionicons name="arrow-back" size={18} color={colors.primary} />
              <Text style={styles.backLinkText}>Back to Solutions</Text>
            </TouchableOpacity>
          </View>

          {/* ANTI-FRAUD SECURITY WARNING */}
          <View style={styles.antiFraudCard}>
            <Ionicons name="warning" size={20} color={colors.orange} />
            <View style={{ flex: 1 }}>
              <Text style={styles.antiFraudTitle}>Anti-Fraud Security Notice</Text>
              <Text style={styles.antiFraudText}>
                LaptopMitra specialists will <Text style={{ fontWeight: '700' }}>NEVER</Text> ask for your OTP,
                ATM PIN, UPI MPIN, or request remote software like AnyDesk/TeamViewer. All official updates appear inside this app.
              </Text>
            </View>
          </View>

          {isReturnMode ? (
            /* RETURN FORM */
            <View style={styles.formContainer}>
              <Text style={styles.stepHeading}>Initiate Return or Replacement</Text>

              {/* Type Switch */}
              <View style={styles.typeSelectorRow}>
                <TouchableOpacity
                  style={[styles.typePill, returnType === 'REFUND' && styles.typePillActive]}
                  onPress={() => setReturnType('REFUND')}
                >
                  <Text style={[styles.typePillText, returnType === 'REFUND' && styles.typePillTextActive]}>
                    Full Refund
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typePill, returnType === 'REPLACEMENT' && styles.typePillActive]}
                  onPress={() => setReturnType('REPLACEMENT')}
                >
                  <Text style={[styles.typePillText, returnType === 'REPLACEMENT' && styles.typePillTextActive]}>
                    Device Replacement
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Reason */}
              <Text style={styles.fieldLabel}>Reason for Return:</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Explain the functional flaw or hardware fault in detail..."
                placeholderTextColor={colors.textMuted}
                value={returnReason}
                onChangeText={setReturnReason}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              {/* Refund Method (if Refund) */}
              {returnType === 'REFUND' && (
                <View style={{ marginTop: spacing.md }}>
                  <Text style={styles.fieldLabel}>Refund Destination:</Text>
                  <View style={styles.refundMethodRow}>
                    {['SOURCE', 'BANK', 'UPI'].map((method) => (
                      <TouchableOpacity
                        key={method}
                        style={[styles.refundMethodPill, refundMethod === method && styles.refundMethodPillActive]}
                        onPress={() => setRefundMethod(method as any)}
                      >
                        <Text style={[styles.refundMethodText, refundMethod === method && styles.refundMethodTextActive]}>
                          {method === 'SOURCE' ? 'Original Payment' : method === 'BANK' ? 'Bank Account' : 'UPI ID'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Bank Details Double Entry */}
                  {refundMethod === 'BANK' && (
                    <View style={styles.bankFieldsContainer}>
                      <Text style={styles.fieldLabel}>Account Holder Name</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Full Name as per Bank"
                        value={bankDetails.accountHolderName}
                        onChangeText={(v) => setBankDetails((prev) => ({ ...prev, accountHolderName: v }))}
                      />

                      <Text style={styles.fieldLabel}>Account Number</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Enter Bank Account Number"
                        keyboardType="number-pad"
                        secureTextEntry
                        value={bankDetails.accountNumber}
                        onChangeText={(v) => setBankDetails((prev) => ({ ...prev, accountNumber: v }))}
                      />

                      <Text style={styles.fieldLabel}>Confirm Account Number</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Re-enter Bank Account Number"
                        keyboardType="number-pad"
                        value={bankDetails.confirmAccountNumber}
                        onChangeText={(v) => setBankDetails((prev) => ({ ...prev, confirmAccountNumber: v }))}
                      />

                      <Text style={styles.fieldLabel}>IFSC Code</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="e.g. HDFC0001234"
                        autoCapitalize="characters"
                        value={bankDetails.ifscCode}
                        onChangeText={(v) => setBankDetails((prev) => ({ ...prev, ifscCode: v.toUpperCase() }))}
                      />
                    </View>
                  )}

                  {refundMethod === 'UPI' && (
                    <View style={styles.bankFieldsContainer}>
                      <Text style={styles.fieldLabel}>UPI ID (VPA)</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="e.g. yourname@okhdfcbank"
                        autoCapitalize="none"
                        value={bankDetails.upiId}
                        onChangeText={(v) => setBankDetails((prev) => ({ ...prev, upiId: v }))}
                      />
                    </View>
                  )}
                </View>
              )}

              {/* Attachments */}
              <View style={{ marginTop: spacing.md }}>
                <Text style={styles.fieldLabel}>Photo or Video Evidence (Optional):</Text>
                <TouchableOpacity
                  style={styles.addAttachmentBtn}
                  onPress={() => setIsAttachModalOpen(true)}
                >
                  <Ionicons name="camera-outline" size={18} color={colors.primary} />
                  <Text style={styles.addAttachmentText}>Add Photo / Diagnostic Video</Text>
                </TouchableOpacity>

                {attachments.map((att) => (
                  <View key={att.id} style={styles.attachmentChip}>
                    <Ionicons
                      name={att.type === 'video' ? 'videocam' : 'image'}
                      size={16}
                      color={colors.primary}
                    />
                    <Text style={styles.attachmentName} numberOfLines={1}>
                      {att.name} ({(att.sizeBytes / (1024 * 1024)).toFixed(1)}MB)
                    </Text>
                    <TouchableOpacity onPress={() => handleRemoveAttachment(att.id)}>
                      <Ionicons name="close-circle" size={18} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, createReturnMutation.isPending && styles.buttonDisabled]}
                disabled={createReturnMutation.isPending}
                onPress={handleSubmitReturn}
              >
                {createReturnMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Text style={styles.primaryButtonText}>Submit Return Request</Text>
                    <Ionicons name="checkmark-circle" size={16} color="#fff" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            /* TICKET FORM */
            <View style={styles.formContainer}>
              <Text style={styles.stepHeading}>Raise Priority Support Ticket</Text>

              <Text style={styles.fieldLabel}>Subject:</Text>
              <TextInput
                style={styles.input}
                value={ticketSubject}
                onChangeText={setTicketSubject}
                placeholder="Brief summary of the inquiry"
              />

              <Text style={styles.fieldLabel}>Detailed Description:</Text>
              <TextInput
                style={styles.textArea}
                value={ticketMessage}
                onChangeText={setTicketMessage}
                placeholder="Please describe symptoms, error messages, or details..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              {/* Callback Request */}
              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchLabel}>Request Specialist Callback</Text>
                  <Text style={styles.switchSublabel}>Receive a phone consultation from an engineer.</Text>
                </View>
                <Switch
                  value={callbackRequested}
                  onValueChange={setCallbackRequested}
                  trackColor={{ false: '#cbd5e1', true: colors.primary }}
                />
              </View>

              {callbackRequested && (
                <View style={styles.callbackFields}>
                  <Text style={styles.fieldLabel}>Phone Number:</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="10-digit mobile number"
                    keyboardType="phone-pad"
                    value={callbackPhone}
                    onChangeText={setCallbackPhone}
                  />

                  <Text style={styles.fieldLabel}>Preferred Time Slot:</Text>
                  <View style={styles.slotRow}>
                    {['Morning (10 AM - 1 PM)', 'Afternoon (1 PM - 4 PM)', 'Evening (4 PM - 7 PM)'].map((slot) => (
                      <TouchableOpacity
                        key={slot}
                        style={[styles.slotPill, callbackSlot === slot && styles.slotPillActive]}
                        onPress={() => setCallbackSlot(slot)}
                      >
                        <Text style={[styles.slotText, callbackSlot === slot && styles.slotTextActive]}>
                          {slot}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Attachments Section */}
              <View style={{ marginTop: spacing.md }}>
                <Text style={styles.fieldLabel}>Evidence Attachments (Max 10MB photo, 50MB/30s video):</Text>
                <TouchableOpacity
                  style={styles.addAttachmentBtn}
                  onPress={() => setIsAttachModalOpen(true)}
                >
                  <Ionicons name="attach" size={18} color={colors.primary} />
                  <Text style={styles.addAttachmentText}>Attach Photo / Video Evidence</Text>
                </TouchableOpacity>

                {attachments.map((att) => (
                  <View key={att.id} style={styles.attachmentChip}>
                    <Ionicons
                      name={att.type === 'video' ? 'videocam' : 'image'}
                      size={16}
                      color={colors.primary}
                    />
                    <Text style={styles.attachmentName} numberOfLines={1}>
                      {att.name} ({(att.sizeBytes / (1024 * 1024)).toFixed(1)}MB)
                    </Text>
                    <TouchableOpacity onPress={() => handleRemoveAttachment(att.id)}>
                      <Ionicons name="close-circle" size={18} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, createTicketMutation.isPending && styles.buttonDisabled]}
                disabled={createTicketMutation.isPending}
                onPress={handleSubmitTicket}
              >
                {createTicketMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Text style={styles.primaryButtonText}>Create Support Ticket</Text>
                    <Ionicons name="checkmark-circle" size={16} color="#fff" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* ATTACHMENT MODAL */}
      <Modal visible={isAttachModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Attachment</Text>
              <TouchableOpacity onPress={() => setIsAttachModalOpen(false)}>
                <Ionicons name="close" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Attach hardware photos or brief diagnostic video clips (validated: size ≤10MB photos, ≤50MB & ≤30s video).
            </Text>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={() =>
                handleAddAttachment({
                  name: `hardware-photo-${Date.now().toString().slice(-4)}.jpg`,
                  type: 'image',
                  sizeBytes: 2.4 * 1024 * 1024,
                })
              }
            >
              <Ionicons name="image" size={24} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.modalOptionTitle}>Laptop Photo / Screen Flaw</Text>
                <Text style={styles.modalOptionSubtitle}>2.4 MB (Photo format)</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={() =>
                handleAddAttachment({
                  name: `diagnostic-video-${Date.now().toString().slice(-4)}.mp4`,
                  type: 'video',
                  sizeBytes: 18 * 1024 * 1024,
                  durationSec: 15,
                })
              }
            >
              <Ionicons name="videocam" size={24} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.modalOptionTitle}>Flickering / Boot Video Clip</Text>
                <Text style={styles.modalOptionSubtitle}>18 MB • 15 Seconds (Valid duration)</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={() =>
                handleAddAttachment({
                  name: `invoice-doc-${Date.now().toString().slice(-4)}.pdf`,
                  type: 'image',
                  sizeBytes: 0.8 * 1024 * 1024,
                })
              }
            >
              <Ionicons name="document-text" size={24} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.modalOptionTitle}>Invoice / Courier Receipt</Text>
                <Text style={styles.modalOptionSubtitle}>0.8 MB</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.pageBg,
  },
  content: {
    padding: spacing.md,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.pageBg,
  },
  authGateTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  authGateDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginVertical: spacing.sm,
    lineHeight: 18,
  },
  stepProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  stepIndicatorWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepIndicatorCircle: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {
    backgroundColor: colors.primary,
  },
  stepCircleDone: {
    backgroundColor: colors.green,
  },
  stepNumText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  stepNumTextActive: {
    color: '#fff',
  },
  stepLine: {
    width: 32,
    height: 3,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 4,
  },
  stepLineDone: {
    backgroundColor: colors.green,
  },
  stepHeading: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  stepSubheading: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: spacing.md,
  },
  stepBackHeader: {
    marginBottom: spacing.sm,
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  ordersList: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  orderSelectCard: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
  },
  orderCardSelected: {
    borderColor: colors.primary,
    backgroundColor: '#eff6ff',
  },
  orderHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  orderNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statusPill: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  orderItemsText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  noOrderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
  },
  noOrderOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: '#eff6ff',
  },
  noOrderText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  categoryScroll: {
    marginBottom: spacing.md,
  },
  categoryPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginRight: spacing.xs,
  },
  categoryPillSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  categoryPillTextSelected: {
    color: '#fff',
  },
  issuesContainer: {
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  issueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.cardBg,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  issueCardSelected: {
    borderColor: colors.primary,
    backgroundColor: '#eff6ff',
  },
  issueLabelText: {
    fontSize: 13,
    color: colors.textPrimary,
    flex: 1,
  },
  hintText: {
    fontSize: 13,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginVertical: spacing.md,
  },
  solutionCard: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  solutionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 4,
  },
  solutionCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  solutionCardDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  outlineButton: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 8,
    alignItems: 'center',
  },
  outlineButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  antiFraudCard: {
    flexDirection: 'row',
    backgroundColor: '#fffbeb',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#fde68a',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  antiFraudTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400e',
    marginBottom: 2,
  },
  antiFraudText: {
    fontSize: 11,
    color: '#78350f',
    lineHeight: 16,
  },
  formContainer: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.sm,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.sm,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.textPrimary,
  },
  textArea: {
    backgroundColor: '#f8fafc',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.textPrimary,
    minHeight: 80,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
    paddingVertical: spacing.xs,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.cardBorderLight,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  switchSublabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  callbackFields: {
    backgroundColor: '#f8fafc',
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  slotRow: {
    gap: 4,
  },
  slotPill: {
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  slotPillActive: {
    borderColor: colors.primary,
    backgroundColor: '#eff6ff',
  },
  slotText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  slotTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  addAttachmentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 10,
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    marginVertical: spacing.xs,
  },
  addAttachmentText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  attachmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    gap: 6,
    marginTop: 4,
  },
  attachmentName: {
    fontSize: 11,
    color: colors.textPrimary,
    flex: 1,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginVertical: spacing.sm,
  },
  typePill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: '#f8fafc',
  },
  typePillActive: {
    borderColor: colors.primary,
    backgroundColor: '#eff6ff',
  },
  typePillText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  typePillTextActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  refundMethodRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginVertical: spacing.xs,
  },
  refundMethodPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: '#f8fafc',
  },
  refundMethodPillActive: {
    borderColor: colors.primary,
    backgroundColor: '#eff6ff',
  },
  refundMethodText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  refundMethodTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  bankFieldsContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: radius.md,
    padding: spacing.sm,
    marginTop: spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.cardBg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 16,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: '#f8fafc',
    marginBottom: spacing.sm,
  },
  modalOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalOptionSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
