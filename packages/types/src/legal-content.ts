/**
 * Canonical legal, policy, and brand content ported faithfully from legacy PHP sources:
 * - terms-condition-buyback.php
 * - about.php
 * - terms-and-condition.php
 * - privacy-policy.php
 */

export interface BuybackTier {
  period: string;
  percentage: number;
  example: string;
}

export interface BuybackPolicy {
  title: string;
  subtitle: string;
  tiers: BuybackTier[];
  note: string;
  eligibility: string[];
  deductions: {
    functional: string;
    physical: string;
    accessories: string;
  };
  howToClaim: string[];
}

export const BUYBACK_POLICY: BuybackPolicy = {
  title: 'Lifetime Buyback Guarantee',
  subtitle: 'We promise to buy back your laptop at an assured price, anytime within 36 months of your purchase.',
  tiers: [
    { period: '0 - 6 Months', percentage: 70, example: '₹21,000 on ₹30,000 laptop' },
    { period: '6 - 12 Months', percentage: 60, example: '₹18,000 on ₹30,000 laptop' },
    { period: '12 - 18 Months', percentage: 50, example: '₹15,000 on ₹30,000 laptop' },
    { period: '18 - 24 Months', percentage: 40, example: '₹12,000 on ₹30,000 laptop' },
    { period: '24 - 30 Months', percentage: 30, example: '₹9,000 on ₹30,000 laptop' },
    { period: '30 - 36 Months', percentage: 20, example: '₹6,000 on ₹30,000 laptop' },
  ],
  note: '* Buyback value is calculated on the base invoice value (excluding taxes and accessories).',
  eligibility: [
    'The laptop must be in working condition (switches on, boots into OS).',
    'Original invoice must be produced at the time of buyback request.',
    'The buyback request must be raised within 36 months from the date of purchase.',
    'The device should not have any critical hardware failure (Motherboard dead, Screen broken).',
  ],
  deductions: {
    functional: 'Keyboard keys not working, Battery dead (holds 0 charge), Speaker crackling, WiFi issues.',
    physical: 'Cracked screen, Broken hinges, Major dents on body, Missing rubber feet.',
    accessories: 'Missing original charger/adapter will result in a deduction of ₹800 - ₹1500 depending on the model.',
  },
  howToClaim: [
    'Login to your account and go to "My Orders".',
    'Select the laptop you wish to sell and click "Claim Buyback".',
    'Fill in the self-assessment form regarding the current condition.',
    'Our executive will visit for physical verification within 48 hours.',
    'Once verified, the amount will be transferred to your bank account instantly.',
  ],
};

export const ABOUT_CONTENT = {
  hero: {
    badge: 'Our Story',
    title: 'Empowering Businesses with Smart IT Solutions',
    description: "Laptop Mitra is India's leading enterprise hardware partner. We specialize in providing premium, high-performance refurbished laptops that help growing teams scale without compromising on quality or budget.",
  },
  mission: {
    title: 'Bridging the Gap Between Premium & Affordable',
    paragraphs: [
      "Setting up an office or a startup shouldn't drain your capital. At Laptop Mitra, we realized that the massive cost of brand new enterprise hardware was a major roadblock for many businesses and students.",
      "That's why we created a platform where you can access top-tier machines from brands like Apple, Dell, HP, and Lenovo at a fraction of the cost. Every laptop we sell is thoroughly tested, refurbished to factory standards, and backed by a solid warranty.",
    ],
    stats: [
      { label: 'Quality Checks', value: '50+' },
      { label: 'Delivery Network', value: 'Pan-India' },
    ],
  },
  coreValues: [
    {
      title: 'Uncompromising Quality',
      description: "We don't just sell 'used' laptops. We sell enterprise-grade machines that have been professionally renewed to perform flawlessly for years.",
    },
    {
      title: 'Trust & Transparency',
      description: 'What you see is exactly what you get. Honest grading, clear specifications, and no hidden terms. Your trust is our biggest asset.',
    },
    {
      title: 'Lifetime Relationship',
      description: 'Our relationship doesn\'t end at the sale. With dedicated lifetime technical support, we ensure your business operations never hit a roadblock.',
    },
  ],
  process: [
    {
      step: 1,
      title: 'Corporate Sourcing',
      description: 'We bulk source A-grade laptops directly from top MNCs and IT parks when they upgrade their inventory.',
    },
    {
      step: 2,
      title: '50-Point Diagnosis',
      description: 'Hardware experts test everything: battery health, screen pixels, keyboard tactility, thermal performance, and motherboard integrity.',
    },
    {
      step: 3,
      title: 'Cleaning & Upgrades',
      description: 'Laptops are physically deep-cleaned, thermal paste replaced, and if needed, upgraded with faster SSDs and extra RAM.',
    },
    {
      step: 4,
      title: 'Packaging & Pan-India Dispatch',
      description: 'Laptops are packed in tamper-proof cushioned protective packaging and dispatched via insured courier partners across India.',
    },
  ],
};

