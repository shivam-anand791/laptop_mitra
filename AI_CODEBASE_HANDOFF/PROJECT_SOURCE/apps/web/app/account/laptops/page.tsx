'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/format';
import Modal from '@/components/ui/Modal';
import {
  Laptop,
  ShieldCheck,
  Wrench,
  CheckCircle2,
  Clock,
  MapPin,
  Calendar,
  AlertCircle,
  Copy,
  Check,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export default function CustomerLaptopsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookUnitId = searchParams.get('book');

  const [laptops, setLaptops] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Booking Modal State
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<any | null>(null);
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredSlot, setPreferredSlot] = useState('MORNING_10_TO_1');
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [manualAddress, setManualAddress] = useState({
    fullName: '',
    phone: '',
    address: '',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560038',
    landmark: '',
  });
  const [useManualAddress, setUseManualAddress] = useState(false);
  const [customerNotes, setCustomerNotes] = useState('');
  const [backupConfirmed, setBackupConfirmed] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState<any | null>(null);

  // Serial copied state
  const [copiedSerial, setCopiedSerial] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [laptopsRes, settingsRes, addressesRes] = await Promise.all([
        api.getUserLaptops().catch(() => []),
        api.getServiceSettings().catch(() => null),
        api.getAddresses().catch(() => []),
      ]);
      setLaptops(laptopsRes || []);
      setSettings(settingsRes);
      setAddresses(addressesRes || []);

      if (addressesRes && addressesRes.length > 0) {
        setSelectedAddressId(addressesRes[0].id);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load laptops and devices');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle URL query parameter ?book=unitId
  useEffect(() => {
    if (bookUnitId && laptops.length > 0 && !bookingModalOpen) {
      const target = laptops.find((l) => l.id === bookUnitId);
      if (target && target.serviceStatus === 'AVAILABLE') {
        handleOpenBooking(target);
      }
    }
  }, [bookUnitId, laptops]);

  const handleCopySerial = (serial: string) => {
    if (!serial) return;
    navigator.clipboard.writeText(serial);
    setCopiedSerial(serial);
    setTimeout(() => setCopiedSerial(null), 2000);
  };

  const handleOpenBooking = (unit: any) => {
    setSelectedUnit(unit);
    setBookingError(null);
    setBookingSuccess(null);
    setBackupConfirmed(false);
    setCustomerNotes('');

    // Pre-populate preferred date with tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setPreferredDate(tomorrow.toISOString().split('T')[0]);

    setBookingModalOpen(true);
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUnit) return;
    if (!backupConfirmed) {
      setBookingError('Please acknowledge that you have backed up your personal data.');
      return;
    }

    let finalAddress: any = null;
    let finalPincode = '';

    if (useManualAddress || addresses.length === 0) {
      if (!manualAddress.address.trim() || !manualAddress.pincode.trim() || !manualAddress.phone.trim()) {
        setBookingError('Please complete all mandatory address fields.');
        return;
      }
      finalAddress = manualAddress;
      finalPincode = manualAddress.pincode.trim();
    } else {
      const chosen = addresses.find((a) => a.id === selectedAddressId);
      if (!chosen) {
        setBookingError('Please select a valid pickup address.');
        return;
      }
      finalAddress = {
        fullName: chosen.fullName || chosen.name,
        phone: chosen.phone,
        address: chosen.addressLine1 || chosen.street || chosen.address,
        city: chosen.city,
        state: chosen.state,
        pincode: chosen.pincode || chosen.postalCode,
        landmark: chosen.landmark || '',
      };
      finalPincode = chosen.pincode || chosen.postalCode;
    }

    setBookingLoading(true);
    setBookingError(null);

    try {
      const res = await api.bookService(selectedUnit.id, {
        preferredDate,
        preferredSlot,
        pickupAddress: finalAddress,
        pickupPincode: finalPincode,
        customerNotes: customerNotes.trim() || undefined,
        backupAcknowledged: backupConfirmed,
      });

      setBookingSuccess(res);
      await loadData();
    } catch (err: any) {
      setBookingError(err?.message || 'Failed to book service appointment. Please try again.');
    } finally {
      setBookingLoading(false);
    }
  };

  const slotOptions = settings?.slotWindows || [
    { id: 'MORNING_10_TO_1', label: 'Morning (10:00 AM - 1:00 PM)' },
    { id: 'AFTERNOON_2_TO_5', label: 'Afternoon (2:00 PM - 5:00 PM)' },
    { id: 'EVENING_5_TO_8', label: 'Evening (5:00 PM - 8:00 PM)' },
  ];

  const minBookingDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, []);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-400/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>LaptopMitra Guarantee</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            My Laptops & Device Benefits
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            Every outright purchased laptop includes <span className="font-semibold text-white">1 complimentary deep general service</span> within the first 6 months from delivery, alongside your official hardware warranty.
          </p>
        </div>
      </div>

      {/* Included 4-Point Service Overview Pill Banner */}
      <div className="card p-5 bg-gradient-to-br from-indigo-50/50 to-white dark:from-slate-900 dark:to-slate-800 border-indigo-100 dark:border-indigo-900/40">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-300 mb-3">
          <Wrench className="w-4 h-4 text-primary" />
          <span>Complimentary 4-Point General Service Includes:</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { title: 'Internal Cleaning', desc: 'Dust removal from fan bays and heatsinks' },
            { title: 'Thermal Repasting', desc: 'Fresh premium non-conductive thermal paste' },
            { title: 'Hardware Stress Test', desc: 'Automated memory and GPU diagnostics' },
            { title: 'Battery Health Report', desc: 'Design vs full-charge capacity inspection' },
          ].map((item, idx) => (
            <div key={idx} className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-indigo-100/80 dark:border-indigo-950 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{item.title}</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="card p-12 text-center text-xs text-slate-500 space-y-2">
          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto" />
          <p>Loading your registered laptops and warranty ledgers...</p>
        </div>
      ) : error ? (
        <div className="card p-8 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
          <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold">{error}</p>
          <button onClick={loadData} className="btn-secondary text-xs">
            Retry Loading
          </button>
        </div>
      ) : laptops.length === 0 ? (
        <div className="card p-12 text-center space-y-4">
          <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-400">
            <Laptop className="w-7 h-7" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">No Laptops Registered Yet</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              When your laptop orders are delivered, your device chassis serial number, warranty registration, and free service benefit will automatically appear here.
            </p>
          </div>
          <Link href="/products" className="btn-primary text-xs inline-flex items-center gap-2">
            <span>Explore Certified Refurbished Laptops</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {laptops.map((unit) => {
            const warranty = unit.warrantyCoverage;
            const entitlement = unit.serviceEntitlement;
            const activeJob = unit.activeJob;

            let warrantyDaysLeft = 0;
            if (warranty?.endDate) {
              warrantyDaysLeft = Math.ceil(
                (new Date(warranty.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
              );
            }

            let serviceDaysLeft = 0;
            if (entitlement?.periodEnd) {
              serviceDaysLeft = Math.ceil(
                (new Date(entitlement.periodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
              );
            }

            return (
              <div
                key={unit.id}
                className="card p-5 sm:p-6 hover:border-slate-300 dark:hover:border-slate-700 transition-all space-y-5"
              >
                {/* Top Section: Photo, Name, Serial Number, Order # */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                      {unit.image ? (
                        <Image
                          src={unit.image}
                          alt={unit.productName}
                          width={80}
                          height={80}
                          className="w-full h-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <Laptop className="w-8 h-8 text-slate-400" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">
                          {unit.brand}
                        </span>
                        <span className="text-slate-300 dark:text-slate-700">•</span>
                        {unit.orderNumber && (
                          <Link
                            href={`/account/orders/${unit.orderId}`}
                            className="text-[11px] font-mono text-slate-500 hover:text-primary underline"
                          >
                            Order #{unit.orderNumber}
                          </Link>
                        )}
                      </div>
                      <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                        {unit.productName}
                      </h2>
                      {/* Monospace Serial with Copy Button */}
                      <div className="flex items-center gap-2 pt-0.5">
                        <span className="text-xs text-slate-500">Serial No:</span>
                        {unit.serialNumber ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                            <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                              {unit.serialNumber}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopySerial(unit.serialNumber)}
                              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors p-0.5"
                              title="Copy serial number"
                            >
                              {copiedSerial === unit.serialNumber ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs font-mono text-amber-600">Pending Assignment</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Top Right Quick Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-start">
                    <Link
                      href={`/help/guided-flow?orderId=${unit.orderId}&category=WARRANTY_CLAIMS`}
                      className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-primary underline"
                    >
                      Warranty Claim
                    </Link>
                  </div>
                </div>

                {/* Grid: 2 Benefit Cards (Warranty & Free General Service) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  {/* Card 1: Official Hardware Warranty */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                        <ShieldCheck className="w-4 h-4 text-indigo-600" />
                        <span>Hardware Warranty</span>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          warranty?.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                            : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {warranty?.status || 'Active'}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 dark:text-slate-400 space-y-0.5">
                      <p>
                        Coverage: <span className="font-semibold text-slate-800 dark:text-slate-200">{warranty?.source === 'EXTENDED' ? 'Extended 18-Month Plan' : 'Base 6-Month Coverage'}</span>
                      </p>
                      {warranty?.endDate && (
                        <p className="text-[11px] text-slate-500">
                          Valid until {formatDate(warranty.endDate)}
                        </p>
                      )}
                    </div>

                    <div className="pt-1">
                      {warranty?.status === 'ACTIVE' && warrantyDaysLeft > 0 ? (
                        <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                          {warrantyDaysLeft} days remaining
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">Warranty period concluded</span>
                      )}
                    </div>
                  </div>

                  {/* Card 2: 1 Free General Service Benefit */}
                  <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/80 dark:border-indigo-900/40 space-y-2 flex flex-col justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                          <Wrench className="w-4 h-4 text-primary" />
                          <span>Complimentary General Service</span>
                        </div>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                            unit.serviceStatus === 'AVAILABLE'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                              : unit.serviceStatus === 'BOOKED'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400'
                              : unit.serviceStatus === 'USED'
                              ? 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                          }`}
                        >
                          {unit.serviceStatus === 'AVAILABLE'
                            ? 'Available to Book'
                            : unit.serviceStatus === 'BOOKED'
                            ? 'Service Active'
                            : unit.serviceStatus === 'USED'
                            ? 'Completed'
                            : 'Expired'}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {unit.serviceStatus === 'AVAILABLE'
                          ? `1 free doorstep service valid for ${serviceDaysLeft} more days.`
                          : unit.serviceStatus === 'BOOKED'
                          ? `Booking active (#${activeJob?.jobNumber || 'SRV'}).`
                          : unit.serviceStatus === 'USED'
                          ? 'Service completed. Inspection checklist verified.'
                          : '6-month free service eligibility window has concluded.'}
                      </p>
                    </div>

                    {/* Action CTA */}
                    <div className="pt-2">
                      {unit.serviceStatus === 'AVAILABLE' ? (
                        <button
                          type="button"
                          onClick={() => handleOpenBooking(unit)}
                          className="btn-primary text-xs w-full sm:w-auto inline-flex items-center justify-center gap-1.5 py-1.5 px-3"
                        >
                          <Wrench className="w-3.5 h-3.5" />
                          <span>Book Free Doorstep Service</span>
                        </button>
                      ) : activeJob ? (
                        <Link
                          href={`/account/service-jobs/${activeJob.id}`}
                          className="btn-secondary text-xs w-full sm:w-auto inline-flex items-center justify-center gap-1.5 py-1.5 px-3"
                        >
                          <Clock className="w-3.5 h-3.5 text-primary" />
                          <span>Track Service Job #{activeJob.jobNumber}</span>
                        </Link>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">
                          {unit.serviceStatus === 'USED' ? 'Benefit claimed' : 'Window expired'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Booking Modal Wizard */}
      <Modal
        open={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        title={bookingSuccess ? 'Booking Confirmed!' : `Book Free Service: ${selectedUnit?.productName || 'Laptop'}`}
        size="lg"
      >
        {bookingSuccess ? (
          <div className="space-y-5 text-center py-4">
            <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950/60 rounded-full flex items-center justify-center mx-auto text-emerald-600">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Service Appointment Scheduled!
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Your reference number is{' '}
                <span className="font-mono font-bold text-primary">{bookingSuccess.jobNumber}</span>
              </p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-xl text-left text-xs space-y-2 border border-slate-100 dark:border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-500">Scheduled Date:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {formatDate(bookingSuccess.scheduledPickupAt)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Time Window:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {slotOptions.find((s: any) => s.id === bookingSuccess.preferredSlot)?.label || bookingSuccess.preferredSlot}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Pickup Pincode:</span>
                <span className="font-mono text-slate-900 dark:text-white">
                  {bookingSuccess.pickupPincode}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setBookingModalOpen(false)}
                className="btn-secondary text-xs w-full sm:w-auto"
              >
                Close
              </button>
              <Link
                href={`/account/service-jobs/${bookingSuccess.id}`}
                className="btn-primary text-xs w-full sm:w-auto inline-flex items-center justify-center gap-1.5"
              >
                <span>Track Live Progress</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleBookingSubmit} className="space-y-4">
            {bookingError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-600 dark:text-rose-400 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{bookingError}</span>
              </div>
            )}

            {/* 4-Point Checklist Summary */}
            <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/40 space-y-1.5">
              <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300 block">
                Standard 4-Point Service Procedure:
              </span>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Internal dust cleaning</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Fresh thermal repasting</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Diagnostic stress run</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Battery health inspection</span>
                </div>
              </div>
            </div>

            {/* Step 2: Pickup Address */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Pickup Address <span className="text-rose-500">*</span>
              </label>

              {addresses.length > 0 && !useManualAddress ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-1 gap-2 max-h-36 overflow-y-auto pr-1">
                    {addresses.map((addr) => (
                      <label
                        key={addr.id}
                        className={`p-3 rounded-xl border text-xs cursor-pointer flex items-start gap-3 transition-all ${
                          selectedAddressId === addr.id
                            ? 'border-primary bg-primary/5 dark:bg-primary/10'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="selectedAddress"
                          checked={selectedAddressId === addr.id}
                          onChange={() => setSelectedAddressId(addr.id)}
                          className="mt-0.5 text-primary focus:ring-primary"
                        />
                        <div className="space-y-0.5">
                          <p className="font-bold text-slate-900 dark:text-white">
                            {addr.fullName || addr.name} ({addr.phone})
                          </p>
                          <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                            {[addr.addressLine1 || addr.street, addr.city, addr.state, addr.pincode].filter(Boolean).join(', ')}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setUseManualAddress(true)}
                    className="text-xs text-primary hover:underline font-semibold"
                  >
                    + Use a different pickup address
                  </button>
                </div>
              ) : (
                <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <input
                        type="text"
                        placeholder="Contact Full Name *"
                        value={manualAddress.fullName}
                        onChange={(e) => setManualAddress({ ...manualAddress, fullName: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                        required
                      />
                    </div>
                    <div>
                      <input
                        type="tel"
                        placeholder="10-digit Phone Number *"
                        value={manualAddress.phone}
                        onChange={(e) => setManualAddress({ ...manualAddress, phone: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                        required
                      />
                    </div>
                  </div>
                  <input
                    type="text"
                    placeholder="Door / Flat / Street Address *"
                    value={manualAddress.address}
                    onChange={(e) => setManualAddress({ ...manualAddress, address: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    required
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="City"
                      value={manualAddress.city}
                      onChange={(e) => setManualAddress({ ...manualAddress, city: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                      required
                    />
                    <input
                      type="text"
                      placeholder="6-digit Pincode *"
                      value={manualAddress.pincode}
                      onChange={(e) => setManualAddress({ ...manualAddress, pincode: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                      required
                    />
                  </div>
                  {addresses.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setUseManualAddress(false)}
                      className="text-xs text-slate-500 hover:underline pt-1"
                    >
                      ← Back to saved addresses
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Step 3: Date & Time Slot */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Preferred Pickup Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  min={minBookingDate}
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Preferred Window Slot <span className="text-rose-500">*</span>
                </label>
                <select
                  value={preferredSlot}
                  onChange={(e) => setPreferredSlot(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  {slotOptions.map((opt: any) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Observations / Notes */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Customer Observations (Optional)
              </label>
              <textarea
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
                placeholder="Notice any heating, noisy fans, slow startup, or battery draining? Note it here for the technician..."
                rows={2}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>

            {/* Mandatory Backup Disclaimer */}
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/40">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={backupConfirmed}
                  onChange={(e) => setBackupConfirmed(e.target.checked)}
                  className="mt-0.5 rounded border-amber-400 text-primary focus:ring-primary h-4 w-4"
                  required
                />
                <span className="text-[11px] text-amber-900 dark:text-amber-200 leading-snug">
                  <span className="font-bold">Data Backup Acknowledgement:</span> I understand that LaptopMitra takes utmost care during servicing, but I am responsible for backing up my personal data, passwords, and work documents before technician collection.
                </span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setBookingModalOpen(false)}
                className="btn-secondary text-xs"
                disabled={bookingLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary text-xs"
                disabled={bookingLoading}
              >
                {bookingLoading ? 'Submitting Booking...' : 'Confirm Doorstep Appointment'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

