// routes/express/adminJS/reportsAPI.js
const express = require('express');
const router = express.Router();

module.exports = (db) => {
  router.get('/quick-stats', async (req, res) => {
    try {
      const period = req.query.period || 'month';

      let dateFilter = '';
      switch(period) {
        case 'week':
          dateFilter = "AND order_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)";
          break;
        case 'month':
          dateFilter = "AND order_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)";
          break;
        case 'quarter':
          dateFilter = "AND order_date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)";
          break;
        case 'year':
          dateFilter = "AND order_date >= DATE_SUB(CURDATE(), INTERVAL 365 DAY)";
          break;
        default:
          dateFilter = "AND order_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)";
      }

      const query = `
        SELECT 
          (SELECT COALESCE(SUM(total_amount), 0) FROM TBL_Orders 
           WHERE order_status = 'Completed' ${dateFilter}) as current_sales,

          (SELECT COUNT(*) FROM TBL_Orders 
           WHERE order_status = 'Completed' ${dateFilter}) as current_orders,
           
          (SELECT COUNT(*) FROM TBL_Orders 
           WHERE order_status = 'Completed' AND order_type = 'Reseller' ${dateFilter}) as current_reseller_orders,
           
          (SELECT COUNT(*) FROM TBL_Orders 
           WHERE order_status = 'Completed' AND order_type = 'Walk-in' ${dateFilter}) as current_walkin_orders,
          
          (SELECT COALESCE(SUM(total_amount), 0) FROM TBL_Orders 
           WHERE order_status = 'Completed' AND order_date BETWEEN 
           DATE_SUB(CURDATE(), INTERVAL ${getPreviousPeriodDays(period)} DAY) AND 
           DATE_SUB(CURDATE(), INTERVAL ${getCurrentPeriodDays(period)} DAY)) as previous_sales,
           
          (SELECT COUNT(*) FROM TBL_Orders 
           WHERE order_status = 'Completed' AND order_date BETWEEN 
           DATE_SUB(CURDATE(), INTERVAL ${getPreviousPeriodDays(period)} DAY) AND 
           DATE_SUB(CURDATE(), INTERVAL ${getCurrentPeriodDays(period)} DAY)) as previous_orders,
           
          (SELECT COUNT(*) FROM TBL_Orders 
           WHERE order_status = 'Completed' AND order_type = 'Reseller' AND order_date BETWEEN 
           DATE_SUB(CURDATE(), INTERVAL ${getPreviousPeriodDays(period)} DAY) AND 
           DATE_SUB(CURDATE(), INTERVAL ${getCurrentPeriodDays(period)} DAY)) as previous_reseller_orders,
           
          (SELECT COUNT(*) FROM TBL_Orders 
           WHERE order_status = 'Completed' AND order_type = 'Walk-in' AND order_date BETWEEN 
           DATE_SUB(CURDATE(), INTERVAL ${getPreviousPeriodDays(period)} DAY) AND 
           DATE_SUB(CURDATE(), INTERVAL ${getCurrentPeriodDays(period)} DAY)) as previous_walkin_orders
      `;
      
      const [results] = await db.promise().query(query);
      res.json(results[0]);
      
    } catch (error) {
      console.error('❌ Database error in quick-stats:', error);
      res.status(500).json({ 
        error: 'Failed to fetch quick stats', 
        details: error.message 
      });
    }
  });

  router.get('/sales-trend', async (req, res) => {
  try {
    const period = req.query.period || 'month';
    
    let groupBy, dateFormat, interval;
    switch(period) {
      case 'week':
        groupBy = "DATE(order_date)";
        dateFormat = "%a";
        interval = 7;
        break;
      case 'month':
        groupBy = "YEARWEEK(order_date)";
        dateFormat = "%u";  // Just use week number
        interval = 4;
        break;
      case 'quarter':
        groupBy = "DATE_FORMAT(order_date, '%Y-%m')";
        dateFormat = "%b";
        interval = 3;
        break;
      case 'year':
        groupBy = "DATE_FORMAT(order_date, '%Y-%m')";
        dateFormat = "%b";
        interval = 12;
        break;
      default:
        groupBy = "YEARWEEK(order_date)";
        dateFormat = "%u"; 
        interval = 4;
    }

    const query = `
      SELECT 
        ${groupBy} as period_value,
        DATE_FORMAT(MIN(order_date), '${dateFormat}') as period_label,
        COALESCE(SUM(total_amount), 0) as sales_amount,
        COUNT(*) as order_count
      FROM TBL_Orders 
      WHERE order_status = 'Completed' 
        AND order_date >= DATE_SUB(CURDATE(), INTERVAL ${interval} ${getIntervalUnit(period)})
      GROUP BY ${groupBy}
      ORDER BY MIN(order_date) ASC
    `;
    
    const [results] = await db.promise().query(query);
    res.json(results);
    
  } catch (error) {
    console.error('❌ Database error in sales-trend:', error);
    res.status(500).json({ 
      error: 'Failed to fetch sales trend', 
      details: error.message 
    });
  }
});
 
  router.get('/customer-types', async (req, res) => {
    try {
      const period = req.query.period || 'month';
      const dateFilter = getDateFilter(period);

      const query = `
        SELECT 
          order_type,
          COUNT(*) as order_count,
          COALESCE(SUM(total_amount), 0) as sales_amount
        FROM TBL_Orders 
        WHERE order_status = 'Completed' ${dateFilter}
        GROUP BY order_type
      `;
      
      const [results] = await db.promise().query(query);
      res.json(results);
      
    } catch (error) {
      console.error('❌ Database error in customer-types:', error);
      res.status(500).json({ 
        error: 'Failed to fetch customer types', 
        details: error.message 
      });
    }
  });


  router.get('/sales-performance', async (req, res) => {
    try {
      const period = req.query.period || 'month';
      
      let groupBy, dateFormat;
      if (period === 'week' || period === 'month') {
        groupBy = "DAYOFWEEK(order_date)";
        dateFormat = "%W";
      } else {
        groupBy = "WEEK(order_date)";
        dateFormat = "'Week '", "WEEK(order_date)";
      }

      const dateFilter = getDateFilter(period);

      const query = `
        SELECT 
          ${groupBy} as day_of_week,
          DATE_FORMAT(order_date, '${dateFormat}') as day_name,
          COALESCE(SUM(total_amount), 0) as sales_amount,
          COUNT(*) as order_count
        FROM TBL_Orders 
        WHERE order_status = 'Completed' ${dateFilter}
        GROUP BY ${groupBy}, day_name
        ORDER BY ${groupBy}
      `;
      
      const [results] = await db.promise().query(query);
      res.json(results);
      
    } catch (error) {
      console.error('❌ Database error in sales-performance:', error);
      res.status(500).json({ 
        error: 'Failed to fetch sales performance', 
        details: error.message 
      });
    }
  });

  
  router.get('/order-status', async (req, res) => {
    try {
      const period = req.query.period || 'month';
      const dateFilter = getDateFilter(period);

      const query = `
        SELECT 
          order_status,
          COUNT(*) as order_count
        FROM TBL_Orders 
        WHERE 1=1 ${dateFilter}
        GROUP BY order_status
      `;
      
      const [results] = await db.promise().query(query);
      res.json(results);
      
    } catch (error) {
      console.error('❌ Database error in order-status:', error);
      res.status(500).json({ 
        error: 'Failed to fetch order status', 
        details: error.message 
      });
    }
  });

  
  router.get('/low-stock', async (req, res) => {
    try {
      const query = `
        SELECT 
          'product' as item_type,
          product_id as id,
          name,
          stock_quantity as current_stock,
          min_stock_level as reorder_level,
          CASE 
            WHEN stock_quantity = 0 THEN 'Out of Stock'
            WHEN stock_quantity <= min_stock_level THEN 'Low Stock'
            ELSE 'In Stock'
          END as status
        FROM TBL_Products 
        WHERE stock_quantity <= min_stock_level
        
        UNION ALL
        
        SELECT 
          'ingredient' as item_type,
          ingredient_id as id,
          name,
          current_stock,
          reorder_level,
          CASE 
            WHEN current_stock = 0 THEN 'Out of Stock'
            WHEN current_stock <= reorder_level THEN 'Low Stock'
            ELSE 'In Stock'
          END as status
        FROM TBL_Ingredients 
        WHERE current_stock <= reorder_level
        
        ORDER BY item_type, current_stock ASC
      `;
      
      const [results] = await db.promise().query(query);
      res.json(results);
      
    } catch (error) {
      console.error('❌ Database error in low-stock:', error);
      res.status(500).json({ 
        error: 'Failed to fetch low stock items', 
        details: error.message 
      });
    }
  });


  router.get('/top-products', async (req, res) => {
    try {
      const period = req.query.period || 'month';
      const limit = parseInt(req.query.limit) || 10;
      const dateFilter = getDateFilter(period);

      const query = `
        SELECT 
          p.name,
          p.product_id,
          SUM(oi.quantity) as total_sold,
          SUM(oi.subtotal) as total_revenue,
          p.price
        FROM TBL_Order_Items oi
        JOIN TBL_Products p ON oi.product_id = p.product_id
        JOIN TBL_Orders o ON oi.order_id = o.order_id
        WHERE o.order_status = 'Completed' ${dateFilter}
        GROUP BY p.product_id, p.name, p.price
        ORDER BY total_sold DESC
        LIMIT ?
      `;
      
      const [results] = await db.promise().query(query, [limit]);
      res.json(results);
      
    } catch (error) {
      console.error('❌ Database error in top-products:', error);
      res.status(500).json({ 
        error: 'Failed to fetch top products', 
        details: error.message 
      });
    }
  });


  function getDateFilter(period) {
    try {
      switch(period) {
        case 'week': return "AND order_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)";
        case 'month': return "AND order_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)";
        case 'quarter': return "AND order_date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)";
        case 'year': return "AND order_date >= DATE_SUB(CURDATE(), INTERVAL 365 DAY)";
        default: return "AND order_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)";
      }
    } catch (error) {
      console.error('Error in getDateFilter:', error);
      return "AND order_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)";
    }
  }

  function getPreviousPeriodDays(period) {
    try {
      switch(period) {
        case 'week': return 14;
        case 'month': return 60;
        case 'quarter': return 180;
        case 'year': return 730;
        default: return 60;
      }
    } catch (error) {
      console.error('Error in getPreviousPeriodDays:', error);
      return 60;
    }
  }

  function getCurrentPeriodDays(period) {
    try {
      switch(period) {
        case 'week': return 7;
        case 'month': return 30;
        case 'quarter': return 90;
        case 'year': return 365;
        default: return 30;
      }
    } catch (error) {
      console.error('Error in getCurrentPeriodDays:', error);
      return 30;
    }
  }

  function getIntervalUnit(period) {
    try {
      switch(period) {
        case 'week': return 'DAY';
        case 'month': return 'WEEK';
        case 'quarter': return 'MONTH';
        case 'year': return 'MONTH';
        default: return 'WEEK';
      }
    } catch (error) {
      console.error('Error in getIntervalUnit:', error);
      return 'WEEK';
    }
  }

  return router;
};
