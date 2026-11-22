'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatIndianRupees } from '@/lib/account-helpers';
import { isActionImplemented } from '@laptopmitra/types';
import {
  X,
  HelpCircle,
  Loader2,
  AlertCircle,
  Clock,
  ShieldCheck,
  RotateCcw,
  MapPin,
  Phone,
  Wrench,
  FileText,
  Building2,
  PackageCheck,
  Truck,
  CheckCircle2,
  PhoneCall,
  MessageSquare,
  Sparkles,
  ArrowRight,
  ShoppingBag,
} from 'lucide-react';
import { ChangeRequestModal } from './ChangeRequestModal';
import { BuybackClaimModal } from './BuybackClaimModal';
import { WarrantyClaimModal } from './WarrantyClaimModal';
import { SupportCallbackModal } from './SupportCallbackModal';
import { SupportTicketModal } from './SupportTicketModal';
import { TrackDeliveryModal } from './TrackDeliveryModal';
import { TaxInvoiceModal } from './TaxInvoiceModal';
import { ItemReturnModal } from './ItemReturnModal';

interface ItemSituationHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderNumber: string;
  orderItemId: string;
  productName: string;
  purchaseMode: string;
  unitPrice: number;
  initialShippingAddress?: any;
  initialPhone?: string;
  onActionSuccess: (message: string) => void;
  onOpenReturnModal?: () => void;
}

function formatDateIST(dateStr?: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}

