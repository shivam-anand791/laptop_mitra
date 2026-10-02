# LaptopMitra Image & Visual Asset Plan

> **Document Version:** 1.1.0  
> **Status:** Phase 0 — Resubmitted for User Review & Approval  
> **Target Directory:** `apps/web/public/images/generated/`

---

## 1. Environment Tool Availability & Strict Rules

### 1.1 Image Generation Tool Availability
- **Tool Available in Environment**: **YES** (`generate_image` tool is available).
- **Execution Plan**: During Phase 2, the available `generate_image` tool will generate the environmental, banner, category, and empty-state assets directly to `apps/web/public/images/generated/` and store the exact prompts used alongside.

### 1.2 Art Direction & Performance Guardrails
- **Color Palette**: Deep enterprise navy blue (`#0B1F4B`, `#071433`), electric cyan/royal blue ambient accents (`#1D6FF2`), subtle glass reflections, and ultra-clean modern studio lighting.
- **Strict Prohibition on Embedded Text**: No readable text, slogans, or typography baked into image pixels. All titles, badges, and copy are rendered as semantic HTML elements.
- **Strict Prohibition on Trademarks**: No visible Apple, Lenovo, Dell, HP, Windows, or Intel logos baked into 3D models or artwork. Minimalist modern unbranded hardware chassis only.
- **Zero Product Catalog Generation**: Individual product card and listing images use authentic photography from catalog data. Generated art is strictly reserved for banners, category tiles, section backdrops, and empty/error states.
- **Resolution & Optimization Budget**:
  - Hero: Full-width `2400 x 1200` px (Desktop) + `800 x 1000` px (Mobile crop). File budget **<= 200 KB** (WebP/AVIF).
  - All other assets: Generated at **2x retina** display resolution. File budget **<= 100 KB** (WebP/AVIF).
  - Referenced exclusively via `next/image` with explicit `alt`, `sizes`, and `priority` strictly reserved for the hero image.

---

## 2. Definitive Asset Inventory & Generation Specifications

### 2.1 Hero & Core Brand Banners

