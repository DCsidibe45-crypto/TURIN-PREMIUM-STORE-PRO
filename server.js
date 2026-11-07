require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const crypto = require("crypto");
const path = require("path");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true"
    ? { rejectUnauthorized: false }
    : false
});

const PAYMENT_METHODS = [
  "Bank Transfer",
  "Mobile Money",
  "M-Pesa",
  "Airtel Money",
  "Mixx by Yas (Tigo Pesa)",
  "Visa / Mastercard",
  "Selcom"
];

const ORDER_STATUSES = [
  "quote_requested",
  "supplier_checking",
  "quoted",
  "awaiting_payment",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled"
];

const CURRENCIES = ["USD", "TZS"];

app.disable("x-powered-by");

app.use(helmet({
  contentSecurityPolicy: false
}));

app.use(express.json({ limit: "1mb" }));

app.use(express.static(
  path.join(__dirname, "public")
));

/* ================================
   GENERAL HELPERS
================================ */

function clean(value, max = 500) {
  return String(value ?? "")
    .trim()
    .slice(0, max);
}

function makeReference() {
  const date = new Date()
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "");

  const random = crypto
    .randomBytes(3)
    .toString("hex")
    .toUpperCase();

  return `TURIN-${date}-${random}`;
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function adminOnly(req, res, next) {
  const expected = process.env.ADMIN_API_TOKEN || "";

  const supplied = clean(
    req.headers.authorization
  ).replace(/^Bearer\s+/i, "");

  if (!expected || !supplied) {
    return res.status(401).json({
      ok: false,
      error: "Unauthorised"
    });
  }

  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);

  if (
    a.length !== b.length ||
    !crypto.timingSafeEqual(a, b)
  ) {
    return res.status(401).json({
      ok: false,
      error: "Unauthorised"
    });
  }

  next();
}

/* ================================
   DATABASE INITIALISATION
================================ */

