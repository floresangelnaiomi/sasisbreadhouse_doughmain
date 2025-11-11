// routes/express/adminJS/ordersAPI.js
const express = require('express');
const router = express.Router();

module.exports = (db) => {
  console.log('🔄 Registered ordersAPI routes:');
  router.stack.forEach(layer => {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
      console.log(`  ${methods} ${layer.route.path}`);
    }
  });

  router.get('/test', (req, res) => {
    console.log('✅ TEST ROUTE HIT! Orders API is working');
    res.json({
      message: 'Orders API is working!',
      timestamp: new Date(),
      deliveryEndpoints: [
        'GET /api/admin/orders/deliveries',
        'POST /api/admin/orders/deliveries',
        'GET /api/admin/orders/deliveries/packed-orders'
      ]
    });
  });

  router.get('/', (req, res) => {
    const { status, paymentStatus, orderType, dateFrom, dateTo, search } = req.query;

    let query = `
      SELECT 
        o.order_id,
        o.order_number,
        o.order_date,
        o.order_type,
        o.order_status,
        o.payment_status,
        o.total_amount,
        o.notes,
        o.created_at,
        o.updated_at,
        u.first_name,
        u.last_name,
        u.contact_number,
        CONCAT(u.house_number, ' ', u.street_name, ' ', u.barangay, ' ', u.municipality, ' ', u.province) as customer_address,
        rb.first_name as received_by_first,
        rb.last_name as received_by_last,
        ab.first_name as approved_by_first,
        ab.last_name as approved_by_last
      FROM TBL_Orders o
      LEFT JOIN TBL_Users u ON o.customer_account_id = u.user_id
      LEFT JOIN TBL_Users rb ON o.received_by = rb.user_id
      LEFT JOIN TBL_Users ab ON o.approved_by = ab.user_id
      WHERE 1=1
    `;

    const params = [];

    if (status) {
      query += ` AND o.order_status = ?`;
      params.push(status);
    }

    if (paymentStatus) {
      query += ` AND o.payment_status = ?`;
      params.push(paymentStatus);
    }

    if (orderType) {
      query += ` AND o.order_type = ?`;
      params.push(orderType);
    }

    if (dateFrom) {
      query += ` AND o.order_date >= ?`;
      params.push(dateFrom);
    }

    if (dateTo) {
      query += ` AND o.order_date <= ?`;
      params.push(dateTo);
    }

    if (search) {
      query += ` AND (o.order_number LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    query += ` ORDER BY o.order_date DESC, o.created_at DESC`;

    db.query(query, params, (err, results) => {
      if (err) {
        console.error('❌ Database error fetching orders:', err);
        return res.status(500).json({ error: err.message });
      }
      res.json(results);
    });
  });

  router.get('/:id', (req, res) => {
    const orderId = req.params.id;

    const orderQuery = `
      SELECT 
        o.*,
        u.first_name,
        u.last_name,
        u.contact_number,
        CONCAT(u.house_number, ' ', u.street_name, ' ', u.barangay, ' ', u.municipality, ' ', u.province) as customer_address,
        rb.first_name as received_by_first,
        rb.last_name as received_by_last,
        ab.first_name as approved_by_first,
        ab.last_name as approved_by_last
      FROM TBL_Orders o
      LEFT JOIN TBL_Users u ON o.customer_account_id = u.user_id
      LEFT JOIN TBL_Users rb ON o.received_by = rb.user_id
      LEFT JOIN TBL_Users ab ON o.approved_by = ab.user_id
      WHERE o.order_id = ?
    `;

    const itemsQuery = `
      SELECT 
        oi.*,
        p.name as product_name,
        p.price as unit_price
      FROM TBL_Order_Items oi
      JOIN TBL_Products p ON oi.product_id = p.product_id
      WHERE oi.order_id = ?
    `;

    db.query(orderQuery, [orderId], (err, orderResults) => {
      if (err) {
        console.error('❌ Database error fetching order:', err);
        return res.status(500).json({ error: err.message });
      }

      if (orderResults.length === 0) {
        return res.status(404).json({ error: 'Order not found' });
      }

      db.query(itemsQuery, [orderId], (err, itemsResults) => {
        if (err) {
          console.error('❌ Database error fetching order items:', err);
          return res.status(500).json({ error: err.message });
        }

        const orderData = {
          ...orderResults[0],
          items: itemsResults
        };

        res.json(orderData);
      });
    });
  });

  router.put('/:id/status', (req, res) => {
    const orderId = req.params.id;
    const { order_status } = req.body;

    const validStatuses = ['Pending', 'Approved', 'Packed', 'Out for Delivery', 'Completed', 'Cancelled'];
    if (!validStatuses.includes(order_status)) {
      return res.status(400).json({ error: 'Invalid order status' });
    }

    if (order_status === 'Completed') {
      const checkQuery = 'SELECT payment_status FROM TBL_Orders WHERE order_id = ?';

      db.query(checkQuery, [orderId], (err, results) => {
        if (err) {
          console.error('❌ Database error checking payment status:', err);
          return res.status(500).json({ error: err.message });
        }

        if (results.length === 0) {
          return res.status(404).json({ error: 'Order not found' });
        }

        const currentPaymentStatus = results[0].payment_status;

        if (currentPaymentStatus === 'Pending') {
          return res.status(400).json({
            error: 'Cannot complete order with pending payment. Payment must be collected first.'
          });
        }

        proceedWithStatusUpdate();
      });
    } else {
      proceedWithStatusUpdate();
    }

    function proceedWithStatusUpdate() {
      const query = `
        UPDATE TBL_Orders 
        SET order_status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE order_id = ?
      `;

      db.query(query, [order_status, orderId], (err, results) => {
        if (err) {
          console.error('❌ Database error updating order status:', err);
          return res.status(500).json({ error: err.message });
        }

        if (results.affectedRows === 0) {
          return res.status(404).json({ error: 'Order not found' });
        }

        res.json({ message: 'Order status updated successfully' });
      });
    }
  });

  router.get('/stats/overview', (req, res) => {
    const query = `
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(CASE WHEN order_status = 'Completed' THEN total_amount ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN order_status = 'Pending' THEN 1 ELSE 0 END), 0) as pending_orders,
        COALESCE(SUM(CASE WHEN order_status = 'Completed' THEN 1 ELSE 0 END), 0) as completed_orders,
        COALESCE(AVG(CASE WHEN order_status = 'Completed' THEN total_amount ELSE NULL END), 0) as average_order_value
      FROM TBL_Orders
      WHERE order_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    `;

    db.query(query, (err, results) => {
      if (err) {
        console.error('❌ Database error fetching order stats:', err);
        return res.status(500).json({ error: err.message });
      }
      res.json(results[0]);
    });
  });

  router.get('/debug/orders', (req, res) => {
    const query = `
      SELECT 
        order_id, 
        order_number, 
        order_status, 
        payment_status,
        customer_account_id
      FROM TBL_Orders 
      WHERE order_status = 'Packed' 
      AND payment_status = 'Pending'
      ORDER BY order_id DESC
      LIMIT 10
    `;

    db.query(query, (err, results) => {
      if (err) {
        console.error('❌ Debug query error:', err);
        return res.status(500).json({ error: err.message });
      }
      res.json(results);
    });
  });

  router.get('/deliveries', (req, res) => {
    console.log('🎯 DELIVERIES ENDPOINT HIT!');

    const query = `
      SELECT 
        d.delivery_id,
        d.external_driver_name,
        d.delivery_status,
        d.scheduled_date,
        d.delivered_at,
        d.recipient_name,
        d.recipient_contact,
        d.cash_collected,
        d.notes,
        o.order_number,
        o.total_amount,
        o.payment_status,
        CONCAT(u.first_name, ' ', u.last_name) as customer_name
      FROM TBL_Deliveries d
      JOIN TBL_Orders o ON d.order_id = o.order_id
      LEFT JOIN TBL_Users u ON o.customer_account_id = u.user_id
      ORDER BY d.scheduled_date DESC
    `;

    db.query(query, (err, results) => {
      if (err) {
        console.error('❌ Database error fetching deliveries:', err);
        return res.status(500).json({ error: err.message });
      }
      console.log(`✅ Returning ${results.length} deliveries`);
      res.json(results);
    });
  });

  router.get('/deliveries/:id', (req, res) => {
    const deliveryId = req.params.id;

    const query = `
      SELECT 
        d.*,
        o.order_number,
        o.total_amount,
        o.payment_status,
        CONCAT(u.first_name, ' ', u.last_name) as customer_name
      FROM TBL_Deliveries d
      JOIN TBL_Orders o ON d.order_id = o.order_id
      LEFT JOIN TBL_Users u ON o.customer_account_id = u.user_id
      WHERE d.delivery_id = ?
    `;

    db.query(query, [deliveryId], (err, results) => {
      if (err) {
        console.error('❌ Database error fetching delivery:', err);
        return res.status(500).json({ error: err.message });
      }

      if (results.length === 0) {
        return res.status(404).json({ error: 'Delivery not found' });
      }

      res.json(results[0]);
    });
  });

  router.post('/deliveries', (req, res) => {
    const { order_id, driver_name, scheduled_date, recipient_name, recipient_contact, notes } = req.body;

    console.log('📦 Delivery scheduling request:', { order_id, driver_name, scheduled_date });

    if (!order_id || !driver_name || !scheduled_date || !recipient_name || !recipient_contact) {
      return res.status(400).json({
        error: 'All required fields must be provided'
      });
    }

    const checkOrderQuery = `
      SELECT 
        order_id, 
        order_status, 
        order_number
      FROM TBL_Orders 
      WHERE order_id = ?
    `;

    db.query(checkOrderQuery, [order_id], (err, orderResults) => {
      if (err) {
        console.error('❌ Database error checking order:', err);
        return res.status(500).json({ error: err.message });
      }

      if (orderResults.length === 0) {
        return res.status(404).json({ error: 'Order not found' });
      }

      const order = orderResults[0];

      if (order.order_status !== 'Packed') {
        return res.status(400).json({
          error: 'Only packed orders can be scheduled for delivery'
        });
      }

      const checkDeliveryQuery = 'SELECT delivery_id FROM TBL_Deliveries WHERE order_id = ?';

      db.query(checkDeliveryQuery, [order_id], (err, deliveryResults) => {
        if (err) {
          console.error('❌ Database error checking existing delivery:', err);
          return res.status(500).json({ error: err.message });
        }

        if (deliveryResults.length > 0) {
          return res.status(400).json({
            error: 'Delivery already scheduled for this order'
          });
        }

        const insertQuery = `
          INSERT INTO TBL_Deliveries 
          (order_id, external_driver_name, delivery_status, scheduled_date, recipient_name, recipient_contact, notes, recorded_by)
          VALUES (?, ?, 'Scheduled', ?, ?, ?, ?, 1)
        `;

        db.query(insertQuery, [order_id, driver_name, scheduled_date, recipient_name, recipient_contact, notes], (err, results) => {
          if (err) {
            console.error('❌ Database error creating delivery:', err);
            return res.status(500).json({ error: err.message });
          }

          const updateOrderQuery = 'UPDATE TBL_Orders SET order_status = ? WHERE order_id = ?';

          db.query(updateOrderQuery, ['Out for Delivery', order_id], (err) => {
            if (err) {
              console.error('❌ Database error updating order status:', err);
            }

            res.json({
              message: 'Delivery scheduled successfully',
              delivery_id: results.insertId
            });
          });
        });
      });
    });
  });

  router.get('/deliveries/packed-orders', (req, res) => {
    const query = `
      SELECT 
        o.order_id,
        o.order_number,
        o.order_date,
        o.total_amount,
        o.payment_status,
        u.first_name,
        u.last_name,
        u.contact_number
      FROM TBL_Orders o
      LEFT JOIN TBL_Users u ON o.customer_account_id = u.user_id
      WHERE o.order_status = 'Packed' 
      AND o.payment_status = 'Pending'
      AND NOT EXISTS (
        SELECT 1 FROM TBL_Deliveries d WHERE d.order_id = o.order_id
      )
      ORDER BY o.order_date DESC
    `;

    db.query(query, (err, results) => {
      if (err) {
        console.error('❌ Database error fetching packed orders:', err);
        return res.status(500).json({ error: err.message });
      }
      res.json(results);
    });
  });

  router.put('/deliveries/:id/status', (req, res) => {
    const deliveryId = req.params.id;
    const { delivery_status } = req.body;

    const validStatuses = ['Scheduled', 'Out for Delivery', 'Delivered', 'Failed', 'Returned', 'Cancelled'];
    if (!validStatuses.includes(delivery_status)) {
      return res.status(400).json({ error: 'Invalid delivery status' });
    }

    let query = '';
    let params = [];

    if (delivery_status === 'Delivered') {
      query = 'UPDATE TBL_Deliveries SET delivery_status = ?, delivered_at = NOW() WHERE delivery_id = ?';
      params = [delivery_status, deliveryId];
    } else {
      query = 'UPDATE TBL_Deliveries SET delivery_status = ? WHERE delivery_id = ?';
      params = [delivery_status, deliveryId];
    }

    db.query(query, params, (err, results) => {
      if (err) {
        console.error('❌ Database error updating delivery status:', err);
        return res.status(500).json({ error: err.message });
      }

      if (results.affectedRows === 0) {
        return res.status(404).json({ error: 'Delivery not found' });
      }

      res.json({ message: 'Delivery status updated successfully' });
    });
  });

  router.get('/debug/delivery-test', (req, res) => {
    console.log('🧪 DELIVERY DEBUG ENDPOINT HIT!');

    const testQuery = `
      SELECT 
        COUNT(*) as delivery_count,
        (SELECT COUNT(*) FROM TBL_Orders WHERE order_status = 'Packed') as packed_orders_count
      FROM TBL_Deliveries
    `;

    db.query(testQuery, (err, results) => {
      if (err) {
        console.error('❌ Delivery debug query failed:', err);
        return res.status(500).json({
          error: err.message,
          sqlMessage: err.sqlMessage
        });
      }

      res.json({
        success: true,
        message: 'Delivery API is working!',
        data: results[0],
        endpoints: {
          getAllDeliveries: 'GET /api/admin/orders/deliveries',
          getPackedOrders: 'GET /api/admin/orders/deliveries/packed-orders',
          scheduleDelivery: 'POST /api/admin/orders/deliveries',
          updateDeliveryStatus: 'PUT /api/admin/orders/deliveries/:id/status'
        }
      });
    });
  });

  return router;
};