const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const app = express();

const PORT = process.env.PORT || 3000;
const PUBLIC_BASE_URL =
  process.env.PUBLIC_BASE_URL ||
  "https://turin-premium-store-pro-api.onrender.com";

const TZS_PER_USD = Number(process.env.TZS_PER_USD || 2550);

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || "";
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || "";
const PAYPAL_BASE_URL =
  process.env.PAYPAL_BASE_URL || "https://api-m.sandbox.paypal.com";

const WHATSAPP_VERIFY_TOKEN =
  process.env.WHATSAPP_VERIFY_TOKEN || "";

const WHATSAPP_ACCESS_TOKEN =
  process.env.WHATSAPP_ACCESS_TOKEN || "";

const WHATSAPP_PHONE_NUMBER_ID =
  process.env.WHATSAPP_PHONE_NUMBER_ID || "";

const WHATSAPP_BUSINESS_NUMBER =
  process.env.WHATSAPP_BUSINESS_NUMBER || "255797955045";

const ORDERS_FILE = path.join(__dirname, "orders.json");

/* =========================================================
   TURIN PREMIUM STORE
   SERVER / API
========================================================= */

app.disable("x-powered-by");

/* ---------------------------------------------------------
   PRODUCT CATALOGUE
   Server-side prices are authoritative.
--------------------------------------------------------- */

const products = [
  {
    id: 0,
    name: "Apple iPhone 14 128GB",
    priceTZS: 1540000
  },
  {
    id: 1,
    name: "Apple iPhone 14 Pro",
    priceTZS: 2000000
  },
  {
    id: 2,
    name: "Apple iPhone 14 Pro Max",
    priceTZS: 2150000
  },
  {
    id: 3,
    name: "Apple iPhone 15 Pro",
    priceTZS: 3200000
  },
  {
    id: 4,
    name: "Apple iPhone 15 Pro Max",
    priceTZS: 3500000
  },
  {
    id: 5,
    name: "Apple iPhone 11 Pro Max",
    priceTZS: 2800000
  },
  {
    id: 6,
    name: "Samsung Galaxy S20 Plus",
    priceTZS: 600000
  },
  {
    id: 7,
    name: "Samsung Galaxy S20 Ultra",
    priceTZS: 750000
  },
  {
    id: 8,
    name: "Samsung Galaxy S21 Ultra",
    priceTZS: 880000
  },
  {
    id: 9,
    name: "Samsung Galaxy S22 Ultra",
    priceTZS: 1330000
  },
  {
    id: 10,
    name: "Samsung Galaxy S23 Ultra",
    priceTZS: 1980000
  },
  {
    id: 11,
    name: "Samsung Galaxy S24 Ultra",
    priceTZS: 2580000
  },
  {
    id: 12,
    name: "Google Pixel 7",
    priceTZS: 600000
  },
  {
    id: 13,
    name: "Google Pixel 7a",
    priceTZS: 590000
  },
  {
    id: 14,
    name: "Google Pixel 7 Pro",
    priceTZS: 770000
  },
  {
    id: 15,
    name: "Google Pixel 8 Pro",
    priceTZS: 1200000
  },
  {
    id: 16,
    name: "Oraimo FreePods Pro",
    priceTZS: 165000
  },
  {
    id: 17,
    name: "Oraimo Shark 4",
    priceTZS: 55000
  },
  {
    id: 18,
    name: "JBL Boombox 3",
    priceTZS: 1300000
  },
  {
    id: 19,
    name: "JBL Charge 5",
    priceTZS: 400000
  },
  {
    id: 20,
    name: "JBL Clip 5",
    priceTZS: 190000
  },
  {
    id: 21,
    name: "JBL Flip 6",
    priceTZS: 290000
  },
  {
    id: 22,
    name: "JBL Go 4",
    priceTZS: 160000
  },
  {
    id: 23,
    name: "JBL Tune 510BT",
    priceTZS: 30000
  },
  {
    id: 24,
    name: "Oraimo Smart Clipper 2 Gold",
    priceTZS: 95000
  },
  {
    id: 25,
    name: "Oraimo Smart Blender",
    priceTZS: 130000
  },
  {
    id: 26,
    name: "Apple iPad Pro 12.9-inch 128GB",
    priceTZS: 2150000
  },
  {
    id: 27,
    name: "4G Wireless Router",
    priceTZS: 150000
  },
  {
    id: 28,
    name: "Airtel 5G SmartBox Router",
    priceTZS: 110000
  },
  {
    id: 29,
    name: "Aborder 1.8L 4-in-1 Juice Extractor",
    priceTZS: 115000
  },
  {
    id: 30,
    name: "Aborder 2L Electric Kettle",
    priceTZS: 32000
  },
  {
    id: 31,
    name: "Lenovo ThinkPad E14 Gen 2",
    priceTZS: 2490000
  },
  {
    id: 32,
    name: "Lenovo ThinkPad E14 Gen 5",
    priceTZS: 2250000
  },
  {
    id: 33,
    name: "Microsoft Surface Laptop 3",
    priceTZS: 1250000
  },
  {
    id: 34,
    name: "iPhone 16",
    priceTZS: 2600000
  },
  {
    id: 35,
    name: "iPhone 17",
    priceTZS: 3500000
  },
  {
    id: 36,
    name: "iPhone 17 Pro Max",
    priceTZS: 5350000
  },
  {
    id: 37,
    name: "Samsung Galaxy A17",
    priceTZS: 520000
  },
  {
    id: 38,
    name: "Samsung Galaxy A07s",
    priceTZS: 380000
  },
  {
    id: 39,
    name: "Tecno Camon 20 Pro 8+256GB",
    priceTZS: 585000
  }
];

