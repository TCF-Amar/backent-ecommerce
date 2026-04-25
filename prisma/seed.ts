import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────

const slugify = (text: string) =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const randomBetween = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const randomFloat = (min: number, max: number) =>
  parseFloat((Math.random() * (max - min) + min).toFixed(2));

const pickRandom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// Consistent image URL using picsum (seed = slug for repeatability)
const productImage = (slug: string, w = 600, h = 600) =>
  `https://picsum.photos/seed/${slug}/${w}/${h}`;

// ─────────────────────────────────────────
// 25 CATEGORIES
// ─────────────────────────────────────────

const CATEGORIES = [
  { name: "Smartphones",       description: "Latest Android and iOS smartphones",         image: "https://picsum.photos/seed/smartphones/400/300"       },
  { name: "Laptops",           description: "Ultrabooks, gaming and office laptops",       image: "https://picsum.photos/seed/laptops/400/300"           },
  { name: "Tablets",           description: "iPads, Android tablets and e-readers",        image: "https://picsum.photos/seed/tablets/400/300"           },
  { name: "Audio",             description: "Headphones, earbuds and speakers",            image: "https://picsum.photos/seed/audio/400/300"             },
  { name: "Cameras",           description: "DSLR, mirrorless and action cameras",         image: "https://picsum.photos/seed/cameras/400/300"           },
  { name: "Gaming",            description: "Consoles, controllers and accessories",       image: "https://picsum.photos/seed/gaming/400/300"            },
  { name: "Smart Home",        description: "Smart bulbs, speakers and home automation",   image: "https://picsum.photos/seed/smarthome/400/300"         },
  { name: "TVs & Displays",    description: "4K, OLED and curved TVs",                     image: "https://picsum.photos/seed/tvs/400/300"               },
  { name: "Men's Clothing",    description: "T-shirts, shirts, trousers and more",         image: "https://picsum.photos/seed/mens-clothing/400/300"     },
  { name: "Women's Clothing",  description: "Dresses, tops, kurtis and ethnic wear",       image: "https://picsum.photos/seed/womens-clothing/400/300"   },
  { name: "Kids' Clothing",    description: "Comfortable and fun clothing for kids",       image: "https://picsum.photos/seed/kids-clothing/400/300"     },
  { name: "Men's Shoes",       description: "Sneakers, formal and sports shoes for men",   image: "https://picsum.photos/seed/mens-shoes/400/300"        },
  { name: "Women's Shoes",     description: "Heels, flats and casual shoes for women",     image: "https://picsum.photos/seed/womens-shoes/400/300"      },
  { name: "Bags & Luggage",    description: "Backpacks, handbags, trolleys and wallets",   image: "https://picsum.photos/seed/bags/400/300"              },
  { name: "Watches",           description: "Luxury, smart and casual watches",            image: "https://picsum.photos/seed/watches/400/300"           },
  { name: "Jewelry",           description: "Necklaces, earrings, rings and bracelets",    image: "https://picsum.photos/seed/jewelry/400/300"           },
  { name: "Beauty & Skincare", description: "Moisturizers, serums and makeup essentials",  image: "https://picsum.photos/seed/beauty/400/300"            },
  { name: "Health & Fitness",  description: "Protein, supplements and gym equipment",      image: "https://picsum.photos/seed/fitness/400/300"           },
  { name: "Home & Kitchen",    description: "Cookware, appliances and home decor",         image: "https://picsum.photos/seed/kitchen/400/300"           },
  { name: "Furniture",         description: "Sofas, beds, tables and storage solutions",   image: "https://picsum.photos/seed/furniture/400/300"         },
  { name: "Books",             description: "Fiction, non-fiction, textbooks and more",    image: "https://picsum.photos/seed/books/400/300"             },
  { name: "Sports & Outdoors", description: "Cricket, football, cycling and camping gear", image: "https://picsum.photos/seed/sports/400/300"            },
  { name: "Toys & Games",      description: "Board games, action figures and LEGO sets",   image: "https://picsum.photos/seed/toys/400/300"              },
  { name: "Food & Beverages",  description: "Organic, gourmet and daily essentials",       image: "https://picsum.photos/seed/food/400/300"              },
  { name: "Automotive",        description: "Car accessories, tools and cleaning kits",    image: "https://picsum.photos/seed/automotive/400/300"        },
];

// ─────────────────────────────────────────
// 200 PRODUCTS mapped to categories
// ─────────────────────────────────────────

type ProductTemplate = {
  category: string;
  name: string;
  description: string;
  price: number;
  comparePrice: number;
  tags: string[];
};

