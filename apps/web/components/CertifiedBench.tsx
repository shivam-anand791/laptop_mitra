'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  Zap,
  Monitor,
  BatteryCharging,
  Wind,
  Keyboard,
  Wifi,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  SlidersHorizontal,
  Laptop,
  Check,
  Wrench,
} from 'lucide-react';

export interface CustomerCheckItem {
  id: string;
  name: string;
  whatWeCheck: string;
  whyItMatters: string;
  badge: string;
  technicalDetails: {
    benchTool: string;
    procedure: string;
    criteria: string;
  };
}

export interface CustomerInspectionCategory {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  testsCount: number;
  highlight: string;
  checks: CustomerCheckItem[];
}

export const CUSTOMER_INSPECTION_CATEGORIES: CustomerInspectionCategory[] = [
  {
    id: 'performance',
    title: 'Performance & Processor',
    subtitle: 'Speed & multitasking',
    icon: Zap,
    testsCount: 6,
    highlight: 'Zero Lag Guaranteed',
    checks: [
      {
        id: 'perf-1',
        name: 'Reliable Everyday Performance',
        whatWeCheck: 'We test the processor under sustained full power to ensure it runs smooth and fast without freezing or crashing.',
        whyItMatters: 'Launch heavy spreadsheets, switch between dozens of browser tabs, and attend video calls without annoying stutter.',
        badge: 'Smooth Multitasking',
        technicalDetails: {
          benchTool: 'Digital Multimeter & Load Bench',
          procedure: 'Continuous 100% CPU multi-core load to verify voltage regulation (VRM) thermal equilibrium.',
          criteria: 'Stable power rail voltages with zero thermal throttle drops.',
        },
      },
      {
        id: 'perf-2',
        name: 'Memory & App Switching',
        whatWeCheck: 'We test every gigabyte of RAM to make sure apps open instantly and run without crashes.',
        whyItMatters: 'Keep multiple browser windows, PDFs, and design apps open side-by-side with instant switching.',
        badge: 'Instant App Launch',
        technicalDetails: {
          benchTool: 'MemTest86 Pro Enterprise Suite',
          procedure: '4-pass comprehensive memory read/write address audit.',
          criteria: 'Zero bit errors or memory address leaks detected.',
        },
      },
      {
        id: 'perf-3',
        name: 'Internal Circuitry Health',
        whatWeCheck: 'We inspect the motherboard under magnification for clean circuitry with zero moisture or wear.',
        whyItMatters: 'You get rock-solid reliability built to last for years of daily office or personal use.',
        badge: '100% Clean Board',
        technicalDetails: {
          benchTool: '40x Industrial Microscope',
          procedure: 'Microscopic inspection across surface-mount capacitors and IC power lines.',
          criteria: 'Zero corrosion or capacitor bulging; factory solder verified.',
        },
      },
    ],
  },
  {
    id: 'display',
    title: 'Display & Screen',
    subtitle: 'Vibrant, sharp visuals',
    icon: Monitor,
    testsCount: 5,
    highlight: 'Zero Dead Pixels',
    checks: [
      {
        id: 'disp-1',
        name: 'Screen Quality & Clarity',
        whatWeCheck: 'We inspect every pixel against pure color patterns to ensure a clean, sharp, blemish-free display.',
        whyItMatters: 'Read documents comfortably and enjoy movies with vivid colors, zero lines, and zero bright spots.',
        badge: 'Vivid & Blemish-Free',
        technicalDetails: {
          benchTool: 'RGB Diagnostic Matrix Screen',
          procedure: 'Full-screen solid color pattern test at 100% brightness.',
          criteria: 'Zero stuck pixels on Grade A+; within strict ISO 13406-2 limits.',
        },
      },
      {
        id: 'disp-2',
        name: 'Comfortable Brightness',
        whatWeCheck: 'We check brightness across the entire screen so lighting is even from corner to corner.',
        whyItMatters: 'Work comfortably in bright daylight or dimmed evening rooms without patchy shadows or eye fatigue.',
        badge: 'Even Backlight',
        technicalDetails: {
          benchTool: 'Colorimeter & Lux Photometer',
          procedure: '9-point screen brightness matrix measurement.',
          criteria: 'Exceeds 85% backlight uniformity at factory nits rating.',
        },
      },
      {
        id: 'disp-3',
        name: 'Smooth & Sturdy Hinges',
        whatWeCheck: 'We test hinge tension so the lid opens smoothly and stays firmly at whichever angle you prefer.',
        whyItMatters: 'The screen stays rock-steady on your lap or desk without annoying wobble when you type.',
        badge: 'Wobble-Free Hold',
        technicalDetails: {
          benchTool: 'Torque Resistance Rig',
          procedure: 'Full 180° smooth opening cycle with live display signal monitoring.',
          criteria: 'Smooth resistance with zero display ribbon flickering.',
        },
      },
    ],
  },
  {
    id: 'battery',
    title: 'Battery & Charging',
    subtitle: 'All-day battery confidence',
    icon: BatteryCharging,
    testsCount: 4,
    highlight: '80% to 100% Health',
    checks: [
      {
        id: 'bat-1',
        name: 'Battery Health Check',
        whatWeCheck: 'We verify true battery capacity so you get dependable, long-lasting battery life on a single charge.',
        whyItMatters: 'Take your laptop to classes, cafes, and client meetings without scrambling for a wall socket.',
        badge: 'Minimum 80%+ Retained',
        technicalDetails: {
          benchTool: 'OEM Diagnostic & BatteryMon',
          procedure: 'Complete charge and discharge telemetry audit.',
          criteria: 'Minimum 80% to 100% original capacity verified.',
        },
      },
      {
        id: 'bat-2',
        name: 'Safe Fast-Charging',
        whatWeCheck: 'We check the charging circuits to ensure the battery refills quickly while staying cool and safe.',
        whyItMatters: 'Plug in for a quick top-up between meetings with zero overheating or battery swelling.',
        badge: 'Cool & Safe Charging',
        technicalDetails: {
          benchTool: 'USB-C PD Power Analyzer',
          procedure: 'High-wattage charge test monitoring BMS thermal safety.',
          criteria: 'Certified temperature control and voltage cutoff.',
        },
      },
      {
        id: 'bat-3',
        name: 'Snug Charger Connection',
        whatWeCheck: 'We make sure the charging port holds the cable firmly without loose or wobbly connections.',
        whyItMatters: 'No accidental disconnects if the cord is gently nudged on your desk.',
        badge: 'Tight Port Fit',
        technicalDetails: {
          benchTool: 'In-Line Power Load Meter',
          procedure: 'Physical retention and 4-hour continuous wattage test.',
          criteria: 'Stable 65W–100W PD delivery and snug mechanical fit.',
        },
      },
    ],
  },
  {
    id: 'cooling',
    title: 'Heating & Cooling',
    subtitle: 'Cool & whisper-quiet',
    icon: Wind,
    testsCount: 4,
    highlight: 'Never Overheats',
    checks: [
      {
        id: 'cool-1',
        name: 'Cooling System Maintenance',
        whatWeCheck: 'We clean internal dust vents and apply fresh, high-grade thermal paste to the processor.',
        whyItMatters: 'The laptop stays pleasantly cool to the touch on your lap, even during long work sessions.',
        badge: 'Fresh Thermal Paste',
        technicalDetails: {
          benchTool: 'Cleanroom Applicator',
          procedure: 'Old thermal paste removal, ultrasonic cleaning, and fresh compound.',
          criteria: '100% surface contact with premium thermal compound.',
        },
      },
      {
        id: 'cool-2',
        name: 'Cool Under Heavy Load',
        whatWeCheck: 'We monitor internal temperatures during heavy work to ensure heat is swiftly pushed out.',
        whyItMatters: 'No sudden slowdowns or throttling when rendering files, compiling code, or gaming.',
        badge: 'Full Speed Maintained',
        technicalDetails: {
          benchTool: 'FLIR Thermal Camera',
          procedure: '30-minute full CPU & GPU burn-in test.',
          criteria: 'Heatsink dissipation confirmed with zero thermal throttling.',
        },
      },
      {
        id: 'cool-3',
        name: 'Whisper-Quiet Fans',
        whatWeCheck: 'We test cooling fans across all speeds to make sure they spin smoothly with zero buzzing or whining.',
        whyItMatters: 'Work in quiet libraries or attend calls without loud, distracting fan noise in the background.',
        badge: 'Whisper-Quiet',
        technicalDetails: {
          benchTool: 'Decibel Acoustic Meter',
          procedure: 'Acoustic sweep across idle and maximum fan RPM.',
          criteria: 'Zero coil whine or bearing wobble below strict dB limits.',
        },
      },
    ],
  },
  {
    id: 'keyboard',
    title: 'Keyboard & Touchpad',
    subtitle: 'Crisp typing & gestures',
    icon: Keyboard,
    testsCount: 5,
    highlight: '100% Keys Verified',
    checks: [
      {
        id: 'kb-1',
        name: 'Responsive Keyboard Check',
        whatWeCheck: 'Every single key is individually tested for comfortable spring, positive click, and working backlight.',
        whyItMatters: 'Type effortlessly for hours without missed letters, sticky keys, or uneven backlighting.',
        badge: 'Springy & Tactile',
        technicalDetails: {
          benchTool: 'AquaKey Matrix Utility',
          procedure: 'Every key switch actuated for travel, rebound, and LED backlight.',
          criteria: '100% keystroke registration with zero ghosting or stuck keys.',
        },
      },
      {
        id: 'kb-2',
        name: 'Silky Touchpad & Gestures',
        whatWeCheck: 'We test the touchpad for smooth finger gliding, accurate cursor pointing, and easy multi-finger gestures.',
        whyItMatters: 'Scroll, swipe, and zoom through webpages and documents without needing an external mouse.',
        badge: 'Precision Multi-Touch',
        technicalDetails: {
          benchTool: 'Precision Touchpad Suite',
          procedure: 'Multi-touch gesture mapping and palm-rejection test.',
          criteria: 'Sub-millimeter tracking accuracy and crisp physical clicks.',
        },
      },
      {
        id: 'kb-3',
        name: 'Business Navigation Buttons',
        whatWeCheck: 'On enterprise laptops (ThinkPad, EliteBook, Latitude), we verify the red trackpoint and mouse buttons.',
        whyItMatters: 'Navigate directly from your typing position for maximum speed and comfort.',
        badge: 'Smooth Cursor Nub',
        technicalDetails: {
          benchTool: 'OEM Hardware Lab',
          procedure: 'TrackPoint strain-gauge calibration and click longevity test.',
          criteria: 'Drift-free center return with quiet, responsive buttons.',
        },
      },
    ],
  },
  {
    id: 'peripherals',
    title: 'Ports, Wi-Fi & Sound',
    subtitle: 'Clear calls & connectivity',
    icon: Wifi,
    testsCount: 8,
    highlight: 'Plug & Play Ready',
    checks: [
      {
        id: 'conn-1',
        name: 'Fast Wi-Fi & Bluetooth',
        whatWeCheck: 'We test wireless range and speeds through walls so you get steady, uninterrupted internet.',
        whyItMatters: 'Smooth video calls, speedy file downloads, and instant pairing with wireless headphones.',
        badge: 'Strong Signal Range',
        technicalDetails: {
          benchTool: 'iPerf3 Network Benchmark',
          procedure: '10m physical distance throughput and packet loss test.',
          criteria: 'Zero packet loss on Wi-Fi 6 and Bluetooth 5.x.',
        },
      },
      {
        id: 'conn-2',
        name: 'Clear Speakers & Microphone',
        whatWeCheck: 'We test the built-in speakers and microphones for clear, natural sound during meetings and media.',
        whyItMatters: 'You sound clear on Zoom and Google Meet, and movies sound punchy with zero speaker crackle.',
        badge: 'Clear Meeting Audio',
        technicalDetails: {
          benchTool: 'SoundCheck Acoustic Lab',
          procedure: '100Hz–12kHz frequency sweep and noise-cancelling mic test.',
          criteria: 'Zero audio distortion and clean voice pickup.',
        },
      },
      {
        id: 'conn-3',
        name: 'All Ports Working Guarantee',
        whatWeCheck: 'We plug real cables into every USB, HDMI, headphone, and monitor port to verify instant connection.',
        whyItMatters: 'Connect external monitors, pen drives, and projectors on the first try without dongle headaches.',
        badge: 'Instant Port Detection',
        technicalDetails: {
          benchTool: 'Hardware Loopback Plugs',
          procedure: 'Data transfer and 4K external display output test on every port.',
          criteria: 'Full speed compliance across USB-C PD, HDMI, and audio jacks.',
        },
      },
    ],
  },
];