/* =========================================================
   HELPERS
========================================================= */

function ensureOrdersFile() {
  if (!fs.existsSync(ORDERS_FILE)) {
    fs.writeFileSync(
      ORDERS_FILE,
      JSON.stringify([], null, 2),
      "utf8"
    );
  }
}

function readOrders() {
  ensureOrdersFile();

  try {
    const data = fs.readFileSync(ORDERS_FILE, "utf8");
    return JSON.parse(data || "[]");
  } catch (error) {
    console.error("Unable to read orders:", error);
    return [];
  }
}

function writeOrders(orders) {
  fs.writeFileSync(
    ORDERS_FILE,
    JSON.stringify(orders, null, 2),
    "utf8"
  );
}

function createOrderReference() {
  const date = new Date()
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "");

  const random = crypto.randomBytes(3).toString("hex").toUpperCase();

  return `TURIN-${date}-${random}`;
}

function cleanText(value, max = 500) {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value)
    .trim()
    .slice(0, max);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normaliseItems(items) {
  if (!Array.isArray(items) || !items.length) {
    throw new Error("Cart is empty.");
  }

  return items.map((item) => {
    const productId = Number(item.productId);
    const quantity = Number(item.quantity);

    if (
      !Number.isInteger(productId) ||
      productId < 0 ||
      productId >= products.length
    ) {
      throw new Error("Invalid product.");
    }

    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 99
    ) {
      throw new Error("Invalid product quantity.");
    }

    const product = products[productId];

    return {
      productId,
      name: product.name,
      quantity,
      unitPriceTZS: product.priceTZS,
      totalTZS: product.priceTZS * quantity
    };
  });
}

function calculateTotal(items) {
  return items.reduce(
    (total, item) => total + item.totalTZS,
    0
  );
}