async function initDatabase() {

  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'General',
      description TEXT NOT NULL DEFAULT '',
      image_url TEXT NOT NULL DEFAULT '',
      indicative_price_usd NUMERIC(14,2),
      indicative_price_tzs NUMERIC(14,2),
      display_currency TEXT NOT NULL DEFAULT 'USD',
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      company_name TEXT NOT NULL,
      country TEXT DEFAULT '',
      contact_name TEXT DEFAULT '',
      email TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      website TEXT DEFAULT '',
      payment_terms TEXT DEFAULT '',
      shipping_notes TEXT DEFAULT '',
      internal_notes TEXT DEFAULT '',
      active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS product_suppliers (
      id BIGSERIAL PRIMARY KEY,
      product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
      supplier_id TEXT REFERENCES suppliers(id) ON DELETE CASCADE,
      supplier_sku TEXT DEFAULT '',
      unit_cost NUMERIC(14,2),
      cost_currency TEXT DEFAULT 'USD',
      lead_time_days INTEGER,
      minimum_order_quantity INTEGER DEFAULT 1,
      is_preferred BOOLEAN DEFAULT FALSE,
      availability TEXT DEFAULT 'needs_confirmation',
      internal_notes TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(product_id, supplier_id)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id BIGSERIAL PRIMARY KEY,
      reference TEXT UNIQUE NOT NULL,
      status TEXT DEFAULT 'quote_requested',
      payment_status TEXT DEFAULT 'not_due',
      currency TEXT NOT NULL,
      customer JSONB NOT NULL,
      items JSONB NOT NULL,
      subtotal NUMERIC(14,2),
      shipping_cost NUMERIC(14,2),
      total NUMERIC(14,2),
      payment_method TEXT,
      payment_reference TEXT,
      payment_link TEXT,
      supplier_confirmation JSONB,
      admin_notes TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS orders_created_idx
    ON orders(created_at DESC);
  `);

  console.log("TURIN database tables are ready.");
}

/* ================================
   PUBLIC STORE CONFIGURATION
================================ */

app.get("/api/config", (req, res) => {

  res.json({
    storeName:
      process.env.STORE_NAME || "TURIN PREMIUM STORE",

    email:
      process.env.STORE_EMAIL || "",

    whatsapp:
      process.env.STORE_WHATSAPP || "",

    currencies: CURRENCIES,

    paymentMethods: PAYMENT_METHODS,

    bank: {
      name: process.env.BANK_NAME || "",
      accountName: process.env.BANK_ACCOUNT_NAME || "",
      accountNumber: process.env.BANK_ACCOUNT_NUMBER || "",
      swift: process.env.BANK_SWIFT || ""
    }
  });

});

/* ================================
   HEALTH CHECK
================================ */

app.get("/api/health", async (req, res) => {

  try {

    await pool.query("SELECT 1");

    res.json({
      ok: true,
      store: "TURIN PREMIUM STORE",
      database: "connected",
      status: "online"
    });

  } catch (error) {

    res.status(503).json({
      ok: false,
      database: "unavailable"
    });

  }

});

/* ================================
   PUBLIC PRODUCTS
================================ */

app.get("/api/products", async (req, res) => {

  try {

    const result = await pool.query(`
      SELECT
        id,
        name,
        category,
        description,
        image_url,
        indicative_price_usd,
        indicative_price_tzs,
        display_currency
      FROM products
      WHERE active = TRUE
      ORDER BY category, name
    `);

    const products = result.rows.map(p => ({
      id: p.id,
      name: p.name,
      category: p.category,
      description: p.description,
      imageUrl: p.image_url,
      indicativePriceUSD: p.indicative_price_usd,
      indicativePriceTZS: p.indicative_price_tzs,
      displayCurrency: p.display_currency
    }));

    res.json({
      ok: true,
      products
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      ok: false,
      error: "Unable to load products."
    });

  }

});

/* ================================
   CUSTOMER ORDER
================================ */

app.post("/api/orders", async (req, res) => {

  try {

    const body = req.body || {};
    const c = body.customer || {};

    const customer = {
      firstName: clean(c.firstName, 100),
      lastName: clean(c.lastName, 100),
      email: clean(c.email, 180).toLowerCase(),
      phone: clean(c.phone, 60),
      country: clean(c.country, 100),
      city: clean(c.city, 100),
      address: clean(c.address, 300),
      postalCode: clean(c.postalCode, 30)
    };

    if (
      !customer.firstName ||
      !validEmail(customer.email) ||
      !customer.phone ||
      !customer.country ||
      !customer.city ||
      !customer.address
    ) {
      return res.status(400).json({
        ok: false,
        error: "Please complete all required customer details."
      });
    }

    const currency = clean(
      body.currency,
      3
    ).toUpperCase();

    if (!CURRENCIES.includes(currency)) {
      return res.status(400).json({
        ok: false,
        error: "Currency must be USD or TZS."
      });
    }

    if (
      !Array.isArray(body.items) ||
      body.items.length === 0 ||
      body.items.length > 30
    ) {
      return res.status(400).json({
        ok: false,
        error: "Your enquiry cart is empty or invalid."
      });
    }

    const productIds = [
      ...new Set(
        body.items.map(item =>
          clean(item.productId, 80)
        )
      )
    ];

    const result = await pool.query(
      `SELECT id, name, category
       FROM products
       WHERE active = TRUE
       AND id = ANY($1::text[])`,
      [productIds]
    );

    const productMap = new Map(
      result.rows.map(p => [p.id, p])
    );

    const items = body.items.map(item => {

      const product = productMap.get(
        clean(item.productId, 80)
      );

      const quantity = Number(item.quantity);

      if (
        !product ||
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        quantity > 50
      ) {
        throw new Error(
          "Invalid product or quantity."
        );
      }

      return {
        productId: product.id,
        name: product.name,
        category: product.category,
        quantity
      };

    });

    const reference = makeReference();

    await pool.query(
      `INSERT INTO orders
       (reference, status, payment_status, currency, customer, items)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        reference,
        "quote_requested",
        "not_due",
        currency,
        JSON.stringify(customer),
        JSON.stringify(items)
      ]
    );

    res.status(201).json({
      ok: true,

      order: {
        reference,
        status: "quote_requested"
      },

      message:
        "Your quotation request has been received. We will confirm supplier availability, final price and shipping before requesting payment."
    });

  } catch (error) {

    console.error("Order error:", error);

    res.status(400).json({
      ok: false,
      error: error.message
    });

  }

});

