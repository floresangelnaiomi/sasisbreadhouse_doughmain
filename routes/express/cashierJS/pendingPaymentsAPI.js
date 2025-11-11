// routes/express/cashierJS/pendingPaymentsAPI.js
const express = require("express");

module.exports = (db) => {
  const router = express.Router();

  console.log("✅ Pending Payments API router created");

  router.get("/test", (req, res) => {
    console.log("✅ Pending Payments API test route hit!");
    res.json({ 
      status: "success", 
      message: "API is working!",
      timestamp: new Date().toISOString()
    });
  });

  router.get("/", async (req, res) => {
    try {
      console.log("📋 Fetching pending payments...");
      
      const sql = `
        SELECT 
          o.order_id,
          o.order_number,
          o.order_date,
          o.total_amount,
          o.order_status,
          CONCAT(u.first_name, ' ', u.last_name) as reseller_name,
          u.contact_number,
          d.delivery_status,
          d.external_driver_name,
          d.recipient_name,
          d.recipient_contact
        FROM TBL_Orders o
        LEFT JOIN TBL_Users u ON o.customer_account_id = u.user_id
        LEFT JOIN TBL_Deliveries d ON o.order_id = d.order_id
        WHERE o.order_type = 'Reseller'
          AND o.payment_status = 'Pending'
          AND o.order_status IN ('Approved', 'Packed', 'Out for Delivery', 'Completed')
        ORDER BY o.order_date DESC
      `;
      
      const [results] = await db.promise().execute(sql);
      
      console.log(`✅ Found ${results.length} pending orders`);
      res.json(results);
      
    } catch (err) {
      console.error("❌ Error fetching pending payments:", err);
      res.status(500).json({ error: "Database error" });
    }
  });
router.post("/collect", async (req, res) => {
    const { order_id } = req.body;
    const cashier_id = req.session.user.id;
    
    if (!order_id) {
        return res.status(400).json({ status: "error", message: "Order ID is required" });
    }
    
    const conn = await db.promise().getConnection();
    
    try {
        await conn.beginTransaction();
        
        console.log(`💰 Collecting payment for order ${order_id} by cashier ${cashier_id}`);
        
      const [orderResult] = await conn.execute(
        `SELECT total_amount FROM TBL_Orders WHERE order_id = ?`,
        [order_id]
      );
      
      if (orderResult.length === 0) {
        throw new Error("Order not found");
      }
      
      const totalAmount = orderResult[0].total_amount;
        
      const [paymentResult] = await conn.execute(
        `UPDATE TBL_Payments 
         SET payment_status = 'Completed', 
             payment_date = NOW(), 
             received_by = ? 
         WHERE order_id = ? AND payment_status = 'Pending'`,
        [cashier_id, order_id]
      );
        
        if (paymentResult.affectedRows === 0) {
            throw new Error("No pending payment found for this order");
        }
        
      await conn.execute(
        `UPDATE TBL_Orders 
         SET payment_status = 'Paid',
             order_status = 'Completed'
         WHERE order_id = ?`,
        [order_id]
      );
      
      await conn.execute(
        `UPDATE TBL_Deliveries 
         SET cash_collected = ? 
         WHERE order_id = ?`,
        [totalAmount, order_id]
      );
        
        await conn.commit();
        
        console.log("✅ Payment collected and cash_collected updated");
        res.json({ 
            status: "success", 
            message: "Payment collected successfully and order completed" 
        });
        
    } catch (err) {
        await conn.rollback();
        console.error("❌ Error collecting payment:", err);
        res.status(500).json({ 
            status: "error", 
            message: err.message || "Failed to collect payment" 
        });
    } finally {
        conn.release();
    }
});
  return router;
};