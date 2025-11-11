// routes/express/resellerJS/resellerOrderAPI.js
const express = require('express');
const router = express.Router();

module.exports = (db) => {
   
    router.post('/', async (req, res) => {
        const { user_id, items, total_amount } = req.body;
        
        console.log('🛒 Placing new order for user:', user_id);

        if (!user_id || !items || items.length === 0) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        db.getConnection(async (err, connection) => {
            if (err) {
                console.error('❌ Database connection error:', err);
                return res.status(500).json({ error: 'Database error' });
            }

            connection.beginTransaction(async (err) => {
                if (err) {
                    connection.release();
                    return res.status(500).json({ error: 'Transaction error' });
                }

                try {
                 
                    const [maxOrderResults] = await connection.promise().execute(
                        'SELECT MAX(CAST(SUBSTRING(order_number, 4) AS UNSIGNED)) as max_number FROM TBL_Orders WHERE order_number LIKE "ORD%"'
                    );
                    
                    let nextOrderNumber;
                    if (maxOrderResults[0].max_number) {
                        nextOrderNumber = `ORD${maxOrderResults[0].max_number + 1}`;
                    } else {
                        nextOrderNumber = 'ORD1021'; 
                    }
                    
                    console.log('📝 Generated order number:', nextOrderNumber);

                    
                    const orderSql = `
                        INSERT INTO TBL_Orders 
                        (order_number, order_date, customer_account_id, order_type, order_status, payment_status, total_amount, received_by)
                        VALUES (?, CURDATE(), ?, 'Reseller', 'Pending', 'Pending', ?, ?)
                    `;
                    
                    const [orderResult] = await connection.promise().execute(orderSql, [
                        nextOrderNumber, user_id, total_amount, user_id
                    ]);
                    
                    const orderId = orderResult.insertId;
                    console.log('✅ Order created with ID:', orderId, 'Number:', nextOrderNumber);

                    
                    const orderItemsSql = `
                        INSERT INTO TBL_Order_Items (order_id, product_id, quantity, unit_price, subtotal)
                        VALUES (?, ?, ?, ?, ?)
                    `;

                    for (const item of items) {
                        const subtotal = parseFloat(item.price) * parseInt(item.quantity);
                        await connection.promise().execute(orderItemsSql, [
                            orderId, 
                            item.product_id, 
                            parseInt(item.quantity), 
                            parseFloat(item.price), 
                            subtotal
                        ]);
                    }

                   
                    await connection.promise().commit();
                    connection.release();

                    console.log('🎉 Order placed successfully!');
                    res.json({ 
                        success: true, 
                        order_id: orderId, 
                        order_number: nextOrderNumber,
                        message: 'Order placed successfully' 
                    });

                } catch (error) {
                   
                    await connection.promise().rollback();
                    connection.release();
                    
                    console.error('❌ Order placement error:', error);
                    res.status(500).json({ error: 'Failed to place order: ' + error.message });
                }
            });
        });
    });

    return router;
};