function validateCustomer(customer) {
  const data = customer || {};

  const firstName = cleanText(data.firstName, 100);
  const lastName = cleanText(data.lastName, 100);
  const email = cleanText(data.email, 180);
  const phone = cleanText(data.phone, 60);
  const country = cleanText(data.country, 100);
  const city = cleanText(data.city, 100);
  const address = cleanText(data.address, 300);

  if (!firstName) {
    throw new Error("First name is required.");
  }

  if (!lastName) {
    throw new Error("Last name is required.");
  }

  if (!isValidEmail(email)) {
    throw new Error("A valid email address is required.");
  }

  if (!phone) {
    throw new Error("Phone / WhatsApp number is required.");
  }

  if (!country) {
    throw new Error("Country is required.");
  }

  if (!city) {
    throw new Error("City is required.");
  }

  if (!address) {
    throw new Error("Street address is required.");
  }

  return {
    firstName,
    lastName,
    email,
    phone,
    country,
    city,
    state: cleanText(data.state, 100),
    address,
    postal: cleanText(data.postal, 30),
    company: cleanText(data.company, 150),
    taxId: cleanText(data.taxId, 100),
    notes: cleanText(data.notes, 1000)
  };
}

function saveOrder(order) {
  const orders = readOrders();

  orders.push(order);

  writeOrders(orders);

  return order;
}

function findOrder(reference) {
  return readOrders().find(
    (order) => order.reference === reference
  );
}

function updateOrder(reference, updates) {
  const orders = readOrders();

  const index = orders.findIndex(
    (order) => order.reference === reference
  );

  if (index === -1) {
    return null;
  }

  orders[index] = {
    ...orders[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };

  writeOrders(orders);

  return orders[index];
}

function tzsToUsd(tzs) {
  return Number((tzs / TZS_PER_USD).toFixed(2));
}

/* =========================================================
   STRIPE HELPERS
========================================================= */

async function createStripeCheckout(order) {
  if (!STRIPE_SECRET_KEY) {
    throw new Error(
      "Stripe is not configured. Add STRIPE_SECRET_KEY in Render Environment Variables."
    );
  }

  const params = new URLSearchParams();

  params.append("mode", "payment");

  params.append(
    "success_url",
    `${PUBLIC_BASE_URL}/payment-success.html?provider=stripe&order=${encodeURIComponent(
      order.reference
    )}`
  );

  params.append(
    "cancel_url",
    `${PUBLIC_BASE_URL}/?payment=cancelled&order=${encodeURIComponent(
      order.reference
    )}`
  );

  params.append(
    "customer_email",
    order.customer.email
  );

  params.append(
    "metadata[order_reference]",
    order.reference
  );

  params.append(
    "metadata[customer_country]",
    order.customer.country
  );

  order.items.forEach((item, index) => {
    const usd = tzsToUsd(item.unitPriceTZS);

    params.append(
      `line_items[${index}][price_data][currency]`,
      "usd"
    );

    params.append(
      `line_items[${index}][price_data][product_data][name]`,
      item.name
    );

    params.append(
      `line_items[${index}][price_data][product_data][description]`,
      `TURIN PREMIUM STORE Order ${order.reference}`
    );

    params.append(
      `line_items[${index}][price_data][unit_amount]`,
      String(Math.round(usd * 100))
    );

    params.append(
      `line_items[${index}][quantity]`,
      String(item.quantity)
    );
  });

  const response = await fetch(
    "https://api.stripe.com/v1/checkout/sessions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type":
          "application/x-www-form-urlencoded"
      },
      body: params.toString()
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error("Stripe error:", data);

    throw new Error(
      data?.error?.message ||
        "Stripe could not create the payment session."
    );
  }

  return data;
}

/* =========================================================
   PAYPAL HELPERS
========================================================= */

async function getPayPalAccessToken() {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    throw new Error(
      "PayPal is not configured. Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in Render."
    );
  }

  const auth = Buffer.from(
    `${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`
  ).toString("base64");

  const response = await fetch(
    `${PAYPAL_BASE_URL}/v1/oauth2/token`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type":
          "application/x-www-form-urlencoded"
      },
      body: "grant_type=client_credentials"
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error("PayPal token error:", data);

    throw new Error(
      "Unable to authenticate with PayPal."
    );
  }

  return data.access_token;
}

async function createPayPalOrder(order) {
  const accessToken = await getPayPalAccessToken();

  const amountUSD = tzsToUsd(order.totalTZS);

  const response = await fetch(
    `${PAYPAL_BASE_URL}/v2/
