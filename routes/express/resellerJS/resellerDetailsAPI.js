const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

module.exports = (db) => {
  const router = express.Router();


  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(__dirname, '../../../uploads');
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `avatar_${req.params.userId}${ext}`);
    }
  });
  const upload = multer({ storage });

 
  router.get('/:userId', (req, res) => {
    const { userId } = req.params;
    console.log('🔍 Fetching user details for ID:', userId);
    
 
    const query = `
      SELECT 
        user_id, username, first_name, last_name, email, contact_number, 
        province, municipality, barangay, street_name, house_number, profile_picture_url 
      FROM TBL_Users 
      WHERE user_id = ?
    `;
    
    db.query(query, [userId], (err, results) => {
      if (err) {
        console.error('❌ Database error:', err);
        return res.status(500).json({ error: err.message });
      }
      if (!results.length) {
        console.error('❌ User not found with ID:', userId);
        return res.status(404).json({ error: 'User not found' });
      }
      console.log('✅ User data found:', results[0]);
      res.json(results[0]);
    });
  });

 
  router.post('/update/:userId', (req, res) => {
    const { userId } = req.params;
    const { 
      username, 
      first_name, 
      last_name, 
      email, 
      contact_number, 
      password,
      province,
      municipality,
      barangay,
      street_name,
      house_number
    } = req.body;

    console.log('🔄 Updating user profile:', userId, req.body);

    //  validations 
    if (!username || !first_name || !last_name || !email || !contact_number) {
      return res.status(400).json({ error: 'Required fields missing' });
    }
    if (contact_number.length !== 11) {
      return res.status(400).json({ error: 'Phone number must be 11 digits' });
    }
    if (!municipality || !barangay || !street_name || !house_number) {
      return res.status(400).json({ error: 'All address fields are required' });
    }

  
    db.query('SELECT user_id FROM TBL_Users WHERE username=? AND user_id<>?', [username, userId], (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results.length) return res.status(400).json({ error: 'Username already exists' });


      let query = `UPDATE TBL_Users SET 
        username=?, first_name=?, last_name=?, email=?, contact_number=?,
        province=?, municipality=?, barangay=?, street_name=?, house_number=?`;
      
      const params = [
        username, first_name, last_name, email, contact_number,
        province || 'Bulacan', municipality, barangay, street_name, house_number
      ];

      
      if (password && password.length >= 6) {
        query += ', password=?'; 
        params.push(password);
      }

      query += ' WHERE user_id=?';
      params.push(userId);

      console.log('📝 Executing update query:', query, params);

      db.query(query, params, (err2) => {
        if (err2) {
          console.error('❌ Database update error:', err2);
          return res.status(500).json({ error: err2.message });
        }


        db.query('SELECT user_id, username, first_name, last_name, email, contact_number, province, municipality, barangay, street_name, house_number, profile_picture_url FROM TBL_Users WHERE user_id=?', [userId], (err3, updated) => {
          if (err3) {
            console.error('❌ Database fetch error:', err3);
            return res.status(500).json({ error: err3.message });
          }
          console.log('✅ User updated successfully:', updated[0]);
          res.json(updated[0]);
        });
      });
    });
  });

router.get('/statistics/:userId', (req, res) => {
  const { userId } = req.params;
  console.log('📊 Fetching statistics for user:', userId);
  
  const query = `
    SELECT 
      COUNT(*) as total_orders,
      COALESCE(SUM(CASE WHEN order_status = 'Completed' THEN total_amount ELSE 0 END), 0) as total_spent,
      COUNT(CASE WHEN order_status = 'Completed' THEN 1 ELSE NULL END) as completed_orders
    FROM TBL_Orders 
    WHERE customer_account_id = ? 
    AND order_status IN ('Completed', 'Delivered', 'Approved', 'Packed', 'Out for Delivery', 'Pending')
  `;
  
  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('❌ Database error fetching statistics:', err);
      return res.status(500).json({ error: err.message });
    }
    
    if (!results || results.length === 0) {
      console.log('📊 No orders found for user:', userId);
      return res.json({
        total_orders: 0,
        total_spent: 0,
        completed_orders: 0
      });
    }
    
    const stats = results[0];
    console.log('✅ Raw statistics from DB:', stats);
    
   
    const responseData = {
      total_orders: parseInt(stats.total_orders) || 0,
      total_spent: parseFloat(stats.total_spent) || 0,
      completed_orders: parseInt(stats.completed_orders) || 0
    };
    
    console.log('📈 Processed statistics:', responseData);
    res.json(responseData);
  });
});

 
  router.post('/avatar/:userId', upload.single('avatar'), (req, res) => {
    const { userId } = req.params;
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    console.log('🖼️ Uploading avatar for user:', userId);

 
    db.query('SELECT profile_picture_url FROM TBL_Users WHERE user_id=?', [userId], (err, results) => {
      if (err) return res.status(500).json({ error: err.message });

      const prevAvatar = results[0]?.profile_picture_url;
      if (prevAvatar && prevAvatar !== `/uploads/${req.file.filename}`) {
     
        const prevPath = path.join(__dirname, '../../../', prevAvatar);
        if (fs.existsSync(prevPath)) {
          fs.unlinkSync(prevPath);
          console.log('🗑️ Deleted previous avatar:', prevPath);
        }
      }

    
      const dbPath = `/uploads/${req.file.filename}`;
      db.query('UPDATE TBL_Users SET profile_picture_url=? WHERE user_id=?', [dbPath, userId], (err2) => {
        if (err2) return res.status(500).json({ error: err2.message });
        console.log('✅ Avatar updated to:', dbPath);
        res.json({ avatar: dbPath });
      });
    });
  });

  return router;
};