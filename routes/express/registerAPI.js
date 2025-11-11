module.exports = (db) => {
  const express = require('express');
  const router = express.Router();

  function capitalizeWords(str) {
    return str.replace(/\w\S*/g, function(txt) {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
  }

  router.post('/', (req, res) => {
    const {
      firstName, lastName, contact, province, municipality,
      barangay, streetName, houseNumber, username, password
    } = req.body;

    console.log('Registration attempt for username:', username);
    console.log('Received province:', province, 'municipality:', municipality);

    const checkUserSql = 'SELECT user_id FROM TBL_Users WHERE username = ?';
    db.query(checkUserSql, [username], (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      if (results.length > 0) {
        return res.status(400).json({ error: 'Username already exists' });
      }

      const capitalizedProvince = capitalizeWords(province);
      const capitalizedMunicipality = capitalizeWords(municipality);

      console.log('Final province:', capitalizedProvince, 'municipality:', capitalizedMunicipality);

      const insertUserSql = `
        INSERT INTO TBL_Users 
        (first_name, last_name, username, password, role, account_status, 
         contact_number, province, municipality, barangay, street_name, house_number) 
        VALUES (?, ?, ?, ?, 'Reseller', 'Pending', ?, ?, ?, ?, ?, ?)
      `;

      db.query(insertUserSql, [
        firstName, lastName, username, password, 
        contact, capitalizedProvince, capitalizedMunicipality, barangay, streetName, houseNumber
      ], (err, result) => {
        if (err) {
          console.error('Error creating user:', err);
          return res.status(500).json({ error: 'Failed to create user account' });
        }

        console.log('New reseller registered:', result.insertId);
        res.json({ 
          success: true, 
          message: 'Registration successful! Please wait for admin approval.' 
        });
      });
    });
  });

  return router;
};