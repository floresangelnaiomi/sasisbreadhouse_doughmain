// routes/express/adminJS/returnsAPI.js
const express = require('express');
const router = express.Router();

module.exports = (db) => {
  router.get('/', async (req, res) => {
    try {
      console.log('🔄 Returns API called with query:', req.query);
            
            const { status, reason, search } = req.query;
            
            let query = `
                SELECT 
                    r.return_id,
                    r.order_id,
                    o.order_number,
                    p.name as product_name,
                    r.quantity,
                    r.return_reason,
                    r.action_taken,
                    r.refund_amount,
                    'Completed' as status,
                    DATE(r.processed_at) as return_date,
                    r.notes,
                    r.processed_at as created_at
                FROM TBL_Returns r
                LEFT JOIN TBL_Orders o ON r.order_id = o.order_id
                LEFT JOIN TBL_Products p ON r.product_id = p.product_id
                WHERE 1=1
            `;
            
            const params = [];
            
            if (reason) {
                query += ' AND r.return_reason = ?';
                params.push(reason);
            }
            
            if (search) {
                query += ' AND (r.return_id LIKE ? OR o.order_number LIKE ? OR p.name LIKE ?)';
                const searchTerm = `%${search}%`;
                params.push(searchTerm, searchTerm, searchTerm);
            }
            
            query += ' ORDER BY r.processed_at DESC';
            
            console.log('📝 SQL Query:', query);
            console.log('📝 SQL Params:', params);
            
            db.query(query, params, (error, results) => {
              if (error) {
                console.error('❌ Database error:', error);
                return res.status(500).json({ error: 'Database error: ' + error.message });
              }
              
              console.log('✅ Returns fetched:', results.length);
              console.log('📊 Sample return:', results[0]);
              
              res.json(results);
            });
            
        } catch (error) {
            console.error('❌ Error in returns API:', error);
            console.error('❌ Error stack:', error.stack);
            res.status(500).json({ error: 'Internal server error: ' + error.message });
        }
    });

  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      console.log('🔄 Fetching return details for ID:', id);
            
            const query = `
                SELECT 
                    r.return_id,
                    r.order_id,
                    o.order_number,
                    p.name as product_name,
                    r.quantity,
                    r.return_reason,
                    r.action_taken,
                    r.refund_amount,
                    'Completed' as status,
                    DATE(r.processed_at) as return_date,
                    r.notes,
                    r.processed_at as created_at,
                    u.first_name,
                    u.last_name
                FROM TBL_Returns r
                LEFT JOIN TBL_Orders o ON r.order_id = o.order_id
                LEFT JOIN TBL_Products p ON r.product_id = p.product_id
                LEFT JOIN TBL_Users u ON r.processed_by = u.user_id
                WHERE r.return_id = ?
            `;
            
            db.query(query, [id], (error, results) => {
                if (error) {
                    console.error('❌ Database error:', error);
                    return res.status(500).json({ error: 'Database error: ' + error.message });
                }
                
                if (results.length === 0) {
                    return res.status(404).json({ error: 'Return not found' });
                }
                
                res.json(results[0]);
            });
            
        } catch (error) {
            console.error('Error fetching return details:', error);
            res.status(500).json({ error: 'Internal server error: ' + error.message });
        }
    });

  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
            db.query('SELECT return_id FROM TBL_Returns WHERE return_id = ?', [id], (error, results) => {
                if (error) {
                    console.error('❌ Database error:', error);
                    return res.status(500).json({ error: 'Database error: ' + error.message });
                }
                
                if (results.length === 0) {
                    return res.status(404).json({ error: 'Return not found' });
                }
                
      db.query('DELETE FROM TBL_Returns WHERE return_id = ?', [id], (error, deleteResults) => {
        if (error) {
          console.error('❌ Database error:', error);
          return res.status(500).json({ error: 'Database error: ' + error.message });
        }
        
        res.json({ message: 'Return deleted successfully' });
      });
    });
    
  } catch (error) {
    console.error('Error deleting return:', error);
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
});

  return router;
};