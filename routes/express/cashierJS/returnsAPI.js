// routes/express/cashierJS/returnsAPI.js
const express = require("express");

module.exports = function (db) {
  const router = express.Router();

  router.get("/", async (req, res) => {
    try {
      const [rows] = await db.promise().query(`
        SELECT 
          r.return_id, 
          r.order_id, 
          p.name AS product_name, 
          r.quantity,
          r.return_reason, 
          r.action_taken, 
          r.refund_amount, 
          r.processed_at,
          u.username
        FROM TBL_Returns r
        JOIN TBL_Products p ON r.product_id = p.product_id
        JOIN TBL_Users u ON r.processed_by = u.user_id
        ORDER BY r.processed_at DESC
      `);

      res.json({ status: "success", data: rows });

    } catch (err) {
      console.error("Fetch Returns Error:", err);
      res.status(500).json({ status: "error", message: "Failed to fetch return requests" });
    }
  });

  router.post("/request", async (req, res) => {
    try {
      const cashierId = req.session.user?.id;

      if (!cashierId) {
        return res.status(401).json({ status: "error", message: "Not logged in" });
      }

      const { order_id, product_id, quantity, return_reason, action_taken, refund_amount, notes } = req.body;

      if (!order_id || !product_id || !quantity || !return_reason || !action_taken) {
        return res.status(400).json({ 
          status: "error", 
          message: "Missing required fields" 
        });
      }

      const [orderCheck] = await db.promise().execute(
        "SELECT order_id, order_number FROM TBL_Orders WHERE order_id = ?",
        [order_id]
      );

      if (orderCheck.length === 0) {
        return res.status(400).json({
          status: "error",
          message: `Order ID ${order_id} does not exist in the system`
        });
      }

      const [productCheck] = await db.promise().execute(
        "SELECT product_id, name FROM TBL_Products WHERE product_id = ?",
        [product_id]
      );

      if (productCheck.length === 0) {
        return res.status(400).json({
          status: "error",
          message: `Product ID ${product_id} does not exist`
        });
      }

      const [result] = await db.promise().execute(
        `INSERT INTO TBL_Returns 
        (order_id, product_id, quantity, return_reason, action_taken, refund_amount, processed_by, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [order_id, product_id, quantity, return_reason, action_taken, refund_amount || 0, cashierId, notes || null]
      );

      res.json({ 
        status: "success", 
        message: "Return request submitted successfully",
        return_id: result.insertId
      });

    } catch (err) {
      console.error("Submit Return Error:", err);
      
      if (err.errno === 1452) {
        return res.status(400).json({ 
          status: "error", 
          message: "Invalid order or product reference. Please check the IDs and try again." 
        });
      }
      
      res.status(500).json({ 
        status: "error", 
        message: "Failed to submit return request: " + err.message 
      });
    }
  });

  return router;
};