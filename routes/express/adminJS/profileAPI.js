// routes/express/adminJS/profileAPI.js
const express = require("express");
const multer = require("multer");
const path = require("path");

module.exports = function (db) {
  const router = express.Router();

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.join(__dirname, "../../../uploads");
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const uniqueName = `admin_${Date.now()}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    }
  });

  const upload = multer({ storage });

  router.get("/profile/:id", (req, res) => {
    const adminId = req.params.id;

    const sql = `
      SELECT 
        user_id, first_name, last_name, username, role, email, 
        contact_number, profile_picture_url as profile_image,
        province, municipality, barangay, street_name, house_number
      FROM TBL_Users 
      WHERE user_id = ? AND role = 'Admin'
      LIMIT 1
    `;

    console.log('🔍 Fetching profile with SQL:', sql);
    console.log('🔍 With admin ID:', adminId);

    db.query(sql, [adminId], (err, result) => {
      if (err) {
        console.error('❌ Database error:', err);
        return res.status(500).json({ error: "Database error" });
      }

      console.log('📊 Query result:', result);

      if (result.length === 0) {
        console.log('❌ Admin not found with ID:', adminId);
        return res.status(404).json({ error: "Admin not found" });
      }

      console.log('✅ Admin found with data:', result[0]);
      res.json(result[0]);
    });
  });

  router.get("/check-username", (req, res) => {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }

    const sql = "SELECT user_id FROM TBL_Users WHERE username = ? AND role = 'Admin'";

    db.query(sql, [username], (err, result) => {
      if (err) {
        console.error('❌ Database error:', err);
        return res.status(500).json({ error: "Database error" });
      }

      res.json({ available: result.length === 0 });
    });
  });

  router.post("/logout", (req, res) => {
    try {
      console.log('🚪 Admin logout requested');

      res.json({
        success: true,
        message: "Logout successful"
      });

    } catch (error) {
      console.error('❌ Logout error:', error);
      res.status(500).json({ error: "Logout failed" });
    }
  });

  router.put("/profile/:id", upload.single("profile_image"), (req, res) => {
    const adminId = req.params.id;
    const {
      first_name, last_name, username, email, contact_number,
      municipality, barangay, street_name, house_number
    } = req.body;

    console.log('📝 Update data received:', req.body);
    console.log('📸 File:', req.file);

    let profileImage = req.file ? `/uploads/${req.file.filename}` : null;

    let sql;
    let params;

    if (profileImage) {
      sql = `
        UPDATE TBL_Users 
        SET first_name = ?, last_name = ?, username = ?, email = ?, contact_number = ?,
            municipality = ?, barangay = ?, street_name = ?, house_number = ?,
            profile_picture_url = ?
        WHERE user_id = ? AND role = 'Admin'
      `;
      params = [first_name, last_name, username, email, contact_number,
                municipality, barangay, street_name, house_number,
                profileImage, adminId];
    } else {
      sql = `
        UPDATE TBL_Users 
        SET first_name = ?, last_name = ?, username = ?, email = ?, contact_number = ?,
            municipality = ?, barangay = ?, street_name = ?, house_number = ?
        WHERE user_id = ? AND role = 'Admin'
      `;
      params = [first_name, last_name, username, email, contact_number,
                municipality, barangay, street_name, house_number, adminId];
    }

    console.log('📊 UPDATE SQL:', sql);
    console.log('📊 UPDATE Parameters:', params);

    db.query(sql, params, (err) => {
      if (err) {
        console.error('❌ Update error:', err);
        return res.status(500).json({ error: "Update failed" });
      }

      console.log('✅ Profile updated successfully');
      res.json({ success: true, message: "Profile updated successfully" });
    });
  });

  return router;
};