/* ================================
   CUSTOMER ORDER TRACKING
================================ */

app.get("/api/orders/:reference", async (req, res) => {

  try {

    const result = await pool.query(
      `SELECT reference, status, payment_status,
       currency, items, total, created_at, updated_at
       FROM orders
       WHERE reference = $1`,
      [clean(req.params.reference, 60)]
    );

    if (!result.rowCount) {
      return res.status(404).json({
        ok: false,
        error: "Order not found."
      });
    }

    const order = result.rows[0];

    res.json({
      ok: true,
      order: {
        reference: order.reference,
        status: order.status,
        paymentStatus: order.payment_status,
        currency: order.currency,
        items: order.items,
        total: order.total,
        createdAt: order.created_at,
        updatedAt: order.updated_at
      }
    });

  } catch (error) {

    res.status(500).json({
      ok: false,
      error: "Unable to retrieve order."
    });

  }

});

/* ================================
   ADMIN: SUPPLIERS
================================ */

app.get("/api/admin/suppliers", adminOnly, async (req, res) => {

  const result = await pool.query(
    "SELECT * FROM suppliers ORDER BY company_name"
  );

  res.json({
    ok: true,
    suppliers: result.rows
  });

});

app.post("/api/admin/suppliers", adminOnly, async (req, res) => {

  try {

    const b = req.body || {};

    const name = clean(b.companyName, 180);

    if (!name) {
      return res.status(400).json({
        ok: false,
        error: "Supplier company name is required."
      });
    }

    const id = clean(b.id, 80) ||
      "SUP-" + crypto.randomUUID();

    const result = await pool.query(
      `INSERT INTO suppliers
       (id, company_name, country, contact_name, email,
        phone, website, payment_terms, shipping_notes,
        internal_notes, active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (id) DO UPDATE SET
        company_name=EXCLUDED.company_name,
        country=EXCLUDED.country,
        contact_name=EXCLUDED.contact_name,
        email=EXCLUDED.email,
        phone=EXCLUDED.phone,
        website=EXCLUDED.website,
        payment_terms=EXCLUDED.payment_terms,
        shipping_notes=EXCLUDED.shipping_notes,
        internal_notes=EXCLUDED.internal_notes,
        active=EXCLUDED.active,
        updated_at=NOW()
       RETURNING *`,
      [
        id,
        name,
        clean(b.country, 100),
        clean(b.contactName, 120),
        clean(b.email, 180),
        clean(b.phone, 60),
        clean(b.website, 500),
        clean(b.paymentTerms, 500),
        clean(b.shippingNotes, 1000),
        clean(b.internalNotes, 2000),
        b.active !== false
      ]
    );

    res.status(201).json({
      ok: true,
      supplier: result.rows[0]
    });

  } catch (error) {

    console.error(error);

    res.status(400).json({
      ok: false,
      error: "Unable to save supplier."
    });

  }

});

/* ================================
   ADMIN: PRODUCTS
================================ */

app.post("/api/admin/products", adminOnly, async (req, res) => {

  try {

    const b = req.body || {};

    const id = clean(b.id, 80) ||
      "PROD-" + crypto.randomUUID();

    const name = clean(b.name, 180);

    if (!name) {
      return res.status(400).json({
        ok: false,
        error: "Product name is required."
      });
    }

    const result = await pool.query(
      `INSERT INTO products
       (id, name, category, description, image_url,
        indicative_price_usd, indicative_price_tzs,
        display_currency, active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (id) DO UPDATE SET
        name=EXCLUDED.name,
        category=EXCLUDED.category,
        description=EXCLUDED.description,
        image_url=EXCLUDED.image_url,
        indicative_price_usd=EXCLUDED.indicative_price_usd,
        indicative_price_tzs=EXCLUDED.indicative_price_tzs,
        display_currency=EXCLUDED.display_currency,
        active=EXCLUDED.active,
        updated_at=NOW()
       RETURNING *`,
      [
        id,
        name,
        clean(b.category, 100) || "General",
        clean(b.description, 1500),
        clean(b.imageUrl, 1000),
        b.indicativePriceUSD ?? null,
        b.indicativePriceTZS ?? null,
        CURRENCIES.includes(b.displayCurrency)
          ? b.displayCurrency
          : "USD",
        b.active !== false
      ]
    );

    res.status(201).json({
      ok: true,
      product: result.rows[0]
    });

  } catch (error) {

    console.error(error);

    res.status(400).json({
      ok: false,
      error: "Unable to save product."
    });

  }

});

