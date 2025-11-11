// ===== routes/express/cashierJS/productsAPI.js =====
const express = require("express");

module.exports = (db) => {
  const router = express.Router();

  router.get("/", (req, res) => {
    console.log("📦 Fetching products from database...");
    
    const sql = `
      SELECT 
        product_id, 
        name, 
        description, 
        price, 
        cost_price, 
        stock_quantity,
        availability_status,
        CASE 
          WHEN image_url IS NULL OR image_url = '' THEN '/assets/productimages/default-bread.jpg'
          WHEN image_url NOT LIKE '/%' THEN CONCAT('/', image_url)
          ELSE image_url
        END as image_url
      FROM TBL_Products 
      WHERE availability_status = 'Active'
      ORDER BY product_id
    `;
    
    db.query(sql, (err, results) => {
      if (err) {
        console.error("❌ Error fetching products:", err);
        return res.status(500).json({ error: "Database error" });
      }
      
      console.log(`✅ Found ${results.length} products`);
      console.log("Sample product:", results[0]);
      
      res.json(results);
    });
  });

  return router;
};