const PRODUCTS: ProductTemplate[] = [
  // ── Smartphones (10) ──────────────────
  { category: "Smartphones", name: "Samsung Galaxy S24 Ultra", description: "200MP camera, S-Pen support, Snapdragon 8 Gen 3, 5000mAh battery.", price: 124999, comparePrice: 134999, tags: ["android", "samsung", "flagship"] },
  { category: "Smartphones", name: "iPhone 15 Pro Max", description: "A17 Pro chip, titanium design, 48MP main camera, USB-C.", price: 159900, comparePrice: 169900, tags: ["apple", "ios", "flagship"] },
  { category: "Smartphones", name: "OnePlus 12", description: "Hasselblad camera, 100W fast charging, Snapdragon 8 Gen 3.", price: 64999, comparePrice: 69999, tags: ["oneplus", "android", "performance"] },
  { category: "Smartphones", name: "Google Pixel 8 Pro", description: "Google AI features, pure Android, 50MP triple camera.", price: 92999, comparePrice: 99999, tags: ["google", "pixel", "android"] },
  { category: "Smartphones", name: "Xiaomi 14 Pro", description: "Leica optics, 4880mAh battery, 120W HyperCharge.", price: 74999, comparePrice: 79999, tags: ["xiaomi", "android", "camera"] },
  { category: "Smartphones", name: "Realme GT 5 Pro", description: "Snapdragon 8 Gen 3, 144Hz AMOLED, 240W fast charging.", price: 39999, comparePrice: 44999, tags: ["realme", "gaming", "fast-charge"] },
  { category: "Smartphones", name: "Vivo X100 Pro", description: "ZEISS optics, Dimensity 9300, 100W wireless charging.", price: 89999, comparePrice: 94999, tags: ["vivo", "camera", "flagship"] },
  { category: "Smartphones", name: "iQOO 12", description: "Snapdragon 8 Gen 3, 144Hz AMOLED, 120W FlashCharge.", price: 52999, comparePrice: 57999, tags: ["iqoo", "gaming", "performance"] },
  { category: "Smartphones", name: "OPPO Find X7 Ultra", description: "Periscope telephoto, Snapdragon 8 Gen 3, 80W charging.", price: 84999, comparePrice: 89999, tags: ["oppo", "camera", "zoom"] },
  { category: "Smartphones", name: "Nothing Phone 2", description: "Glyph interface, Snapdragon 8+ Gen 1, clean Android.", price: 44999, comparePrice: 49999, tags: ["nothing", "design", "android"] },

  // ── Laptops (9) ───────────────────────
  { category: "Laptops", name: "MacBook Pro 14 M3 Pro", description: "M3 Pro chip, 18GB RAM, 512GB SSD, Liquid Retina XDR display.", price: 199900, comparePrice: 209900, tags: ["apple", "macos", "professional"] },
  { category: "Laptops", name: "Dell XPS 15 9530", description: "Intel Core i9, 32GB DDR5, OLED 4K display, RTX 4070.", price: 189999, comparePrice: 199999, tags: ["dell", "windows", "creator"] },
  { category: "Laptops", name: "Lenovo ThinkPad X1 Carbon", description: "Business ultrabook, Intel Core i7, MIL-SPEC durability.", price: 129999, comparePrice: 139999, tags: ["lenovo", "business", "ultrabook"] },
  { category: "Laptops", name: "ASUS ROG Zephyrus G16", description: "AMD Ryzen 9, RTX 4080, 240Hz QHD display, 18hr battery.", price: 169999, comparePrice: 179999, tags: ["asus", "gaming", "rog"] },
  { category: "Laptops", name: "HP Spectre x360 14", description: "2-in-1 ultrabook, Intel Core i7, OLED touch display.", price: 149999, comparePrice: 159999, tags: ["hp", "2-in-1", "touchscreen"] },
  { category: "Laptops", name: "Acer Nitro V 16", description: "AMD Ryzen 7, RTX 4060, 165Hz FHD display, best value gaming.", price: 79999, comparePrice: 89999, tags: ["acer", "gaming", "budget"] },
  { category: "Laptops", name: "Microsoft Surface Laptop 5", description: "Intel Core i7, 16GB RAM, PixelSense display, slim design.", price: 139999, comparePrice: 149999, tags: ["microsoft", "surface", "windows"] },
  { category: "Laptops", name: "Samsung Galaxy Book 4 Pro", description: "Intel Core Ultra 7, AMOLED display, 400 nits, thin & light.", price: 149999, comparePrice: 159999, tags: ["samsung", "amoled", "ultrabook"] },
  { category: "Laptops", name: "Realme Book Prime", description: "Intel Core i5, 16GB RAM, 2K IPS display, budget-friendly.", price: 54999, comparePrice: 59999, tags: ["realme", "budget", "windows"] },

  // ── Tablets (8) ───────────────────────
  { category: "Tablets", name: "iPad Pro 13 M4", description: "M4 chip, Ultra Retina XDR OLED, Apple Pencil Pro support.", price: 108900, comparePrice: 114900, tags: ["apple", "ipad", "professional"] },
  { category: "Tablets", name: "Samsung Galaxy Tab S9 Ultra", description: "14.6\" Dynamic AMOLED, S Pen included, Snapdragon 8 Gen 2.", price: 108999, comparePrice: 114999, tags: ["samsung", "android", "large-screen"] },
  { category: "Tablets", name: "OnePlus Pad 2", description: "12.1\" LCD, Snapdragon 8 Gen 3, 67W SUPERVOOC charging.", price: 49999, comparePrice: 54999, tags: ["oneplus", "android", "performance"] },
  { category: "Tablets", name: "Xiaomi Pad 6 Pro", description: "11\" WQHD+ 144Hz, Snapdragon 8+ Gen 1, stylus support.", price: 34999, comparePrice: 39999, tags: ["xiaomi", "android", "value"] },
  { category: "Tablets", name: "Amazon Fire HD 10 Plus", description: "10.1\" 1080p, 4GB RAM, ideal for streaming and browsing.", price: 14999, comparePrice: 17999, tags: ["amazon", "budget", "entertainment"] },
  { category: "Tablets", name: "Lenovo Tab P12 Pro", description: "12.6\" AMOLED, Snapdragon 870, precision pen bundled.", price: 64999, comparePrice: 69999, tags: ["lenovo", "amoled", "productivity"] },
  { category: "Tablets", name: "Realme Pad X", description: "11\" 2K display, Snapdragon 695, 8340mAh battery.", price: 19999, comparePrice: 23999, tags: ["realme", "budget", "android"] },
  { category: "Tablets", name: "Apple iPad Air 11 M2", description: "M2 chip, 11\" Liquid Retina, USB-C, landscape FaceTime.", price: 59900, comparePrice: 64900, tags: ["apple", "ipad", "mid-range"] },

  // ── Audio (8) ─────────────────────────
  { category: "Audio", name: "Sony WH-1000XM5", description: "Industry-leading ANC, 30hr battery, multipoint connection.", price: 29990, comparePrice: 34990, tags: ["sony", "anc", "over-ear"] },
  { category: "Audio", name: "Apple AirPods Pro 2nd Gen", description: "H2 chip, adaptive transparency, MagSafe case, USB-C.", price: 24900, comparePrice: 26900, tags: ["apple", "earbuds", "anc"] },
  { category: "Audio", name: "Bose QuietComfort 45", description: "World-class ANC, 24hr battery, lightweight design.", price: 27990, comparePrice: 32990, tags: ["bose", "anc", "over-ear"] },
  { category: "Audio", name: "Samsung Galaxy Buds 3 Pro", description: "ANC, hi-fi audio, blade design, Galaxy ecosystem.", price: 17999, comparePrice: 19999, tags: ["samsung", "earbuds", "anc"] },
  { category: "Audio", name: "JBL Charge 5", description: "Portable Bluetooth speaker, IP67, 20hr playback, powerbank.", price: 14999, comparePrice: 17999, tags: ["jbl", "speaker", "waterproof"] },
  { category: "Audio", name: "Boat Rockerz 450 Pro", description: "60hr battery, Bluetooth 5.3, ENx tech, foldable design.", price: 1999, comparePrice: 3999, tags: ["boat", "budget", "over-ear"] },
  { category: "Audio", name: "Nothing Ear 2", description: "Dual ANC, 36hr total battery, transparency mode, clear design.", price: 9999, comparePrice: 11999, tags: ["nothing", "earbuds", "anc"] },
  { category: "Audio", name: "Sennheiser Momentum 4", description: "60hr battery, adaptive ANC, aptX Adaptive codec support.", price: 34990, comparePrice: 39990, tags: ["sennheiser", "premium", "over-ear"] },

  // ── Cameras (8) ───────────────────────
  { category: "Cameras", name: "Sony Alpha A7 IV", description: "33MP full-frame, 4K 60fps, IBIS, pro-level AF system.", price: 259990, comparePrice: 279990, tags: ["sony", "mirrorless", "full-frame"] },
  { category: "Cameras", name: "Canon EOS R6 Mark II", description: "24.2MP, 40fps burst, 6K RAW video, Dual Pixel AF II.", price: 234990, comparePrice: 249990, tags: ["canon", "mirrorless", "video"] },
  { category: "Cameras", name: "Nikon Z8", description: "45.7MP BSI CMOS, 8K RAW video, 20fps burst.", price: 329990, comparePrice: 349990, tags: ["nikon", "mirrorless", "flagship"] },
  { category: "Cameras", name: "Fujifilm X-T5", description: "40MP X-Trans sensor, film simulations, compact body.", price: 159990, comparePrice: 169990, tags: ["fujifilm", "mirrorless", "retro"] },
  { category: "Cameras", name: "GoPro HERO 12 Black", description: "5.3K video, HyperSmooth 6.0, waterproof to 10m.", price: 39999, comparePrice: 44999, tags: ["gopro", "action", "waterproof"] },
  { category: "Cameras", name: "DJI Osmo Pocket 3", description: "4K/120fps, 1-inch sensor, 3-axis gimbal, creator combo.", price: 44999, comparePrice: 49999, tags: ["dji", "vlogging", "gimbal"] },
  { category: "Cameras", name: "Canon EOS 250D", description: "24.1MP APS-C, 4K video, touchscreen, beginner DSLR.", price: 54990, comparePrice: 59990, tags: ["canon", "dslr", "beginner"] },
  { category: "Cameras", name: "Sony ZV-E10 II", description: "26MP APS-C, 4K 60fps, side-flip LCD, vlog-focused.", price: 79990, comparePrice: 84990, tags: ["sony", "vlogging", "mirrorless"] },

  // ── Gaming (8) ────────────────────────
  { category: "Gaming", name: "PlayStation 5 Slim", description: "PS5 Slim with disc drive, 1TB SSD, DualSense controller.", price: 54990, comparePrice: 59990, tags: ["sony", "console", "ps5"] },
  { category: "Gaming", name: "Xbox Series X", description: "12 TFLOPS, 1TB SSD, Xbox Game Pass ready.", price: 52990, comparePrice: 57990, tags: ["microsoft", "console", "xbox"] },
  { category: "Gaming", name: "Nintendo Switch OLED", description: "7\" OLED screen, enhanced audio, 64GB storage.", price: 34999, comparePrice: 37999, tags: ["nintendo", "handheld", "switch"] },
  { category: "Gaming", name: "Razer DeathAdder V3 Pro", description: "Wireless gaming mouse, Focus Pro 30K sensor, 90hr battery.", price: 14999, comparePrice: 17999, tags: ["razer", "mouse", "peripheral"] },
  { category: "Gaming", name: "Corsair K70 RGB Pro", description: "Cherry MX Speed switches, per-key RGB, media controls.", price: 13999, comparePrice: 16999, tags: ["corsair", "keyboard", "mechanical"] },
  { category: "Gaming", name: "ASUS ROG Swift PG279QM", description: "27\" IPS, 240Hz, 1ms, G-Sync, 1440p gaming monitor.", price: 59999, comparePrice: 64999, tags: ["asus", "monitor", "1440p"] },
  { category: "Gaming", name: "DualSense Edge Controller", description: "Customizable PS5 pro controller, back buttons, trigger stops.", price: 19999, comparePrice: 21999, tags: ["sony", "controller", "ps5"] },
  { category: "Gaming", name: "Logitech G Pro X Superlight 2", description: "Lightest gaming mouse, HERO 25K sensor, 95hr battery.", price: 11999, comparePrice: 13999, tags: ["logitech", "mouse", "esports"] },

  // ── Smart Home (7) ────────────────────
  { category: "Smart Home", name: "Amazon Echo Show 10", description: "10\" HD display, motion tracking, Alexa built-in, Zigbee hub.", price: 24999, comparePrice: 29999, tags: ["amazon", "alexa", "smart-display"] },
  { category: "Smart Home", name: "Google Nest Hub 2nd Gen", description: "7\" display, sleep sensing, Google Assistant, Chromecast.", price: 9999, comparePrice: 12999, tags: ["google", "assistant", "smart-display"] },
  { category: "Smart Home", name: "Philips Hue Starter Kit", description: "4 smart bulbs + bridge, 16M colors, app & voice control.", price: 12999, comparePrice: 15999, tags: ["philips", "smart-bulb", "rgb"] },
  { category: "Smart Home", name: "Ring Video Doorbell 4", description: "1080p HD, color pre-roll, two-way talk, motion detection.", price: 14999, comparePrice: 17999, tags: ["ring", "security", "doorbell"] },
  { category: "Smart Home", name: "Xiaomi Robot Vacuum S12", description: "4000Pa suction, LiDAR navigation, auto-empty base.", price: 34999, comparePrice: 39999, tags: ["xiaomi", "vacuum", "robot"] },
  { category: "Smart Home", name: "TP-Link Tapo Smart Plug", description: "Wi-Fi smart plug, energy monitoring, voice control.", price: 1499, comparePrice: 1999, tags: ["tp-link", "smart-plug", "energy"] },
  { category: "Smart Home", name: "Nest Learning Thermostat 4", description: "Auto-schedule, energy savings, works with Alexa & Google.", price: 27999, comparePrice: 31999, tags: ["google", "thermostat", "energy"] },

  // ── TVs & Displays (7) ────────────────
  { category: "TVs & Displays", name: "LG C3 OLED 55\"", description: "OLED evo, α9 AI Processor, 120Hz, Dolby Vision IQ.", price: 139990, comparePrice: 159990, tags: ["lg", "oled", "55-inch"] },
  { category: "TVs & Displays", name: "Samsung Neo QLED 4K 65\"", description: "Mini-LED, Neo Quantum Processor, Dolby Atmos, 65 inch.", price: 159990, comparePrice: 179990, tags: ["samsung", "qled", "65-inch"] },
  { category: "TVs & Displays", name: "Sony Bravia XR 55\"", description: "OLED, Cognitive Processor XR, HDMI 2.1, PS5 ready.", price: 179990, comparePrice: 199990, tags: ["sony", "oled", "bravia"] },
  { category: "TVs & Displays", name: "Mi TV 5X 55\"", description: "4K HDR10+, Dolby Vision, 30W Dolby Audio, PatchWall 4.", price: 44999, comparePrice: 49999, tags: ["xiaomi", "4k", "android-tv"] },
  { category: "TVs & Displays", name: "Hisense U7K 65\"", description: "ULED 4K Mini-LED, 144Hz, Dolby Vision, Google TV.", price: 89999, comparePrice: 99999, tags: ["hisense", "miniled", "65-inch"] },
  { category: "TVs & Displays", name: "BenQ EW2880U Monitor", description: "28\" 4K IPS, USB-C 60W, HDRi, eye-care for creators.", price: 44999, comparePrice: 49999, tags: ["benq", "monitor", "4k"] },
  { category: "TVs & Displays", name: "Samsung 34\" Odyssey G8", description: "Curved QD-OLED, 175Hz, 0.03ms, Ultra WQHD gaming monitor.", price: 99999, comparePrice: 109999, tags: ["samsung", "ultrawide", "gaming"] },

  // ── Men's Clothing (9) ────────────────
  { category: "Men's Clothing", name: "Levi's 511 Slim Jeans", description: "Slim fit, stretch fabric, classic 5-pocket design, dark wash.", price: 2999, comparePrice: 3999, tags: ["levi's", "jeans", "slim-fit"] },
  { category: "Men's Clothing", name: "Nike Dri-FIT T-Shirt", description: "Moisture-wicking, 100% polyester, athletic fit, breathable.", price: 1299, comparePrice: 1799, tags: ["nike", "sportswear", "gym"] },
  { category: "Men's Clothing", name: "Allen Solly Formal Shirt", description: "Regular fit, 100% cotton, wrinkle-resistant, for office wear.", price: 1499, comparePrice: 2499, tags: ["allen-solly", "formal", "shirt"] },
  { category: "Men's Clothing", name: "H&M Oversized Hoodie", description: "Cotton fleece, relaxed fit, kangaroo pocket, streetwear style.", price: 1999, comparePrice: 2999, tags: ["h&m", "hoodie", "casual"] },
  { category: "Men's Clothing", name: "Adidas Tiro Track Pants", description: "Tricot material, two-stripe design, tapered fit, elastic waist.", price: 2499, comparePrice: 3499, tags: ["adidas", "track-pants", "sport"] },
  { category: "Men's Clothing", name: "Peter England Blazer", description: "Slim fit, single button, notch lapel, polyester-viscose blend.", price: 4999, comparePrice: 7999, tags: ["peter-england", "blazer", "formal"] },
  { category: "Men's Clothing", name: "Puma Graphic Tee", description: "Regular fit, cotton blend, bold chest print, casual everyday.", price: 999, comparePrice: 1499, tags: ["puma", "casual", "tee"] },
  { category: "Men's Clothing", name: "Jack & Jones Cargo Shorts", description: "Multi-pocket cargo, relaxed fit, zip fly, summer essential.", price: 2199, comparePrice: 3199, tags: ["jack-jones", "shorts", "casual"] },
  { category: "Men's Clothing", name: "Van Heusen Chinos", description: "Slim fit, stretch fabric, khaki, wrinkle-free, smart casual.", price: 2499, comparePrice: 3499, tags: ["van-heusen", "chinos", "smart-casual"] },

  // ── Women's Clothing (9) ──────────────
  { category: "Women's Clothing", name: "Biba Anarkali Kurti", description: "Cotton blend, floral print, A-line, ethnic Indian wear.", price: 1899, comparePrice: 2999, tags: ["biba", "kurti", "ethnic"] },
  { category: "Women's Clothing", name: "Zara Floral Midi Dress", description: "V-neck, flowy fabric, button-down, spring/summer collection.", price: 3499, comparePrice: 4999, tags: ["zara", "dress", "midi"] },
  { category: "Women's Clothing", name: "H&M Ribbed Crop Top", description: "Stretch cotton, slim fit, versatile for casual or layered.", price: 799, comparePrice: 1299, tags: ["h&m", "crop-top", "casual"] },
  { category: "Women's Clothing", name: "W Women Straight Salwar", description: "Cotton palazzo, printed hem, wide-leg, ethnic comfort wear.", price: 1299, comparePrice: 1999, tags: ["w", "ethnic", "palazzo"] },
  { category: "Women's Clothing", name: "Levi's Women 721 Jeans", description: "High-rise skinny, stretch denim, ankle-length, dark indigo.", price: 3499, comparePrice: 4499, tags: ["levi's", "skinny-jeans", "high-rise"] },
  { category: "Women's Clothing", name: "Nike Yoga Tank Top", description: "Dri-FIT fabric, racerback, light support bra shelf, gym-ready.", price: 1799, comparePrice: 2499, tags: ["nike", "sportswear", "gym"] },
  { category: "Women's Clothing", name: "Global Desi Wrap Dress", description: "Rayon, wrap style, boho print, knee-length, summer dress.", price: 1599, comparePrice: 2299, tags: ["global-desi", "wrap-dress", "boho"] },
  { category: "Women's Clothing", name: "AND Women's Blazer", description: "Single-button, structured shoulders, lined, formal or casual.", price: 3999, comparePrice: 5999, tags: ["and", "blazer", "office"] },
  { category: "Women's Clothing", name: "Fabindia Cotton Dupatta Set", description: "Hand-block print, kurta + dupatta set, festive wear.", price: 2499, comparePrice: 3499, tags: ["fabindia", "ethnic", "festive"] },

  // ── Kids' Clothing (6) ────────────────
  { category: "Kids' Clothing", name: "H&M Kids Cotton Set", description: "T-shirt + shorts combo, soft jersey, fun prints, ages 2-10.", price: 799, comparePrice: 1299, tags: ["h&m", "kids", "casual"] },
  { category: "Kids' Clothing", name: "Disney Graphic Tee Kids", description: "100% cotton, soft feel, licensed Disney characters.", price: 599, comparePrice: 999, tags: ["disney", "kids", "graphic-tee"] },
  { category: "Kids' Clothing", name: "United Colors Benetton Jeans", description: "Slim fit, stretchable denim, comfortable for daily school wear.", price: 1299, comparePrice: 1799, tags: ["benetton", "kids", "jeans"] },
  { category: "Kids' Clothing", name: "Mothercare Fleece Jacket", description: "Zip-up fleece, warm lining, kangaroo pocket, winter essential.", price: 1499, comparePrice: 2199, tags: ["mothercare", "winter", "jacket"] },
  { category: "Kids' Clothing", name: "Max Fashion School Uniform Set", description: "Shirt + pant combo, anti-wrinkle fabric, navy & white.", price: 999, comparePrice: 1499, tags: ["max", "uniform", "school"] },
  { category: "Kids' Clothing", name: "Reebok Kids Tracksuit", description: "Polyester, full zip, elastic waist, sports branding.", price: 1799, comparePrice: 2499, tags: ["reebok", "kids", "sports"] },

  // ── Men's Shoes (8) ──────────────────
  { category: "Men's Shoes", name: "Nike Air Force 1 Low", description: "Iconic low-top leather sneaker, Air-Sole cushioning, white.", price: 7495, comparePrice: 8495, tags: ["nike", "sneaker", "af1"] },
  { category: "Men's Shoes", name: "Adidas Ultraboost 23", description: "Primeknit upper, BOOST midsole, Continental rubber outsole.", price: 14999, comparePrice: 17999, tags: ["adidas", "running", "boost"] },
  { category: "Men's Shoes", name: "Red Tape Formal Leather Shoe", description: "Genuine leather, Oxford style, cushioned insole, party/office.", price: 2999, comparePrice: 4999, tags: ["red-tape", "formal", "leather"] },
  { category: "Men's Shoes", name: "Woodland High-Ankle Boot", description: "Nubuck leather, water-resistant, rubber sole, trekking-friendly.", price: 4999, comparePrice: 6999, tags: ["woodland", "boots", "trekking"] },
  { category: "Men's Shoes", name: "Puma RS-X Sneaker", description: "Chunky design, mesh + leather, RS technology in sole.", price: 7999, comparePrice: 9999, tags: ["puma", "chunky", "sneaker"] },
  { category: "Men's Shoes", name: "Skechers Go Walk 7", description: "Ultra-lightweight, Goga Mat insole, slip-on daily walker.", price: 4499, comparePrice: 5999, tags: ["skechers", "comfort", "walking"] },
  { category: "Men's Shoes", name: "Bata North Star Canvas", description: "Canvas upper, vulcanized sole, casual everyday sneaker.", price: 999, comparePrice: 1499, tags: ["bata", "canvas", "casual"] },
  { category: "Men's Shoes", name: "New Balance 574", description: "Classic silhouette, suede/mesh, ENCAP midsole cushioning.", price: 7499, comparePrice: 8999, tags: ["new-balance", "lifestyle", "classic"] },

  // ── Women's Shoes (8) ────────────────
  { category: "Women's Shoes", name: "Steve Madden Heeled Sandal", description: "Block heel, ankle strap, vegan leather, 3-inch heel.", price: 4999, comparePrice: 6999, tags: ["steve-madden", "heels", "sandal"] },
  { category: "Women's Shoes", name: "Nike Air Max 90 Women", description: "Classic Air Max, leather/mesh upper, visible Air unit.", price: 8995, comparePrice: 10495, tags: ["nike", "sneaker", "airmax"] },
  { category: "Women's Shoes", name: "Clarks Cushion Sole Flats", description: "Leather upper, Cushion Soft technology, everyday comfort flats.", price: 4499, comparePrice: 5999, tags: ["clarks", "flats", "comfort"] },
  { category: "Women's Shoes", name: "Mochi Block Heel Mule", description: "Backless slip-on, chunky block heel, suede finish.", price: 1999, comparePrice: 2999, tags: ["mochi", "mule", "block-heel"] },
  { category: "Women's Shoes", name: "Adidas Stan Smith Women", description: "Clean leather upper, iconic 3-stripe, perforated toe cap.", price: 8999, comparePrice: 9999, tags: ["adidas", "stan-smith", "classic"] },
  { category: "Women's Shoes", name: "Bata Marie Claire Pump", description: "Pointed toe, stiletto, faux leather, party & formal wear.", price: 1799, comparePrice: 2499, tags: ["bata", "pump", "stiletto"] },
  { category: "Women's Shoes", name: "Inc.5 Ethnic Juttis", description: "Embroidered velvet, cushioned sole, ethnic festive footwear.", price: 1299, comparePrice: 1999, tags: ["inc5", "juttis", "ethnic"] },
  { category: "Women's Shoes", name: "Crocs Classic Clog", description: "Lightweight, odour-resistant, 13 port ventilation, all-season.", price: 3299, comparePrice: 3999, tags: ["crocs", "casual", "comfort"] },

  // ── Bags & Luggage (8) ────────────────
  { category: "Bags & Luggage", name: "American Tourister 67cm Trolley", description: "Hard shell, TSA lock, 4 spinner wheels, expandable.", price: 5999, comparePrice: 8999, tags: ["american-tourister", "trolley", "travel"] },
  { category: "Bags & Luggage", name: "Wildcraft Campus 30L Backpack", description: "Water-resistant, laptop sleeve, padded back, ergonomic straps.", price: 1999, comparePrice: 2999, tags: ["wildcraft", "backpack", "travel"] },
  { category: "Bags & Luggage", name: "Lavie Women's Handbag", description: "PU leather, magnetic snap, zipper compartments, structured.", price: 1499, comparePrice: 2499, tags: ["lavie", "handbag", "women"] },
  { category: "Bags & Luggage", name: "Samsonite Lite-Biz Briefcase", description: "Nylon, laptop + tablet section, TSA lock, business travel.", price: 12999, comparePrice: 15999, tags: ["samsonite", "briefcase", "business"] },
  { category: "Bags & Luggage", name: "VIP Skybags 55cm Cabin", description: "Polycarbonate, cabin-size, TSA lock, lightweight spinner.", price: 3999, comparePrice: 5999, tags: ["vip", "cabin-bag", "travel"] },
  { category: "Bags & Luggage", name: "Fastrack Messenger Bag", description: "Canvas, crossbody, padded compartment, casual urban style.", price: 1299, comparePrice: 1999, tags: ["fastrack", "messenger", "casual"] },
  { category: "Bags & Luggage", name: "Tommy Hilfiger Tote Bag", description: "Cotton canvas, branded print, open top, spacious tote.", price: 3499, comparePrice: 4499, tags: ["tommy-hilfiger", "tote", "branded"] },
  { category: "Bags & Luggage", name: "Da Milano Leather Wallet", description: "Genuine leather, multiple card slots, bi-fold, slim profile.", price: 1999, comparePrice: 3499, tags: ["da-milano", "wallet", "leather"] },

  // ── Watches (8) ──────────────────────
  { category: "Watches", name: "Apple Watch Series 9 GPS 45mm", description: "Bright Always-On Retina, crash detection, health sensors.", price: 41900, comparePrice: 44900, tags: ["apple", "smartwatch", "fitness"] },
  { category: "Watches", name: "Samsung Galaxy Watch 6 Classic", description: "Rotating bezel, BioActive sensor, sleep coaching, Wear OS.", price: 34999, comparePrice: 37999, tags: ["samsung", "smartwatch", "classic"] },
  { category: "Watches", name: "Titan Edge Ultra Slim", description: "2.5mm thin, analog quartz, mineral crystal glass, formal.", price: 9999, comparePrice: 12999, tags: ["titan", "analog", "slim"] },
  { category: "Watches", name: "Fossil Gen 6 Wellness", description: "Wear OS, SpO2, Snapdragon 4100+, 1.28\" AMOLED.", price: 24995, comparePrice: 27995, tags: ["fossil", "smartwatch", "wear-os"] },
  { category: "Watches", name: "Casio G-Shock GA-2100", description: "CasiOak, Carbon Core Guard, 200m water resistant, shock proof.", price: 9995, comparePrice: 11995, tags: ["casio", "g-shock", "sport"] },
  { category: "Watches", name: "Fastrack Reflex 3.0", description: "1.3\" color touch display, SpO2, 10 days battery, HR.", price: 3495, comparePrice: 4995, tags: ["fastrack", "smartwatch", "budget"] },
  { category: "Watches", name: "Seiko Automatic SKX009", description: "NH36A movement, 200m diver, rotating bezel, iconic design.", price: 29990, comparePrice: 34990, tags: ["seiko", "automatic", "dive"] },
  { category: "Watches", name: "Noise ColorFit Ultra 3", description: "1.96\" AMOLED, BT calling, 100+ sports, 7-day battery.", price: 2999, comparePrice: 4999, tags: ["noise", "smartwatch", "budget"] },

  // ── Jewelry (7) ──────────────────────
  { category: "Jewelry", name: "Tanishq 22K Gold Mangalsutra", description: "Hallmarked 22K gold, traditional design, adjustable length.", price: 28999, comparePrice: 31999, tags: ["tanishq", "gold", "mangalsutra"] },
  { category: "Jewelry", name: "Malabar Diamond Earrings", description: "0.30ct solitaire, 18K white gold, certified diamond.", price: 34999, comparePrice: 39999, tags: ["malabar", "diamond", "earrings"] },
  { category: "Jewelry", name: "Pipa Bella Statement Necklace", description: "Oxidized silver finish, layered chain, boho ethnic style.", price: 799, comparePrice: 1299, tags: ["pipa-bella", "necklace", "boho"] },
  { category: "Jewelry", name: "BlueStone Sterling Silver Ring", description: "925 silver, CZ stone, stackable, rhodium plated.", price: 1499, comparePrice: 2199, tags: ["bluestone", "silver", "ring"] },
  { category: "Jewelry", name: "Voylla Kundan Choker Set", description: "Gold-plated, Kundan stones, festive/bridal, with earrings.", price: 1299, comparePrice: 2499, tags: ["voylla", "kundan", "bridal"] },
  { category: "Jewelry", name: "Accessorize Crystal Bracelet", description: "Czech crystal, elastic stretch, statement piece.", price: 699, comparePrice: 999, tags: ["accessorize", "bracelet", "crystal"] },
  { category: "Jewelry", name: "GRT Jewellers Temple Pendant", description: "22K gold-plated, Goddess Lakshmi design, South Indian style.", price: 5999, comparePrice: 7999, tags: ["grt", "temple", "pendant"] },

  // ── Beauty & Skincare (9) ─────────────
  { category: "Beauty & Skincare", name: "Minimalist 2% Salicylic Acid Serum", description: "Unclogs pores, controls oil, gentle BHA exfoliant, 30ml.", price: 549, comparePrice: 699, tags: ["minimalist", "serum", "acne"] },
  { category: "Beauty & Skincare", name: "Dot & Key Watermelon Gel Moisturizer", description: "Oil-free, SPF 35, hydrating, lightweight, for combination skin.", price: 695, comparePrice: 895, tags: ["dot-key", "moisturizer", "spf"] },
  { category: "Beauty & Skincare", name: "Lakme Cushion Matte Foundation", description: "15hr wear, SPF 40, cushion compact, buildable coverage.", price: 749, comparePrice: 999, tags: ["lakme", "foundation", "makeup"] },
  { category: "Beauty & Skincare", name: "SUGAR Lip Love Set", description: "3 lipsticks + 1 liner, matte finish, long-lasting formula.", price: 1299, comparePrice: 1999, tags: ["sugar", "lipstick", "set"] },
  { category: "Beauty & Skincare", name: "WOW Skin Science Apple Cider Vinegar Shampoo", description: "No sulfate, DHT blocker, 300ml, for damaged hair.", price: 499, comparePrice: 699, tags: ["wow", "shampoo", "haircare"] },
  { category: "Beauty & Skincare", name: "The Derma Co 1% Retinol Cream", description: "Anti-aging, brightening, niacinamide blend, 30g.", price: 899, comparePrice: 1199, tags: ["derma-co", "retinol", "anti-aging"] },
  { category: "Beauty & Skincare", name: "Maybelline Sky High Mascara", description: "Buildable length, flexible fiber brush, washable formula.", price: 549, comparePrice: 699, tags: ["maybelline", "mascara", "makeup"] },
  { category: "Beauty & Skincare", name: "L'Oreal Paris Revitalift Serum", description: "1.5% pure Hyaluronic Acid, plumps skin, 30ml, all skin types.", price: 799, comparePrice: 1099, tags: ["loreal", "serum", "hydration"] },
  { category: "Beauty & Skincare", name: "Biotique Bio Cucumber Sunscreen SPF 66", description: "Lightweight, no white cast, cucumber extract, 50g.", price: 299, comparePrice: 449, tags: ["biotique", "sunscreen", "spf"] },

  // ── Health & Fitness (8) ─────────────
  { category: "Health & Fitness", name: "MuscleBlaze Raw Whey 1kg", description: "25g protein/scoop, unflavored, mixes easily, post-workout.", price: 1799, comparePrice: 2299, tags: ["muscleblaze", "protein", "whey"] },
  { category: "Health & Fitness", name: "Boldfit Adjustable Dumbbell Set", description: "2x20kg adjustable, cast iron, hex grip, home gym essentials.", price: 3999, comparePrice: 5499, tags: ["boldfit", "dumbbell", "gym"] },
  { category: "Health & Fitness", name: "Decathlon Yoga Mat 6mm", description: "Anti-slip, carry strap, washable, comfortable for all poses.", price: 999, comparePrice: 1499, tags: ["decathlon", "yoga", "mat"] },
  { category: "Health & Fitness", name: "Omron HEM-7121 BP Monitor", description: "Clinically validated, WHO indicator, 60-memory, arm cuff.", price: 1999, comparePrice: 2699, tags: ["omron", "bp-monitor", "health"] },
  { category: "Health & Fitness", name: "Lifelong LLM5100 Treadmill", description: "3HP motor, 12 programs, auto incline, LCD display, foldable.", price: 24999, comparePrice: 29999, tags: ["lifelong", "treadmill", "cardio"] },
  { category: "Health & Fitness", name: "Fittr Resistance Bands Set", description: "5 resistance levels, fabric, anti-snap, glute & leg workouts.", price: 999, comparePrice: 1499, tags: ["fittr", "bands", "resistance"] },
  { category: "Health & Fitness", name: "Healthkart Multivitamin 60 Tabs", description: "23 vitamins & minerals, energy, immunity, men/women variants.", price: 699, comparePrice: 999, tags: ["healthkart", "vitamins", "supplement"] },
  { category: "Health & Fitness", name: "Nivia Gym Gloves Pro", description: "Padded palm, wrist wrap, anti-slip grip, weight training.", price: 499, comparePrice: 799, tags: ["nivia", "gloves", "gym"] },

  // ── Home & Kitchen (9) ───────────────
  { category: "Home & Kitchen", name: "Philips Air Fryer HD9200", description: "Rapid Air technology, 1400W, 4.1L, 90% less fat cooking.", price: 5499, comparePrice: 6999, tags: ["philips", "air-fryer", "appliance"] },
  { category: "Home & Kitchen", name: "Prestige Svachh Deep Kadai", description: "Hard anodized, spill-control lid, non-stick, 2.6L.", price: 1899, comparePrice: 2799, tags: ["prestige", "cookware", "non-stick"] },
  { category: "Home & Kitchen", name: "Instant Pot Duo 7-in-1", description: "Pressure cooker, slow cooker, rice cooker, yogurt maker, 6Qt.", price: 8999, comparePrice: 10999, tags: ["instant-pot", "pressure-cooker", "multi"] },
  { category: "Home & Kitchen", name: "Morphy Richards Pop-Up Toaster", description: "2-slice, browning control, removable crumb tray, 700W.", price: 1299, comparePrice: 1799, tags: ["morphy-richards", "toaster", "breakfast"] },
  { category: "Home & Kitchen", name: "Dyson V15 Detect Cordless Vacuum", description: "Laser dust detection, HEPA filter, LCD screen, 60min run.", price: 49900, comparePrice: 55900, tags: ["dyson", "vacuum", "cordless"] },
  { category: "Home & Kitchen", name: "Milton Thermosteel Flask 1L", description: "24hr hot/cold, food grade steel, no-rust, leak-proof.", price: 699, comparePrice: 999, tags: ["milton", "flask", "thermos"] },
  { category: "Home & Kitchen", name: "Butterfly Jet Elite Mixer 750W", description: "3 jars, 4 speed + pulse, stainless blades, anti-vibration.", price: 3499, comparePrice: 4499, tags: ["butterfly", "mixer", "kitchen"] },
  { category: "Home & Kitchen", name: "Urban Ladder Wooden Shelf Set", description: "Mango wood, 3-tier floating shelves, rustic finish, wall-mount.", price: 3999, comparePrice: 5499, tags: ["urban-ladder", "shelf", "decor"] },
  { category: "Home & Kitchen", name: "Bombay Dyeing Microfiber Bedsheet Set", description: "Queen, 2 pillow covers, 1000TC microfiber, anti-pilling.", price: 1299, comparePrice: 1999, tags: ["bombay-dyeing", "bedsheet", "home"] },

  // ── Furniture (7) ────────────────────
  { category: "Furniture", name: "Wakefit Orthopedic Memory Foam Mattress", description: "Queen, 6-inch, dual comfort, breathable fabric, 10yr warranty.", price: 12999, comparePrice: 17999, tags: ["wakefit", "mattress", "memory-foam"] },
  { category: "Furniture", name: "Durian 3-Seater Sofa", description: "Premium fabric, solid wood legs, high-density foam seating.", price: 34999, comparePrice: 44999, tags: ["durian", "sofa", "living-room"] },
  { category: "Furniture", name: "IKEA KALLAX Shelf Unit", description: "4x4 cubes, particle board, versatile storage or room divider.", price: 12999, comparePrice: 15999, tags: ["ikea", "shelf", "storage"] },
  { category: "Furniture", name: "Godrej Interio Study Desk", description: "Engineered wood, drawer, cable management, laptop-friendly.", price: 8999, comparePrice: 11999, tags: ["godrej", "study-table", "work-from-home"] },
  { category: "Furniture", name: "Green Soul Ergonomic Chair", description: "Lumbar support, adjustable armrest, mesh back, 5yr warranty.", price: 14999, comparePrice: 19999, tags: ["green-soul", "office-chair", "ergonomic"] },
  { category: "Furniture", name: "Pepperfry Sheesham Dining Table 6-Seater", description: "Solid Sheesham wood, natural finish, steel frame, 6 chairs.", price: 44999, comparePrice: 59999, tags: ["pepperfry", "dining-table", "sheesham"] },
  { category: "Furniture", name: "FabIndia Cotton Dhurrie Rug 4x6", description: "Handwoven, cotton, reversible, living/bedroom area rug.", price: 3999, comparePrice: 5499, tags: ["fabindia", "rug", "handwoven"] },

  // ── Books (9) ─────────────────────────
  { category: "Books", name: "Atomic Habits — James Clear", description: "Build good habits, break bad ones. Practical actionable guide.", price: 499, comparePrice: 699, tags: ["self-help", "habits", "bestseller"] },
  { category: "Books", name: "The Psychology of Money — Morgan Housel", description: "Timeless lessons on wealth, greed, and happiness.", price: 449, comparePrice: 599, tags: ["finance", "mindset", "bestseller"] },
  { category: "Books", name: "Zero to One — Peter Thiel", description: "Notes on startups and how to build the future.", price: 399, comparePrice: 549, tags: ["startup", "entrepreneurship", "tech"] },
  { category: "Books", name: "Ikigai — Héctor García", description: "The Japanese secret to a long and happy life.", price: 299, comparePrice: 449, tags: ["lifestyle", "japanese", "philosophy"] },
  { category: "Books", name: "The Alchemist — Paulo Coelho", description: "A philosophical novel about following your dreams.", price: 249, comparePrice: 399, tags: ["fiction", "inspirational", "classic"] },
  { category: "Books", name: "Clean Code — Robert C. Martin", description: "A handbook of agile software craftsmanship.", price: 699, comparePrice: 899, tags: ["programming", "software", "engineering"] },
  { category: "Books", name: "System Design Interview Vol 2", description: "Alex Xu's guide to designing large-scale systems.", price: 1299, comparePrice: 1599, tags: ["system-design", "engineering", "interview"] },
  { category: "Books", name: "Rich Dad Poor Dad — Robert Kiyosaki", description: "Personal finance classic on money and investing.", price: 349, comparePrice: 499, tags: ["finance", "investing", "classic"] },
  { category: "Books", name: "Sapiens — Yuval Noah Harari", description: "A brief history of humankind from Stone Age to present.", price: 599, comparePrice: 799, tags: ["history", "humanity", "bestseller"] },

  // ── Sports & Outdoors (8) ─────────────
  { category: "Sports & Outdoors", name: "SS Ton Cricket Bat English Willow", description: "Grade 1 EW, short handle, full profile, professional play.", price: 4999, comparePrice: 6999, tags: ["ss", "cricket", "bat"] },
  { category: "Sports & Outdoors", name: "Nivia Storm Football Size 5", description: "Hand-stitched, 32-panel, FIFA quality pro, all-weather use.", price: 1299, comparePrice: 1799, tags: ["nivia", "football", "soccer"] },
  { category: "Sports & Outdoors", name: "Yonex Arcsaber 11 Badminton Racket", description: "Carbon graphite shaft, G4 grip, 88g, attack & defense.", price: 5999, comparePrice: 7499, tags: ["yonex", "badminton", "racket"] },
  { category: "Sports & Outdoors", name: "Decathlon MH100 Hiking Backpack 40L", description: "Hip belt, rain cover, hydration sleeve, multiple pockets.", price: 3999, comparePrice: 4999, tags: ["decathlon", "hiking", "backpack"] },
  { category: "Sports & Outdoors", name: "Hercules Roadeo Thorn Mountain Bike", description: "21-speed, Shimano gears, front suspension, 26\" alloy wheels.", price: 12999, comparePrice: 15999, tags: ["hercules", "mtb", "cycle"] },
  { category: "Sports & Outdoors", name: "Leader Sport Swimming Goggles", description: "UV protection, anti-fog, adjustable strap, silicone seal.", price: 399, comparePrice: 599, tags: ["leader", "swimming", "goggles"] },
  { category: "Sports & Outdoors", name: "Quechua Camping Tent 2 Person", description: "2-second setup, UV protection, 1500mm waterproof rating.", price: 4999, comparePrice: 6499, tags: ["quechua", "camping", "tent"] },
  { category: "Sports & Outdoors", name: "Cosco Table Tennis Set", description: "2 rackets + 6 balls + net clamp, beginner to intermediate.", price: 1299, comparePrice: 1799, tags: ["cosco", "table-tennis", "indoor"] },

  // ── Toys & Games (7) ─────────────────
  { category: "Toys & Games", name: "LEGO Technic Bugatti Chiron", description: "3599 pieces, 1:8 scale, working W16 engine, collectible.", price: 22999, comparePrice: 26999, tags: ["lego", "technic", "collector"] },
  { category: "Toys & Games", name: "Hasbro Monopoly Classic", description: "Timeless family board game, complete with board, pieces, cards.", price: 799, comparePrice: 1199, tags: ["hasbro", "board-game", "family"] },
  { category: "Toys & Games", name: "Hot Wheels 20-Car Gift Pack", description: "Die-cast metal, 1:64 scale, assorted colors and designs.", price: 999, comparePrice: 1499, tags: ["hot-wheels", "die-cast", "kids"] },
  { category: "Toys & Games", name: "Funskool Candy Land Game", description: "Classic color matching board game, for ages 3+, 2-4 players.", price: 499, comparePrice: 699, tags: ["funskool", "board-game", "kids"] },
  { category: "Toys & Games", name: "Remote Control Car Buggy 4WD", description: "1:16 scale, 4WD, 25km/h, off-road, rechargeable battery.", price: 2499, comparePrice: 3499, tags: ["rc-car", "remote-control", "kids"] },
  { category: "Toys & Games", name: "Smiggle Slime Kit", description: "12 colors, glitter, foam beads, step-by-step guide, ages 6+.", price: 999, comparePrice: 1499, tags: ["smiggle", "slime", "diy"] },
  { category: "Toys & Games", name: "Rubik's Cube 3x3 Original", description: "Official Rubik's brand, smooth turning, classic color tiles.", price: 449, comparePrice: 649, tags: ["rubiks", "puzzle", "classic"] },

  // ── Food & Beverages (6) ─────────────
  { category: "Food & Beverages", name: "Vahdam Darjeeling First Flush Tea", description: "100g, USDA organic, first flush, whole leaf, gift-worthy.", price: 899, comparePrice: 1199, tags: ["vahdam", "tea", "organic"] },
  { category: "Food & Beverages", name: "Sleepy Owl Cold Brew Coffee", description: "Pack of 5, ready-to-brew, Colombian blend, no preservatives.", price: 499, comparePrice: 649, tags: ["sleepy-owl", "coffee", "cold-brew"] },
  { category: "Food & Beverages", name: "Farmley Premium Mixed Nuts 500g", description: "Cashews, almonds, walnuts, pistachios, no added salt.", price: 1199, comparePrice: 1599, tags: ["farmley", "nuts", "healthy"] },
  { category: "Food & Beverages", name: "Paper Boat Kokum & Aam Panna Combo", description: "6 Kokum + 6 Aam Panna, traditional recipes, no preservatives.", price: 299, comparePrice: 399, tags: ["paper-boat", "drinks", "traditional"] },
  { category: "Food & Beverages", name: "Yoga Bar Oats Dark Chocolate Box 6", description: "Whole grain oats, 10g protein/bar, gluten-free, no refined sugar.", price: 699, comparePrice: 899, tags: ["yoga-bar", "protein-bar", "healthy"] },
  { category: "Food & Beverages", name: "Country Bean Coffee Subscription", description: "250g specialty beans, monthly freshly roasted, single-origin.", price: 799, comparePrice: 999, tags: ["country-bean", "specialty", "subscription"] },

  // ── Automotive (6) ───────────────────
  { category: "Automotive", name: "Michelin Pilot Sport 4 205/55 R16", description: "Ultra high performance tyre, wet & dry grip, 91W rated.", price: 8999, comparePrice: 10999, tags: ["michelin", "tyres", "performance"] },
  { category: "Automotive", name: "Bosch Car Battery S4 Silver 55Ah", description: "Maintenance-free, 420A CCA, 5yr warranty, for mid-size cars.", price: 7999, comparePrice: 9499, tags: ["bosch", "battery", "car"] },
  { category: "Automotive", name: "Meguiar's G7516 Ultimate Wash & Wax Kit", description: "Shampoo + spray wax combo, car care kit, streak-free finish.", price: 1899, comparePrice: 2499, tags: ["meguiars", "car-care", "wash"] },
  { category: "Automotive", name: "Garmin DriveSmart 65 GPS Navigator", description: "6.95\" display, driver alerts, voice control, live traffic.", price: 19999, comparePrice: 23999, tags: ["garmin", "gps", "navigation"] },
  { category: "Automotive", name: "Viper 5906V Car Alarm System", description: "2-way remote start, SmartStart compatible, shock sensor.", price: 14999, comparePrice: 17999, tags: ["viper", "car-alarm", "security"] },
  { category: "Automotive", name: "3M Scotchgard Car Seat Protector", description: "Universal fit, waterproof, fabric/leather protector, easy clean.", price: 1299, comparePrice: 1799, tags: ["3m", "seat-protector", "car-accessories"] },
];

