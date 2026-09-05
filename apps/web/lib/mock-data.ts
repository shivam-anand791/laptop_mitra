import { Product, Category } from './types';

export const MOCK_CATEGORIES: Category[] = [
  { id: 'cat-business', name: 'Business Laptops', slug: 'business', description: 'Durable, secure laptops engineered for enterprise productivity and executive mobility.' },
  { id: 'cat-ultrabook', name: 'Ultrabooks & Thin', slug: 'ultrabooks', description: 'Featherweight, sleek aluminum ultraportables with all-day battery life.' },
  { id: 'cat-gaming', name: 'Gaming & High-Perf', slug: 'gaming', description: 'High-refresh displays and dedicated NVIDIA GPUs for gaming, rendering, and CAD.' },
  { id: 'cat-apple', name: 'Apple MacBooks', slug: 'macbooks', description: 'Certified pre-owned Apple Silicon MacBooks in pristine condition with 100% battery health.' },
  { id: 'cat-student', name: 'Student & Budget', slug: 'student-budget', description: 'Affordable, dependable laptops with high battery backup for study and coding.' },
];

export const MOCK_PRODUCTS: Product[] = [
  {
    id: 'prod-macbook-pro-16',
    name: 'Apple MacBook Pro 16" (M2 Pro, 16GB, 512GB SSD) - Space Gray',
    slug: 'apple-macbook-pro-16-m2-pro',
    description: 'Certified Refurbished Apple MacBook Pro 16-inch featuring the revolutionary Apple M2 Pro chip with 12-core CPU and 19-core GPU. Liquid Retina XDR display with ProMotion 120Hz, pristine aluminum unibody with zero blemishes, and battery health rated at 98%. Includes original 140W MagSafe charger and 1-Year LaptopMitra comprehensive warranty.',
    shortDescription: 'Apple M2 Pro (12-Core), 16GB Unified RAM, 512GB NVMe, 16.2" Liquid Retina XDR 120Hz.',
    price: 154999,
    compareAtPrice: 249900,
    sku: 'LM-APL-MBP16-M2',
    stock: 8,
    status: 'ACTIVE',
    isFeatured: true,
    isNewArrival: true,
    tags: 'apple,macbook,m2,pro,space-gray,16gb,ultrabook',
    categoryId: 'cat-apple',
    category: MOCK_CATEGORIES[3],
    images: [
      { id: 'img-1', url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1000&q=80', altText: 'MacBook Pro 16 open on desk', isPrimary: true },
      { id: 'img-2', url: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&w=1000&q=80', altText: 'MacBook Pro side profile', isPrimary: false },
      { id: 'img-3', url: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&w=1000&q=80', altText: 'MacBook Pro keyboard and trackpad', isPrimary: false }
    ],
    metadata: {
      processor: 'Apple M2 Pro (12-Core CPU, 19-Core GPU)',
      ram: '16GB Unified Memory',
      storage: '512GB Superfast NVMe SSD',
      display: '16.2" Liquid Retina XDR (3456x2234), 120Hz ProMotion',
      graphics: 'Apple 19-Core Integrated GPU',
      condition: 'Grade A+ Pristine (Certified Like-New)',
      warranty: '1 Year LaptopMitra Replacement & Service Warranty',
      batteryHealth: '98% Original Capacity (Tested 42 Cycles)',
      os: 'macOS Sequoia Pre-installed'
    }
  },
  {
    id: 'prod-thinkpad-x1-carbon-g10',
    name: 'Lenovo ThinkPad X1 Carbon Gen 10 (Intel Core i7 12th Gen, 16GB, 512GB SSD)',
    slug: 'lenovo-thinkpad-x1-carbon-gen-10',
    description: 'The definitive business executive laptop. Ultra-light carbon-fiber chassis weighing just 1.12kg, MIL-STD 810H durability tested, legendary ergonomic ThinkPad keyboard with TrackPoint, and stunning 14" WUXGA Anti-Glare IPS display. Thoroughly sanitized, thermal repasted, and tested across our 32-point inspection checklist.',
    shortDescription: 'Intel Core i7-1260P, 16GB LPDDR5, 512GB Gen4 SSD, 14" IPS 400 nits, 1.12 kg Carbon Fiber.',
    price: 64999,
    compareAtPrice: 148000,
    sku: 'LM-LEN-X1C-G10',
    stock: 14,
    status: 'ACTIVE',
    isFeatured: true,
    isNewArrival: false,
    tags: 'lenovo,thinkpad,x1,carbon,i7,business,ultrabook',
    categoryId: 'cat-business',
    category: MOCK_CATEGORIES[0],
    images: [
      { id: 'img-4', url: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=1000&q=80', altText: 'Lenovo ThinkPad laptop', isPrimary: true },
      { id: 'img-5', url: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=1000&q=80', altText: 'Lenovo keyboard view', isPrimary: false }
    ],
    metadata: {
      processor: 'Intel Core i7-1260P (12 Cores, 16 Threads, up to 4.7GHz)',
      ram: '16GB LPDDR5 5200MHz Dual Channel',
      storage: '512GB M.2 PCIe 4.0 NVMe SSD (Upgradable)',
      display: '14.0" WUXGA (1920x1200) IPS, 400 nits, 100% sRGB, Anti-glare',
      graphics: 'Intel Iris Xe Graphics',
      condition: 'Grade A+ Certified Refurbished',
      warranty: '1 Year Full On-site Warranty',
      batteryHealth: '95% Healthy, Up to 9 Hours Backup',
      os: 'Windows 11 Pro Genuine License'
    }
  },
  {
    id: 'prod-dell-xps-15-9520',
    name: 'Dell XPS 15 9520 (Intel Core i7 12th Gen, 32GB RAM, 1TB SSD, RTX 3050 Ti)',
    slug: 'dell-xps-15-9520-rtx',
    description: 'Precision-crafted CNC machined aluminum chassis with carbon-fiber palm rest. Features a breathtaking 15.6" 3.5K OLED InfinityEdge touchscreen, dedicated NVIDIA GeForce RTX 3050 Ti graphics, and mammoth 32GB DDR5 memory. Ideal for content creators, software architects, and design professionals.',
    shortDescription: 'Intel Core i7-12700H, 32GB DDR5, 1TB NVMe SSD, NVIDIA RTX 3050 Ti 4GB, 15.6" 3.5K OLED Touch.',
    price: 89999,
    compareAtPrice: 195000,
    sku: 'LM-DEL-XPS15-9520',
    stock: 6,
    status: 'ACTIVE',
    isFeatured: true,
    isNewArrival: true,
    tags: 'dell,xps,oled,rtx,creator,i7,32gb',
    categoryId: 'cat-ultrabook',
    category: MOCK_CATEGORIES[1],
    images: [
      { id: 'img-6', url: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=1000&q=80', altText: 'Dell XPS 15 workspace setup', isPrimary: true },
      { id: 'img-7', url: 'https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?auto=format&fit=crop&w=1000&q=80', altText: 'Dell XPS side profile', isPrimary: false }
    ],
    metadata: {
      processor: 'Intel Core i7-12700H (14 Cores, 20 Threads, up to 4.7GHz)',
      ram: '32GB DDR5 4800MHz Dual Channel',
      storage: '1TB Samsung Gen4 NVMe M.2 SSD',
      display: '15.6" 3.5K (3456x2160) OLED InfinityEdge Touch, 100% DCI-P3',
      graphics: 'NVIDIA GeForce RTX 3050 Ti 4GB GDDR6 Dedicated',
      condition: 'Grade A+ Immaculate',
      warranty: '1 Year LaptopMitra Warranty',
      batteryHealth: '92% Battery Health (86Whr)',
      os: 'Windows 11 Pro 64-bit'
    }
  },
  {
    id: 'prod-asus-rog-zephyrus-g14',
    name: 'ASUS ROG Zephyrus G14 (AMD Ryzen 9 6900HS, 16GB, 1TB SSD, Radeon RX 6700S)',
    slug: 'asus-rog-zephyrus-g14-ryzen9',
    description: 'The ultimate compact gaming beast. Powered by AMD Ryzen 9 6900HS paired with Radeon RX 6700S 8GB graphics and AniMe Matrix LED lid. 14-inch ROG Nebula 120Hz QHD display with 3ms response time, vapor chamber cooling, and Dolby Atmos quad-speaker audio.',
    shortDescription: 'AMD Ryzen 9 6900HS, 16GB DDR5, 1TB SSD, Radeon RX 6700S 8GB, 14" QHD 120Hz Nebula Display.',
    price: 78999,
    compareAtPrice: 165000,
    sku: 'LM-ASU-ROG-G14',
    stock: 10,
    status: 'ACTIVE',
    isFeatured: true,
    isNewArrival: false,
    tags: 'asus,rog,gaming,ryzen9,radeon,120hz,portable',
    categoryId: 'cat-gaming',
    category: MOCK_CATEGORIES[2],
    images: [
      { id: 'img-8', url: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=1000&q=80', altText: 'ASUS ROG Gaming laptop on illuminated desk', isPrimary: true },
      { id: 'img-9', url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1000&q=80', altText: 'Gaming setup display', isPrimary: false }
    ],
    metadata: {
      processor: 'AMD Ryzen 9 6900HS (8 Cores, 16 Threads, up to 4.9GHz)',
      ram: '16GB DDR5 4800MHz (expandable to 32GB)',
      storage: '1TB PCIe 4.0 NVMe M.2 SSD',
      display: '14" QHD+ (2560x1600) 120Hz ROG Nebula Display, 500 nits, 100% DCI-P3',
      graphics: 'AMD Radeon RX 6700S 8GB GDDR6 with MUX Switch',
      condition: 'Grade A+ Mint Condition',
      warranty: '1 Year Comprehensive Protection',
      batteryHealth: '94% Original Capacity (76Whr)',
      os: 'Windows 11 Home Genuine'
    }
  },
  {
    id: 'prod-hp-elitebook-840-g8',
    name: 'HP EliteBook 840 G8 (Intel Core i5 11th Gen, 16GB RAM, 256GB SSD)',
    slug: 'hp-elitebook-840-g8-i5',
    description: 'Corporate powerhouse laptop featuring HP Sure View privacy screen, Bang & Olufsen tuned audio, spill-resistant backlit keyboard, and full aluminum chassis. High efficiency battery with fast charge capabilities.',
    shortDescription: 'Intel Core i5-1135G7, 16GB DDR4, 256GB NVMe SSD, 14" FHD IPS Anti-glare, Bang & Olufsen Audio.',
    price: 33999,
    compareAtPrice: 88000,
    sku: 'LM-HP-EB840-G8',
    stock: 22,
    status: 'ACTIVE',
    isFeatured: false,
    isNewArrival: true,
    tags: 'hp,elitebook,budget,student,business,i5',
    categoryId: 'cat-student',
    category: MOCK_CATEGORIES[4],
    images: [
      { id: 'img-10', url: 'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?auto=format&fit=crop&w=1000&q=80', altText: 'HP EliteBook laptop open on desk', isPrimary: true },
      { id: 'img-11', url: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1000&q=80', altText: 'HP laptop side view', isPrimary: false }
    ],
    metadata: {
      processor: 'Intel Core i5-1135G7 (4 Cores, 8 Threads, up to 4.2GHz)',
      ram: '16GB DDR4 3200MHz Dual Channel',
      storage: '256GB NVMe PCIe M.2 SSD (Upgradable to 1TB)',
      display: '14.0" Full HD (1920x1080) IPS, 250 nits Anti-glare',
      graphics: 'Intel Iris Xe Graphics',
      condition: 'Grade A+ Corporate Lease Return',
      warranty: '1 Year Warranty with Free Doorstep Pickup',
      batteryHealth: '91% (Up to 7.5 hours battery life)',
      os: 'Windows 11 Pro Genuine'
    }
  },
  {
    id: 'prod-macbook-air-m1',
    name: 'Apple MacBook Air 13.3" (M1 Chip, 8GB RAM, 256GB SSD) - Gold',
    slug: 'apple-macbook-air-m1-gold',
    description: 'The world\'s most popular laptop, powered by the game-changing Apple M1 chip. Silent fanless design with zero noise, astonishing 18-hour battery endurance, Retina display with True Tone, and studio-quality mics.',
    shortDescription: 'Apple M1 (8-Core CPU / 7-Core GPU), 8GB Unified RAM, 256GB SSD, 13.3" Retina Display.',
    price: 49999,
    compareAtPrice: 92900,
    sku: 'LM-APL-MBA13-M1',
    stock: 16,
    status: 'ACTIVE',
    isFeatured: true,
    isNewArrival: false,
    tags: 'apple,macbook,air,m1,gold,retina,budget',
    categoryId: 'cat-apple',
    category: MOCK_CATEGORIES[3],
    images: [
      { id: 'img-12', url: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&w=1000&q=80', altText: 'MacBook Air open cleanly', isPrimary: true },
      { id: 'img-13', url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1000&q=80', altText: 'MacBook Air side angle', isPrimary: false }
    ],
    metadata: {
      processor: 'Apple M1 Chip (8-Core CPU, 7-Core GPU, 16-Core Neural Engine)',
      ram: '8GB Unified Memory',
      storage: '256GB Superfast SSD',
      display: '13.3" LED-backlit Retina Display (2560x1600) with True Tone',
      graphics: 'Apple 7-Core GPU',
      condition: 'Grade A+ Pristine (Screen & Chassis Flawless)',
      warranty: '1 Year Comprehensive Warranty',
      batteryHealth: '96% (Tested 54 cycles, 14+ hours backup)',
      os: 'macOS Sonoma'
    }
  }
];

export const MOCK_DISCOUNT_CODES = [
  { code: 'MITRA500', name: 'Mitra ₹500 Flat Discount', type: 'fixed', value: 500, minOrderValue: 20000 },
  { code: 'WELCOME10', name: 'New Buyer 10% Off', type: 'percentage', value: 10, minOrderValue: 30000 },
  { code: 'STUDENTPASS', name: 'Student Extra ₹1,000 Off', type: 'fixed', value: 1000, minOrderValue: 30000 }
];