export const TERMS_CONTENT = {
  lastUpdated: 'January 2026',
  sections: [
    {
      title: '1. Introduction',
      content: 'Welcome to LaptopMitra ("Company", "we", "our", "us"). By accessing or using our website, services, and tools (collectively, the "Services"), you agree to be bound by these Terms and Conditions ("Terms"). If you do not agree to all of these Terms, do not use our Services.',
    },
    {
      title: '2. Accounts and Registration',
      content: 'To access certain features of the Services, such as bulk ordering or leasing, you may be required to register for an account. You agree to provide accurate, current, and complete information during the registration process and to update such information to keep it accurate, current, and complete.',
    },
    {
      title: '3. Product Condition & Warranty',
      content: 'Refurbished Hardware: Unless explicitly stated as "New", products sold on this platform are "Refurbished". These devices have undergone strict quality testing but may show minor signs of cosmetic wear.\n\nWarranty: We provide warranty coverage on hardware defects for all refurbished units. This warranty covers motherboard, screen, and component failure but excludes physical damage, liquid damage, or software issues caused by the user.',
    },
    {
      title: '4. Leasing & Corporate Rentals',
      content: 'For clients opting for our Leasing (Rent / Lease) model:\n• A separate Lease Agreement must be signed for tenures exceeding 6 months.\n• Equipment remains the property of LaptopMitra until/unless a buyout clause is exercised.\n• The lessee is responsible for any damage beyond normal wear and tear during the lease period.',
    },
    {
      title: '5. Pricing and Payment',
      content: 'All prices are listed in INR (Indian Rupees). We reserve the right to change prices at any time without notice. GST (Goods and Services Tax) will be levied on all invoices as per applicable government regulations. 100% advance payment is required for dispatched orders unless a credit line or Cash on Delivery has been approved.',
    },
    {
      title: '6. Returns and Refunds',
      content: 'Returns are accepted within 7 days of delivery only if the product received is defective or different from the description. Refund processing may take 7-10 business days.',
    },
    {
      title: '7. Limitation of Liability',
      content: 'In no event shall LaptopMitra be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the services.',
    },
    {
      title: '8. Contact Us',
      content: 'If you have any questions about these Terms, please contact us at support@laptopmitra.in or call our pan-India helpline.',
    },
  ],
};

export const PRIVACY_CONTENT = {
  effectiveDate: 'January 2026',
  sections: [
    {
      title: '1. Information We Collect',
      items: [
        'Personal Information: Name, Email address, Phone number, and GST Number (for business accounts) provided during registration.',
        'Transactional Information: Details about payments to and from you and other details of products you have purchased or leased from us.',
        'Usage Data: Information about how you use our website, such as page views and interaction logs.',
      ],
    },
    {
      title: '2. How We Use Your Information',
      items: [
        'To process orders, generate GST-compliant invoices, and manage leasing agreements.',
        'To communicate with you regarding your account, security updates, and product support.',
        'To improve our inventory management and user interface based on browsing patterns.',
      ],
    },
    {
      title: '3. Data Sharing and Disclosure',
      content: 'We do not sell your personal data. We may share your information only in the following circumstances:\n• Service Providers: We use trusted third-party payment gateways and logistics partners who process data on our behalf.\n• Legal Requirements: We may disclose information if required by law or in response to valid requests by public authorities (e.g., GST filings).',
    },
    {
      title: '4. Cookies and Tracking',
      content: 'We use cookies to maintain your session (login state) and to store your cart preferences. You can instruct your browser to refuse all cookies, but some portions of our Service may not function properly without them.',
    },
    {
      title: '5. Data Security',
      content: 'We implement a variety of security measures to maintain the safety of your personal information. Passwords are hashed and stored securely in our database. However, no method of transmission over the Internet is 100% secure.',
    },
    {
      title: '6. Your Rights',
      content: 'You have the right to access, correct, or request deletion of your personal data. You can manage your profile information directly from your Dashboard or contact our support team for assistance.',
    },
  ],
};