export const QUALITY_GRADES = [
  {
    grade: 'Grade A+',
    label: 'Certified Like-New',
    badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    summary: 'Looks and feels brand new. Flawless display, 85%+ battery health, and zero noticeable marks.',
    screen: 'Flawless display, zero dead pixels or scratches',
    battery: '85% – 100% health capacity verified',
    casing: 'Showroom condition, minimal handling wear',
    warranty: '1 Year Full Hardware Warranty Included',
  },
  {
    grade: 'Grade A',
    label: 'Certified Excellent',
    badgeBg: 'bg-blue-50 text-[#2563EB] border-blue-200',
    summary: 'Superb enterprise condition with negligible faint micro-marks from normal office docking.',
    screen: 'Clean, bright display with zero active blemishes',
    battery: '80% – 90% health capacity verified',
    casing: 'Very light cosmetic micro-scratches on outer lid',
    warranty: '1 Year Full Hardware Warranty Included',
  },
  {
    grade: 'Grade B',
    label: 'Certified Value Workhorse',
    badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
    summary: '100% verified internal hardware with light cosmetic signs of handling. Maximum value for budget.',
    screen: 'Clear, crisp display, 100% functional',
    battery: '80%+ health capacity verified',
    casing: 'Visible wear on corners or lid, structurally solid',
    warranty: '1 Year Full Hardware Warranty Included',
  },
];

