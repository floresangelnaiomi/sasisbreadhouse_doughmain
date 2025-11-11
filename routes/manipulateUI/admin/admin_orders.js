//routes/manipulateUI/admin/admin_orders.js
let allOrders = [];
let filteredOrders = [];
let currentFilters = {
    status: '',
    paymentStatus: '',
    orderType: '',
    dateRange: '',
    dateFrom: '',
    dateTo: '',
    search: ''
};

function initializeOrderHistory() {
    loadOrders();
    setupOrderEventListeners();
    updateActiveFiltersDisplay();
}

async function openScheduleDeliveryModal() {
    try {
        const response = await fetch('/api/admin/delivery/packed-orders/packed');
        if (!response.ok) throw new Error('Failed to fetch packed orders');
        
        const packedOrders = await response.json();
        
        const modal = document.getElementById('scheduleDeliveryModal');
        const orderSelect = document.getElementById('deliveryOrder');
        
        if (!modal || !orderSelect) {
            console.error('Modal or order select element not found');
            return;
        }
        
        orderSelect.innerHTML = '<option value="">Select Packed Order</option>';
        
        packedOrders.forEach(order => {
            const option = document.createElement('option');
            option.value = order.order_id;
            option.textContent = `${order.order_number} - ${order.first_name ? `${order.first_name} ${order.last_name}` : 'Walk-in Customer'} - ₱${parseFloat(order.total_amount).toFixed(2)}`;
            orderSelect.appendChild(option);
        });
        
        document.getElementById('scheduleDeliveryForm').reset();
        document.getElementById('deliveryCustomerInfo').textContent = '-';
        document.getElementById('deliveryContactInfo').textContent = '-';
        document.getElementById('deliveryAddressInfo').textContent = '-';
        document.getElementById('deliveryAmountInfo').textContent = '₱0.00';
        document.getElementById('deliveryPaymentInfo').textContent = '-';
        
        modal.style.display = 'block';
        
    } catch (error) {
        console.error('Error opening schedule delivery modal:', error);
        showNotification('Error loading packed orders', 'error');
    }
}

function closeScheduleDeliveryModal() {
    const modal = document.getElementById('scheduleDeliveryModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

async function loadOrderDeliveryInfo(orderId) {
    if (!orderId) return;
    
    try {
        const response = await fetch(`/api/admin/orders/${orderId}`);
        if (!response.ok) throw new Error('Failed to fetch order details');
        
        const order = await response.json();
        
        document.getElementById('deliveryCustomerInfo').textContent = 
            order.first_name ? `${order.first_name} ${order.last_name}` : 'Walk-in Customer';
        document.getElementById('deliveryContactInfo').textContent = 
            order.contact_number || 'N/A';
        document.getElementById('deliveryAddressInfo').textContent = 
            order.customer_address || 'N/A';
        document.getElementById('deliveryAmountInfo').textContent = 
            `₱${parseFloat(order.total_amount).toFixed(2)}`;
        document.getElementById('deliveryPaymentInfo').textContent = 
            order.payment_status;
        
    } catch (error) {
        console.error('Error loading order delivery info:', error);
    }
}

async function submitDeliverySchedule(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    const deliveryData = {
        order_id: formData.get('order_id'),
        driver_name: formData.get('driver_name'),
        scheduled_date: formData.get('scheduled_date'),
        recipient_name: formData.get('recipient_name'),
        recipient_contact: formData.get('recipient_contact'),
        notes: formData.get('notes')
    };
    
    if (!deliveryData.order_id || !deliveryData.driver_name || !deliveryData.scheduled_date || 
        !deliveryData.recipient_name || !deliveryData.recipient_contact) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/admin/delivery', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(deliveryData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to schedule delivery');
        }
        
        const result = await response.json();
        
        showNotification('Delivery scheduled successfully!', 'success');
        closeScheduleDeliveryModal();
        
        loadDeliveries(currentDeliveryFilters);
        if (typeof loadOrders === 'function') {
            loadOrders(currentFilters);
        }
        
    } catch (error) {
        console.error('Error scheduling delivery:', error);
        showNotification(error.message || 'Error scheduling delivery', 'error');
    }
}

window.openScheduleDeliveryModal = openScheduleDeliveryModal;
window.closeScheduleDeliveryModal = closeScheduleDeliveryModal;
window.loadOrderDeliveryInfo = loadOrderDeliveryInfo;
window.submitDeliverySchedule = submitDeliverySchedule;

function setupOrderEventListeners() {
    const filterToggle = document.getElementById('filterToggle');
    const filterModal = document.getElementById('filterModal');
    const dateRangeFilter = document.getElementById('dateRangeFilter');
    const searchInput = document.getElementById('orderSearch');
    
    if (filterToggle) {
        filterToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            filterModal.classList.toggle('active');
            filterToggle.classList.toggle('active');
        });
    }
    
    document.addEventListener('click', (e) => {
        if (filterModal && !filterModal.contains(e.target) && e.target !== filterToggle) {
            filterModal.classList.remove('active');
            if (filterToggle) filterToggle.classList.remove('active');
        }
    });
    
    if (dateRangeFilter) {
        dateRangeFilter.addEventListener('change', function() {
            const customRange = document.getElementById('customDateRange');
            if (customRange) {
                customRange.style.display = this.value === 'custom' ? 'block' : 'none';
            }
        });
    }
    
    if (searchInput) {
        searchInput.addEventListener('input', debounce(applyFilters, 300));
    }
}

