// routes/express/adminJS/usersAPI.js
const express = require('express');

function usersAPI(db) {
  const router = express.Router();

  router.get('/', async (req, res) => {
    try {
      const [users] = await db.promise().execute(`
        SELECT user_id, first_name, last_name, role, account_status, 
               username, email, contact_number, province, municipality, 
               barangay, street_name, house_number, created_at 
        FROM TBL_Users 
        WHERE account_status != 'Pending'
        ORDER BY user_id DESC
      `);
      res.json(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  router.get('/pending', async (req, res) => {
    try {
      const [users] = await db.promise().execute(`
        SELECT user_id, first_name, last_name, role, account_status, 
               username, email, contact_number, province, municipality, 
               barangay, street_name, house_number, created_at 
        FROM TBL_Users 
        WHERE account_status = 'Pending'
        ORDER BY created_at DESC
      `);
      res.json(users);
    } catch (error) {
      console.error('Error fetching pending users:', error);
      res.status(500).json({ error: 'Failed to fetch pending users' });
    }
  });

  router.get('/:id', async (req, res) => {
    try {
      const [users] = await db.promise().execute(`
        SELECT user_id, first_name, last_name, role, account_status, 
               username, email, contact_number, province, municipality, 
               barangay, street_name, house_number, created_at 
        FROM TBL_Users 
        WHERE user_id = ?
      `, [req.params.id]);
      
      if (users.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json(users[0]);
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  });

  router.put('/:id/status', async (req, res) => {
    try {
      const { status } = req.body;
      await db.promise().execute(
        'UPDATE TBL_Users SET account_status = ? WHERE user_id = ?',
        [status, req.params.id]
      );
      res.json({ message: 'User status updated successfully' });
    } catch (error) {
      console.error('Error updating user status:', error);
      res.status(500).json({ error: 'Failed to update user status' });
    }
  });

  router.put('/:id', async (req, res) => {
    try {
      const {
        first_name, last_name, username, email, contact_number,
        role, account_status, province, municipality, barangay,
        street_name, house_number
      } = req.body;
      
      await db.promise().execute(
        `UPDATE TBL_Users SET 
          first_name = ?, last_name = ?, username = ?, email = ?,
          contact_number = ?, role = ?, account_status = ?, province = ?,
          municipality = ?, barangay = ?, street_name = ?, house_number = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?`,
        [
          first_name, last_name, username, email, contact_number,
          role, account_status, province, municipality, barangay,
          street_name, house_number, req.params.id
        ]
      );
      
      res.json({ message: 'User updated successfully' });
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ error: 'Failed to update user' });
    }
  });

  router.delete('/:id', async (req, res) => {
    try {
      await db.promise().execute('DELETE FROM TBL_Users WHERE user_id = ?', [req.params.id]);
      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ error: 'Failed to delete user' });
    }
  });

  router.post('/', async (req, res) => {
    try {
      const {
            first_name, last_name, username, password, email, contact_number,
            role, account_status, province, municipality, barangay, street_name, house_number
        } = req.body;
        
        console.log('📥 Received user data:', req.body);
        
      const hashedPassword = password;
      const finalAccountStatus = account_status || 'Active';
        
        const [result] = await db.promise().execute(
            `INSERT INTO TBL_Users 
            (first_name, last_name, username, password, email, contact_number,
             role, account_status, province, municipality, barangay, street_name, house_number)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                first_name, last_name, username, hashedPassword, email, contact_number,
                role, finalAccountStatus, province, municipality, barangay, street_name, house_number
            ]
        );
        
        console.log('✅ User created successfully with ID:', result.insertId);
        res.json({ 
            success: true,
            message: 'User created successfully',
            user_id: result.insertId 
        });
        
    } catch (error) {
        console.error('❌ Error creating user:', error);
        
        // Handle specific MySQL errors
        if (error.code === 'ER_DUP_ENTRY') {
            if (error.sqlMessage.includes('username')) {
                return res.status(400).json({ error: 'Username already exists' });
            }
            if (error.sqlMessage.includes('email')) {
                return res.status(400).json({ error: 'Email already exists' });
            }
        }
        
        res.status(500).json({ error: 'Failed to create user: ' + error.message });
    }
});

  router.post('/approve-all-pending', async (req, res) => {
    try {
      await db.promise().execute(
        "UPDATE TBL_Users SET account_status = 'Active' WHERE account_status = 'Pending'"
      );
      res.json({ message: 'All pending users approved successfully' });
    } catch (error) {
      console.error('Error approving all pending users:', error);
      res.status(500).json({ error: 'Failed to approve all pending users' });
    }
  });

  return router;
}

module.exports = usersAPI;