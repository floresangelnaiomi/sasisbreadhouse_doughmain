// routes/express/adminJS/deliveryAPI.js
const express = require('express');
const router = express.Router();

module.exports = (db) => {
  console.log('🚚 DELIVERY API LOADED!');

  router.get('/test', (req, res) => {
    console.log('✅ DELIVERY API TEST ROUTE HIT!');
    res.json({
      success: true,
      message: 'Delivery API is working!',
      timestamp: new Date().toISOString()
    });
  });

  router.get('/', (req, res) => {
    console.log('🎯 DELIVERIES ENDPOINT HIT!');

    const { status, search, dateRange } = req.query;

    let query = `
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
        o.order_id,
        o.order_number,
        o.total_amount,
        o.payment_status,
        o.order_status,
        CONCAT(u.first_name, ' ', u.last_name) as customer_name
      FROM TBL_Deliveries d
      JOIN TBL_Orders o ON d.order_id = o.order_id
      LEFT JOIN TBL_Users u ON o.customer_account_id = u.user_id
      WHERE 1=1
    `;

    const params = [];

    if (status) {
      query += ' AND d.delivery_status = ?';
      params.push(status);
    }

    if (search) {
      query += ' AND (o.order_number LIKE ? OR d.external_driver_name LIKE ? OR d.recipient_name LIKE ? OR CONCAT(u.first_name, " ", u.last_name) LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (dateRange) {
      const today = new Date();
      let fromDate, toDate;

      switch (dateRange) {
        case 'today':
          fromDate = new Date(today);
          toDate = new Date(today);
          break;
        case 'tomorrow':
          fromDate = new Date(today);
          fromDate.setDate(today.getDate() + 1);
          toDate = new Date(fromDate);
          break;
        case 'week':
          fromDate = new Date(today);
          fromDate.setDate(today.getDate() - 7);
          toDate = new Date(today);
          break;
        case 'overdue':
          fromDate = new Date('2000-01-01');
          toDate = new Date(today);
          toDate.setDate(today.getDate() - 1);
          query += ' AND d.delivery_status IN ("Scheduled", "Out for Delivery")';
          break;
      }

      if (fromDate && toDate) {
        query += ' AND DATE(d.scheduled_date) BETWEEN ? AND ?';
        params.push(fromDate.toISOString().split('T')[0], toDate.toISOString().split('T')[0]);
      }
    }

    query += ' ORDER BY d.scheduled_date DESC';

    console.log('📋 Delivery query:', query);
    console.log('📋 Query params:', params);

    db.query(query, params, (err, results) => {
      if (err) {
        console.error('❌ Database error fetching deliveries:', err);
        return res.status(500).json({ error: err.message });
      }
      console.log(`✅ Returning ${results.length} deliveries`);
      res.json(results);
    });
  });

  router.get('/:id', (req, res) => {
    const deliveryId = req.params.id;

    const query = `
      SELECT
        d.*,
        o.order_number,
        o.total_amount,
        o.payment_status,
        o.order_status,
        CONCAT(u.first_name, ' ', u.last_name) as customer_name,
        CONCAT(rec.first_name, ' ', rec.last_name) as recorded_by_name
      FROM TBL_Deliveries d
      JOIN TBL_Orders o ON d.order_id = o.order_id
      LEFT JOIN TBL_Users u ON o.customer_account_id = u.user_id
      LEFT JOIN TBL_Users rec ON d.recorded_by = rec.user_id
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

  router.post('/', (req, res) => {
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

  router.get('/packed-orders/packed', (req, res) => {
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

  router.put('/:id/status', (req, res) => {
    const deliveryId = req.params.id;
    const { delivery_status } = req.body;

    const validStatuses = ['Scheduled', 'Out for Delivery', 'Delivered', 'Failed', 'Returned', 'Cancelled'];
    if (!validStatuses.includes(delivery_status)) {
      return res.status(400).json({ error: 'Invalid delivery status' });
    }

    const getOrderQuery = 'SELECT order_id FROM TBL_Deliveries WHERE delivery_id = ?';

    db.query(getOrderQuery, [deliveryId], (err, deliveryResults) => {
      if (err) {
        console.error('❌ Database error fetching delivery:', err);
        return res.status(500).json({ error: err.message });
      }

      if (deliveryResults.length === 0) {
        return res.status(404).json({ error: 'Delivery not found' });
      }

      const orderId = deliveryResults[0].order_id;

      let orderStatus = '';
      switch (delivery_status) {
        case 'Out for Delivery':
          orderStatus = 'Out for Delivery';
          break;
        case 'Delivered':
          orderStatus = 'Completed';
          break;
        case 'Failed':
        case 'Cancelled':
          orderStatus = 'Cancelled';
          break;
        default:
          orderStatus = 'Packed';
      }

      let deliveryQuery = '';
      let deliveryParams = [];

      if (delivery_status === 'Delivered') {
        deliveryQuery = 'UPDATE TBL_Deliveries SET delivery_status = ?, delivered_at = NOW() WHERE delivery_id = ?';
        deliveryParams = [delivery_status, deliveryId];
      } else {
        deliveryQuery = 'UPDATE TBL_Deliveries SET delivery_status = ? WHERE delivery_id = ?';
        deliveryParams = [delivery_status, deliveryId];
      }

      db.query(deliveryQuery, deliveryParams, (err, deliveryUpdateResults) => {
        if (err) {
          console.error('❌ Database error updating delivery status:', err);
          return res.status(500).json({ error: err.message });
        }

        if (orderStatus) {
          const orderQuery = 'UPDATE TBL_Orders SET order_status = ?, updated_at = CURRENT_TIMESTAMP WHERE order_id = ?';

          db.query(orderQuery, [orderStatus, orderId], (err, orderUpdateResults) => {
            if (err) {
              console.error('❌ Database error updating order status:', err);
            }

            console.log(`✅ Updated delivery ${deliveryId} to ${delivery_status} and order ${orderId} to ${orderStatus}`);
            res.json({
              message: 'Delivery status updated successfully',
              order_status_updated: orderStatus
            });
          });
        } else {
          console.log(`✅ Updated delivery ${deliveryId} to ${delivery_status}`);
          res.json({ message: 'Delivery status updated successfully' });
        }
      });
    });
  });

  router.put('/:id/complete', (req, res) => {
    const deliveryId = req.params.id;

    const query = 'UPDATE TBL_Deliveries SET delivery_status = "Delivered", delivered_at = NOW() WHERE delivery_id = ?';

    db.query(query, [deliveryId], (err, results) => {
      if (err) {
        console.error('❌ Database error completing delivery:', err);
        return res.status(500).json({ error: err.message });
      }

      if (results.affectedRows === 0) {
        return res.status(404).json({ error: 'Delivery not found' });
      }

      res.json({
        message: 'Delivery marked as delivered successfully',
        note: 'Payment will be collected when rider returns'
      });
    });
  });

  console.log('📋 Delivery API Routes Registered:');
  router.stack.forEach(layer => {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
      console.log(`  ${methods} ${layer.route.path}`);
    }
  });

  return router;
};