function applyFilters() {
    const status = document.getElementById('orderStatusFilter')?.value || '';
    const paymentStatus = document.getElementById('paymentStatusFilter')?.value || '';
    const orderType = document.getElementById('orderTypeFilter')?.value || '';
    const dateRange = document.getElementById('dateRangeFilter')?.value || '';
    const dateFrom = document.getElementById('dateFromFilter')?.value || '';
    const dateTo = document.getElementById('dateToFilter')?.value || '';
    const search = document.getElementById('orderSearch')?.value.toLowerCase() || '';
    
    currentFilters = {
        status,
        paymentStatus,
        orderType,
        dateRange,
        dateFrom,
        dateTo,
        search
    };
    
    const filterModal = document.getElementById('filterModal');
    const filterToggle = document.getElementById('filterToggle');
    if (filterModal) filterModal.classList.remove('active');
    if (filterToggle) filterToggle.classList.remove('active');
    
    loadOrders(currentFilters);
    updateActiveFiltersDisplay();
}


function clearAllFilters() {
    const statusFilter = document.getElementById('orderStatusFilter');
    const paymentStatusFilter = document.getElementById('paymentStatusFilter');
    const orderTypeFilter = document.getElementById('orderTypeFilter');
    const dateRangeFilter = document.getElementById('dateRangeFilter');
    const dateFromFilter = document.getElementById('dateFromFilter');
    const dateToFilter = document.getElementById('dateToFilter');
    const searchInput = document.getElementById('orderSearch');
    const customRange = document.getElementById('customDateRange');
    
    if (statusFilter) statusFilter.value = '';
    if (paymentStatusFilter) paymentStatusFilter.value = '';
    if (orderTypeFilter) orderTypeFilter.value = '';
    if (dateRangeFilter) dateRangeFilter.value = '';
    if (dateFromFilter) dateFromFilter.value = '';
    if (dateToFilter) dateToFilter.value = '';
    if (searchInput) searchInput.value = '';
    if (customRange) customRange.style.display = 'none';
    
    currentFilters = {
        status: '',
        paymentStatus: '',
        orderType: '',
        dateRange: '',
        dateFrom: '',
        dateTo: '',
        search: ''
    };
    
    loadOrders();
    updateActiveFiltersDisplay();
}

function removeFilter(filterType) {
    switch(filterType) {
        case 'status':
            document.getElementById('orderStatusFilter').value = '';
            currentFilters.status = '';
            break;
        case 'paymentStatus':
            document.getElementById('paymentStatusFilter').value = '';
            currentFilters.paymentStatus = '';
            break;
        case 'orderType':
            document.getElementById('orderTypeFilter').value = '';
            currentFilters.orderType = '';
            break;
        case 'dateRange':
            document.getElementById('dateRangeFilter').value = '';
            document.getElementById('customDateRange').style.display = 'none';
            currentFilters.dateRange = '';
            currentFilters.dateFrom = '';
            currentFilters.dateTo = '';
            break;
        case 'search':
            document.getElementById('orderSearch').value = '';
            currentFilters.search = '';
            break;
    }
    
    applyFilters();
}

function updateActiveFiltersDisplay() {
    const activeFiltersContainer = document.getElementById('activeFilters');
    if (!activeFiltersContainer) return;
    
    const activeFilters = [];
    
    if (currentFilters.status) {
        activeFilters.push(`
            <div class="filter-badge">
                Status: ${currentFilters.status}
                <span class="remove" onclick="removeFilter('status')">×</span>
            </div>
        `);
    }
    
    if (currentFilters.paymentStatus) {
        activeFilters.push(`
            <div class="filter-badge">
                Payment: ${currentFilters.paymentStatus}
                <span class="remove" onclick="removeFilter('paymentStatus')">×</span>
            </div>
        `);
    }
    
    if (currentFilters.orderType) {
        activeFilters.push(`
            <div class="filter-badge">
                Type: ${currentFilters.orderType}
                <span class="remove" onclick="removeFilter('orderType')">×</span>
            </div>
        `);
    }
    
    if (currentFilters.dateRange && currentFilters.dateRange !== 'custom') {
        activeFilters.push(`
            <div class="filter-badge">
                Date: ${currentFilters.dateRange}
                <span class="remove" onclick="removeFilter('dateRange')">×</span>
            </div>
        `);
    } else if (currentFilters.dateFrom && currentFilters.dateTo) {
        activeFilters.push(`
            <div class="filter-badge">
                Date: ${formatDisplayDate(currentFilters.dateFrom)} to ${formatDisplayDate(currentFilters.dateTo)}
                <span class="remove" onclick="removeFilter('dateRange')">×</span>
            </div>
        `);
    }
    
    if (currentFilters.search) {
        activeFilters.push(`
            <div class="filter-badge">
                Search: "${currentFilters.search}"
                <span class="remove" onclick="removeFilter('search')">×</span>
            </div>
        `);
    }
    
    activeFiltersContainer.innerHTML = activeFilters.join('');
}

