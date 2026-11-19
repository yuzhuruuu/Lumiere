import { getStoragePublicUrl } from "./utils";

// Curated high-resolution Unsplash food photography matching each seed menu item
export const MENU_ITEM_IMAGES: Record<string, string> = {
  // Main Course
  "Wagyu Beef Steak":
    "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80",
  "Grilled Salmon":
    "https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=800&q=80",
  "Chicken Parmigiana":
    "https://images.unsplash.com/photo-1632778149955-e80f8ceca2e8?auto=format&fit=crop&w=800&q=80",
  "BBQ Beef Short Ribs":
    "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80",

  // Pasta & Rice
  "Truffle Mushroom Pasta":
    "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=800&q=80",
  "Seafood Aglio Olio":
    "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&q=80",
  "Chicken Teriyaki Rice":
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80",
  "Beef Bulgogi Rice":
    "https://images.unsplash.com/photo-1553163147-622ab57be1c7?auto=format&fit=crop&w=800&q=80",

  // Appetizer
  "Calamari Rings":
    "https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=800&q=80",
  "Crispy Chicken Wings":
    "https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=800&q=80",
  "Tomato Bruschetta":
    "https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?auto=format&fit=crop&w=800&q=80",
  "Creamy Mushroom Soup":
    "https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=800&q=80",

  // Dessert
  "Chocolate Lava Cake":
    "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=800&q=80",
  "Classic Tiramisu":
    "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=800&q=80",
  "Creme Brulee":
    "https://images.unsplash.com/photo-1470124182917-cc6e71b22ecc?auto=format&fit=crop&w=800&q=80",
  "New York Cheesecake":
    "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=800&q=80",

  // Coffee
  "Espresso":
    "https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?auto=format&fit=crop&w=800&q=80",
  "Cappuccino":
    "https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&w=800&q=80",
  "Cafe Latte":
    "https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?auto=format&fit=crop&w=800&q=80",
  "Caramel Macchiato":
    "https://images.unsplash.com/photo-1485808191679-5f86510681a2?auto=format&fit=crop&w=800&q=80",

  // Non-Coffee
  "Matcha Latte":
    "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=800&q=80",
  "Lychee Tea":
    "https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=800&q=80",
  "Iced Chocolate":
    "https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?auto=format&fit=crop&w=800&q=80",
  "Fresh Orange Juice":
    "https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=800&q=80",

  // Signature Mocktail
  "Lumiere Sunset":
    "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=800&q=80",
  "Citrus Garden":
    "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=800&q=80",
  "Berry Bloom":
    "https://images.unsplash.com/photo-1556881286-fc6915169721?auto=format&fit=crop&w=800&q=80",
  "Tropical Spark":
    "https://images.unsplash.com/photo-1536935338788-846bb9981813?auto=format&fit=crop&w=800&q=80",

  // Sharing & Sides
  "Premium Cheese Board":
    "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=800&q=80",
  "Signature Sharing Platter":
    "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80",
  "French Fries": "/images/french-fries.jpg",
  "Fench Fries": "/images/french-fries.jpg",
  "Onion Rings": "/images/onion-rings.jpg",
};

const DEFAULT_FOOD_IMAGE =
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80";

export function getMenuItemImageUrl(
  photoPath?: string | null,
  name?: string | null
): string {
  // 1. If explicit photo uploaded in storage or http
  if (photoPath) {
    const publicUrl = getStoragePublicUrl(photoPath);
    if (publicUrl) return publicUrl;
  }

  // 2. Exact match from predefined dictionary
  if (name && MENU_ITEM_IMAGES[name]) {
    return MENU_ITEM_IMAGES[name];
  }

  // 3. Fuzzy keyword matching
  if (name) {
    const lower = name.toLowerCase();

    // Check specific sides first
    if (
      lower.includes("fries") ||
      lower.includes("french") ||
      lower.includes("fench") ||
      lower.includes("kentang")
    ) {
      return MENU_ITEM_IMAGES["French Fries"];
    }
    if (
      lower.includes("onion") ||
      lower.includes("ring") ||
      lower.includes("bawang")
    ) {
      return MENU_ITEM_IMAGES["Onion Rings"];
    }

    for (const [key, url] of Object.entries(MENU_ITEM_IMAGES)) {
      if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) {
        return url;
      }
    }

    if (lower.includes("steak") || lower.includes("wagyu") || lower.includes("beef") || lower.includes("rib")) {
      return MENU_ITEM_IMAGES["Wagyu Beef Steak"];
    }
    if (lower.includes("salmon") || lower.includes("fish") || lower.includes("seafood")) {
      return MENU_ITEM_IMAGES["Grilled Salmon"];
    }
    if (lower.includes("pasta") || lower.includes("spaghetti") || lower.includes("tagliolini") || lower.includes("aglio")) {
      return MENU_ITEM_IMAGES["Truffle Mushroom Pasta"];
    }
    if (lower.includes("soup") || lower.includes("zuppa")) {
      return MENU_ITEM_IMAGES["Creamy Mushroom Soup"];
    }
    if (lower.includes("chicken") || lower.includes("wing")) {
      return MENU_ITEM_IMAGES["Crispy Chicken Wings"];
    }
    if (lower.includes("cake") || lower.includes("tiramisu") || lower.includes("dessert") || lower.includes("sweet")) {
      return MENU_ITEM_IMAGES["Classic Tiramisu"];
    }
    if (lower.includes("coffee") || lower.includes("espresso") || lower.includes("latte") || lower.includes("cappuccino")) {
      return MENU_ITEM_IMAGES["Cappuccino"];
    }
    if (lower.includes("tea") || lower.includes("matcha") || lower.includes("juice") || lower.includes("mocktail") || lower.includes("drink")) {
      return MENU_ITEM_IMAGES["Lumiere Sunset"];
    }
    if (lower.includes("cheese") || lower.includes("platter")) {
      return MENU_ITEM_IMAGES["Premium Cheese Board"];
    }
  }

  return DEFAULT_FOOD_IMAGE;
}

