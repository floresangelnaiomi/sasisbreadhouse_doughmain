const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// ABSOLUTE PATH to your project's assets folder
const projectRoot = path.resolve(__dirname, '..', '..', '..');
const uploadPath = path.join(projectRoot, 'assets', 'productimages');

console.log('🎯 ABSOLUTE upload path:', uploadPath);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    console.log('📁 Saving to:', uploadPath);

    if (!fs.existsSync(uploadPath)) {
      console.log('📁 Creating upload directory...');
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const productName = req.body.name ? req.body.name.toLowerCase().replace(/\s+/g, '-') : 'product';
    const timestamp = Date.now();
    const fileExtension = path.extname(file.originalname);
    const fileName = `${productName}-${timestamp}${fileExtension}`;

    console.log('📸 Multer filename:', fileName);
    cb(null, fileName);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

const deleteOldImage = (imagePath) => {
  if (imagePath && imagePath !== '/assets/productimages/default-bread.png') {
    try {
      const filename = path.basename(imagePath);
      const fullPath = path.join(uploadPath, filename);

      console.log('🗑️ Attempting to delete old image:', fullPath);

      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        console.log('✅ Old image deleted successfully');
      }
    } catch (error) {
      console.error('❌ Error deleting old image:', error);
    }
  }
};

