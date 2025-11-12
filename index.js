const express = require('express');
const path = require('path');
const mysql = require('mysql2');
const session = require('express-session');
const bcrypt = require('bcrypt');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

const db = mysql.createPool({
  host: process.env.DB_HOST || 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
  user: process.env.DB_USER || '3a7DPdDCMdfQWY3.root',
  password: process.env.DB_PASSWORD || 'ao2rp0YULXi6UAi8',
  database: process.env.DB_NAME || 'DoughMain_Database',
  port: process.env.DB_PORT || 4000,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: {
    rejectUnauthorized: true,
    ca: fs.readFileSync(process.env.DB_SSL_CA || '/etc/ssl/certs/ca-certificates.crt')
  },
  queryFormat: (query, values) => {
    return mysql.format(query, values);
  }
});

db.getConnection((err, connection) => {
  if (err) {
    console.error('MySQL connection error:', err);
  } else {
    console.log('Connected to MySQL database DoughMain_Database');
    connection.release();
  }
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: 'sasi-secret-change-this',
  resave: false,
  saveUninitialized: false
}));

app.use(express.static(path.join(__dirname)));
app.use('/assets/productimages', express.static(path.join(__dirname, 'assets', 'productimages')));
app.use('/design', express.static(path.join(__dirname, 'design')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/routes', express.static(path.join(__dirname, 'routes')));
app.use((req, res, next) => {
  const publicPaths = [
    '/', 
    '/login', 
     '/api/register',
    '/__ping', 
    '/__routes', 
    '/api/user/session',
    '/test-css'
  ];
  
  // Allow access to all static file requests
  if (publicPaths.includes(req.path) || 
      req.path.startsWith('/uploads') || 
      req.path.startsWith('/design') || 
      req.path.startsWith('/assets') ||
      req.path.startsWith('/routes') ||
      /\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/.test(req.path)) {
    return next();
  }
  
  if (!req.session || !req.session.user) {
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(401).json({ error: 'Unauthorized - Please login first' });
    }
    return res.redirect('/login');
  }
  
  next();
});


app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'views', 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'views', 'login.html')));
app.get('/api/user/session', (req, res) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ message: 'Not logged in' });
  }
  res.json({ user: req.session.user });
});


app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.redirect('/login?error=1');

  const sql = 'SELECT user_id, first_name, last_name, role, password, account_status FROM TBL_Users WHERE username = ? LIMIT 1';
  db.query(sql, [username], (err, results) => {
    if (err) {
      console.error('Login DB error:', err);
      return res.status(500).send('Database error');
    }
    if (!results || results.length === 0) return res.redirect('/login?error=1');

    const user = results[0];
    
    if (user.password !== password) return res.redirect('/login?error=1');
    
    if (user.account_status !== 'Active' && user.account_status !== 'Verified') {
      console.log(`❌ Login blocked - User ${username} has status: ${user.account_status}`);
      
      // Redirect with specific error codes
      if (user.account_status === 'Pending') {
        return res.redirect('/login?error=pending');
      } else if (user.account_status === 'Suspended') {
        return res.redirect('/login?error=suspended');
      } else if (user.account_status === 'Rejected') {
        return res.redirect('/login?error=rejected');
      } else if (user.account_status === 'Inactive') {
        return res.redirect('/login?error=inactive');
      } else {
        return res.redirect('/login?error=disabled');
      }
    }

    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
    
    req.session.user_id = user.user_id;
    req.session.user = { 
      id: user.user_id, 
      name: fullName,
      role: user.role 
    };

    console.log("✅ Login successful - Session user_id:", req.session.user_id);

    if (user.role === 'Admin') return res.redirect('/admin');
    if (user.role === 'Cashier') return res.redirect('/cashier');
    if (user.role === 'Reseller') return res.redirect('/reseller');
    return res.redirect('/');
  });
});

function requireRole(role) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) return res.redirect('/login');
    if (role && req.session.user.role !== role) return res.status(403).send('Forbidden');
    next();
  };
}
app.get('/cashier', requireRole('Cashier'), (req, res) => res.sendFile(path.join(__dirname, 'views', 'cashier.html')));
app.get('/admin', requireRole('Admin'), (req, res) => res.sendFile(path.join(__dirname, 'views', 'admin.html')));
app.get('/reseller', requireRole('Reseller'), (req, res) => res.sendFile(path.join(__dirname, 'views', 'reseller.html')));
app.get('/logout', (req, res) => req.session.destroy(() => res.redirect('/')));