async function loadOrders(filters = {}) {
    try {
        showLoading(true);
        
        const processedFilters = { ...filters };
        
        if (filters.dateRange && filters.dateRange !== 'custom') {
            const dateRange = getDateRange(filters.dateRange);
            processedFilters.dateFrom = dateRange.from;
            processedFilters.dateTo = dateRange.to;
        }
        
        const queryParams = new URLSearchParams();
        Object.keys(processedFilters).forEach(key => {
            if (processedFilters[key]) {
                queryParams.append(key, processedFilters[key]);
            }
        });
        
        const response = await fetch(`/api/admin/orders?${queryParams}`);
        if (!response.ok) throw new Error('Failed to fetch orders');
        
        allOrders = await response.json();
        allOrders.sort((a, b) => new Date(b.order_date) - new Date(a.order_date));
        
        filteredOrders = [...allOrders];
        displayOrders();
        
    } catch (error) {
        console.error('Error loading orders:', error);
        const tbody = document.getElementById('ordersTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:red;">Error loading orders</td></tr>';
        }
    } finally {
        showLoading(false);
    }
}

function displayOrders() {
    const tbody = document.getElementById('ordersTableBody');
    if (!tbody) return;
    
    if (filteredOrders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 2rem;">No orders found matching your criteria</td></tr>';
        return;
    }
    
    tbody.innerHTML = filteredOrders.map(order => `
        <tr class="order-row" data-order-id="${order.order_id}" ondblclick="viewOrderDetails(${order.order_id})">
            <td>${order.order_number}</td>
            <td>${formatDate(order.order_date)}</td>
            <td>
                ${order.first_name ? `${order.first_name} ${order.last_name}` : 'Walk-in Customer'}
                ${order.order_type === 'Reseller' ? '<span class="badge badge-reseller">Reseller</span>' : '<span class="badge badge-walkin">Walk-in</span>'}
            </td>
            <td>₱${parseFloat(order.total_amount).toFixed(2)}</td>
            <td><span class="status-badge status-${order.order_status.toLowerCase().replace(' ', '-')}">${order.order_status}</span></td>
            <td><span class="payment-badge payment-${order.payment_status.toLowerCase()}">${order.payment_status}</span></td>
            <td>${order.received_by_first ? `${order.received_by_first} ${order.received_by_last}` : '-'}</td>
            <td>
                <div class="action-buttons">
                    ${getOrderActionButtons(order)}
                </div>
            </td>
        </tr>
    `).join('');
    
    const rows = tbody.querySelectorAll('.order-row');
    rows.forEach(row => {
        row.style.cursor = 'pointer';
        row.addEventListener('mouseenter', function() {
            this.style.backgroundColor = '#f8f9fa';
        });
        row.addEventListener('mouseleave', function() {
            this.style.backgroundColor = '';
        });
    });
}

function getOrderActionButtons(order) {
    const status = order.order_status;
    const paymentStatus = order.payment_status;
    
    switch(status) {
        case 'Pending':
            return `
                <button class="btn-action btn-approve" onclick="updateOrderStatus(${order.order_id}, 'Approved')" title="Approve">
                    <i class="fas fa-check"></i>
                </button>
                <button class="btn-action btn-cancel" onclick="updateOrderStatus(${order.order_id}, 'Cancelled')" title="Cancel">
                    <i class="fas fa-times"></i>
                </button>
            `;
        case 'Approved':
            return `
                <button class="btn-action btn-pack" onclick="updateOrderStatus(${order.order_id}, 'Packed')" title="Mark as Packed">
                    <i class="fas fa-box"></i>
                </button>
                <button class="btn-action btn-cancel" onclick="updateOrderStatus(${order.order_id}, 'Cancelled')" title="Cancel">
                    <i class="fas fa-times"></i>
                </button>
            `;
        case 'Packed':
            return `
                <button class="btn-action btn-deliver" onclick="updateOrderStatus(${order.order_id}, 'Out for Delivery')" title="Mark for Delivery">
                    <i class="fas fa-truck"></i>
                </button>
                <button class="btn-action btn-cancel" onclick="updateOrderStatus(${order.order_id}, 'Cancelled')" title="Cancel">
                    <i class="fas fa-times"></i>
                </button>
            `;
        case 'Out for Delivery':
            
            return `
                <button class="btn-action btn-complete" onclick="updateOrderStatus(${order.order_id}, 'Completed')" title="Mark as Completed">
                    <i class="fas fa-check-circle"></i>
                </button>
                <button class="btn-action btn-view" onclick="viewOrderDetails(${order.order_id})" title="View Details">
                    <i class="fas fa-eye"></i>
                </button>
            `;
        case 'Completed':
        case 'Cancelled':
            return `
                <button class="btn-action btn-view" onclick="viewOrderDetails(${order.order_id})" title="View Details">
                    <i class="fas fa-eye"></i>
                </button>
            `;
        default:
            return `
                <button class="btn-action btn-view" onclick="viewOrderDetails(${order.order_id})" title="View Details">
                    <i class="fas fa-eye"></i>
                </button>
            `;
    }
}