module.exports = (db) => {
  router.get('/overview', (req, res) => {
    const query = `
      SELECT 
        (SELECT COUNT(*) FROM TBL_Products WHERE availability_status = 'Active') as totalProducts,
        (SELECT COUNT(*) FROM TBL_Orders) as totalOrders,
        (SELECT COUNT(*) FROM TBL_Products WHERE stock_quantity = 0) as outOfStockItems,
        (SELECT COALESCE(SUM(price * stock_quantity), 0) FROM TBL_Products) as totalProductsValue
    `;

    db.query(query, (err, results) => {
      if (err) {
        console.error('❌ Database error fetching dashboard stats:', err);
        return res.status(500).json({ error: err.message });
      }
      res.json(results[0]);
    });
  });

  router.get('/top-product-sales', (req, res) => {
    const query = `
      SELECT 
        p.name as productName,
        p.price as unitPrice,
        COALESCE(SUM(oi.quantity), 0) as salesQuantity,
        (p.price * COALESCE(SUM(oi.quantity), 0)) as totalRevenue
      FROM TBL_Products p
      LEFT JOIN TBL_Order_Items oi ON p.product_id = oi.product_id
      LEFT JOIN TBL_Orders o ON oi.order_id = o.order_id
      WHERE p.availability_status = 'Active'
        AND o.order_status = 'Completed'
        AND o.order_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY p.product_id, p.name, p.price
      ORDER BY totalRevenue DESC
      LIMIT 8
    `;

    db.query(query, (err, results) => {
      if (err) {
        console.error('❌ Database error fetching top product sales:', err);
        return res.status(500).json({ error: err.message });
      }
      res.json(results);
    });
  });

  router.get('/top-stock-value', (req, res) => {
    const query = `
      SELECT 
        name as productName,
        stock_quantity,
        price,
        (stock_quantity * price) as stockValue
      FROM TBL_Products 
      WHERE availability_status = 'Active'
      ORDER BY stockValue DESC
      LIMIT 8
    `;

    db.query(query, (err, results) => {
      if (err) {
        console.error('❌ Database error fetching top stock value:', err);
        return res.status(500).json({ error: err.message });
      }
      res.json(results);
    });
  });

  router.get('/products', (req, res) => {
    const query = `
      SELECT 
        product_id,
        name,
        description,
        price,
        cost_price,
        availability_status,
        stock_quantity,
        min_stock_level,
        image_url,
        created_at
      FROM TBL_Products 
      ORDER BY name
    `;

    db.query(query, (err, results) => {
      if (err) {
        console.error('❌ Database error fetching products:', err);
        return res.status(500).json({ error: err.message });
      }
      res.json(results);
    });
  });

  router.post('/products', upload.single('image'), (req, res) => {
    try {
      console.log('📤 Add Product Request');

      const { name, description, price, cost_price, stock_quantity, min_stock_level } = req.body;

      let image_url = '/assets/productimages/default-bread.png';
      if (req.file) {
        image_url = `assets/productimages/${req.file.filename}`;
        console.log('🖼️ Image URL set to:', image_url);
        console.log('📁 File saved to:', req.file.path);
      }

      const query = `
            INSERT INTO TBL_Products 
            (name, description, price, cost_price, stock_quantity, min_stock_level, image_url, availability_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

      const availability_status = stock_quantity > 0 ? 'Active' : 'Out of Stock';

      db.query(query, [name, description, price, cost_price, stock_quantity, min_stock_level, image_url, availability_status],
        (err, results) => {
          if (err) {
            console.error('❌ Database error adding product:', err);
            return res.status(500).json({ error: err.message });
          }

          res.json({
            message: 'Product added successfully',
            product_id: results.insertId,
            image_url: image_url
          });
        });
    } catch (error) {
      console.error('❌ Error in add product:', error);
      res.status(500).json({ error: error.message });
    }
  });

  router.put('/products/:id', upload.single('image'), (req, res) => {
    try {
      const productId = req.params.id;
      const { name, description, price, cost_price, stock_quantity, min_stock_level, availability_status } = req.body;

      const getProductQuery = 'SELECT image_url FROM TBL_Products WHERE product_id = ?';

      db.query(getProductQuery, [productId], (err, productResults) => {
        if (err) {
          console.error('❌ Database error fetching product:', err);
          return res.status(500).json({ error: err.message });
        }

        if (productResults.length === 0) {
          return res.status(404).json({ error: 'Product not found' });
        }

        const currentProduct = productResults[0];
        let image_url = currentProduct.image_url;

        if (req.file) {
          deleteOldImage(currentProduct.image_url);
          image_url = `assets/productimages/${req.file.filename}`;
          console.log('🖼️ New image URL:', image_url);
        }

        const updateQuery = `
          UPDATE TBL_Products 
          SET name = ?, description = ?, price = ?, cost_price = ?, 
              stock_quantity = ?, min_stock_level = ?, image_url = ?, availability_status = ?
          WHERE product_id = ?
        `;

        db.query(updateQuery, [name, description, price, cost_price, stock_quantity, min_stock_level, image_url, availability_status, productId],
          (err, results) => {
            if (err) {
              console.error('❌ Database error updating product:', err);
              return res.status(500).json({ error: err.message });
            }
            res.json({
              message: 'Product updated successfully',
              image_url: image_url
            });
          });
      });
    } catch (error) {
      console.error('❌ Error in update product:', error);
      res.status(500).json({ error: error.message });
    }
  });

  router.delete('/products/:id', (req, res) => {
    const productId = req.params.id;

    const checkQuery = 'SELECT COUNT(*) as order_count FROM TBL_Order_Items WHERE product_id = ?';

    db.query(checkQuery, [productId], (err, checkResults) => {
      if (err) {
        console.error('❌ Database error checking product orders:', err);
        return res.status(500).json({ error: err.message });
      }

      const orderCount = checkResults[0].order_count;

      if (orderCount > 0) {
        const softDeleteQuery = `
          UPDATE TBL_Products 
          SET availability_status = 'Discontinued', 
              stock_quantity = 0
          WHERE product_id = ?
      `;
        db.query(softDeleteQuery, [productId], (err, results) => {
          if (err) {
            console.error('❌ Database error soft deleting product:', err);
            return res.status(500).json({ error: err.message });
          }

          res.json({
            message: 'Product has been discontinued (cannot delete due to existing orders)',
            action: 'soft_delete'
          });
        });
      } else {
        const getProductQuery = 'SELECT image_url FROM TBL_Products WHERE product_id = ?';

        db.query(getProductQuery, [productId], (err, productResults) => {
          if (err) {
            console.error('❌ Database error fetching product:', err);
            return res.status(500).json({ error: err.message });
          }

          if (productResults.length > 0) {
            deleteOldImage(productResults[0].image_url);
          }

          const deleteQuery = `DELETE FROM TBL_Products WHERE product_id = ?`;

          db.query(deleteQuery, [productId], (err, results) => {
            if (err) {
              console.error('❌ Database error deleting product:', err);
              return res.status(500).json({ error: err.message });
            }

            res.json({
              message: 'Product deleted successfully',
              action: 'hard_delete'
            });
          });
        });
      }
    });
  });

  router.get('/ingredients', (req, res) => {
    const query = `
      SELECT 
        ingredient_id,
        name,
        unit,
        current_stock,
        reorder_level,
        cost_per_unit,
        created_at
      FROM TBL_Ingredients 
      ORDER BY name
    `;

    db.query(query, (err, results) => {
      if (err) {
        console.error('❌ Database error fetching ingredients:', err);
        return res.status(500).json({ error: err.message });
      }
      res.json(results);
    });
  });

  router.post('/ingredients', (req, res) => {
    const { name, unit, current_stock, reorder_level, cost_per_unit } = req.body;

    const query = `
      INSERT INTO TBL_Ingredients 
      (name, unit, current_stock, reorder_level, cost_per_unit)
      VALUES (?, ?, ?, ?, ?)
    `;

    db.query(query, [name, unit, current_stock, reorder_level, cost_per_unit],
      (err, results) => {
        if (err) {
          console.error('❌ Database error adding ingredient:', err);
          return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Ingredient added successfully', ingredient_id: results.insertId });
      });
  });

  router.put('/ingredients/:id', (req, res) => {
    const ingredientId = req.params.id;
    const { name, unit, current_stock, reorder_level, cost_per_unit } = req.body;

    const query = `
      UPDATE TBL_Ingredients 
      SET name = ?, unit = ?, current_stock = ?, reorder_level = ?, cost_per_unit = ?
      WHERE ingredient_id = ?
    `;

    db.query(query, [name, unit, current_stock, reorder_level, cost_per_unit, ingredientId],
      (err, results) => {
        if (err) {
          console.error('❌ Database error updating ingredient:', err);
          return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Ingredient updated successfully' });
      });
  });

  router.delete('/ingredients/:id', (req, res) => {
    const ingredientId = req.params.id;

    const query = `DELETE FROM TBL_Ingredients WHERE ingredient_id = ?`;

    db.query(query, [ingredientId], (err, results) => {
      if (err) {
        console.error('❌ Database error deleting ingredient:', err);
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Ingredient deleted successfully' });
    });
  });

  router.get('/stock-movements', (req, res) => {
    const query = `
      SELECT 
        sm.movement_id,
        sm.item_type,
        sm.item_id,
        sm.movement_type,
        sm.quantity_change,
        sm.previous_stock,
        sm.new_stock,
        sm.reference_type,
        sm.notes,
        sm.created_at,
        CASE 
          WHEN sm.item_type = 'Product' THEN p.name
          WHEN sm.item_type = 'Ingredient' THEN i.name
          ELSE 'Unknown Item'
        END as item_name,
        u.first_name,
        u.last_name
      FROM TBL_Stock_Movements sm
      LEFT JOIN TBL_Products p ON sm.item_type = 'Product' AND sm.item_id = p.product_id
      LEFT JOIN TBL_Ingredients i ON sm.item_type = 'Ingredient' AND sm.item_id = i.ingredient_id
      LEFT JOIN TBL_Users u ON sm.created_by = u.user_id
      ORDER BY sm.created_at DESC
    `;

    db.query(query, (err, results) => {
      if (err) {
        console.error('❌ Database error fetching stock movements:', err);
        return res.status(500).json({ error: err.message });
      }
      res.json(results);
    });
  });

  router.post('/stock-movements', (req, res) => {
    const { item_type, item_id, movement_type, quantity_change, previous_stock, new_stock, reference_type, notes, created_by } = req.body;

    console.log('📤 Stock Movement Data:', req.body);

    if (!item_type || !item_id || !movement_type || quantity_change === undefined) {
      return res.status(400).json({ error: 'Missing required fields: item_type, item_id, movement_type, quantity_change' });
    }

    const getCurrentStockQuery = item_type === 'Product'
      ? 'SELECT stock_quantity FROM TBL_Products WHERE product_id = ?'
      : 'SELECT current_stock FROM TBL_Ingredients WHERE ingredient_id = ?';

    db.query(getCurrentStockQuery, [item_id], (err, stockResults) => {
      if (err) {
        console.error('❌ Database error fetching current stock:', err);
        return res.status(500).json({ error: 'Failed to fetch current stock' });
      }

      if (stockResults.length === 0) {
        return res.status(404).json({ error: `${item_type} not found` });
      }

      const currentStock = parseFloat(stockResults[0][item_type === 'Product' ? 'stock_quantity' : 'current_stock']);
      const calculatedPreviousStock = previous_stock !== undefined ? parseFloat(previous_stock) : currentStock;
      const calculatedNewStock = new_stock !== undefined ? parseFloat(new_stock) : currentStock + parseFloat(quantity_change);

      console.log('📊 Stock calculations:', {
        currentStock,
        calculatedPreviousStock,
        calculatedNewStock,
        quantity_change
      });

      const query = `
      INSERT INTO TBL_Stock_Movements 
      (item_type, item_id, movement_type, quantity_change, previous_stock, new_stock, reference_type, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

      db.query(query, [
        item_type,
        item_id,
        movement_type,
        quantity_change,
        calculatedPreviousStock,
        calculatedNewStock,
        reference_type,
        notes,
        created_by
      ], (err, results) => {
        if (err) {
          console.error('❌ Database error adding stock movement:', err);
          return res.status(500).json({ error: err.message });
        }

        const updateStockQuery = item_type === 'Product'
          ? 'UPDATE TBL_Products SET stock_quantity = ? WHERE product_id = ?'
          : 'UPDATE TBL_Ingredients SET current_stock = ? WHERE ingredient_id = ?';

        db.query(updateStockQuery, [calculatedNewStock, item_id], (updateErr) => {
          if (updateErr) {
            console.error('❌ Error updating stock:', updateErr);
          }

          res.json({
            message: 'Stock movement added successfully',
            movement_id: results.insertId,
            previous_stock: calculatedPreviousStock,
            new_stock: calculatedNewStock
          });
        });
      });
    });
  });

  router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
      }
    }
    res.status(500).json({ error: error.message });
  });

  return router;
};