const express = require("express");
const router = express.Router();

module.exports = function(db) {
  async function generateOrderNumber() {
    try {
      const [rows] = await db.promise().execute(
        "SELECT order_number FROM TBL_Orders ORDER BY order_id DESC LIMIT 1"
      );
      
      if (rows.length > 0) {
        const lastOrderNumber = rows[0].order_number;
        const lastNumber = parseInt(lastOrderNumber.replace('ORD', ''));
        const newNumber = lastNumber + 1;
        return `ORD${newNumber}`;
      } else {
        return 'ORD1001';
      }
    } catch (error) {
      console.error('Error generating order number:', error);
      return `ORD${Date.now().toString().slice(-6)}`;
    }
  }

  router.post("/place", async (req, res) => {
    const user_id = req.session.user_id; 
    const { total_amount, cart } = req.body;

    console.log("📥 Order request received:", { 
      user_id, 
      total_amount, 
      cart: cart 
    });

    if (!user_id) {
      return res.status(401).json({ 
        status: "error", 
        message: "User not authenticated. Please log in again." 
      });
    }

    if (!cart || cart.length === 0) {
      return res.status(400).json({ 
        status: "error", 
        message: "Cart is empty" 
      });
    }

    const conn = await db.promise().getConnection();

    try {
      await conn.beginTransaction();

      const order_number = await generateOrderNumber();
      const [orderResult] = await conn.execute(
        `INSERT INTO TBL_Orders (order_number, order_date, customer_account_id, order_type, order_status, payment_status, total_amount, received_by)
         VALUES (?, CURDATE(), NULL, 'Walk-in', 'Completed', 'Paid', ?, ?)`,
        [order_number, total_amount, user_id]
      );

      const order_id = orderResult.insertId;
      console.log("✅ Order created:", order_id, "with order number:", order_number);

      // Insert order items and update stock
      for (const item of cart) {
        const product_id = item.product_id;
        const quantity = item.quantity;

        console.log("📦 Processing item:", { product_id, quantity });

        const [stockCheck] = await conn.execute(
          "SELECT name, stock_quantity FROM TBL_Products WHERE product_id = ?",
          [product_id]
        );

        if (!stockCheck.length) {
          throw new Error(`Product ID ${product_id} not found`);
        }

        const { name, stock_quantity } = stockCheck[0];

        if (stock_quantity < quantity) {
          throw new Error(
            `Insufficient stock for "${name}" (Available: ${stock_quantity}, Requested: ${quantity})`
          );
        }

        await conn.execute(
          `INSERT INTO TBL_Order_Items (order_id, product_id, quantity, unit_price, subtotal)
           VALUES (?, ?, ?, ?, ?)`,
          [order_id, product_id, quantity, item.unit_price, item.subtotal]
        );
        await conn.execute(
          `UPDATE TBL_Products SET stock_quantity = stock_quantity - ? WHERE product_id = ?`,
          [quantity, product_id]
        );

        await conn.execute(
          `INSERT INTO TBL_Stock_Movements (item_type, item_id, movement_type, quantity_change, previous_stock, new_stock, reference_id, reference_type, created_by, notes)
           VALUES ('Product', ?, 'Sale', ?, ?, ?, ?, 'Order', ?, ?)`,
          [
            product_id,
            -quantity,
            stock_quantity,
            stock_quantity - quantity,
            order_id,
            user_id,
            `Walk-in sale for ${name}`,
          ]
        );
      }

      await conn.execute(
        `INSERT INTO TBL_Payments (order_id, payment_method, amount, payment_status, received_by)
         VALUES (?, 'Cash', ?, 'Completed', ?)`,
        [order_id, total_amount, user_id]
      );

      await conn.commit();

      console.log("✅ Order completed successfully:", order_number);

      res.json({
        status: "success",
        message: "Walk-in order placed successfully",
        order_id,
        order_number,
      });
    } catch (err) {
      await conn.rollback();
      console.error("❌ Order placement failed:", err.message);
      res.status(500).json({
        status: "error",
        message: err.message,
      });
    } finally {
      conn.release();
    }
  });

  return router;
};