async function updateOrderStatus(orderId, newStatus) {
    if (!confirm(`Are you sure you want to mark this order as "${newStatus}"?`)) return;
    
    try {
 
        
        const response = await fetch(`/api/admin/orders/${orderId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order_status: newStatus })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update order status');
        }
        
        showNotification(`Order status updated to ${newStatus} successfully`, 'success');
        loadOrders(currentFilters);
        
    } catch (error) {
        console.error('Error updating order status:', error);
        showNotification(error.message || 'Error updating order status', 'error');
    }
}


async function updateOrderStatus(orderId, newStatus) {
    if (!confirm(`Are you sure you want to mark this order as "${newStatus}"?`)) return;
    
    try {
       
        if (newStatus === 'Completed') {
           
            const orderResponse = await fetch(`/api/admin/orders/${orderId}`);
            if (!orderResponse.ok) throw new Error('Failed to fetch order details');
            
            const order = await orderResponse.json();
            
           
            if (order.payment_status === 'Pending') {
                showNotification('Cannot complete order with pending payment. Please collect payment first.', 'error');
                return;
            }
        }
        
  
        const response = await fetch(`/api/admin/orders/${orderId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order_status: newStatus })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update order status');
        }
        
        showNotification(`Order status updated to ${newStatus} successfully`, 'success');
        loadOrders(currentFilters);
        
    } catch (error) {
        console.error('Error updating order status:', error);
        showNotification(error.message || 'Error updating order status', 'error');
    }
}

async function viewOrderDetails(orderId) {
    try {
        const response = await fetch(`/api/admin/orders/${orderId}`);
        if (!response.ok) throw new Error('Failed to fetch order details');
        
        const order = await response.json();
        showOrderModal(order);
        
    } catch (error) {
        console.error('Error fetching order details:', error);
        showNotification('Error loading order details', 'error');
    }
}

function showOrderModal(order) {
    const modal = document.createElement('div');
    modal.className = 'order-modal';
    
    modal.innerHTML = `
        <div class="order-modal-content">
            <div class="order-modal-header">
                <h3>Order Details - ${order.order_number}</h3>
                <span class="order-modal-close">&times;</span>
            </div>
            <div class="modal-body">
                <div class="order-info-grid">
                    <div class="order-info-group">
                        <span class="order-info-label">Order Date:</span>
                        <span class="order-info-value">${formatDate(order.order_date)}</span>
                    </div>
                    <div class="order-info-group">
                        <span class="order-info-label">Customer:</span>
                        <span class="order-info-value">${order.first_name ? `${order.first_name} ${order.last_name}` : 'Walk-in Customer'}</span>
                    </div>
                    <div class="order-info-group">
                        <span class="order-info-label">Contact:</span>
                        <span class="order-info-value">${order.contact_number || 'N/A'}</span>
                    </div>
                    <div class="order-info-group">
                        <span class="order-info-label">Address:</span>
                        <span class="order-info-value">${order.customer_address || 'N/A'}</span>
                    </div>
                    <div class="order-info-group">
                        <span class="order-info-label">Order Type:</span>
                        <span class="order-info-value">${order.order_type}</span>
                    </div>
                    <div class="order-info-group">
                        <span class="order-info-label">Status:</span>
                        <span class="status-badge status-${order.order_status.toLowerCase().replace(' ', '-')}">${order.order_status}</span>
                    </div>
                    <div class="order-info-group">
                        <span class="order-info-label">Payment:</span>
                        <span class="payment-badge payment-${order.payment_status.toLowerCase()}">${order.payment_status}</span>
                    </div>
                    <div class="order-info-group">
                        <span class="order-info-label">Total Amount:</span>
                        <span class="order-info-value order-amount">₱${parseFloat(order.total_amount).toFixed(2)}</span>
                    </div>
                </div>
                
                <div class="order-items-section">
                    <h4>Order Items</h4>
                    <table class="order-items-table">
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>Quantity</th>
                                <th>Unit Price</th>
                                <th>Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${order.items && order.items.length > 0 ? order.items.map(item => `
                                <tr>
                                    <td>${item.product_name}</td>
                                    <td>${item.quantity}</td>
                                    <td>₱${parseFloat(item.unit_price).toFixed(2)}</td>
                                    <td>₱${parseFloat(item.subtotal).toFixed(2)}</td>
                                </tr>
                            `).join('') : '<tr><td colspan="4" style="text-align: center;">No items found</td></tr>'}
                        </tbody>
                    </table>
                </div>
                
                ${order.notes ? `
                    <div class="order-notes-section">
                        <h4>Notes</h4>
                        <p class="order-notes-content">${order.notes}</p>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    

    const closeBtn = modal.querySelector('.order-modal-close');
    closeBtn.addEventListener('click', () => modal.remove());
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

function getDateRange(rangeType) {
    const today = new Date();
    const from = new Date();
    const to = new Date();
    
    switch(rangeType) {
        case 'today':
            return { from: today.toISOString().split('T')[0], to: today.toISOString().split('T')[0] };
        case 'yesterday':
            from.setDate(today.getDate() - 1);
            return { from: from.toISOString().split('T')[0], to: from.toISOString().split('T')[0] };
        case 'week':
            from.setDate(today.getDate() - 7);
            return { from: from.toISOString().split('T')[0], to: to.toISOString().split('T')[0] };
        case 'month':
            from.setMonth(today.getMonth() - 1);
            return { from: from.toISOString().split('T')[0], to: to.toISOString().split('T')[0] };
        default:
            return { from: '', to: '' };
    }
}

function formatDisplayDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function showLoading(show) {
    const tbody = document.getElementById('ordersTableBody');
    if (tbody && show) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 2rem;">Loading orders...</td></tr>';
    }
}

