//routes/express/adminJS/dashboardAPI.js

const express = require('express');
const router = express.Router();

module.exports = (db) => {
  router.get('/stats', (req, res) => {
    const query = `
      SELECT 
        (SELECT COUNT(*) FROM TBL_Users WHERE role = 'Reseller' AND account_status = 'Active') as active_resellers,
        (SELECT COALESCE(SUM(total_amount), 0) FROM TBL_Orders WHERE order_status = 'Completed') as total_sales,
        (SELECT COUNT(*) FROM TBL_Products WHERE stock_quantity < 10) as low_stock_items,
        (SELECT COUNT(*) FROM TBL_Orders WHERE order_status = 'Pending') as pending_orders
    `;
    
    db.query(query, (err, results) => {
      if (err) {
        console.error('❌ Database error:', err);
        return res.status(500).json({ error: err.message });
      }
      res.json(results[0]);
    });
  });

  router.get('/recent-orders', (req, res) => {
    const query = `
      SELECT 
        order_id,
        order_number,
        CASE 
          WHEN TBL_Orders.customer_account_id IS NOT NULL THEN CONCAT(TBL_Users.first_name, ' ', TBL_Users.last_name)
          ELSE 'Walk-in Customer'
        END as customer_name,
        total_amount,
        order_status,
        order_date,
        payment_status,
        order_type
      FROM TBL_Orders 
      LEFT JOIN TBL_Users ON TBL_Orders.customer_account_id = TBL_Users.user_id
      ORDER BY order_date DESC 
      LIMIT 5
    `;
    
    db.query(query, (err, results) => {
      if (err) {
        console.error('❌ Database error:', err);
        return res.status(500).json({ error: err.message });
      }
      res.json(results);
    });
  });

  return router;
};