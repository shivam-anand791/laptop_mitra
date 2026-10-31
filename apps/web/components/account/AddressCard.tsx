'use client';

import React from 'react';
import { Address } from '@/lib/types';
import { MapPin, Phone, Building2, Home, Briefcase, Check, Trash2, Edit2 } from 'lucide-react';

export interface AddressCardProps {
  address: Address;
  onEdit?: (address: Address) => void;
  onDelete?: (address: Address) => void;
  onSetDefault?: (address: Address) => void;
  isSettingDefault?: boolean;
}

export function AddressCard({
  address,
  onEdit,
  onDelete,
  onSetDefault,
  isSettingDefault = false,
}: AddressCardProps) {
  const label = (address.label || 'Home').toLowerCase();

  const getLabelIcon = () => {
    if (label === 'work') return <Briefcase className="w-3.5 h-3.5" />;
    if (label === 'other') return <Building2 className="w-3.5 h-3.5" />;
    return <Home className="w-3.5 h-3.5" />;
  };

  return (
    <div
      className={`bg-white rounded-2xl border p-5 transition flex flex-col justify-between ${
        address.isDefault ? 'border-blue-400 shadow-xs' : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 uppercase tracking-wide">
              {getLabelIcon()}
              {address.label || 'Home'}
            </span>
            {address.isDefault && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                <Check className="w-3 h-3" /> Default Delivery Address
              </span>
            )}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-bold text-slate-900">{address.fullName || 'Recipient'}</h4>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            {address.address}
            {address.landmark ? `, Near ${address.landmark}` : ''}
          </p>
          <p className="text-xs font-medium text-slate-700 mt-0.5">
            {address.city}, {address.state} -{' '}
            <span className="font-bold text-slate-900">{address.pincode}</span>
          </p>
          {address.phone && (
            <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span>{address.phone}</span>
            </p>
          )}
          {address.gstin && (
            <p className="text-[11px] text-slate-500 mt-1">
              GSTIN: <span className="font-mono font-bold text-slate-700">{address.gstin}</span>
            </p>
          )}
        </div>
      </div>

      <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
        <div>
          {!address.isDefault && onSetDefault && (
            <button
              type="button"
              onClick={() => onSetDefault(address)}
              disabled={isSettingDefault}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition cursor-pointer"
            >
              {isSettingDefault ? 'Setting...' : 'Set as Default'}
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(address)}
              className="text-slate-600 hover:text-slate-900 font-semibold inline-flex items-center gap-1 cursor-pointer transition"
            >
              <Edit2 className="w-3.5 h-3.5" /> Edit
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(address)}
              className="text-rose-600 hover:text-rose-800 font-semibold inline-flex items-center gap-1 cursor-pointer transition"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