function showNotification(message, type = 'info') {
    alert(`${type.toUpperCase()}: ${message}`);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

let allDeliveries = [];
let filteredDeliveries = [];
let currentDeliveryFilters = {
    status: '',
    dateRange: '',
    search: ''
};

function initializeDeliveryPage() {
    updateDeliveryTableHeaders();
    loadDeliveries();
    setupDeliveryEventListeners();
    updateDeliveryActiveFiltersDisplay();
}

function updateDeliveryTableHeaders() {
    const thead = document.querySelector('#delivery-page thead');
    if (thead) {
        thead.innerHTML = `
            <tr>
                <th>Order #</th>
                <th>Driver</th>
                <th>Recipient</th>
                <th>Contact</th>
                <th>Scheduled Date</th>
                <th>Status</th>
                <th>Cash Collected</th>
                <th>Actions</th>
            </tr>
        `;
    }
}

function setupDeliveryEventListeners() {
    const searchInput = document.getElementById('deliverySearch');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(applyDeliveryFilters, 300));
    }
}

async function loadDeliveries(filters = {}) {
    try {
        showLoading(true);
        
        const queryParams = new URLSearchParams();
        Object.keys(filters).forEach(key => {
            if (filters[key]) {
                queryParams.append(key, filters[key]);
            }
        });
        
        const url = `/api/admin/delivery?${queryParams}`;
        console.log('🔄 Fetching deliveries from:', url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Server response error:', errorText);
            throw new Error(`Failed to fetch deliveries: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('✅ Deliveries loaded:', data.length, 'records');
        
        allDeliveries = data;
        filteredDeliveries = [...allDeliveries];
        displayDeliveries();
        
    } catch (error) {
        console.error('❌ Error loading deliveries:', error);
        const tbody = document.getElementById('deliveriesTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align:center; color:red; padding: 2rem;">
                        Error loading deliveries: ${error.message}
                    </td>
                </tr>
            `;
        }
    } finally {
        showLoading(false);
    }
}

function displayDeliveries() {
    const tbody = document.getElementById('deliveriesTableBody');
    if (!tbody) return;
    
    if (filteredDeliveries.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 2rem;">No deliveries found</td></tr>';
        return;
    }
    
    tbody.innerHTML = filteredDeliveries.map(delivery => `
        <tr class="delivery-row" data-delivery-id="${delivery.delivery_id}">
            <td>${delivery.order_number}</td>
            <td>${delivery.external_driver_name}</td>
            <td>${delivery.recipient_name}</td>
            <td>${delivery.recipient_contact || 'N/A'}</td>
            <td>${formatDateTime(delivery.scheduled_date)}</td>
            <td>
                <span class="status-badge status-${delivery.delivery_status.toLowerCase().replace(' ', '-')}">
                    ${delivery.delivery_status}
                </span>
            </td>
            <td>
                ${getCashDisplay(delivery)}
            </td>
            <td>
                <div class="action-buttons">
                    ${getDeliveryActionButtons(delivery)}
                </div>
            </td>
        </tr>
    `).join('');
}

function getCashDisplay(delivery) {

    const collectedAmount = delivery.cash_collected ? parseFloat(delivery.cash_collected) : 0;
    
    if (delivery.delivery_status === 'Delivered' && collectedAmount > 0) {
        return `₱${collectedAmount.toFixed(2)}`;
    } else {
        return '-';
    }
}

function getDeliveryActionButtons(delivery) {
    const status = delivery.delivery_status;
    
    switch(status) {
        case 'Scheduled':
            return `
                <button class="btn-action btn-truck" onclick="updateDeliveryStatus(${delivery.delivery_id}, 'Out for Delivery')" title="Out for Delivery">
                    <i class="fas fa-truck"></i>
                </button>
                <button class="btn-action btn-eye" onclick="viewDeliveryDetails(${delivery.delivery_id})" title="View Details">
                    <i class="fas fa-eye"></i>
                </button>
            `;
        case 'Out for Delivery':
            return `
                <button class="btn-action btn-check" onclick="updateDeliveryStatus(${delivery.delivery_id}, 'Delivered')" title="Mark as Delivered">
                    <i class="fas fa-check"></i>
                </button>
                <button class="btn-action btn-eye" onclick="viewDeliveryDetails(${delivery.delivery_id})" title="View Details">
                    <i class="fas fa-eye"></i>
                </button>
            `;
        case 'Delivered':
        case 'Failed':
        case 'Cancelled':
        default:
            return `
                <button class="btn-action btn-eye" onclick="viewDeliveryDetails(${delivery.delivery_id})" title="View Details">
                    <i class="fas fa-eye"></i>
                </button>
            `;
    }
}


async function viewDeliveryDetails(deliveryId) {
    try {
        const response = await fetch(`/api/admin/delivery/${deliveryId}`);
        if (!response.ok) throw new Error('Failed to fetch delivery details');
        
        const delivery = await response.json();
        showDeliveryModal(delivery);
        
    } catch (error) {
        console.error('Error fetching delivery details:', error);
        showNotification('Error loading delivery details', 'error');
    }
}

async function completeDelivery(deliveryId) {
    if (!confirm('Mark this delivery as delivered? The rider will return to collect payment.')) return;
    
    try {
        const response = await fetch(`/api/admin/delivery/${deliveryId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ delivery_status: 'Delivered' })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to mark delivery as delivered');
        }
        
        showNotification('Delivery marked as delivered. Rider will return to collect payment.', 'success');
        loadDeliveries(currentDeliveryFilters);
        
    } catch (error) {
        console.error('Error completing delivery:', error);
        showNotification(error.message || 'Error marking delivery as delivered', 'error');
    }
}

async function updateDeliveryStatus(deliveryId, newStatus) {
    if (!confirm(`Are you sure you want to mark this delivery as "${newStatus}"?`)) return;
    
    try {
        const response = await fetch(`/api/admin/delivery/${deliveryId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ delivery_status: newStatus })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update delivery status');
        }
        
        showNotification(`Delivery status updated to ${newStatus} successfully`, 'success');
        loadDeliveries(currentDeliveryFilters);
        
    } catch (error) {
        console.error('Error updating delivery status:', error);
        showNotification(error.message || 'Error updating delivery status', 'error');
    }
}
function showDeliveryModal(delivery) {
    const modal = document.createElement('div');
    modal.className = 'order-modal';
    
    modal.innerHTML = `
        <div class="order-modal-content">
            <div class="order-modal-header">
                <h3>Delivery Details - #${delivery.delivery_id}</h3>
                <span class="order-modal-close">&times;</span>
            </div>
            <div class="modal-body">
                <div class="order-info-grid">
                    <div class="order-info-group">
                        <span class="order-info-label">Order Number:</span>
                        <span class="order-info-value">${delivery.order_number}</span>
                    </div>
                    <div class="order-info-group">
                        <span class="order-info-label">Driver:</span>
                        <span class="order-info-value">${delivery.external_driver_name}</span>
                    </div>
                    <div class="order-info-group">
                        <span class="order-info-label">Scheduled Date:</span>
                        <span class="order-info-value">${formatDateTime(delivery.scheduled_date)}</span>
                    </div>
                    <div class="order-info-group">
                        <span class="order-info-label">Status:</span>
                        <span class="status-badge status-${delivery.delivery_status.toLowerCase().replace(' ', '-')}">${delivery.delivery_status}</span>
                    </div>
                    <div class="order-info-group">
                        <span class="order-info-label">Recipient:</span>
                        <span class="order-info-value">${delivery.recipient_name}</span>
                    </div>
                    <div class="order-info-group">
                        <span class="order-info-label">Contact:</span>
                        <span class="order-info-value">${delivery.recipient_contact}</span>
                    </div>
                    <div class="order-info-group">
                        <span class="order-info-label">Cash Collected:</span>
                        <span class="order-info-value">${delivery.cash_collected ? `₱${parseFloat(delivery.cash_collected).toFixed(2)}` : '₱0.00'}</span>
                    </div>
                    <div class="order-info-group">
                        <span class="order-info-label">Delivered At:</span>
                        <span class="order-info-value">${delivery.delivered_at ? formatDateTime(delivery.delivered_at) : 'Not delivered yet'}</span>
                    </div>
                </div>
                
                ${delivery.notes ? `
                    <div class="order-notes-section">
                        <h4>Delivery Notes</h4>
                        <p class="order-notes-content">${delivery.notes}</p>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    const closeBtn = modal.querySelector('.order-modal-close');
    closeBtn.addEventListener('click', () => modal.remove());
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}


