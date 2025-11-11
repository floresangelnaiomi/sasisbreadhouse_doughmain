// routes/express/userAPI.js
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

module.exports = (db) => {
  const router = express.Router();

  const uploadDir = path.join(__dirname, "../../uploads");
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  const storage = multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const filename = `profile_${Date.now()}${ext}`;
      cb(null, filename);
    },
  });
  const upload = multer({ storage });

  function requireCashier(req, res, next) {
    if (!req.session?.user || req.session.user.role !== "Cashier") {
      return res.status(401).json({ message: "Not authorized" });
    }
    next();
  }

  router.get("/me", requireCashier, (req, res) => {
    const cashierId = req.session.user.id;
    const sql = `
      SELECT user_id, username, first_name, last_name, profile_picture_url 
      FROM TBL_Users 
      WHERE user_id = ?`;
    db.query(sql, [cashierId], (err, results) => {
      if (err) {
        console.error("DB error fetching profile:", err);
        return res.status(500).json({ message: "DB error" });
      }
      if (!results.length) return res.status(404).json({ message: "User not found" });
      
      const user = results[0];
      user.name = `${user.first_name || ''} ${user.last_name || ''}`.trim();
      
      console.log("Fetched user profile:", user);
      res.json(user);
    });
  });

  router.post("/updateProfile", requireCashier, upload.single("profileImage"), (req, res) => {
    const cashierId = req.session.user.id;
    const newUsername = req.body.username?.trim();
    const file = req.file;

    console.log("Update profile request:", { cashierId, newUsername, file: file ? file.filename : 'none' });

    if (newUsername && newUsername !== "") {
      const checkSql = "SELECT user_id FROM TBL_Users WHERE username = ? AND user_id != ?";
      db.query(checkSql, [newUsername, cashierId], (err, results) => {
        if (err) {
          console.error("DB error checking username:", err);
          return res.status(500).json({ message: "DB error" });
        }
        if (results.length > 0) {
          return res.status(400).json({ message: "Username already taken" });
        }
        completeUpdate();
      });
    } else {
      completeUpdate();
    }

    function completeUpdate() {
      let updates = [];
      let params = [];

      if (newUsername && newUsername !== "") {
        updates.push("username = ?");
        params.push(newUsername);
      }

      if (file) {
        const profilePath = `uploads/${file.filename}`;
        updates.push("profile_picture_url = ?");
        params.push(profilePath);
      }

      if (updates.length === 0) {
        return res.status(400).json({ message: "No changes provided" });
      }

      params.push(cashierId);
      const sql = `UPDATE TBL_Users SET ${updates.join(", ")} WHERE user_id = ?`;

      db.query(sql, params, (err, results) => {
        if (err) {
          console.error("DB error updating profile:", err);
          return res.status(500).json({ message: "DB update failed" });
        }

        console.log("Profile updated successfully");
        res.json({ 
          status: "success", 
          message: "Profile updated successfully"
        });
      });
    }
  });

  router.post("/resetProfile", requireCashier, (req, res) => {
    const cashierId = req.session.user.id;

    console.log("Resetting profile for user:", cashierId);

    const selectSql = "SELECT profile_picture_url FROM TBL_Users WHERE user_id = ?";
    db.query(selectSql, [cashierId], (err, results) => {
      if (err) {
        console.error("DB error fetching profile for reset:", err);
        return res.status(500).json({ message: "DB error" });
      }

      const oldProfilePath = results[0]?.profile_picture_url;
      if (oldProfilePath) {
        const absolutePath = path.join(__dirname, "../../", oldProfilePath);
        fs.unlink(absolutePath, (unlinkErr) => {
          if (unlinkErr && unlinkErr.code !== "ENOENT") {
            console.warn("Failed to delete old profile picture:", unlinkErr);
          }
        });
      }

      const updateSql = "UPDATE TBL_Users SET username = NULL, profile_picture_url = NULL WHERE user_id = ?";
      db.query(updateSql, [cashierId], (updateErr, results) => {
        if (updateErr) {
          console.error("DB error resetting profile:", updateErr);
          return res.status(500).json({ message: "DB update failed" });
        }

        console.log("Profile reset successfully");
        res.json({ 
          status: "success", 
          message: "Profile reset successfully" 
        });
      });
    });
  });

  return router;
};