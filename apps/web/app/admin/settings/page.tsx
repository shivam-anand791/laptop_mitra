'use client';

import { useState } from 'react';

interface SettingsSection {
  id: string;
  title: string;
  description: string;
  fields: Array<{
    name: string;
    label: string;
    type: string;
    value: string;
  }>;
}

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('general');
  const [saved, setSaved] = useState(false);

  const sections: SettingsSection[] = [
    {
      id: 'general',
      title: 'General Settings',
      description: 'Basic store configuration',
      fields: [
        { name: 'storeName', label: 'Store Name', type: 'text', value: 'LaptopMitra' },
        { name: 'storeDescription', label: 'Store Description', type: 'text', value: 'Your trusted laptop partner' },
        { name: 'supportEmail', label: 'Support Email', type: 'email', value: 'support@laptopmitra.com' },
        { name: 'contactPhone', label: 'Contact Phone', type: 'tel', value: '+91-1800-123-4567' },
      ],
    },
    {
      id: 'payment',
      title: 'Payment Gateway',
      description: 'Payment provider configuration',
      fields: [
        { name: 'paymentProvider', label: 'Payment Provider', type: 'select', value: 'Razorpay' },
        { name: 'currency', label: 'Currency', type: 'text', value: 'INR' },
        { name: 'enableCOD', label: 'Enable Cash on Delivery', type: 'checkbox', value: 'true' },
        { name: 'enableWallet', label: 'Enable Digital Wallet', type: 'checkbox', value: 'true' },
      ],
    },
    {
      id: 'shipping',
      title: 'Shipping Settings',
      description: 'Shipping and delivery configuration',
      fields: [
        { name: 'freeShippingThreshold', label: 'Free Shipping Threshold (₹)', type: 'number', value: '999' },
        { name: 'standardDeliveryDays', label: 'Standard Delivery (Days)', type: 'number', value: '3-5' },
        { name: 'expressDeliveryDays', label: 'Express Delivery (Days)', type: 'number', value: '1-2' },
      ],
    },
    {
      id: 'email',
      title: 'Email Settings',
      description: 'SMTP and notification configuration',
      fields: [
        { name: 'smtpHost', label: 'SMTP Host', type: 'text', value: 'smtp.gmail.com' },
        { name: 'smtpPort', label: 'SMTP Port', type: 'number', value: '587' },
        { name: 'emailFrom', label: 'From Email', type: 'email', value: 'noreply@laptopmitra.com' },
      ],
    },
  ];

  const currentSection = sections.find((s) => s.id === activeSection) || sections[0];

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <button onClick={handleSave} className="btn btn-primary">
          Save Changes
        </button>
      </div>

      {saved && (
        <div className="p-4 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-lg">
          Settings saved successfully!
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <nav className="space-y-1">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                activeSection === section.id
                  ? 'bg-primary text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
              }`}
            >
              <span className="font-medium">{section.title}</span>
              <p className="text-xs mt-1 opacity-75">{section.description}</p>
            </button>
          ))}
        </nav>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <div className="card">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {currentSection.title}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                {currentSection.description}
              </p>

              <div className="space-y-6">
                {currentSection.fields.map((field) => (
                  <div key={field.name}>
                    <label className="label">{field.label}</label>
                    {field.type === 'select' ? (
                      <select className="input" defaultValue={field.value}>
                        <option value="Razorpay">Razorpay</option>
                        <option value="Stripe">Stripe</option>
                        <option value="PayPal">PayPal</option>
                      </select>
                    ) : field.type === 'checkbox' ? (
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id={field.name}
                          defaultChecked={field.value === 'true'}
                          className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
                        />
                        <label htmlFor={field.name} className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                          Enable
                        </label>
                      </div>
                    ) : (
                      <input
                        type={field.type}
                        className="input"
                        defaultValue={field.value}
                        aria-label={field.label}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
