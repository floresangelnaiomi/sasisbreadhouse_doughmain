const express = require('express');
const router = express.Router();

module.exports = (db) => {
  // ✅ Fetch reseller order history
  router.get('/history/:resellerId', (req, res) => {
    const { resellerId } = req.params;
    
    console.log('📦 Fetching order history for reseller:', resellerId);

    const sql = `
      SELECT
        o.order_id,
        o.order_number,
        DATE(o.order_date) as order_date,
        o.total_amount,
        o.order_status,
        o.payment_status,
        p.name AS product_name,
        oi.quantity,
        oi.unit_price,
        (oi.quantity * oi.unit_price) as item_total
      FROM TBL_Orders o
      JOIN TBL_Order_Items oi ON o.order_id = oi.order_id
      JOIN TBL_Products p ON oi.product_id = p.product_id
      WHERE o.customer_account_id = ?
        AND o.order_type = 'Reseller'
      ORDER BY o.order_date DESC, o.order_id DESC;
    `;

    db.query(sql, [resellerId], (err, results) => {
      if (err) {
        console.error('❌ Error fetching order history:', err);
        return res.status(500).json({ error: 'Database query failed' });
      }

      console.log(`📊 Found ${results.length} order items for reseller ${resellerId}`);

      // Group items per order and validate totals
      const ordersMap = {};
      results.forEach(row => {
        if (!ordersMap[row.order_id]) {
          ordersMap[row.order_id] = {
            order_id: row.order_id,
            order_number: row.order_number,
            order_date: row.order_date,
            total_amount: parseFloat(row.total_amount) || 0,
            order_status: row.order_status,
            payment_status: row.payment_status,
            items: []
          };
        }
        ordersMap[row.order_id].items.push({
          product_name: row.product_name,
          quantity: row.quantity,
          unit_price: parseFloat(row.unit_price) || 0,
          item_total: parseFloat(row.item_total) || 0
        });
      });

      // Log for debugging
      Object.values(ordersMap).forEach(order => {
        console.log(`Order ${order.order_number}: ${order.total_amount} - ${order.order_status}`);
      });

      res.json(Object.values(ordersMap));
    });
  });


  router.put('/cancel/:orderId', (req, res) => {
    const { orderId } = req.params;
    const { user_id } = req.body; 

    console.log(`❌ Attempting to cancel order ${orderId} by user ${user_id}`);

    const verifySql = `
      SELECT order_id, order_status, customer_account_id 
      FROM TBL_Orders 
      WHERE order_id = ? AND customer_account_id = ?
    `;

    db.query(verifySql, [orderId, user_id], (err, results) => {
      if (err) {
        console.error('❌ Error verifying order:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      if (results.length === 0) {
        return res.status(404).json({ error: 'Order not found or access denied' });
      }

      const order = results[0];
      
      
      const cancellableStatuses = ['Pending', 'Approved'];
      if (!cancellableStatuses.includes(order.order_status)) {
        return res.status(400).json({ 
          error: `Cannot cancel order with status: ${order.order_status}. Only Pending or Approved orders can be cancelled.` 
        });
      }

      const updateSql = `
        UPDATE TBL_Orders 
        SET order_status = 'Cancelled', 
            updated_at = CURRENT_TIMESTAMP 
        WHERE order_id = ?
      `;

      db.query(updateSql, [orderId], (err, updateResult) => {
        if (err) {
          console.error('❌ Error cancelling order:', err);
          return res.status(500).json({ error: 'Failed to cancel order' });
        }

        console.log(`✅ Order ${orderId} cancelled successfully`);
        res.json({ 
          success: true, 
          message: 'Order cancelled successfully',
          order_id: orderId,
          new_status: 'Cancelled'
        });
      });
    });
  });

  return router;
};