function applyDeliveryFilters() {
    const status = document.getElementById('deliveryStatusFilter')?.value || '';
    const dateRange = document.getElementById('deliveryDateFilter')?.value || '';
    const search = document.getElementById('deliverySearch')?.value.toLowerCase() || '';
    
    currentDeliveryFilters = { status, dateRange, search };
    loadDeliveries(currentDeliveryFilters);
    updateDeliveryActiveFiltersDisplay();
}


function updateDeliveryActiveFiltersDisplay() {
    const activeFiltersContainer = document.getElementById('deliveryActiveFilters');
    if (!activeFiltersContainer) return;
    
    const activeFilters = [];
    
    if (currentDeliveryFilters.status) {
        activeFilters.push(`
            <div class="filter-badge">
                Status: ${currentDeliveryFilters.status}
                <span class="remove" onclick="removeDeliveryFilter('status')">×</span>
            </div>
        `);
    }
    
    if (currentDeliveryFilters.dateRange) {
        activeFilters.push(`
            <div class="filter-badge">
                Date: ${currentDeliveryFilters.dateRange}
                <span class="remove" onclick="removeDeliveryFilter('dateRange')">×</span>
            </div>
        `);
    }
    
    if (currentDeliveryFilters.search) {
        activeFilters.push(`
            <div class="filter-badge">
                Search: "${currentDeliveryFilters.search}"
                <span class="remove" onclick="removeDeliveryFilter('search')">×</span>
            </div>
        `);
    }
    
    activeFiltersContainer.innerHTML = activeFilters.join('');
}