// ─────────────────────────────────────────
// SEED FUNCTION
// ─────────────────────────────────────────

async function main() {
  console.log("🌱 Starting database seed...\n");

  // 1. Clean existing data (order matters for FK constraints)
  await prisma.review.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.address.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
  console.log("✅ Cleared existing data");

  // 2. Seed 4 protected default users (isProtected = true — NEVER auto-deleted)
  const defaultUsers = [
    { email: "admin@shop.com",  password: "Admin@123", name: "Admin User",  role: "ADMIN" as const },
    { email: "user@shop.com",   password: "User@123",  name: "Demo User",   role: "USER"  as const },
    { email: "demo1@shop.com",  password: "Demo@1234", name: "Demo User 1", role: "USER"  as const },
    { email: "demo2@shop.com",  password: "Demo@1234", name: "Demo User 2", role: "USER"  as const },
  ];

  for (const u of defaultUsers) {
    const hashed = await bcrypt.hash(u.password, 12);
    await prisma.user.create({
      data: {
        email: u.email,
        password: hashed,
        name: u.name,
        role: u.role,
        isProtected: true,  // These users will NEVER be auto-deleted
        expiresAt: null,    // No expiry — permanent
      },
    });
  }
  console.log("✅ 4 protected default users seeded");

  // 4. Seed categories
  const categoryMap: Record<string, string> = {};

  for (const cat of CATEGORIES) {
    const slug = slugify(cat.name);
    const created = await prisma.category.create({
      data: {
        name: cat.name,
        slug,
        description: cat.description,
        image: cat.image,
      },
    });
    categoryMap[cat.name] = created.id;
  }
  console.log(`✅ ${CATEGORIES.length} categories seeded`);

  // 5. Seed products
  let productCount = 0;
  const skuSet = new Set<string>();

  for (const p of PRODUCTS) {
    const catId = categoryMap[p.category];
    if (!catId) {
      console.warn(`⚠️ Category not found: ${p.category}`);
      continue;
    }

    // Generate unique slug (handle duplicates)
    let baseSlug = slugify(p.name);
    let slug = baseSlug;
    let attempt = 1;
    while (skuSet.has(slug)) {
      slug = `${baseSlug}-${attempt++}`;
    }

    // Generate unique SKU
    let sku = `SKU-${baseSlug.substring(0, 8).toUpperCase().replace(/-/g, "")}-${randomBetween(1000, 9999)}`;
    while (skuSet.has(sku)) {
      sku = `SKU-${baseSlug.substring(0, 8).toUpperCase().replace(/-/g, "")}-${randomBetween(1000, 9999)}`;
    }
    skuSet.add(slug);
    skuSet.add(sku);

    // Generate 3 image variants per product
    const images = [
      productImage(slug, 600, 600),
      productImage(`${slug}-2`, 600, 600),
      productImage(`${slug}-3`, 600, 600),
    ];

    await prisma.product.create({
      data: {
        name: p.name,
        slug,
        description: p.description,
        price: p.price,
        comparePrice: p.comparePrice,
        stock: randomBetween(5, 200),
        sku,
        images,
        tags: p.tags,
        rating: randomFloat(3.5, 5.0),
        reviewCount: randomBetween(10, 2500),
        categoryId: catId,
      },
    });
    productCount++;
  }

  console.log(`✅ ${productCount} products seeded`);
  console.log("\n🎉 Seed complete!");
  console.log("─────────────────────────");
  console.log(`📦 Categories : ${CATEGORIES.length}`);
  console.log(`🛍  Products   : ${productCount}`);
  console.log(`👤 Admin      : admin@shop.com / Admin@123`);
  console.log(`👤 User       : user@shop.com  / User@123`);
  console.log("─────────────────────────");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
