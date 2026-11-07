require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const crypto = require("crypto");
const path = require("path");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3000;

app.disable("x-powered-by");

app.use(
  helmet({
    contentSecurityPolicy: false
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.DATABASE_SSL === "true"
      ? { rejectUnauthorized: false }
      : false
});

const PAYMENT_METHODS = [
  "Bank Transfer",
  "Mobile Money",
  "M-Pesa",
  "Airtel Money",
  "Mixx by Yas",
  "Visa",
  "Mastercard",
  "Selcom"
];

function requireAdmin(req, res, next) {
  const token = req.headers["x-admin-token"];

  if (
    !process.env.ADMIN_API_TOKEN ||
    !token ||
    token !== process.env.ADMIN_API_TOKEN
  ) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized access"
    });
  }

  next();
}


        address,
        postal_code,
        currency,
        items,
        payment_method
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING reference, status, created_at`,
      [
        reference,
        customerName,
        email,
        phone,
        country,
        city,
        address,
        postalCode || null,
        validCurrency,
        JSON.stringify(items),
        validPaymentMethod
      ]
    );

    res.status(201).json({
      success: true,
      message: "Your enquiry has been received. Stock and quotation will be confirmed.",
      order: result.rows[0]
    });
  } catch (error) {
    console.error("Order error:", error.message);

    res.status(500).json({
      success: false,
      message: "Unable to submit your enquiry. Please try again."
    });
  }
});

app.get("/api/orders/:reference", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT reference, status, currency, confirmed_total, created_at
       FROM orders
       WHERE reference = $1`,
      [req.params.reference]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    res.json({
      success: true,
      order: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Unable to retrieve order"
    });
  }
});

/* ADMIN: SUPPLIERS */

app.get("/api/admin/suppliers", requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM suppliers ORDER BY created_at DESC"
    );

    res.json({ success: true, suppliers: result.rows });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

app.post("/api/admin/suppliers", requireAdmin, async (req, res) => {
  try {
    const { name, country, email, website, contactPerson } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Supplier name is required"
      });
    }

    const result = await pool.query(
      `INSERT INTO suppliers
       (name, country, email, website, contact_person)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [
        name,
        country || null,
        email || null,
        website || null,
        contactPerson || null
      ]
    );

    res.status(201).json({
      success: true,
      supplier: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

/* ADMIN: PRODUCTS */

app.post("/api/admin/products", requireAdmin, async (req, res) => {
  try {
    const {
      name,
      category,
      description,
      imageUrl,
      indicativePriceUSD,
      indicativePriceTZS,
      displayCurrency,
      status
    } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Product name is required"
      });
    }

    const result = await pool.query(
      `INSERT INTO products (
        name, category, description, image_url,
        indicative_price_usd, indicative_price_tzs,
        display_currency, status
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *`,
      [
        name,
        category || null,
        description || null,
        imageUrl || null,
        indicativePriceUSD || null,
        indicativePriceTZS || null,
        displayCurrency || "USD",
        status || "draft"
      ]
    );

    res.status(201).json({
      success: true,
      product: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

app.post(
  "/api/admin/products/:productId/suppliers/:supplierId",
  requireAdmin,
  async (req, res) => {
    try {
      const {
        supplierReference,
        supplierPrice,
        supplierCurrency,
        availabilityStatus
      } = req.body;

      const result = await pool.query(
        `INSERT INTO product_suppliers (
          product_id, supplier_id, supplier_reference,
          supplier_price, supplier_currency, availability_status
        )
        VALUES ($1,$2,$3,$4,$5,$6)
        ON CONFLICT (product_id, supplier_id)
        DO UPDATE SET
          supplier_reference = EXCLUDED.supplier_reference,
          supplier_price = EXCLUDED.supplier_price,
          supplier_currency = EXCLUDED.supplier_currency,
          availability_status = EXCLUDED.availability_status,
          last_verified_at = CURRENT_TIMESTAMP
        RETURNING *`,
        [
          req.params.productId,
          req.params.supplierId,
          supplierReference || null,
          supplierPrice || null,
          supplierCurrency || null,
          availabilityStatus || "unverified"
        ]
      );

      res.json({
        success: true,
        link: result.rows[0]
      });
    } catch (error) {
      res.status(500).json({ success: false });
    }
  }
);

/* ADMIN: ORDERS */

app.get("/api/admin/orders", requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM orders ORDER BY created_at DESC"
    );

    res.json({
      success: true,
      orders: result.rows
    });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

app.patch("/api/admin/orders/:reference", requireAdmin, async (req, res) => {
  try {
    const { status, confirmedTotal, notes, paymentMethod } = req.body;

    const result = await pool.query(
      `UPDATE orders
       SET status = COALESCE($1, status),
           confirmed_total = COALESCE($2, confirmed_total),
           notes = COALESCE($3, notes),
           payment_method = COALESCE($4, payment_method)
       WHERE reference = $5
       RETURNING reference, status, confirmed_total, notes`,
      [
        status || null,
        confirmedTotal ?? null,
        notes ?? null,
        paymentMethod || null,
        req.params.reference
      ]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    res.json({
      success: true,
      order: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

/* WEBSITE: index.html IS IN THE ROOT DIRECTORY */

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

async function startServer() {
  try {
    await initDatabase();

    app.listen(PORT, () => {
      console.log(`TURIN PREMIUM STORE running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
}

startServer();