function removeDeliveryFilter(filterType) {
    switch(filterType) {
        case 'status':
            document.getElementById('deliveryStatusFilter').value = '';
            currentDeliveryFilters.status = '';
            break;
        case 'dateRange':
            document.getElementById('deliveryDateFilter').value = '';
            currentDeliveryFilters.dateRange = '';
            break;
        case 'search':
            document.getElementById('deliverySearch').value = '';
            currentDeliveryFilters.search = '';
            break;
    }
    
    applyDeliveryFilters();
}


function formatDateTime(dateTimeString) {
    if (!dateTimeString) return 'N/A';
    const date = new Date(dateTimeString);
    return date.toLocaleString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    }).replace(',', '');
}


window.initializeDeliveryPage = initializeDeliveryPage;
window.applyDeliveryFilters = applyDeliveryFilters;
window.removeDeliveryFilter = removeDeliveryFilter;
window.completeDelivery = completeDelivery;
window.updateDeliveryStatus = updateDeliveryStatus;
window.viewDeliveryDetails = viewDeliveryDetails;

document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('deliveriesTableBody')) {
        initializeDeliveryPage();
    }
});


function searchDeliveries() {
    applyDeliveryFilters();
}

function filterDeliveries() {
    applyDeliveryFilters();
}

function showDeliveryLoading(show) {
    const tbody = document.getElementById('deliveriesTableBody');
    if (!tbody) return;
    
    if (show) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align:center; padding: 2rem;">
                    <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                        <i class="fas fa-spinner fa-spin"></i>
                        Loading deliveries...
                    </div>
                </td>
            </tr>
        `;
    }
}


window.initializeOrderHistory = initializeOrderHistory;
window.applyFilters = applyFilters;
window.clearAllFilters = clearAllFilters;
window.removeFilter = removeFilter;
window.viewOrderDetails = viewOrderDetails;
window.updateOrderStatus = updateOrderStatus;

document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('ordersTableBody')) {
        initializeOrderHistory();
    }
});

let allReturns = [];
let filteredReturns = [];
let currentReturnsFilters = {
    status: '',
    reason: '',
    search: ''
};


function initializeReturnsPage() {
    loadReturns();
    setupReturnsEventListeners();
}


function setupReturnsEventListeners() {
    const searchInput = document.getElementById('returnsSearch');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(applyReturnsFilters, 300));
    }
}

async function loadReturns(filters = {}) {
    try {
        showReturnsLoading(true);
        
        const queryParams = new URLSearchParams();
        Object.keys(filters).forEach(key => {
            if (filters[key]) {
                queryParams.append(key, filters[key]);
            }
        });
        
        const response = await fetch(`/api/admin/returns?${queryParams}`);
        if (!response.ok) throw new Error('Failed to fetch returns');
        
        allReturns = await response.json();
        filteredReturns = [...allReturns];
        displayReturns();
        
    } catch (error) {
        console.error('Error loading returns:', error);
        const tbody = document.getElementById('returnsTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; color:red;">Error loading returns</td></tr>';
        }
    } finally {
        showReturnsLoading(false);
    }
}

function displayReturns() {
    const tbody = document.getElementById('returnsTableBody');
    if (!tbody) return;
    
    if (filteredReturns.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding: 2rem;">No returns found matching your criteria</td></tr>';
        return;
    }
    
    tbody.innerHTML = filteredReturns.map(returnItem => `
        <tr class="return-row" data-return-id="${returnItem.return_id}">
            <td>${returnItem.return_id}</td>
            <td>${returnItem.order_number}</td>
            <td>${returnItem.product_name}</td>
            <td>${returnItem.quantity}</td>
            <td>${returnItem.return_reason}</td>
            <td>${returnItem.action_taken}</td>
            <td>${returnItem.refund_amount ? `₱${parseFloat(returnItem.refund_amount).toFixed(2)}` : '-'}</td>
            <td><span class="status-badge status-${returnItem.status.toLowerCase()}">${returnItem.status}</span></td>
            <td>${formatDate(returnItem.return_date)}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-action btn-view" onclick="viewReturnDetails('${returnItem.return_id}')" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-action btn-delete" onclick="deleteReturn('${returnItem.return_id}')" title="Delete Return">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}