export function ItemSituationHelpModal({
  isOpen,
  onClose,
  orderId,
  orderNumber,
  orderItemId,
  productName,
  purchaseMode,
  unitPrice,
  initialShippingAddress,
  initialPhone,
  onActionSuccess,
  onOpenReturnModal,
}: ItemSituationHelpModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [situationData, setSituationData] = useState<any>(null);

  // Sub-modals state
  const [changeType, setChangeType] = useState<'ADDRESS_CHANGE' | 'PHONE_CHANGE' | null>(null);
  const [buybackModalOpen, setBuybackModalOpen] = useState(false);
  const [warrantyModalOpen, setWarrantyModalOpen] = useState(false);
  const [callbackModalOpen, setCallbackModalOpen] = useState(false);
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [ticketPrefill, setTicketPrefill] = useState<{ category?: string; subject?: string }>({});
  const [trackingModalOpen, setTrackingModalOpen] = useState(false);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [returnModalOpen, setReturnModalOpen] = useState(false);

  // Focus trap ref
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    previousActiveElement.current = document.activeElement as HTMLElement | null;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Tab' && modalRef.current) {
        const focusables = modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      previousActiveElement.current?.focus();
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !orderItemId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    api
      .getItemSituation(orderItemId)
      .then((res: any) => {
        if (isMounted) {
          setSituationData(res);
          setLoading(false);
        }
      })
      .catch((err: any) => {
        if (isMounted) {
          setError(err?.message || 'Failed to load item help options.');
          setLoading(false);
        }
      });

  }, [isOpen, orderItemId]);

  if (!isOpen) return null;

  const handleActionClick = (actionId: string) => {
    switch (actionId) {
      case 'CANCEL_ORDER':
        if (
          window.confirm(
            `Are you sure you want to cancel ${productName} from order #${orderNumber}?`
          )
        ) {
          setLoading(true);
          api
            .cancelOrderItem(orderId, orderItemId, 'Customer cancelled item via Need Help')
            .then(() => {
              onActionSuccess('Item cancelled successfully.');
              onClose();
            })
            .catch((err: any) => {
              setError(err?.message || 'Failed to cancel item.');
              setLoading(false);
            });
        }
        break;

      case 'REQUEST_ADDRESS_CHANGE':
        setChangeType('ADDRESS_CHANGE');
        break;

      case 'REQUEST_PHONE_CHANGE':
        setChangeType('PHONE_CHANGE');
        break;

      case 'REQUEST_RETURN':
        if (onOpenReturnModal) {
          onClose();
          onOpenReturnModal();
        } else {
          setReturnModalOpen(true);
        }
        break;

      case 'CLAIM_WARRANTY':
      case 'LEASE_MAINTENANCE':
        setWarrantyModalOpen(true);
        break;

      case 'REQUEST_BUYBACK':
        setBuybackModalOpen(true);
        break;

      case 'DOWNLOAD_INVOICE':
        setInvoiceModalOpen(true);
        break;

      case 'TRACK_SHIPMENT':
        setTrackingModalOpen(true);
        break;

      case 'REQUEST_CALLBACK':
        setCallbackModalOpen(true);
        break;

      case 'CORP_ACCOUNT_MANAGER_CALLBACK':
        setCallbackModalOpen(true);
        break;

      case 'CORP_GST_CORRECTION':
        setTicketPrefill({
          category: 'BILLING',
          subject: `GST Invoice Correction for Order #${orderNumber}`,
        });
        setTicketModalOpen(true);
        break;

      case 'CORP_ADD_UNITS':
        setTicketPrefill({
          category: 'CORPORATE',
          subject: `Corporate Bulk Quote / Additional Units for ${productName}`,
        });
        setTicketModalOpen(true);
        break;

      case 'LEASE_BUYOUT':
        if (situationData?.leaseContract?.id) {
          setLoading(true);
          api
            .requestLeaseBuyout(situationData.leaseContract.id)
            .then((res: any) => {
              onActionSuccess(res?.message || 'Buyout requested successfully.');
              onClose();
            })
            .catch((err: any) => {
              setError(err?.message || 'Failed to submit buyout request.');
              setLoading(false);
            });
        }
        break;

      case 'CREATE_TICKET':
        setTicketPrefill({});
        setTicketModalOpen(true);
        break;

      default:
        break;
    }
  };

  const getActionIcon = (id: string) => {
    switch (id) {
      case 'CANCEL_ORDER':
        return <X className="w-4 h-4 text-rose-600 shrink-0" />;
      case 'REQUEST_ADDRESS_CHANGE':
        return <MapPin className="w-4 h-4 text-blue-600 shrink-0" />;
      case 'REQUEST_PHONE_CHANGE':
        return <Phone className="w-4 h-4 text-blue-600 shrink-0" />;
      case 'REQUEST_RETURN':
        return <RotateCcw className="w-4 h-4 text-amber-600 shrink-0" />;
      case 'CLAIM_WARRANTY':
      case 'LEASE_MAINTENANCE':
        return <Wrench className="w-4 h-4 text-blue-600 shrink-0" />;
      case 'REQUEST_BUYBACK':
        return <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />;
      case 'DOWNLOAD_INVOICE':
        return <FileText className="w-4 h-4 text-indigo-600 shrink-0" />;
      case 'TRACK_SHIPMENT':
        return <Truck className="w-4 h-4 text-teal-600 shrink-0" />;
      case 'REQUEST_CALLBACK':
      case 'CORP_ACCOUNT_MANAGER_CALLBACK':
        return <PhoneCall className="w-4 h-4 text-purple-600 shrink-0" />;
      case 'CREATE_TICKET':
      case 'CORP_GST_CORRECTION':
      case 'CORP_ADD_UNITS':
        return <MessageSquare className="w-4 h-4 text-slate-700 shrink-0" />;
      case 'LEASE_BUYOUT':
      case 'LEASE_EXTEND':
        return <Building2 className="w-4 h-4 text-purple-600 shrink-0" />;
      default:
        return <HelpCircle className="w-4 h-4 text-slate-600 shrink-0" />;
    }
  };

  // Group actions by section
  const availableActions = (situationData?.actions || []).filter((act: any) =>
    isActionImplemented(act.id, 'web')
  );

  const sections = [
    {
      title: 'Orders & Delivery',
      icon: <Truck className="w-3.5 h-3.5 text-blue-600" />,
      actions: availableActions.filter((a: any) =>
        ['CANCEL_ORDER', 'REQUEST_ADDRESS_CHANGE', 'REQUEST_PHONE_CHANGE', 'TRACK_SHIPMENT'].includes(
          a.id
        )
      ),
    },
    {
      title: 'Returns & Exchanges',
      icon: <RotateCcw className="w-3.5 h-3.5 text-amber-600" />,
      actions: availableActions.filter((a: any) => ['REQUEST_RETURN'].includes(a.id)),
    },
    {
      title: 'Warranty & Repairs',
      icon: <Wrench className="w-3.5 h-3.5 text-blue-600" />,
      actions: availableActions.filter((a: any) =>
        ['CLAIM_WARRANTY', 'LEASE_MAINTENANCE'].includes(a.id)
      ),
    },
    {
      title: 'Ownership & Buyback',
      icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />,
      actions: availableActions.filter((a: any) =>
        ['REQUEST_BUYBACK', 'LEASE_BUYOUT', 'LEASE_EXTEND'].includes(a.id)
      ),
    },
    {
      title: 'Invoices & Documents',
      icon: <FileText className="w-3.5 h-3.5 text-indigo-600" />,
      actions: availableActions.filter((a: any) =>
        ['DOWNLOAD_INVOICE', 'CORP_GST_CORRECTION', 'CORP_ADD_UNITS'].includes(a.id)
      ),
    },
    {
      title: 'Talk to Us',
      icon: <PhoneCall className="w-3.5 h-3.5 text-purple-600" />,
      actions: availableActions.filter((a: any) =>
        ['REQUEST_CALLBACK', 'CORP_ACCOUNT_MANAGER_CALLBACK'].includes(a.id)
      ),
    },
  ].filter((sec) => sec.actions.length > 0);

  // Compute Next Best Action
  let nextBestAction: {
    id: string;
    label: string;
    description: string;
    badge: string;
    actionId: string;
  } | null = null;

  if (situationData) {
    if (situationData.isWithin7DayReturnWindow) {
      nextBestAction = {
        id: 'nba-return',
        label: 'Return or Replacement Window Active',
        description: `Eligible for exchange or return until ${formatDateIST(
          situationData.returnDeadlineIso
        )}. Free doorstep pickup.`,
        badge: 'Recommended',
        actionId: 'REQUEST_RETURN',
      };
    } else if (situationData.warranty?.isInWarranty) {
      nextBestAction = {
        id: 'nba-warranty',
        label: 'Covered under Active Warranty',
        description: `Hardware repair or replacement covered until ${formatDateIST(
          situationData.warranty.warrantyExpiresAt
        )}.`,
        badge: 'Warranty Active',
        actionId: 'CLAIM_WARRANTY',
      };
    } else if (situationData.buybackEligible) {
      nextBestAction = {
        id: 'nba-buyback',
        label: 'Guaranteed Buyback Active',
        description: `Sell back this device for ${situationData.buybackTierPercentage}% of invoice (${formatIndianRupees(
          situationData.buybackEstimatedPayout
        )}).`,
        badge: 'Buyback Eligible',
        actionId: 'REQUEST_BUYBACK',
      };
    } else if (['PENDING', 'CONFIRMED'].includes(situationData.itemStatus || '')) {
      nextBestAction = {
        id: 'nba-dispatch',
        label: 'Order in Preparation',
        description: 'You can update delivery address or mobile number before shipment dispatch.',
        badge: 'Pre-Dispatch',
        actionId: 'REQUEST_ADDRESS_CHANGE',
      };
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="situation-modal-title"
      >
        <div
          ref={modalRef}
          className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-50 text-blue-700 rounded-xl">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h2 id="situation-modal-title" className="text-sm font-bold text-slate-900">
                  Help with this Item
                </h2>
                <p className="text-[11px] text-slate-500 truncate max-w-xs sm:max-w-sm">
                  {productName} • Order #{orderNumber}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-xs text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span>Analyzing order and device status...</span>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          ) : situationData ? (
            <div className="space-y-4">
              {/* Situation Status Card */}
              <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-600 text-white">
                    {situationData.situationTitle}
                  </span>
                  {situationData.isPriorityClient && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                      <Building2 className="w-3 h-3" /> Priority Business Support
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  {situationData.situationDescription}
                </p>

                {/* Return deadline badge if active */}
                {situationData.isWithin7DayReturnWindow && situationData.returnDeadlineIso && (
                  <div className="flex items-center gap-1.5 text-[11px] text-amber-800 font-medium pt-1">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>
                      Return window closes {formatDateIST(situationData.returnDeadlineIso)}
                    </span>
                  </div>
                )}

                {/* Buyback guarantee highlight if eligible */}
                {situationData.buybackEligible && (
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 font-semibold pt-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>
                      Guaranteed Buyback: {situationData.buybackTierPercentage}% of invoice (
                      {formatIndianRupees(situationData.buybackEstimatedPayout)})
                    </span>
                  </div>
                )}
              </div>

              {/* Next Best Action Card (Highlighted) */}
              {nextBestAction && (
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50/50 to-slate-50 border border-blue-200/80 flex items-center justify-between gap-3 shadow-2xs">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
                        {nextBestAction.badge}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-900 mt-0.5">
                      {nextBestAction.label}
                    </p>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      {nextBestAction.description}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleActionClick(nextBestAction!.actionId)}
                    className="shrink-0 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition shadow-xs flex items-center gap-1 cursor-pointer"
                  >
                    Action <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Categorized Action Catalog */}
              <div className="space-y-4">
                {sections.map((section) => (
                  <div key={section.title} className="space-y-2">
                    <div className="flex items-center gap-1.5 text-slate-800 text-xs font-bold uppercase tracking-wider">
                      {section.icon}
                      <span>{section.title}</span>
                    </div>

                    <div className="space-y-1.5">
                      {section.actions.map((act: any) => {
                        const content = (
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5">{getActionIcon(act.id)}</div>
                            <div className="min-w-0 flex-1">
                              <p
                                className={`text-xs font-semibold ${
                                  act.enabled ? 'text-slate-900' : 'text-slate-400'
                                }`}
                              >
                                {act.label}
                              </p>
                              {!act.enabled && act.disabledReason && (
                                <p className="text-[11px] text-slate-500 font-normal mt-0.5 leading-relaxed">
                                  {act.disabledReason}
                                </p>
                              )}
                            </div>
                          </div>
                        );

                        return (
                          <button
                            key={act.id}
                            type="button"
                            disabled={!act.enabled}
                            onClick={() => handleActionClick(act.id)}
                            className={`w-full text-left p-3 rounded-xl border transition ${
                              act.enabled
                                ? 'border-slate-200 hover:border-blue-400 hover:bg-blue-50/20 cursor-pointer shadow-2xs'
                                : 'border-slate-100 bg-slate-50/50 cursor-not-allowed opacity-75'
                            }`}
                          >
                            {content}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Need specific help?</span>
            <button
              type="button"
              onClick={() => {
                setTicketPrefill({});
                setTicketModalOpen(true);
              }}
              className="text-blue-600 font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              Raise a Support Ticket →
            </button>
          </div>
        </div>
      </div>

      {/* Sub-Modal: Change Request (Address / Phone) */}
      {changeType && (
        <ChangeRequestModal
          isOpen={true}
          onClose={() => setChangeType(null)}
          orderId={orderId}
          orderNumber={orderNumber}
          type={changeType}
          initialData={{
            addressLine1:
              initialShippingAddress?.addressLine1 || initialShippingAddress?.address || '',
            city: initialShippingAddress?.city || '',
            state: initialShippingAddress?.state || '',
            postalCode:
              initialShippingAddress?.postalCode || initialShippingAddress?.pincode || '',
            phone: initialPhone || '',
          }}
          onSuccess={(reqNum) => {
            onActionSuccess(`Change request #${reqNum} submitted for support review.`);
            onClose();
          }}
        />
      )}

      {/* Sub-Modal: Buyback Claim */}
      {buybackModalOpen && (
        <BuybackClaimModal
          isOpen={true}
          onClose={() => setBuybackModalOpen(false)}
          orderId={orderId}
          orderItemId={orderItemId}
          orderNumber={orderNumber}
          productName={productName}
          unitPrice={unitPrice}
          deviceAgeMonths={situationData?.deviceAgeMonths || 0}
          initialTierPercent={situationData?.buybackTierPercentage || 70}
          onSuccess={(bbNum) => {
            onActionSuccess(
              `Buyback guarantee claim #${bbNum} created successfully! Our team will contact you for pickup.`
            );
            onClose();
          }}
        />
      )}

      {/* Sub-Modal: Warranty Claim */}
      {warrantyModalOpen && (
        <WarrantyClaimModal
          isOpen={true}
          onClose={() => setWarrantyModalOpen(false)}
          orderId={orderId}
          orderNumber={orderNumber}
          orderItemId={orderItemId}
          productName={productName}
          pickupAddress={initialShippingAddress}
          onSuccess={(ticketNum) => {
            onActionSuccess(`Warranty claim ticket #${ticketNum} registered successfully.`);
            onClose();
          }}
        />
      )}

      {/* Sub-Modal: Support Callback */}
      {callbackModalOpen && (
        <SupportCallbackModal
          isOpen={true}
          onClose={() => setCallbackModalOpen(false)}
          orderId={orderId}
          orderNumber={orderNumber}
          orderItemId={orderItemId}
          productName={productName}
          initialPhone={initialPhone}
          onSuccess={(ticketNum) => {
            onActionSuccess(`Support callback ticket #${ticketNum} requested successfully.`);
            onClose();
          }}
        />
      )}

      {/* Sub-Modal: Support Ticket */}
      {ticketModalOpen && (
        <SupportTicketModal
          isOpen={true}
          onClose={() => setTicketModalOpen(false)}
          orderId={orderId}
          orderNumber={orderNumber}
          orderItemId={orderItemId}
          productName={productName}
          initialCategory={ticketPrefill.category}
          initialSubject={ticketPrefill.subject}
          onSuccess={(ticketNum) => {
            onActionSuccess(`Support ticket #${ticketNum} submitted successfully.`);
            onClose();
          }}
        />
      )}

      {/* Sub-Modal: Track Delivery */}
      {trackingModalOpen && (
        <TrackDeliveryModal
          isOpen={true}
          onClose={() => setTrackingModalOpen(false)}
          orderId={orderId}
          orderNumber={orderNumber}
          productName={productName}
        />
      )}

      {/* Sub-Modal: Tax Invoice */}
      {invoiceModalOpen && (
        <TaxInvoiceModal
          isOpen={true}
          onClose={() => setInvoiceModalOpen(false)}
          orderId={orderId}
          orderNumber={orderNumber}
        />
      )}

      {/* Sub-Modal: Item Return / Replacement */}
      {returnModalOpen && (
        <ItemReturnModal
          isOpen={true}
          onClose={() => setReturnModalOpen(false)}
          orderId={orderId}
          orderNumber={orderNumber}
          orderItemId={orderItemId}
          productName={productName}
          pickupAddress={initialShippingAddress}
          onSuccess={(orderNum) => {
            onActionSuccess(`Return request for order #${orderNum} submitted successfully.`);
            onClose();
          }}
        />
      )}
    </>
  );
}
