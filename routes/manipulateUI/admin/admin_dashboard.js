//routes/manipulateUI/admin/admin_dashboard.js
window.loadDashboard = async function() {
  console.log('🔄 Loading dashboard data from database...');
  await loadDashboardStats();
  await loadRecentOrders();
};

async function loadDashboardStats() {
  try {
    console.log('📊 Fetching dashboard statistics...');
    const response = await fetch('/api/admin/dashboard/stats');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('✅ Dashboard stats received:', data);
    updateDashboardCards(data);
    
  } catch (error) {
    console.error('❌ Error fetching dashboard stats:', error);
    updateDashboardCards({
      active_resellers: 0,
      total_sales: 0,
      low_stock_items: 0,
      pending_orders: 0
    });
  }
}

function updateDashboardCards(stats) {
  console.log('🎯 Updating dashboard cards with:', stats);
  
  const elements = {
    activeResellers: document.getElementById('activeResellers'),
    totalSales: document.getElementById('totalSales'),
    lowStock: document.getElementById('lowStock'),
    pendingOrders: document.getElementById('pendingOrders')
  };

  if (elements.activeResellers) {
    elements.activeResellers.textContent = stats.active_resellers || 0;
  }
  if (elements.totalSales) {
    elements.totalSales.textContent = `₱${(stats.total_sales || 0).toLocaleString()}`;
  }
  if (elements.lowStock) {
    elements.lowStock.textContent = stats.low_stock_items || 0;
  }
  if (elements.pendingOrders) {
    elements.pendingOrders.textContent = stats.pending_orders || 0;
  }
}

async function loadRecentOrders() {
  try {
    console.log('📦 Fetching recent orders...');
    const response = await fetch('/api/admin/dashboard/recent-orders');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const orders = await response.json();
    console.log('✅ ALL ORDERS DATA:', orders);
    
    orders.forEach((order, index) => {
      console.log(`📅 Order ${index + 1}:`, {
        order_number: order.order_number,
        order_date: order.order_date,
        formatted: formatDashboardDate(order.order_date)
      });
    });
    
    updateRecentOrdersTable(orders);
    
  } catch (error) {
    console.error('❌ Error fetching recent orders:', error);
    const tableBody = document.getElementById('recentOrdersTableBody');
    if (tableBody) {
      tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color: red;">Error loading orders</td></tr>';
    }
  }
}

function updateRecentOrdersTable(orders) {
  const tableBody = document.getElementById('recentOrdersTableBody');
  
  if (!tableBody) {
    console.error('❌ Recent orders table body not found');
    return;
  }
  
  if (!orders || orders.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No recent orders</td></tr>';
    return;
  }
  
  let html = '';
  orders.forEach(order => {
    html += `
      <tr>
        <td>${order.order_number || 'N/A'}</td>
        <td>${order.customer_name || 'N/A'}</td>
        <td>₱${(order.total_amount || 0).toLocaleString()}</td>
        <td><span class="status-badge status-${getStatusClass(order.order_status)}">${order.order_status || 'N/A'}</span></td>
        <td>${formatDashboardDate(order.order_date)}</td>
      </tr>
    `;
  });
  
  tableBody.innerHTML = html;
}

function getStatusClass(status) {
  if (!status) return 'pending';
  
  const statusMap = {
    'Pending': 'pending',
    'Completed': 'completed',
    'Processing': 'processing',
    'Cancelled': 'cancelled',
    'Shipped': 'shipped'
  };
  
  return statusMap[status] || 'pending';
}

function formatDashboardDate(dateString) {
  if (!dateString) return 'N/A';
  
  try {
    const datePart = dateString.substring(0, 10);
    return datePart;
  } catch (error) {
    return 'Invalid Date';
  }
}