function applyReturnsFilters() {
    const status = document.getElementById('returnsStatusFilter')?.value || '';
    const reason = document.getElementById('returnsReasonFilter')?.value || '';
    const search = document.getElementById('returnsSearch')?.value.toLowerCase() || '';
    
    currentReturnsFilters = { status, reason, search };

    filteredReturns = allReturns.filter(returnItem => {
        const matchesStatus = !status || returnItem.status === status;
        const matchesReason = !reason || returnItem.return_reason === reason;
        const matchesSearch = !search || 
            returnItem.return_id.toLowerCase().includes(search) ||
            returnItem.order_number.toLowerCase().includes(search) ||
            returnItem.product_name.toLowerCase().includes(search);
        
        return matchesStatus && matchesReason && matchesSearch;
    });
    
    displayReturns();
}

function searchReturns() {
    applyReturnsFilters();
}

function filterReturns() {
    applyReturnsFilters();
}

async function viewReturnDetails(returnId) {
    try {
        const response = await fetch(`/api/admin/returns/${returnId}`);
        if (!response.ok) throw new Error('Failed to fetch return details');
        
        const returnItem = await response.json();
        showReturnDetailsModal(returnItem);
        
    } catch (error) {
        console.error('Error fetching return details:', error);
        showNotification('Error loading return details', 'error');
    }
}

function showReturnDetailsModal(returnItem) {
    const modal = document.getElementById('viewReturnModal');
    const content = document.getElementById('returnDetailsContent');
    
    if (!modal || !content) return;
    
    content.innerHTML = `
        <div class="order-info-grid">
            <div class="order-info-group">
                <span class="order-info-label">Return ID:</span>
                <span class="order-info-value">${returnItem.return_id}</span>
            </div>
            <div class="order-info-group">
                <span class="order-info-label">Order Number:</span>
                <span class="order-info-value">${returnItem.order_number}</span>
            </div>
            <div class="order-info-group">
                <span class="order-info-label">Product:</span>
                <span class="order-info-value">${returnItem.product_name}</span>
            </div>
            <div class="order-info-group">
                <span class="order-info-label">Quantity:</span>
                <span class="order-info-value">${returnItem.quantity}</span>
            </div>
            <div class="order-info-group">
                <span class="order-info-label">Reason:</span>
                <span class="order-info-value">${returnItem.return_reason}</span>
            </div>
            <div class="order-info-group">
                <span class="order-info-label">Action Taken:</span>
                <span class="order-info-value">${returnItem.action_taken}</span>
            </div>
            <div class="order-info-group">
                <span class="order-info-label">Refund Amount:</span>
                <span class="order-info-value">${returnItem.refund_amount ? `₱${parseFloat(returnItem.refund_amount).toFixed(2)}` : '-'}</span>
            </div>
            <div class="order-info-group">
                <span class="order-info-label">Status:</span>
                <span class="status-badge status-${returnItem.status.toLowerCase()}">${returnItem.status}</span>
            </div>
            <div class="order-info-group">
                <span class="order-info-label">Return Date:</span>
                <span class="order-info-value">${formatDate(returnItem.return_date)}</span>
            </div>
        </div>
        
        ${returnItem.notes ? `
            <div class="order-notes-section">
                <h4>Notes</h4>
                <p class="order-notes-content">${returnItem.notes}</p>
            </div>
        ` : ''}
        
        <div class="form-actions" style="margin-top: 20px;">
            <button type="button" class="btn-primary" onclick="closeViewReturnModal()">Close</button>
        </div>
    `;
    
    modal.style.display = 'block';
}


function closeViewReturnModal() {
    const modal = document.getElementById('viewReturnModal');
    if (modal) {
        modal.style.display = 'none';
    }
}


async function deleteReturn(returnId) {
    if (!confirm('Are you sure you want to delete this return? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/returns/${returnId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to delete return');
        }
        
        showNotification('Return deleted successfully', 'success');
        loadReturns(currentReturnsFilters);
        
    } catch (error) {
        console.error('Error deleting return:', error);
        showNotification(error.message || 'Error deleting return', 'error');
    }
}


function showReturnsLoading(show) {
    const tbody = document.getElementById('returnsTableBody');
    if (!tbody) return;
    
    if (show) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding: 2rem;">Loading returns...</td></tr>';
    }
}


function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}


function showNotification(message, type = 'info') {
    alert(`${type.toUpperCase()}: ${message}`);
}


function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}


window.initializeReturnsPage = initializeReturnsPage;
window.searchReturns = searchReturns;
window.filterReturns = filterReturns;
window.viewReturnDetails = viewReturnDetails;
window.closeViewReturnModal = closeViewReturnModal;
window.deleteReturn = deleteReturn;


document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('returnsTableBody')) {
        initializeReturnsPage();
    }
});