try {
  const registerAPI = require('./routes/express/registerAPI');
  app.use('/api/register', registerAPI(db));
  console.log('✅ Mounted registration API');
} catch (err) {
  console.error('❌ Failed to mount registration API:', err);
}
try {
  const productsAPI = require('./routes/express/cashierJS/productsAPI');
  app.use('/api/cashier/products', productsAPI(db));
  console.log('Mounted cashier products API');
} catch (err) {
  console.error('Failed to mount cashier products API:', err);
}

try {
  const pendingPaymentsAPI = require('./routes/express/cashierJS/pendingPaymentsAPI');
  app.use('/api/cashier/pending-payments', pendingPaymentsAPI(db));
  console.log('✅ Mounted cashier pending payments API');
} catch (err) {
  console.error('❌ Failed to mount cashier pending payments API:', err);
}

try {
  const ordersAPI = require('./routes/express/cashierJS/ordersAPI');
  app.use('/api/cashier/orders', ordersAPI(db)); 
  console.log('Mounted cashier orders API');
} catch (err) {
  console.error('Failed to mount cashier orders API:', err);
}

// User API
try {
  const userAPI = require('./routes/express/userAPI');
  app.use('/api/user', userAPI(db));
  console.log('Mounted user API');
} catch (err) {
  console.error('Failed to mount user API:', err);
}

// Reseller APIs
try {
  const resellerOrderAPI = require('./routes/express/resellerJS/resellerOrderAPI')(db);
  app.use('/api/reseller/orders', resellerOrderAPI);
  console.log('✅ Mounted reseller orders API');
} catch (err) {
  console.error('❌ Failed to mount reseller orders API:', err);
}

try {
  const resellerOrdersHistoryAPI = require('./routes/express/resellerJS/orderHistoryAPI')(db);
 app.use('/api/reseller/orders', resellerOrdersHistoryAPI);
  console.log('✅ Mounted reseller order history API');
} catch (err) {
  console.error('❌ Failed to mount reseller order history API:', err);
}

try {
  const usersAPI = require('./routes/express/adminJS/usersAPI');
  app.use('/api/admin/users', requireRole('Admin'), usersAPI(db));
  console.log('✅ Mounted admin users API');
} catch (err) {
  console.error('❌ Failed to mount admin users API:', err);
}
try {
  const resellerDetailsAPI = require('./routes/express/resellerJS/resellerDetailsAPI');
  app.use('/api/reseller/details', resellerDetailsAPI(db));
  console.log('✅ Mounted reseller details API');
} catch (err) {
  console.error('❌ Failed to mount reseller details API:', err);
}

try {
  console.log('🔄 Attempting to load profile API...');
  const profileAPI = require('./routes/express/adminJS/profileAPI');
  console.log('✅ Profile API loaded successfully');
  
  // Mount with proper path - note this will make routes available at /api/admin/profile/:id
  const profileRouter = profileAPI(db);
  app.use('/api/admin', requireRole('Admin'), profileRouter);
  console.log('✅ Mounted admin profile API at /api/admin');
  
    app.get('/api/admin/test-profile', requireRole('Admin'), (req, res) => {
    res.json({ message: 'Profile API is working!', timestamp: new Date() });
  });
  
} catch (err) {
  console.error('❌ Failed to mount admin profile API:', err);
  console.error('Stack trace:', err.stack);
}

try {
  const resellerProductsRoute = require('./routes/express/resellerJS/productsAPI')(db);
  app.use('/api/reseller/products', resellerProductsRoute);
  console.log('✅ Mounted reseller products API');
} catch (err) {
  console.error('❌ Failed to mount reseller products API:', err);
}

try {
  const returnsAPI = require('./routes/express/cashierJS/returnsAPI');
  app.use('/api/cashier/returns', returnsAPI(db));
  console.log('✅ Mounted cashier returns API');
} catch (err) {
  console.error('❌ Failed to mount cashier returns API:', err);
}
try {
  const inventoryAPI = require('./routes/express/adminJS/inventoryAPI');
  app.use('/api/admin/inventory', requireRole('Admin'), inventoryAPI(db));
  console.log('✅ Mounted admin inventory API');
} catch (err) {
  console.error('❌ Failed to mount admin inventory API:', err);
}