/* ================================
   ADMIN: LINK PRODUCT TO SUPPLIER
================================ */

app.post(
  "/api/admin/products/:productId/suppliers",
  adminOnly,
  async (req, res) => {

    try {

      const productId = clean(
        req.params.productId,
        80
      );

      const b = req.body || {};

      const supplierId = clean(
        b.supplierId,
        80
      );

      if (!supplierId) {
        return res.status(400).json({
          ok: false,
          error: "Supplier ID is required."
        });
      }

      const product = await pool.query(
        "SELECT id FROM products WHERE id=$1",
        [productId]
      );

      const supplier = await pool.query(
        "SELECT id FROM suppliers WHERE id=$1 AND active=true",
        [supplierId]
      );

      if (!product.rowCount || !supplier.rowCount) {
        return res.status(404).json({
          ok: false,
          error: "Product or supplier not found."
        });
      }

      const cost = b.unitCost === undefined ||
        b.unitCost === null ||
        b.unitCost === ""
        ? null
        : Number(b.unitCost);

      const currency = clean(
        b.costCurrency || "USD",
        3
      ).toUpperCase();

      const leadTime = b.leadTimeDays === undefined ||
        b.leadTimeDays === ""
        ? null
        : Number(b.leadTimeDays);

      const minimumQuantity = Number(
        b.minimumOrderQuantity || 1
      );

      if (
        (cost !== null &&
          (!Number.isFinite(cost) || cost < 0)) ||
        (leadTime !== null &&
          (!Number.isInteger(leadTime) || leadTime < 0)) ||
        !Number.isInteger(minimumQuantity) ||
        minimumQuantity < 1 ||
        !CURRENCIES.includes(currency)
      ) {
        throw new Error("Invalid supplier product details.");
      }

      if (b.isPreferred === true) {
        await pool.query(
          `UPDATE product_suppliers
           SET is_preferred=false
           WHERE product_id=$1`,
          [productId]
        );
      }

      const result = await pool.query(
        `INSERT INTO product_suppliers
         (product_id, supplier_id, supplier_sku,
          unit_cost, cost_currency, lead_time_days,
          minimum_order_quantity, is_preferred,
          availability, internal_notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (product_id, supplier_id)
         DO UPDATE SET
          supplier_sku=EXCLUDED.supplier_sku,
          unit_cost=EXCLUDED.unit_cost,
          cost_currency=EXCLUDED.cost_currency,
          lead_time_days=EXCLUDED.lead_time_days,
          minimum_order_quantity=EXCLUDED.minimum_order_quantity,
          is_preferred=EXCLUDED.is_preferred,
          availability=EXCLUDED.availability,
          internal_notes=EXCLUDED.internal_notes,
          updated_at=NOW()
         RETURNING *`,
        [
          productId,
          supplierId,
          clean(b.supplierSku, 120),
          cost,
          currency,
          leadTime,
          minimumQuantity,
          b.isPreferred === true,
          clean(b.availability || "needs_confirmation", 50),
          clean(b.internalNotes, 2000)
        ]
      );

      res.status(201).json({
        ok: true,
        productSupplier: result.rows[0]
      });

    } catch (error) {

      res.status(400).json({
        ok: false,
        error: error.message
      });

    }

  }
);

/* ================================
   ADMIN: VIEW PRODUCT SUPPLIERS
================================ */