export const INSPECTION_TIMELINE = [
  {
    step: '01',
    title: 'Carefully Sourced',
    desc: 'Acquired directly from top corporate refresh programs with verified ownership and clean system history.',
    icon: Laptop,
  },
  {
    step: '02',
    title: 'Thoroughly Checked',
    desc: 'Every unit passes our rigorous 32-point checklist across screen, battery, performance, and thermals.',
    icon: ShieldCheck,
  },
  {
    step: '03',
    title: 'Cleaned & Prepared',
    desc: 'Internal cooling maintenance, fresh thermal paste, and deep sanitization for out-of-the-box freshness.',
    icon: Wind,
  },
  {
    step: '04',
    title: 'Certified & Guaranteed',
    desc: 'Sealed with an official test certificate, 1-year doorstep warranty, and 14-day hassle-free replacement.',
    icon: Sparkles,
  },
];

export default function CertifiedBench({ className = '' }: { className?: string }) {
  const [activeCategory, setActiveCategory] = useState(CUSTOMER_INSPECTION_CATEGORIES[0].id);
  const [selectedGrade, setSelectedGrade] = useState('Grade A+');
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  const selectedCategoryData =
    CUSTOMER_INSPECTION_CATEGORIES.find((c) => c.id === activeCategory) ||
    CUSTOMER_INSPECTION_CATEGORIES[0];
  const activeGradeData =
    QUALITY_GRADES.find((g) => g.grade === selectedGrade) || QUALITY_GRADES[0];

  return (
    <section className={`space-y-10 sm:space-y-12 pb-8 ${className}`}>
      {/* Top Banner / Hero */}
      <div className="bg-[#FFFDF9] rounded-3xl p-6 sm:p-10 border border-[#E6DFD5] shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-[#E6DFD5] pb-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-50 text-[#2563EB] border border-blue-200">
              <ShieldCheck className="w-4 h-4 text-[#2563EB]" /> Refurbished, Perfected.
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#0B1F4B] tracking-tight">
              Tested for Real Life. Built to Last.
            </h2>
            <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
              Every refurbished laptop is hand-picked, serviced, and tested so it boots instantly, runs cool and quiet, and delivers all-day battery life from day one.
            </p>
          </div>

          {/* Honest Assurance Badge */}
          <div className="flex items-center gap-3.5 shrink-0 bg-[#FAF6EF] p-4 sm:p-5 rounded-2xl border border-[#E6DFD5]">
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 text-[#2563EB] flex items-center justify-center font-bold text-xl shadow-xs">
              <Sparkles className="w-6 h-6 text-[#2563EB]" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Verified Assurance
              </span>
              <span className="text-xl font-black text-[#0B1F4B]">32-Point Certified</span>
              <span className="text-[11px] text-emerald-700 font-semibold block">
                1-Year Doorstep Warranty Included
              </span>
            </div>
          </div>
        </div>

        {/* 4-Stage Process Timeline */}
        <div className="space-y-4 pt-2">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
            How Every Laptop Is Prepared For You
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {INSPECTION_TIMELINE.map((item, idx) => {
              const StepIcon = item.icon;
              return (
                <div
                  key={item.step}
                  className="p-4 sm:p-5 rounded-2xl bg-[#FAF6EF] border border-[#E6DFD5] space-y-2.5 relative group hover:border-blue-300 hover:shadow-xs transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="w-7 h-7 rounded-lg bg-[#2563EB] text-white text-xs font-black flex items-center justify-center shadow-xs">
                      {item.step}
                    </span>
                    <StepIcon className="w-4 h-4 text-slate-400 group-hover:text-[#2563EB] transition-colors" />
                    {idx < 3 && (
                      <span className="hidden lg:block absolute -right-2.5 top-6 text-slate-300 font-bold text-xs z-10">
                        →
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-[#0B1F4B]">{item.title}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Interactive Quality Checklist & Visual Inspector */}
      <div className="bg-[#FFFDF9] rounded-3xl p-6 sm:p-10 border border-[#E6DFD5] shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[#2563EB] font-bold tracking-widest uppercase text-xs">
              Everyday Language • 32 Verified Checks
            </span>
            <h3 className="text-2xl font-black text-[#0B1F4B] mt-1">What We Check Before You Buy</h3>
            <p className="text-xs text-slate-500 mt-1">
              Select any part of the laptop below to see how it will perform in your hands.
            </p>
          </div>

          {/* Toggle for Power Users / Tech Details */}
          <button
            onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2563EB] bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3.5 py-2 rounded-xl transition-colors cursor-pointer self-start sm:self-center shrink-0"
          >
            <Wrench className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>{showTechnicalDetails ? 'Hide Engineering Specs' : 'See technical details'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Category Tabs (6 interactive buttons) */}
          <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
            {CUSTOMER_INSPECTION_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = cat.id === activeCategory;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between group cursor-pointer ${
                    isActive
                      ? 'bg-blue-50/70 border-[#2563EB] shadow-xs ring-1 ring-[#2563EB]/20'
                      : 'bg-[#FAF6EF] border-[#E6DFD5] hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-xl transition-colors ${
                        isActive
                          ? 'bg-[#2563EB] text-white'
                          : 'bg-white text-slate-600 border border-[#E6DFD5]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4
                        className={`text-xs font-bold ${isActive ? 'text-[#0B1F4B]' : 'text-slate-800'}`}
                      >
                        {cat.title}
                      </h4>
                      <span className="text-[10px] text-slate-500 block">{cat.subtitle}</span>
                    </div>
                  </div>
                  <ChevronRight
                    className={`w-4 h-4 transition-transform ${
                      isActive
                        ? 'text-[#2563EB] translate-x-1'
                        : 'text-slate-400 group-hover:translate-x-0.5'
                    }`}
                  />
                </button>
              );
            })}
          </div>

          {/* Right Cards: Simple, Scannable & Punchy (8 cols) */}
          <div className="lg:col-span-8 p-5 sm:p-6 rounded-2xl bg-[#FAF6EF] border border-[#E6DFD5] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E6DFD5] pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#0B1F4B] uppercase tracking-wider">
                  Inspecting: {selectedCategoryData.title}
                </span>
              </div>
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/90 px-2.5 py-0.5 rounded-full border border-emerald-300 self-start sm:self-auto">
                ✓ {selectedCategoryData.highlight}
              </span>
            </div>

            {/* Scannable Cards */}
            <div className="space-y-3">
              {selectedCategoryData.checks.map((check) => (
                <div
                  key={check.id}
                  className="p-4 rounded-xl bg-[#FFFDF9] border border-[#E6DFD5] shadow-xs space-y-2 hover:border-slate-300 transition-all"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center text-xs font-bold shrink-0">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                      <h4 className="text-xs sm:text-sm font-bold text-[#0B1F4B]">{check.name}</h4>
                    </div>
                    <span className="text-[10px] font-bold text-[#2563EB] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200 shrink-0">
                      {check.badge}
                    </span>
                  </div>

                  {/* Level 1: What We Check */}
                  <div className="pl-7 text-xs text-slate-700 leading-relaxed">
                    <span className="font-bold text-slate-900 mr-1.5">What we check:</span>
                    {check.whatWeCheck}
                  </div>

                  {/* Level 2: Why it matters */}
                  <div className="ml-7 p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-100 text-xs text-emerald-950 leading-relaxed flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold mr-1">Why it matters:</span>
                      {check.whyItMatters}
                    </div>
                  </div>

                  {/* Level 3: Optional Engineering Specs (When Toggled) */}
                  {showTechnicalDetails && (
                    <div className="ml-7 mt-2 p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1 animate-fade-in-up">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-1 text-slate-800 font-bold">
                        <span className="flex items-center gap-1">
                          <Wrench className="w-3 h-3 text-slate-500" /> Engineering Diagnostics
                        </span>
                        <span className="font-mono text-[10px] text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                          {check.technicalDetails.benchTool}
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-800">Test Procedure:</span>{' '}
                        {check.technicalDetails.procedure}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-800">Pass Criteria:</span>{' '}
                        {check.technicalDetails.criteria}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500 border-t border-[#E6DFD5]">
              <span className="flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-emerald-600" /> 100% Genuine Hardware &amp; Components
              </span>
              <span>32-Point Quality Certified Before Dispatch</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quality Grading Standards Section */}
      <div className="bg-[#FFFDF9] rounded-3xl p-6 sm:p-10 border border-[#E6DFD5] shadow-xs space-y-6">
        <div>
          <span className="text-[#2563EB] font-bold tracking-widest uppercase text-xs">
            Simple &amp; Honest Choices
          </span>
          <h3 className="text-2xl font-black text-[#0B1F4B] mt-1">Pick Your Preferred Condition</h3>
          <p className="text-xs text-slate-500 mt-1">
            Every grade has 100% healthy, tested internal hardware. You only choose the exterior cosmetic finish that fits your budget.
          </p>
        </div>

        {/* 3 Clean Self-Contained Grade Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {QUALITY_GRADES.map((g) => {
            const isSelected = g.grade === selectedGrade;
            return (
              <button
                key={g.grade}
                onClick={() => setSelectedGrade(g.grade)}
                className={`p-5 rounded-2xl border text-left transition-all cursor-pointer group flex flex-col justify-between ${
                  isSelected
                    ? 'border-[#2563EB] bg-blue-50/40 shadow-xs ring-2 ring-[#2563EB]/20'
                    : 'border-[#E6DFD5] bg-[#FAF6EF] hover:border-slate-300'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-black px-2.5 py-1 rounded-lg border ${g.badgeBg}`}>
                      {g.grade}
                    </span>
                    <span
                      className={`text-xs font-bold ${isSelected ? 'text-[#2563EB]' : 'text-slate-400'}`}
                    >
                      {isSelected ? 'Selected' : 'View Grade'}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-[#0B1F4B]">{g.label}</h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{g.summary}</p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#E6DFD5] text-[11px] text-emerald-800 font-semibold flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  {g.warranty}
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Grade Deep Dive Card */}
        <div className="p-5 sm:p-6 rounded-2xl bg-[#FAF6EF] border border-[#E6DFD5] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E6DFD5] pb-3">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Selected Condition:
              </span>
              <h4 className="text-base sm:text-lg font-black text-[#0B1F4B] flex items-center gap-2">
                {activeGradeData.grade} — {activeGradeData.label}
              </h4>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0 self-start sm:self-auto">
              1 Year Full Hardware Warranty Included
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
            <div className="p-3.5 rounded-xl bg-[#FFFDF9] border border-[#E6DFD5] space-y-1">
              <span className="font-bold text-[#0B1F4B] block flex items-center gap-1.5">
                <Monitor className="w-3.5 h-3.5 text-blue-600" /> Screen Condition
              </span>
              <p className="text-slate-600 leading-relaxed">{activeGradeData.screen}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#FFFDF9] border border-[#E6DFD5] space-y-1">
              <span className="font-bold text-[#0B1F4B] block flex items-center gap-1.5">
                <BatteryCharging className="w-3.5 h-3.5 text-emerald-600" /> Battery Health
              </span>
              <p className="text-slate-600 leading-relaxed">{activeGradeData.battery}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#FFFDF9] border border-[#E6DFD5] space-y-1">
              <span className="font-bold text-[#0B1F4B] block flex items-center gap-1.5">
                <Laptop className="w-3.5 h-3.5 text-purple-600" /> Exterior Body
              </span>
              <p className="text-slate-600 leading-relaxed">{activeGradeData.casing}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