| # | Filename | Dimensions & Ratio | Placement | Target Size | `sizes` Attribute | Alt Text | Art Direction & Generation Prompt |
|---|---|---|---|---|---|---|---|
| **1a** | `hero-enterprise-laptop.webp` | `2400 x 1200` px<br>`(2:1)` | **Home Hero Desktop** | `<= 200 KB` | `(max-width: 1024px) 100vw, 1200px` | "Enterprise-grade certified refurbished laptops in modern studio lighting" | **Prompt:** *Sleek unbranded premium dark enterprise laptop slightly open at an elegant angle on a dark slate studio surface, soft cinematic ambient blue edge-lighting, deep navy blue background (#0B1F4B) with subtle geometric gradient shadows, ultra-clean studio lighting, professional corporate aesthetic, 8k render, no text, no logos.* |
| **1b** | `hero-enterprise-laptop-mobile.webp` | `800 x 1000` px<br>`(4:5)` | **Home Hero Mobile** | `<= 120 KB` | `100vw` | "Certified refurbished laptops showcase" | **Prompt:** *Vertical portrait composition of a sleek unbranded premium dark enterprise laptop slightly open, soft cinematic ambient blue edge-lighting, deep navy blue background (#0B1F4B), ultra-clean studio lighting, no text, no logos.* |
| **2** | `more-than-purchase-banner.webp` | `2400 x 1000` px<br>`(12:5 2x)` | **"More than a purchase" Banner** | `<= 100 KB` | `(max-width: 1280px) 100vw, 1280px` | "Close-up view of precision engineered enterprise laptop chassis" | **Prompt:** *Futuristic close-up view of an open premium sleek laptop keyboard and chassis illuminated by smooth cyan and royal blue studio rim light, deep navy blue background, pristine clean metallic texture, subtle depth of field, high-tech enterprise engineering aesthetic, 8k resolution, no text, no brand logos.* |
| **3** | `bulk-order-callout.webp` | `1200 x 750` px<br>`(16:10 2x)` | **Store Page Bulk Quote Callout** | `<= 90 KB` | `(max-width: 768px) 100vw, 400px` | "Row of enterprise laptops configured for corporate deployment" | **Prompt:** *Modern enterprise office desk setup with multiple sleek unbranded laptops neatly arranged in a row, soft ambient corporate office lighting with navy and blue accents, high-end business workspace environment, clean shallow depth of field, 8k render, no text, no logos.* |

---

### 2.2 Verified Category Showcase Cards (5 Real Categories in Data)

> [!NOTE]
> Validated against catalog database categories in `apps/web/lib/mock-data.ts`. "Desktops & Workstations" from Image 1 placeholder has been omitted since only laptops are currently cataloged.

| # | Filename | Dimensions & Ratio | Placement & Route Link | Target Size | `sizes` Attribute | Alt Text | Art Direction & Generation Prompt |
|---|---|---|---|---|---|---|---|
| **4** | `cat-business.webp` | `800 x 600` px<br>`(4:3 2x)` | **Business Laptops**<br>(`/products?category=cat-business`) | `<= 70 KB` | `(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw` | "Business executive laptop for corporate productivity" | **Prompt:** *Ultra-durable matte black executive business laptop standing open on a clean modern office desk with soft blue lighting accents, professional enterprise aesthetic, high-end studio product photograph, minimalist, sharp focus, no text, no logos.* |
| **5** | `cat-apple.webp` | `800 x 600` px<br>`(4:3 2x)` | **Apple MacBooks**<br>(`/products?category=cat-apple`) | `<= 70 KB` | `(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw` | "Ultra-slim silver laptop with high resolution Retina display" | **Prompt:** *Ultra-slim precision CNC machined space-gray ultrabook floating at an elegant angle, luxury minimalist aesthetic, reflective glass studio surface with subtle royal blue highlights, ultra-crisp studio lighting, no text, no logos.* |
| **6** | `cat-gaming.webp` | `800 x 600` px<br>`(4:3 2x)` | **Gaming & High-Perf**<br>(`/products?category=cat-gaming`) | `<= 70 KB` | `(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw` | "High performance gaming laptop with backlit keyboard" | **Prompt:** *High-performance stealth gaming laptop with subtle RGB keyboard backlighting, open on a dark minimalist gaming desk, cool cyan and purple ambient glow in the background, sharp industrial design, no text, no logos.* |
| **7** | `cat-ultrabook.webp` | `800 x 600` px<br>`(4:3 2x)` | **Ultrabooks & Thin**<br>(`/products?category=cat-ultrabook`) | `<= 70 KB` | `(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw` | "Featherweight slim laptop for executive mobility" | **Prompt:** *Precision aluminum ultraportable laptop open on a modern glass desk, soft clean ambient daylight with blue studio accents, sleek minimalist aesthetic, no text, no logos.* |
| **8** | `cat-student.webp` | `800 x 600` px<br>`(4:3 2x)` | **Student & Budget**<br>(`/products?category=cat-student`) | `<= 70 KB` | `(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw` | "Affordable student laptop for study and programming" | **Prompt:** *Modern lightweight sleek silver laptop open on a clean bright wooden study desk with minimal study accessories, soft natural lighting with cool blue ambient tones, neat educational productivity workspace, no text, no logos.* |

---

### 2.3 Service & Value-Add Sections

| # | Filename | Dimensions & Ratio | Placement | Target Size | `sizes` Attribute | Alt Text | Art Direction & Generation Prompt |
|---|---|---|---|---|---|---|---|
| **9** | `service-leasing.webp` | `1000 x 600` px<br>`(5:3 2x)` | **Flexible Leasing Card** (Home page) | `<= 80 KB` | `(max-width: 768px) 100vw, 50vw` | "Enterprise hardware fleet leasing program illustration" | **Prompt:** *Isometric 3D render of modern corporate hardware fleet deployment, multiple neat laptops with glowing blue connection lines, deep navy background, sleek business tech visualization, clean minimalist aesthetic, no text, no logos.* |
| **10** | `service-exchange.webp` | `1000 x 600` px<br>`(5:3 2x)` | **Sell / Exchange Card** (Home page) | `<= 80 KB` | `(max-width: 768px) 100vw, 50vw` | "Instant laptop trade-in and exchange program illustration" | **Prompt:** *Isometric 3D tech trade-in concept illustration, circular recycle arrows glowing with emerald green and cyan light around a sleek laptop, deep navy background, premium corporate aesthetic, clean lighting, no text, no logos.* |

---

### 2.4 Empty States & Error Screens

| # | Filename | Dimensions & Ratio | Placement | Target Size | `sizes` Attribute | Alt Text | Art Direction & Generation Prompt |
|---|---|---|---|---|---|---|---|
| **11** | `empty-cart.webp` | `600 x 600` px<br>`(1:1 2x)` | **Empty Cart State** (`app/cart/page.tsx`) | `<= 60 KB` | `300px` | "Empty shopping cart illustration" | **Prompt:** *3D minimalist illustration of a stylized shopping cart with soft blue and cyan glassmorphism materials, floating gently in front of a clean soft slate-grey backdrop, friendly clean e-commerce art, no text.* |
| **12** | `empty-wishlist.webp` | `600 x 600` px<br>`(1:1 2x)` | **Empty Wishlist State** (`app/wishlist/page.tsx`) | `<= 60 KB` | `300px` | "Saved items wishlist illustration" | **Prompt:** *3D minimalist illustration of a sleek laptop with a floating holographic glass heart icon above it, soft pastel blue and rose reflections on a clean studio surface, friendly modern art, no text.* |
| **13** | `empty-search.webp` | `600 x 600` px<br>`(1:1 2x)` | **No Search Results** (`app/products/page.tsx`) | `<= 60 KB` | `300px` | "No matching laptops found illustration" | **Prompt:** *3D minimalist illustration of a sleek magnifying glass inspecting a laptop with glowing blue interface lines, clean slate-grey backdrop, modern tech aesthetic, no text.* |
| **14** | `error-404.webp` | `800 x 600` px<br>`(4:3 2x)` | **404 Page** (`app/not-found.tsx`) | `<= 75 KB` | `400px` | "Page not found 404 error illustration" | **Prompt:** *3D illustration of an unplugged or floating futuristic laptop cable with gentle glowing cyan light sparks, modern tech error concept, soft deep navy and blue background, friendly sleek UI art, no text.* |

---

## 3. Live Hero Carousel Content Audit

In `apps/web/app/page.tsx` and the live site (Image 2), the hero content communicates the following core promotional pillars:
1. **Slide 1 / Primary Pillar**: "Enterprise Laptops. Like-New Condition. Up to 65% Off Retail." — 32-point inspection, 1-Year Comprehensive Warranty, 7-Day Replacement Guarantee. CTAs: "Explore All Laptops", "Apple MacBooks", "Corporate Leasing".
2. **Slide 2 / MacBooks Pillar**: "Certified Apple Silicon MacBooks (M1 & M2)" — 100% Battery health tested, Retina displays, premium aluminum unibody.
3. **Slide 3 / Corporate Fleet Pillar**: "Zero CapEx Laptop Leasing for Startups & Teams" — Tax-deductible monthly rentals, 48-hour swap guarantee.

*All three promotional pillars will be preserved in the redesigned hero carousel.*

---

## 4. Database Product Images Audit: Stock vs Real Hardware Photos

During the audit of `apps/web/lib/mock-data.ts`, all 6 catalog products were identified as currently using Unsplash stock/lifestyle photography. Below is the full inventory for replacement with authentic unit photos:

| Product ID & Name | Image URL | Image Type | Current Issue |
|---|---|---|---|
| `prod-macbook-pro-16`<br>(MacBook Pro 16" M2 Pro) | `https://images.unsplash.com/photo-1517336714731-489689fd1ca8`<br>`https://images.unsplash.com/photo-1611186871348-b1ce696e52c9`<br>`https://images.unsplash.com/photo-1541807084-5c52b6b3adef` | **Stock (Unsplash)** | Generic MacBook shots; shows older Intel MacBook chassis rather than real M2 Pro unit. |
| `prod-thinkpad-x1-carbon-g10`<br>(ThinkPad X1 Carbon Gen 10) | `https://images.unsplash.com/photo-1588872657578-7efd1f1555ed`<br>`https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0` | **Stock (Unsplash)** | Generic ThinkPad on wooden table; does not display actual Gen 10 chassis condition. |
| `prod-dell-xps-15-9520`<br>(Dell XPS 15 9520) | `https://images.unsplash.com/photo-1593642632823-8f785ba67e45`<br>`https://images.unsplash.com/photo-1593642702821-c8da6771f0c6` | **Stock (Unsplash)** | Unsplash marketing shot with coffee cup; not authentic refurbished inventory photograph. |
| `prod-asus-rog-zephyrus-g14`<br>(ASUS ROG Zephyrus G14) | `https://images.unsplash.com/photo-1603302576837-37561b2e2302`<br>`https://images.unsplash.com/photo-1542751371-adc38448a05e` | **Stock (Unsplash)** | Generic neon gaming setup; not actual refurbished unit. |
| `prod-hp-elitebook-840-g8`<br>(HP EliteBook 840 G8) | `https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2`<br>`https://images.unsplash.com/photo-1496181133206-80ce9b88a853` | **Stock (Unsplash)** | Generic silver laptop on white desk. |
| `prod-macbook-air-m1`<br>(MacBook Air 13.3" M1) | `https://images.unsplash.com/photo-1611186871348-b1ce696e52c9`<br>`https://images.unsplash.com/photo-1517336714731-489689fd1ca8` | **Stock (Unsplash)** | Reused Unsplash image identical to MacBook Pro 16. |

> [!NOTE]
> Per Hard Constraints, AI-generated images will NEVER be used for product catalog items. Authentic product photographs should be uploaded to replace the Unsplash URLs above.