app.get(
  "/api/admin/products/:productId/suppliers",
  adminOnly,
  async (req, res) => {

    const result = await pool.query(
      `SELECT ps.*, s.company_name, s.country,
       s.email, s.phone
       FROM product_suppliers ps
       JOIN suppliers s ON s.id=ps.supplier_id
       WHERE ps.product_id=$1
       ORDER BY ps.is_preferred DESC, s.company_name`,
      [clean(req.params.productId, 80)]
    );

    res.json({
      ok: true,
      suppliers: result.rows
    });

  }
);

/* ================================
   ADMIN: VIEW ORDERS
================================ */

app.get("/api/admin/orders", adminOnly, async (req, res) => {

  const result = await pool.query(
    "SELECT * FROM orders ORDER BY created_at DESC LIMIT 250"
  );

  res.json({
    ok: true,
    orders: result.rows
  });

});

/* ================================
   ADMIN: UPDATE ORDER / QUOTATION
================================ */

app.patch(
  "/api/admin/orders/:reference",
  adminOnly,
  async (req, res) => {

    try {

      const reference = clean(
        req.params.reference,
        60
      );

      const b = req.body || {};

      const old = await pool.query(
        "SELECT * FROM orders WHERE reference=$1",
        [reference]
      );

      if (!old.rowCount) {
        return res.status(404).json({
          ok: false,
          error: "Order not found."
        });
      }

      const current = old.rows[0];

      const status = b.status ?? current.status;

      const paymentStatus =
        b.paymentStatus ?? current.payment_status;

      const paymentMethod =
        b.paymentMethod ?? current.payment_method;

      if (!ORDER_STATUSES.includes(status)) {
        throw new Error("Invalid order status.");
      }

      if (![
        "not_due",
        "pending",
        "paid",
        "failed",
        "refunded"
      ].includes(paymentStatus)) {
        throw new Error("Invalid payment status.");
      }

      if (
        paymentMethod &&
        !PAYMENT_METHODS.includes(paymentMethod)
      ) {
        throw new Error("Invalid payment method.");
      }

      const subtotal = b.subtotal === undefined
        ? current.subtotal
        : Number(b.subtotal);

      const shipping = b.shippingCost === undefined
        ? current.shipping_cost
        : Number(b.shippingCost);

      const total = b.total === undefined
        ? (
          subtotal === null
            ? current.total
            : Number(subtotal) + Number(shipping || 0)
        )
        : Number(b.total);

      for (const amount of [subtotal, shipping, total]) {
        if (
          amount !== null &&
          (!Number.isFinite(Number(amount)) || Number(amount) < 0)
        ) {
          throw new Error("Invalid quotation amount.");
        }
      }

      const result = await pool.query(
        `UPDATE orders SET
         status=$2,
         payment_status=$3,
         payment_method=$4,
         subtotal=$5,
         shipping_cost=$6,
         total=$7,
         payment_reference=$8,
         payment_link=$9,
         supplier_confirmation=$10,
         admin_notes=$11,
         updated_at=NOW()
         WHERE reference=$1
         RETURNING *`,
        [
          reference,
          status,
          paymentStatus,
          paymentMethod,
          subtotal,
          shipping,
          total,
          clean(b.paymentReference ?? current.payment_reference, 150),
          clean(b.paymentLink ?? current.payment_link, 1000),
          JSON.stringify(
            b.supplierConfirmation ?? current.supplier_confirmation ?? {}
          ),
          clean(b.adminNotes ?? current.admin_notes, 3000)
        ]
      );

      res.json({
        ok: true,
        order: result.rows[0]
      });

    } catch (error) {

      res.status(400).json({
        ok: false,
        error: error.message
      });

    }

  }
);

/* ================================
   START SERVER
================================ */

app.get("*", (req, res) => {
  res.sendFile(
    path.join(__dirname, "public", "index.html")
  );
});

initDatabase()
  .then(() => {

    app.listen(PORT, () => {
      console.log(
        `TURIN PREMIUM STORE running on port ${PORT}`
      );
    });

  })
  .catch(error => {

    console.error(
      "Database startup error:",
      error
    );

    process.exit(1);

  });
