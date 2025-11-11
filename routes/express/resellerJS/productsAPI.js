const express = require('express');

module.exports = (db) => {
  const router = express.Router();

  // GET /api/products
  router.get('/', (req, res) => {
    const query = `
      SELECT 
        product_id, 
        name, 
        description, 
        price, 
        cost_price,
        availability_status, 
        stock_quantity, 
        min_stock_level,
        image_url 
      FROM TBL_Products 
      WHERE availability_status = 'Active' 
      AND stock_quantity > 0
      ORDER BY name ASC
    `;
    
    db.query(query, (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: err.message });
      }
      
      console.log(`📦 Found ${results.length} available products`);
      res.json(results);
    });
  });

  return router;
};