try {
  const dashboardAPI = require('./routes/express/adminJS/dashboardAPI');
  app.use('/api/admin/dashboard', requireRole('Admin'), dashboardAPI(db));
  console.log('✅ Mounted admin dashboard API');
} catch (err) {
  console.error('❌ Failed to mount admin dashboard API:', err);
}
try {
  console.log('🔄 Loading delivery API...');
  const deliveryAPI = require('./routes/express/adminJS/deliveryAPI');
  app.use('/api/admin/delivery', requireRole('Admin'), deliveryAPI(db));
  console.log('✅ Mounted delivery API at /api/admin/delivery');
  
    app.get('/api/admin/delivery/test', requireRole('Admin'), (req, res) => {
    res.json({ message: 'Delivery API is working!', timestamp: new Date() });
  });
} catch (err) {
  console.error('❌ Failed to mount delivery API:', err);
  console.error('Error details:', err.message);
}
try {
  const adminOrdersAPI = require('./routes/express/adminJS/ordersAPI');
  app.use('/api/admin/orders', requireRole('Admin'), adminOrdersAPI(db));
  console.log('✅ Mounted admin orders API');
  
    app.get('/api/admin/orders/test-simple', requireRole('Admin'), (req, res) => {
    res.json({ message: 'Orders API is working!', timestamp: new Date() });
  });
} catch (err) {
  console.error('❌ Failed to mount admin orders API:', err);
  console.error('Stack trace:', err.stack);
}
try {
  const reportsAPI = require('./routes/express/adminJS/reportsAPI');
  app.use('/api/admin/reports', requireRole('Admin'), reportsAPI(db));
  console.log('✅ Mounted admin reports API at /api/admin/reports');
} catch (err) {
  console.error('❌ Failed to mount admin reports API:', err);
  console.error('Stack trace:', err.stack);
}

try {
  const returnsAPI = require('./routes/express/adminJS/returnsAPI');
  app.use('/api/admin/returns', requireRole('Admin'), returnsAPI(db));
  console.log('✅ Mounted admin returns API at /api/admin/returns');
  
  app.get('/api/admin/returns/test', requireRole('Admin'), (req, res) => {
    res.json({ message: 'Returns API is working!', timestamp: new Date() });
  });
} catch (err) {
  console.error('❌ Failed to mount admin returns API:', err);
  console.error('Error details:', err.message);
}


app.get('/test-returns', requireRole('Admin'), async (req, res) => {
    try {
        console.log('🧪 Testing returns API...');
        db.query("SHOW TABLES LIKE 'TBL_Returns'", (error, tables) => {
            if (error) {
                console.error('❌ Database error:', error);
                return res.status(500).json({ error: 'Database error: ' + error.message });
            }
            
            console.log('📊 TBL_Returns table exists:', tables.length > 0);
            
            if (tables.length > 0) {
                // Check returns count
                db.query('SELECT COUNT(*) as count FROM TBL_Returns', (error, returns) => {
                    if (error) {
                        console.error('❌ Database error:', error);
                        return res.status(500).json({ error: 'Database error: ' + error.message });
                    }
                    
                    console.log('📊 Returns count:', returns[0].count);
                    
                    // Get sample data
                    db.query(`
                        SELECT r.return_id, o.order_number, p.name as product_name 
                        FROM TBL_Returns r
                        LEFT JOIN TBL_Orders o ON r.order_id = o.order_id
                        LEFT JOIN TBL_Products p ON r.product_id = p.product_id
                        LIMIT 5
                    `, (error, sampleData) => {
                        if (error) {
                            console.error('❌ Database error:', error);
                            return res.status(500).json({ error: 'Database error: ' + error.message });
                        }
                        
                        console.log('📊 Sample returns data:', sampleData);
                        
                        res.json({ 
                            tableExists: tables.length > 0,
                            returnsCount: tables.length > 0 ? returns[0].count : 0,
                            sampleData: tables.length > 0 ? sampleData : []
                        });
                    });
                });
            } else {
                res.json({ 
                    tableExists: false,
                    returnsCount: 0,
                    sampleData: []
                });
            }
        });
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/__ping', (req, res) => res.json({ ok: true, uptime: process.uptime() }));
app.get('/__routes', (req, res) => {
  try {
    const routes = app._router.stack
      .filter(r => r.route)
      .map(r => ({ path: r.route.path, methods: r.route.methods }));
    res.json(routes);
  } catch (e) {
    res.status(500).json({ error: 'cannot list routes' });
  }
});

app.get('/test-css', (req, res) => {
  res.sendFile(path.join(__dirname, 'design', 'landing.css'));
});

app.get('/test-assets', (req, res) => {
  res.json({
    landingCSS: require('fs').existsSync(path.join(__dirname, 'design', 'landing.css')),
    loginCSS: require('fs').existsSync(path.join(__dirname, 'design', 'login.css')),
    monayImage: require('fs').existsSync(path.join(__dirname, 'assets', 'landingpage', 'monayBuns2.png'))
  });
});

app.get('/debug-routes', (req, res) => {
  const routes = [];
  
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods)
      });
    } else if (middleware.name === 'router') {
  
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          routes.push({
            path: handler.route.path,
            methods: Object.keys(handler.route.methods),
            source: 'router'
          });
        }
      });
    }
  });
  
  res.json(routes);
});

app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
