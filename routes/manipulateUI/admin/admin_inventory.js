let topSalesChart = null;
let topProductsValueChart = null;

window.loadInventoryOverview = async function() {
  console.log('� Loading inventory overview...');
  await loadInventoryStats();
  await loadInventoryCharts();
};

async function loadInventoryStats() {
  try {
    console.log('📈 Fetching inventory statistics...');
    const response = await fetch('/api/admin/inventory/overview');
    
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const data = await response.json();
    console.log('✅ Inventory stats received:', data);
    updateInventoryCards(data);
    
  } catch (error) {
    console.error('❌ Error fetching inventory stats:', error);
    updateInventoryCards({
      totalProducts: 0,
      totalOrders: 0,
      outOfStockItems: 0,
      totalProductsValue: 0
    });
  }
}

function updateInventoryCards(stats) {
  console.log('🎯 Updating inventory cards with:', stats);
  
  const elements = {
    totalProducts: document.getElementById('totalProducts'),
    totalOrders: document.getElementById('totalOrders'),
    outOfStockItems: document.getElementById('outOfStockItems'),
    totalProductsValue: document.getElementById('totalProductsValue')
  };

  if (elements.totalProducts) {
    elements.totalProducts.textContent = stats.totalProducts || 0;
  }
  if (elements.totalOrders) {
    elements.totalOrders.textContent = stats.totalOrders || 0;
  }
  if (elements.outOfStockItems) {
    elements.outOfStockItems.textContent = stats.outOfStockItems || 0;
  }
  if (elements.totalProductsValue) {
    elements.totalProductsValue.textContent = `₱${(stats.totalProductsValue || 0).toLocaleString()}`;
  }
}

async function loadInventoryCharts() {
  try {
    console.log('📊 Loading inventory charts...');
    
    const [salesData, stockData] = await Promise.all([
      fetch('/api/admin/inventory/top-product-sales').then(res => res.json()),
      fetch('/api/admin/inventory/top-stock-value').then(res => res.json())
    ]);
    
    console.log('✅ Chart data received:', { salesData, stockData });
    
    renderTopSalesPieChart(salesData);
    renderTopProductsValueChart(stockData);
    
  } catch (error) {
    console.error('❌ Error loading chart data:', error);
    renderSampleCharts();
  }
}

function renderTopSalesPieChart(salesData) {
  const ctx = document.getElementById('inventoryTypeChart');
  if (!ctx) {
    console.error('❌ Chart canvas not found');
    return;
  }
  
  if (topSalesChart) {
    topSalesChart.destroy();
  }
  
  const processedData = salesData.map(item => ({
    productName: item.productName,
    salesValue: item.totalRevenue || 0
  })).sort((a, b) => b.salesValue - a.salesValue).slice(0, 6);
  
  const labels = processedData.map(item => item.productName);
  const salesValues = processedData.map(item => item.salesValue);

  const backgroundColors = [
    'rgba(156, 122, 61, 0.8)',
    'rgba(212, 168, 86, 0.8)',
    'rgba(120, 92, 41, 0.8)',
    'rgba(188, 150, 88, 0.8)',
    'rgba(139, 108, 66, 0.8)',
    'rgba(169, 133, 73, 0.8)'
  ];
  
  topSalesChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{
        data: salesValues,
        backgroundColor: backgroundColors,
        borderColor: backgroundColors.map(color => color.replace('0.8', '1')),
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: 'Top Product Sales (Revenue)',
          color: 'rgb(120, 92, 41)',
          font: {
            family: "'Poppins', sans-serif",
            size: 16,
            weight: '500'
          },
          padding: 20
        },
        legend: {
          display: true,
          position: 'right',
          labels: {
            font: {
              family: "'Poppins', sans-serif",
              size: 11
            },
            padding: 15
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.parsed;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = Math.round((value / total) * 100);
              return `${label}: ₱${value.toLocaleString()} (${percentage}%)`;
            }
          }
        }
      }
    }
  });
}

function renderTopProductsValueChart(stockData) {
  const ctx = document.getElementById('topProductsChart');
  if (!ctx) {
    console.error('❌ Chart canvas not found');
    return;
  }
  
  if (topProductsValueChart) {
    topProductsValueChart.destroy();
  }
  
  const sortedData = stockData.sort((a, b) => b.stockValue - a.stockValue).slice(0, 8);
  
  const labels = sortedData.map(item => item.productName);
  const stockValues = sortedData.map(item => item.stockValue);
  
  topProductsValueChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Stock Value',
        data: stockValues,
        backgroundColor: 'rgba(156, 122, 61, 0.8)',
        borderColor: 'rgba(156, 122, 61, 1)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: 'Top Products by Stock Value',
          color: 'rgb(120, 92, 41)',
          font: {
            family: "'Poppins', sans-serif",
            size: 16,
            weight: '500'
          },
          padding: 20
        },
        legend: {
          display: true,
          position: 'top',
          labels: {
            font: {
              family: "'Poppins', sans-serif",
              size: 12
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Stock Value (₱)',
            font: {
              family: "'Poppins', sans-serif",
              size: 12
            }
          },
          ticks: {
            font: {
              family: "'Poppins', sans-serif",
              size: 11
            },
            callback: function(value) {
              return '₱' + value.toLocaleString();
            }
          }
        },
        x: {
          title: {
            display: true,
            text: 'Products',
            font: {
              family: "'Poppins', sans-serif",
              size: 12
            }
          },
          ticks: {
            font: {
              family: "'Poppins', sans-serif",
              size: 11
            },
            maxRotation: 45
          }
        }
      }
    }
  });
}

function renderSampleCharts() {
  const sampleSalesData = [
    { productName: "Monay Small", totalRevenue: 1200 },
    { productName: "Monay Sliced", totalRevenue: 1900 },
    { productName: "Cheese Bread", totalRevenue: 425 },
    { productName: "Monay Medium", totalRevenue: 1125 },
    { productName: "Spanish Bread", totalRevenue: 325 }
  ];
  
  const sampleStockData = [
    { productName: "Monay Small", stockValue: 500 },
    { productName: "Monay Sliced", stockValue: 900 },
    { productName: "Cheese Bread", stockValue: 500 },
    { productName: "Monay Medium", stockValue: 450 },
    { productName: "Spanish Bread", stockValue: 450 }
  ];
  
  renderTopSalesPieChart(sampleSalesData);
  renderTopProductsValueChart(sampleStockData);
}

let allProducts = [];
let allIngredients = [];

console.log('🔄 admin_inventory.js loaded');

window.loadItemsPage = function() {
  console.log('🎯 Items page initialized');
  setupTabButtons();
  showProducts();
};

function setupTabButtons() {
  const toggleProducts = document.getElementById('toggleProducts');
  const toggleIngredients = document.getElementById('toggleIngredients');
  
  if (toggleProducts) {
    toggleProducts.addEventListener('click', showProducts);
    toggleProducts.classList.add('active');
  }
  
  if (toggleIngredients) {
    toggleIngredients.addEventListener('click', showIngredients);
  }
  
  console.log('✅ Tab buttons setup complete');
}

function showProducts() {
  console.log('📦 Switching to products tab...');
  
  document.getElementById('toggleProducts').classList.add('active');
  document.getElementById('toggleIngredients').classList.remove('active');
  
  document.getElementById('products-section').style.display = 'block';
  document.getElementById('ingredients-section').style.display = 'none';
  
  if (allProducts.length === 0) {
    loadProducts();
  }
}

function showIngredients() {
  console.log('🥚 Switching to ingredients tab...');
  
  document.getElementById('toggleIngredients').classList.add('active');
  document.getElementById('toggleProducts').classList.remove('active');
  
  document.getElementById('products-section').style.display = 'none';
  document.getElementById('ingredients-section').style.display = 'block';
  
  if (allIngredients.length === 0) {
    loadIngredients();
  }
}

async function loadProducts() {
  try {
    console.log('📦 Loading products from API...');
    const response = await fetch('/api/admin/inventory/products');
    
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    allProducts = await response.json();
    console.log('✅ Products loaded:', allProducts.length, 'items');
    renderProductsTable(allProducts);
    
  } catch (error) {
    console.error('❌ Error loading products:', error);
    document.getElementById('productsTableBody').innerHTML = 
      '<tr><td colspan="6" style="text-align:center; color: red;">Error loading products: ' + error.message + '</td></tr>';
  }
}

async function loadIngredients() {
  try {
    console.log('🥚 Loading ingredients from API...');
    const response = await fetch('/api/admin/inventory/ingredients');
    
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    allIngredients = await response.json();
    console.log('✅ Ingredients loaded:', allIngredients.length, 'items');
    renderIngredientsTable(allIngredients);
    
  } catch (error) {
    console.error('❌ Error loading ingredients:', error);
    document.getElementById('ingredientsTableBody').innerHTML = 
      '<tr><td colspan="6" style="text-align:center; color: red;">Error loading ingredients: ' + error.message + '</td></tr>';
  }
}

function renderProductsTable(products) {
    const tableBody = document.getElementById('productsTableBody');
    if (!tableBody) {
        console.error('❌ Products table body not found');
        return;
    }
    
    if (!products || products.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center;">No products found</td></tr>';
        return;
    }
    
    console.log('🎨 Rendering products table with', products.length, 'items');
    
    let html = '';
    products.forEach(product => {
        const statusClass = product.availability_status === 'Active' ? 'status-active' : 
                           product.availability_status === 'Out of Stock' ? 'status-out-of-stock' : 'status-inactive';
        
        const stockClass = product.stock_quantity === 0 ? 'stock-out' : 
                          product.stock_quantity <= product.min_stock_level ? 'stock-low' : 'stock-ok';
        
        html += `
            <tr>
                <td>${product.product_id}</td> <!-- ADDED PRODUCT ID -->
                <td>${product.name}</td>
                <td>₱${product.price}</td>
                <td class="${stockClass}">${Math.round(product.stock_quantity)}</td> <!-- REMOVED DECIMALS -->
                <td><span class="status-badge ${statusClass}">${product.availability_status}</span></td>
                <td>${formatDashboardDate(product.created_at)}</td> <!-- CHANGED TO SIMPLE DATE FORMAT -->
                <td>
                    <div class="action-buttons">
                        <button class="btn-edit" onclick="openEditProductModal(${product.product_id})">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn-delete" onclick="deleteProduct(${product.product_id})">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = html;
}

function renderIngredientsTable(ingredients) {
    const tableBody = document.getElementById('ingredientsTableBody');
    
    if (!ingredients || ingredients.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No ingredients found</td></tr>';
        return;
    }
    
    let html = '';
    ingredients.forEach(ingredient => {
        const stockClass = ingredient.current_stock === 0 ? 'stock-out' : 
                          ingredient.current_stock <= ingredient.reorder_level ? 'stock-low' : 'stock-ok';
        
        html += `
            <tr>
                <td>${ingredient.ingredient_id}</td> <!-- ADDED INGREDIENT ID -->
                <td>${ingredient.name}</td>
                <td>${ingredient.unit}</td>
                <td class="${stockClass}">${Math.round(ingredient.current_stock)}</td> <!-- REMOVED DECIMALS -->
                <td>${Math.round(ingredient.reorder_level)}</td> <!-- REMOVED DECIMALS -->
                <td>₱${ingredient.cost_per_unit}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-edit" onclick="openEditIngredientModal(${ingredient.ingredient_id})">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn-delete" onclick="deleteIngredient(${ingredient.ingredient_id})">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = html;
    console.log('✅ Ingredients table rendered with', ingredients.length, 'items');
}
function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    
    try {
        // Extract date and time parts from the UTC string
        const dateObj = new Date(dateString);
        
        // Get date parts
        const year = dateObj.getUTCFullYear();
        const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getUTCDate()).padStart(2, '0');
        
        // Get time parts
        const hours = String(dateObj.getUTCHours()).padStart(2, '0');
        const minutes = String(dateObj.getUTCMinutes()).padStart(2, '0');
        const seconds = String(dateObj.getUTCSeconds()).padStart(2, '0');
        
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    } catch (error) {
        return 'Invalid Date';
    }
}
// Format date
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-PH');
    } catch (error) {
        return 'Invalid Date';
    }
}

// Search products
function searchProducts() {
    const searchTerm = document.getElementById('productSearch').value.toLowerCase();
    const filtered = allProducts.filter(product => 
        product.name.toLowerCase().includes(searchTerm) ||
        (product.description && product.description.toLowerCase().includes(searchTerm))
    );
    renderProductsTable(filtered);
}

// Search ingredients
function searchIngredients() {
    const searchTerm = document.getElementById('ingredientSearch').value.toLowerCase();
    const filtered = allIngredients.filter(ingredient => 
        ingredient.name.toLowerCase().includes(searchTerm)
    );
    renderIngredientsTable(filtered);
}

// Filter products
function filterProducts() {
    const statusFilter = document.getElementById('statusFilter').value;
    const stockFilter = document.getElementById('stockFilter').value;
    
    let filtered = allProducts;
    
    if (statusFilter) {
        filtered = filtered.filter(product => product.availability_status === statusFilter);
    }
    
    if (stockFilter) {
        switch(stockFilter) {
            case 'low':
                filtered = filtered.filter(product => product.stock_quantity > 0 && product.stock_quantity <= 5);
                break;
            case 'out':
                filtered = filtered.filter(product => product.stock_quantity === 0);
                break;
            case 'in':
                filtered = filtered.filter(product => product.stock_quantity > 0);
                break;
        }
    }
    
    renderProductsTable(filtered);
}

// Filter ingredients
function filterIngredients() {
    const stockFilter = document.getElementById('ingredientStockFilter').value;
    
    let filtered = allIngredients;
    
    if (stockFilter) {
        switch(stockFilter) {
            case 'low':
                filtered = filtered.filter(ingredient => ingredient.current_stock > 0 && ingredient.current_stock <= ingredient.reorder_level);
                break;
            case 'out':
                filtered = filtered.filter(ingredient => ingredient.current_stock === 0);
                break;
            case 'in':
                filtered = filtered.filter(ingredient => ingredient.current_stock > 0);
                break;
        }
    }
    
    renderIngredientsTable(filtered);
}



function editProduct(productId) {
    const product = allProducts.find(p => p.product_id === productId);
    if (product) {
        console.log('Editing product:', product);
        // You can implement edit modal similar to add modal
        alert(`Edit product functionality would open here for: ${product.name}`);
    }
}
// =======================================
// STOCK MOVEMENT FUNCTIONS
// =======================================

let allMovements = [];

// Initialize stock movements page
window.loadStockManagement = function() {
    console.log('📊 Initializing stock movements...');
    loadStockMovements();
};

// Load all stock movements
async function loadStockMovements() {
    try {
        console.log('📊 Loading stock movements from API...');
        const response = await fetch('/api/admin/inventory/stock-movements');
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        allMovements = await response.json();
        console.log('✅ Stock movements loaded:', allMovements);
        renderMovementsTable(allMovements);
        
    } catch (error) {
        console.error('❌ Error loading stock movements:', error);
        document.getElementById('movementsTableBody').innerHTML = 
            '<tr><td colspan="7" style="text-align:center; color: red;">Error loading stock movements</td></tr>';
    }
}

// Render movements table
function renderMovementsTable(movements) {
    const tableBody = document.getElementById('movementsTableBody');
    if (!tableBody) {
        console.error('❌ Movements table body not found');
        return;
    }
    
    if (!movements || movements.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No stock movements found</td></tr>';
        return;
    }
    
    console.log('🎨 Rendering movements table with', movements.length, 'items');
    
    let html = '';
    movements.forEach(movement => {
        const movementClass = `movement-${movement.movement_type.toLowerCase()}`;
        
        // Convert to integers to remove decimals using Math.round()
        const quantityChange = Math.round(movement.quantity_change);
        const previousStock = Math.round(movement.previous_stock);
        const newStock = Math.round(movement.new_stock);
        
        const quantityDisplay = quantityChange > 0 ? `+${quantityChange}` : quantityChange;
        
        html += `
            <tr>
                <td>${movement.item_name || 'Unknown Item'}</td>
                <td>
                    <span class="status-badge ${movement.item_type === 'Product' ? 'status-active' : 'status-out-of-stock'}">
                        ${movement.item_type}
                    </span>
                </td>
                <td class="${movementClass}">${movement.movement_type}</td>
                <td class="${movementClass}">${quantityDisplay}</td>
                <td>${previousStock}</td>
                <td>${newStock}</td>
                <td>${formatDateTimeMultiline(movement.created_at)}</td> <!-- CHANGED TO formatDateTimeMultiline -->
            </tr>
        `;
    });
    
    tableBody.innerHTML = html;
}
function formatDateTimeMultiline(dateString) {
    if (!dateString) return 'N/A';
    
    try {
        // Extract just the date and time part from ISO string
        // Example: "2025-10-31T16:00:00.000Z" -> "2025-10-31<br>16:00:00"
        const dateTimePart = dateString.substring(0, 19); // Gets "2025-10-31T16:00:00"
        const [date, time] = dateTimePart.split('T');
        return `${date}<br>${time}`;
    } catch (error) {
        return 'Invalid Date';
    }
}
// Search movements
window.searchMovements = function() {
    const searchTerm = document.getElementById('movementSearch').value.toLowerCase();
    const filtered = allMovements.filter(movement => 
        movement.item_name.toLowerCase().includes(searchTerm) ||
        movement.movement_type.toLowerCase().includes(searchTerm) ||
        (movement.notes && movement.notes.toLowerCase().includes(searchTerm))
    );
    renderMovementsTable(filtered);
};

// Filter movements
window.filterMovements = function() {
    const movementTypeFilter = document.getElementById('movementTypeFilter').value;
    const itemTypeFilter = document.getElementById('itemTypeFilter').value;
    
    let filtered = allMovements;
    
    if (movementTypeFilter) {
        filtered = filtered.filter(movement => movement.movement_type === movementTypeFilter);
    }
    
    if (itemTypeFilter) {
        filtered = filtered.filter(movement => movement.item_type === itemTypeFilter);
    }
    
    renderMovementsTable(filtered);
};

// Add movement modal
window.openAddMovementModal = function() {
    console.log('Opening add movement modal');
    alert('Add Movement modal would open here');
};
function editIngredient(ingredientId) {
    const ingredient = allIngredients.find(i => i.ingredient_id === ingredientId);
    if (ingredient) {
        console.log('Editing ingredient:', ingredient);
        // You can implement edit modal similar to add modal
        alert(`Edit ingredient functionality would open here for: ${ingredient.name}`);
    }
}

// =======================================
// MODAL MANAGEMENT FUNCTIONS
function openAddProductModal() {
    console.log('📦 Opening add product modal...');
    const modal = document.getElementById('addProductModal');
    const form = document.getElementById('addProductForm');
    
    if (!modal || !form) {
        console.error('❌ Modal or form not found.');
        alert('Modal not loaded. Please refresh the page.');
        return;
    }
    
    form.reset();
    resetImagePreview('add');
    
    document.getElementById('productMinStock').value = 5;
    document.getElementById('productStatus').value = 'Active';
    
    modal.style.display = 'block';
    
    setTimeout(() => {
        const firstInput = document.getElementById('productName');
        if (firstInput) firstInput.focus();
    }, 100);
}

function closeAddProductModal() {
    const modal = document.getElementById('addProductModal');
    if (modal) modal.style.display = 'none';
}

function openEditProductModal(productId) {
    console.log('📦 Opening edit product modal for ID:', productId);
    const modal = document.getElementById('editProductModal');
    const form = document.getElementById('editProductForm');
    
    if (!modal || !form) {
        console.error('❌ Edit modal or form not found.');
        return;
    }
    
    const product = allProducts.find(p => p.product_id === productId);
    if (!product) {
        console.error('❌ Product not found:', productId);
        return;
    }
    
    // Fill form with product data
    document.getElementById('editProductId').value = product.product_id;
    document.getElementById('editProductName').value = product.name;
    document.getElementById('editProductDescription').value = product.description || '';
    document.getElementById('editProductPrice').value = product.price;
    document.getElementById('editProductCost').value = product.cost_price;
    document.getElementById('editProductStock').value = product.stock_quantity;
    document.getElementById('editProductMinStock').value = product.min_stock_level;
    document.getElementById('editProductStatus').value = product.availability_status;
    
    // Set image preview
    if (product.image_url) {
        setImagePreview(product.image_url, 'edit');
    } else {
        resetImagePreview('edit');
    }
    
    modal.style.display = 'block';
    
    setTimeout(() => {
        const firstInput = document.getElementById('editProductName');
        if (firstInput) firstInput.focus();
    }, 100);
}

function closeEditProductModal() {
    const modal = document.getElementById('editProductModal');
    if (modal) modal.style.display = 'none';
}

// =======================================
// INGREDIENT MODAL FUNCTIONS
// =======================================

function openAddIngredientModal() {
    console.log('🥚 Opening add ingredient modal...');
    const modal = document.getElementById('addIngredientModal');
    const form = document.getElementById('addIngredientForm');
    
    if (!modal || !form) {
        console.error('❌ Modal or form not found.');
        alert('Modal not loaded. Please refresh the page.');
        return;
    }
    
    form.reset();
    document.getElementById('ingredientUnit').value = 'kg';
    
    modal.style.display = 'block';
    
    setTimeout(() => {
        const firstInput = document.getElementById('ingredientName');
        if (firstInput) firstInput.focus();
    }, 100);
}

function closeAddIngredientModal() {
    const modal = document.getElementById('addIngredientModal');
    if (modal) modal.style.display = 'none';
}

function openEditIngredientModal(ingredientId) {
    console.log('🥚 Opening edit ingredient modal for ID:', ingredientId);
    const modal = document.getElementById('editIngredientModal');
    const form = document.getElementById('editIngredientForm');
    
    if (!modal || !form) {
        console.error('❌ Edit modal or form not found.');
        return;
    }
    
    const ingredient = allIngredients.find(i => i.ingredient_id === ingredientId);
    if (!ingredient) {
        console.error('❌ Ingredient not found:', ingredientId);
        return;
    }
    
    // Fill form with ingredient data
    document.getElementById('editIngredientId').value = ingredient.ingredient_id;
    document.getElementById('editIngredientName').value = ingredient.name;
    document.getElementById('editIngredientUnit').value = ingredient.unit;
    document.getElementById('editIngredientCost').value = ingredient.cost_per_unit;
    document.getElementById('editIngredientStock').value = ingredient.current_stock;
    document.getElementById('editIngredientReorder').value = ingredient.reorder_level;
    
    modal.style.display = 'block';
    
    setTimeout(() => {
        const firstInput = document.getElementById('editIngredientName');
        if (firstInput) firstInput.focus();
    }, 100);
}

function closeEditIngredientModal() {
    const modal = document.getElementById('editIngredientModal');
    if (modal) modal.style.display = 'none';
}

async function submitProductForm(event) {
    console.log('🟢 SUBMIT PRODUCT FORM CALLED');
    event.preventDefault();
    
    try {
        const submitButton = document.getElementById('addProductSubmitBtn');
        console.log('🔍 Submit button by ID:', submitButton);
        
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'Adding Product...';
        }
        
        // Get form data
        const formData = {
            name: document.getElementById('productName').value.trim(),
            description: document.getElementById('productDescription').value.trim(),
            price: document.getElementById('productPrice').value,
            cost_price: document.getElementById('productCost').value,
            stock_quantity: document.getElementById('productStock').value,
            min_stock_level: document.getElementById('productMinStock').value,
            availability_status: document.getElementById('productStatus').value
        };
        
        // Validation
        if (!validateProductForm(formData)) {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = 'Add Product';
            }
            return;
        }
        
        // Create FormData for file upload
        const uploadData = new FormData();
        uploadData.append('name', formData.name);
        uploadData.append('description', formData.description);
        uploadData.append('price', formData.price);
        uploadData.append('cost_price', formData.cost_price);
        uploadData.append('stock_quantity', formData.stock_quantity);
        uploadData.append('min_stock_level', formData.min_stock_level);
        uploadData.append('availability_status', formData.availability_status);
        
        // Add image file if exists
        const imageFile = document.getElementById('productImageUpload').files[0];
        if (imageFile) {
            uploadData.append('image', imageFile);
        }
        
        const response = await fetch('/api/admin/inventory/products', {
            method: 'POST',
            body: uploadData
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to add product');
        }
        
        const result = await response.json();
        console.log('✅ Product added successfully:', result);
        
        showNotification('Product added successfully!', 'success');
        
        closeAddProductModal();
        setTimeout(() => {
            if (document.getElementById('products-section').style.display !== 'none') {
                loadProducts();
            }
        }, 1000);
        
    } catch (error) {
        console.error('❌ Error adding product:', error);
        showNotification('Error adding product: ' + error.message, 'error');
    } finally {
        const submitButton = document.getElementById('addProductSubmitBtn');
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = 'Add Product';
        }
    }
}
// Updated submitEditProductForm with FormData
async function submitEditProductForm(event) {
    event.preventDefault();
    console.log('📤 Submitting edit product form...');
    
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const productId = document.getElementById('editProductId').value;
    const imageFile = document.getElementById('editProductImageUpload').files[0];
    
    // Create FormData object
    const formData = new FormData();
    formData.append('name', document.getElementById('editProductName').value.trim());
    formData.append('description', document.getElementById('editProductDescription').value.trim());
    formData.append('price', document.getElementById('editProductPrice').value);
    formData.append('cost_price', document.getElementById('editProductCost').value);
    formData.append('stock_quantity', document.getElementById('editProductStock').value);
    formData.append('min_stock_level', document.getElementById('editProductMinStock').value);
    formData.append('availability_status', document.getElementById('editProductStatus').value);
    
    // Append image file if selected
    if (imageFile) {
        formData.append('image', imageFile);
    }
    
    // Validation
    const productData = {
        name: formData.get('name'),
        price: parseFloat(formData.get('price')),
        cost_price: parseFloat(formData.get('cost_price')),
        stock_quantity: parseInt(formData.get('stock_quantity')),
        min_stock_level: parseInt(formData.get('min_stock_level'))
    };
    
    if (!validateProductForm(productData)) return;
    
    submitButton.disabled = true;
    submitButton.textContent = 'Updating Product...';
    form.classList.add('form-loading');
    
    try {
        const response = await fetch(`/api/admin/inventory/products/${productId}`, {
            method: 'PUT',
            body: formData // No Content-Type header
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update product');
        }
        
        console.log('✅ Product updated successfully');
        showFormMessage('Product updated successfully!', 'success');
        
        setTimeout(() => {
            closeEditProductModal();
            if (document.getElementById('products-section').style.display !== 'none') {
                loadProducts();
            }
        }, 1500);
        
    } catch (error) {
        console.error('❌ Error updating product:', error);
        showFormMessage('Error updating product: ' + error.message, 'error');
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Update Product';
        form.classList.remove('form-loading');
    }
}


async function submitIngredientForm(event) {
    event.preventDefault();
    console.log('📤 Submitting ingredient form...');
    
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    
    // Get form data
    const formData = {
        name: document.getElementById('ingredientName').value.trim(),
        unit: document.getElementById('ingredientUnit').value,
        cost_per_unit: parseFloat(document.getElementById('ingredientCost').value),
        current_stock: parseFloat(document.getElementById('ingredientStock').value),
        reorder_level: parseFloat(document.getElementById('ingredientReorder').value)
    };
    
    // Validation
    if (!validateIngredientForm(formData)) {
        return;
    }
    
    // Show loading state
    submitButton.disabled = true;
    submitButton.textContent = 'Adding Ingredient...';
    form.classList.add('form-loading');
    
    try {
        const response = await fetch('/api/admin/inventory/ingredients', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to add ingredient');
        }
        
        const result = await response.json();
        console.log('✅ Ingredient added successfully:', result);
        
        // Show success message
        showFormMessage('Ingredient added successfully!', 'success');
        
        // Close modal after delay
        setTimeout(() => {
            closeAddIngredientModal();
            
            // Reload ingredients if we're on the ingredients page
            if (document.getElementById('ingredients-section').style.display !== 'none') {
                loadIngredients();
            }
        }, 1500);
        
    } catch (error) {
        console.error('❌ Error adding ingredient:', error);
        showFormMessage('Error adding ingredient: ' + error.message, 'error');
    } finally {
        // Reset loading state
        submitButton.disabled = false;
        submitButton.textContent = 'Add Ingredient';
        form.classList.remove('form-loading');
    }
}

async function submitEditIngredientForm(event) {
    event.preventDefault();
    console.log('📤 Submitting edit ingredient form...');
    
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const ingredientId = document.getElementById('editIngredientId').value;
    
    const ingredientData = {
        name: document.getElementById('editIngredientName').value.trim(),
        unit: document.getElementById('editIngredientUnit').value,
        cost_per_unit: parseFloat(document.getElementById('editIngredientCost').value),
        current_stock: parseFloat(document.getElementById('editIngredientStock').value),
        reorder_level: parseFloat(document.getElementById('editIngredientReorder').value)
    };
    
    if (!validateIngredientForm(ingredientData)) return;
    
    submitButton.disabled = true;
    submitButton.textContent = 'Updating Ingredient...';
    form.classList.add('form-loading');
    
    try {
        const response = await fetch(`/api/admin/inventory/ingredients/${ingredientId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(ingredientData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update ingredient');
        }
        
        console.log('✅ Ingredient updated successfully');
        showFormMessage('Ingredient updated successfully!', 'success');
        
        setTimeout(() => {
            closeEditIngredientModal();
            if (document.getElementById('ingredients-section').style.display !== 'none') {
                loadIngredients();
            }
        }, 1500);
        
    } catch (error) {
        console.error('❌ Error updating ingredient:', error);
        showFormMessage('Error updating ingredient: ' + error.message, 'error');
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Update Ingredient';
        form.classList.remove('form-loading');
    }
}


async function deleteProduct(productId) {
    const product = allProducts.find(p => p.product_id === productId);
    if (!product) return;
    
    const confirmation = confirm(
        `Discontinue "${product.name}"?\n\n` +
        `This product has order history and cannot be permanently deleted.\n\n` +
        `It will be:\n` +
        `• Marked as "Discontinued"\n` +
        `• Stock set to 0\n` +
        `• Hidden from active product lists\n\n` +
        `Continue?`
    );
    
    if (!confirmation) return;
    
    try {
        const response = await fetch(`/api/admin/inventory/products/${productId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to discontinue product');
        }
        
        const result = await response.json();
        
        if (result.action === 'soft_delete') {
            showNotification('✅ Product discontinued (order history preserved)', 'success');
        } else {
            showNotification('✅ Product deleted successfully!', 'success');
        }
        
        // Reload products to reflect changes
        await loadProducts();
        
    } catch (error) {
        console.error('❌ Error discontinuing product:', error);
        showNotification('Failed to discontinue product: ' + error.message, 'error');
    }
}

async function deleteIngredient(ingredientId) {
    if (!confirm('Are you sure you want to delete this ingredient? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/inventory/ingredients/${ingredientId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to delete ingredient');
        }
        
        showNotification('Ingredient deleted successfully!', 'success');
        
        // Reload ingredients
        await loadIngredients();
        
    } catch (error) {
        console.error('❌ Error deleting ingredient:', error);
        showNotification('Failed to delete ingredient: ' + error.message, 'error');
    }
}

// =======================================
// VALIDATION FUNCTIONS
// =======================================

function validateProductForm(data) {
    if (!data.name || data.name.trim() === '') {
        showFormMessage('Product name is required', 'error');
        return false;
    }
    
    if (data.price <= 0 || isNaN(data.price)) {
        showFormMessage('Price must be greater than 0', 'error');
        return false;
    }
    
    if (data.cost_price <= 0 || isNaN(data.cost_price)) {
        showFormMessage('Cost price must be greater than 0', 'error');
        return false;
    }
    
    if (data.price < data.cost_price) {
        showFormMessage('Price cannot be less than cost price', 'error');
        return false;
    }
    
    if (data.stock_quantity < 0 || isNaN(data.stock_quantity)) {
        showFormMessage('Stock quantity cannot be negative', 'error');
        return false;
    }
    
    if (data.min_stock_level < 0 || isNaN(data.min_stock_level)) {
        showFormMessage('Minimum stock level cannot be negative', 'error');
        return false;
    }
    
    return true;
}

function validateIngredientForm(data) {
    if (!data.name || data.name.trim() === '') {
        showFormMessage('Ingredient name is required', 'error');
        return false;
    }
    
    if (data.cost_per_unit <= 0 || isNaN(data.cost_per_unit)) {
        showFormMessage('Cost per unit must be greater than 0', 'error');
        return false;
    }
    
    if (data.current_stock < 0 || isNaN(data.current_stock)) {
        showFormMessage('Current stock cannot be negative', 'error');
        return false;
    }
    
    if (data.reorder_level < 0 || isNaN(data.reorder_level)) {
        showFormMessage('Reorder level cannot be negative', 'error');
        return false;
    }
    
    return true;
}

// =======================================
// UTILITY FUNCTIONS
// =======================================

function showFormMessage(message, type) {
    // Remove existing messages
    const existingMessages = document.querySelectorAll('.form-message');
    existingMessages.forEach(msg => msg.remove());
    
    // Create new message
    const messageDiv = document.createElement('div');
    messageDiv.className = `form-message ${type}`;
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
        padding: 10px;
        margin: 10px 0;
        border-radius: 4px;
        font-weight: 500;
        ${type === 'success' ? 'background: #d4edda; color: #155724; border: 1px solid #c3e6cb;' : ''}
        ${type === 'error' ? 'background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb;' : ''}
    `;
    
    // Insert at the top of the form
    const form = document.activeElement.closest('form');
    if (form) {
        form.insertBefore(messageDiv, form.firstChild);
    }
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, 5000);
}

function showNotification(message, type) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 4px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        ${type === 'success' ? 'background: #28a745;' : ''}
        ${type === 'error' ? 'background: #dc3545;' : ''}
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 3000);
}

// Image Preview Functions
function previewImage(input, type) {
    const previewImg = document.getElementById(`${type}ImagePreviewImg`);
    const previewText = document.getElementById(`${type}ImagePreviewText`);
    
    if (input.files && input.files[0]) {
        const file = input.files[0];
        
        // Validate file type
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            showFormMessage('Please select a valid image file (JPG, PNG, WebP)', 'error');
            input.value = '';
            return;
        }
        
        // Validate file size (2MB)
        if (file.size > 2 * 1024 * 1024) {
            showFormMessage('Image size must be less than 2MB', 'error');
            input.value = '';
            return;
        }
        
        const reader = new FileReader();
        
        reader.onload = function(e) {
            previewImg.src = e.target.result;
            previewImg.style.display = 'block';
            previewText.style.display = 'none';
        }
        
        reader.readAsDataURL(file);
    }
}

function setImagePreview(imageUrl, type) {
    const previewImg = document.getElementById(`${type}ImagePreviewImg`);
    const previewText = document.getElementById(`${type}ImagePreviewText`);
    
    console.log('🖼️ Setting image preview for:', imageUrl);
    
    if (imageUrl && imageUrl !== '/assets/productimages/default-bread.png') {
        // Ensure URL starts with /
        let finalUrl = imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl;
        
        // Add cache buster
        const fullImageUrl = finalUrl + `?t=${Date.now()}`;
        
        console.log('🖼️ Loading image:', fullImageUrl);
        
        previewImg.src = fullImageUrl;
        previewImg.style.display = 'block';
        previewText.style.display = 'none';
        
        previewImg.onerror = function() {
            console.error('❌ Failed to load image:', fullImageUrl);
            previewImg.style.display = 'none';
            previewText.style.display = 'flex';
            previewText.innerHTML = '<i class="fas fa-image"></i> Image preview';
        };
        
        previewImg.onload = function() {
            console.log('✅ Image loaded successfully:', fullImageUrl);
        };
    } else {
        resetImagePreview(type);
    }
}

function resetImagePreview(type) {
    const previewImg = document.getElementById(`${type}ImagePreviewImg`);
    const previewText = document.getElementById(`${type}ImagePreviewText`);
    
    previewImg.src = '';
    previewImg.style.display = 'none';
    previewText.style.display = 'flex';
    previewText.innerHTML = '<i class="fas fa-image"></i> No image';
}

function resetImagePreview(type) {
    const previewImg = document.getElementById(`${type}ImagePreviewImg`);
    const previewText = document.getElementById(`${type}ImagePreviewText`);
    
    previewImg.src = '';
    previewImg.style.display = 'none';
    previewText.style.display = 'flex';
}

// Utility Functions

// Close modals when clicking outside
window.addEventListener('click', function(event) {
    const productModal = document.getElementById('addProductModal');
    const ingredientModal = document.getElementById('addIngredientModal');
    
    if (event.target === productModal) {
        closeAddProductModal();
    }
    
    if (event.target === ingredientModal) {
        closeAddIngredientModal();
    }
});

window.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeAddProductModal();
        closeEditProductModal();
        closeAddIngredientModal();
        closeEditIngredientModal();
    }
});


window.addEventListener('click', function(event) {
    const modals = [
        'addProductModal', 'editProductModal', 
        'addIngredientModal', 'editIngredientModal'
    ];
    
    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (event.target === modal) {
            if (modalId === 'addProductModal') closeAddProductModal();
            if (modalId === 'editProductModal') closeEditProductModal();
            if (modalId === 'addIngredientModal') closeAddIngredientModal();
            if (modalId === 'editIngredientModal') closeEditIngredientModal();
        }
    });
});


// =======================================
// STOCK MOVEMENT MODAL FUNCTIONS
// =======================================

// Add movement modal - COMPLETE IMPLEMENTATION
window.openAddMovementModal = function() {
    console.log('📊 Opening add movement modal...');
    const modal = document.getElementById('addMovementModal');
    const form = document.getElementById('addMovementForm');
    
    if (!modal || !form) {
        console.error('❌ Movement modal or form not found.');
        alert('Movement modal not loaded. Please refresh the page.');
        return;
    }
    
    // Reset form
    form.reset();
    document.getElementById('movementItem').innerHTML = '<option value="">Select Item</option>';
    document.getElementById('currentStockInfo').style.display = 'none';
    
    // Show modal
    modal.style.display = 'block';
    console.log('✅ Movement modal opened successfully');
    
    setTimeout(() => {
        const firstInput = document.getElementById('movementItemType');
        if (firstInput) firstInput.focus();
    }, 100);
}

window.closeAddMovementModal = function() {
    const modal = document.getElementById('addMovementModal');
    if (modal) {
        modal.style.display = 'none';
        console.log('✅ Movement modal closed');
    }
}

// Load items based on selected type
window.loadItemsByType = async function() {
    const itemType = document.getElementById('movementItemType').value;
    const itemSelect = document.getElementById('movementItem');
    const currentStockInfo = document.getElementById('currentStockInfo');
    
    itemSelect.innerHTML = '<option value="">Select Item</option>';
    currentStockInfo.style.display = 'none';
    
    if (!itemType) return;
    
    try {
        let endpoint = '';
        if (itemType === 'Product') {
            endpoint = '/api/admin/inventory/products';
        } else if (itemType === 'Ingredient') {
            endpoint = '/api/admin/inventory/ingredients';
        }
        
        const response = await fetch(endpoint);
        if (!response.ok) throw new Error('Failed to fetch items');
        
        const items = await response.json();
        
        items.forEach(item => {
            const option = document.createElement('option');
            option.value = itemType === 'Product' ? item.product_id : item.ingredient_id;
            option.textContent = item.name;
            option.setAttribute('data-stock', itemType === 'Product' ? item.stock_quantity : item.current_stock);
            option.setAttribute('data-unit', item.unit || 'pcs');
            itemSelect.appendChild(option);
        });
        
    } catch (error) {
        console.error('❌ Error loading items:', error);
        itemSelect.innerHTML = '<option value="">Error loading items</option>';
    }
}

// Update stock info when item is selected
window.updateStockInfo = function() {
    const itemSelect = document.getElementById('movementItem');
    const selectedOption = itemSelect.options[itemSelect.selectedIndex];
    const currentStockInfo = document.getElementById('currentStockInfo');
    const stockDetails = document.getElementById('stockDetails');
    
    if (selectedOption && selectedOption.value) {
        const stock = selectedOption.getAttribute('data-stock');
        const unit = selectedOption.getAttribute('data-unit');
        
        stockDetails.innerHTML = `
            <div class="stock-value">${stock} ${unit}</div>
            <div class="stock-label">Current Stock</div>
            ${stock <= 0 ? '<div class="stock-warning">Out of Stock</div>' : 
              stock <= 5 ? '<div class="stock-warning">Low Stock</div>' : 
              '<div class="stock-ok">In Stock</div>'}
        `;
        
        currentStockInfo.style.display = 'block';
    } else {
        currentStockInfo.style.display = 'none';
    }
}

// Fixed submitMovementForm function with real-time updates
window.submitMovementForm = async function(event) {
  event.preventDefault();
  console.log('📤 Submitting movement form...');
  
  const form = event.target;
  const formData = new FormData(form);
  
  // Get form values with correct field names
  const movementData = {
    item_type: formData.get('item_type'),
    item_id: parseInt(formData.get('item_id')),
    movement_type: formData.get('movement_type'),
    quantity_change: parseFloat(formData.get('quantity_change')),
    reference_type: formData.get('reference_type') || null,
    notes: formData.get('notes') || '',
    created_by: 1 // Use actual user ID from your session system
  };
  
  console.log('📦 Movement data:', movementData);
  
  // Validate required fields
  if (!movementData.item_type || !movementData.item_id || !movementData.movement_type || 
      isNaN(movementData.quantity_change)) {
    alert('Please fill all required fields correctly');
    return;
  }
  
  try {
    const response = await fetch('/api/admin/inventory/stock-movements', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(movementData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('✅ Stock movement added:', result);
    
    // Show success message
    alert('Stock movement recorded successfully!');
    
    // Reset form
    form.reset();
    document.getElementById('currentStockInfo').style.display = 'none';
    
    // Close modal
    closeAddMovementModal();
    
    // Refresh ALL relevant data
    if (window.loadStockMovements) {
      window.loadStockMovements(); // Refresh stock movements table
    }
    
    // Refresh items data based on what page is active
    const productsSection = document.getElementById('products-section');
    const ingredientsSection = document.getElementById('ingredients-section');
    
    if (productsSection && productsSection.style.display !== 'none') {
      // Products page is active - refresh products
      if (window.loadProducts) {
        window.loadProducts();
      }
    }
    
    if (ingredientsSection && ingredientsSection.style.display !== 'none') {
      // Ingredients page is active - refresh ingredients
      if (window.loadIngredients) {
        window.loadIngredients();
      }
    }
    
    // Also refresh the items in the dropdown for next time
    if (window.loadItemsByType) {
      window.loadItemsByType();
    }
    
  } catch (error) {
    console.error('❌ Error adding stock movement:', error);
    alert('Error adding stock movement: ' + error.message);
  }
};
// Load items based on selected type
window.loadItemsByType = async function() {
  const itemType = document.getElementById('movementItemType').value;
  const itemSelect = document.getElementById('movementItem');
  
  itemSelect.innerHTML = '<option value="">Select Item</option>';
  document.getElementById('currentStockInfo').style.display = 'none';
  
  if (!itemType) return;
  
  try {
    const endpoint = itemType === 'Product' 
      ? '/api/admin/inventory/products' 
      : '/api/admin/inventory/ingredients';
    
    const response = await fetch(endpoint);
    const items = await response.json();
    
    items.forEach(item => {
      const option = document.createElement('option');
      option.value = itemType === 'Product' ? item.product_id : item.ingredient_id;
      option.textContent = item.name;
      itemSelect.appendChild(option);
    });
    
  } catch (error) {
    console.error('Error loading items:', error);
  }
}

// Update stock information when item is selected
window.updateStockInfo = async function() {
  const itemType = document.getElementById('movementItemType').value;
  const itemId = document.getElementById('movementItem').value;
  const stockInfo = document.getElementById('currentStockInfo');
  const stockDetails = document.getElementById('stockDetails');
  
  if (!itemType || !itemId) {
    stockInfo.style.display = 'none';
    return;
  }
  
  try {
    const endpoint = itemType === 'Product' 
      ? `/api/admin/inventory/products` 
      : `/api/admin/inventory/ingredients`;
    
    const response = await fetch(endpoint);
    const items = await response.json();
    
    const selectedItem = items.find(item => 
      (itemType === 'Product' ? item.product_id : item.ingredient_id) == itemId
    );
    
    if (selectedItem) {
      if (itemType === 'Product') {
        stockDetails.innerHTML = `
          <div><strong>Current Stock:</strong> ${selectedItem.stock_quantity} units</div>
          <div><strong>Price:</strong> ₱${selectedItem.price}</div>
          <div><strong>Status:</strong> ${selectedItem.availability_status}</div>
        `;
      } else {
        stockDetails.innerHTML = `
          <div><strong>Current Stock:</strong> ${selectedItem.current_stock} ${selectedItem.unit}</div>
          <div><strong>Cost:</strong> ₱${selectedItem.cost_per_unit}/${selectedItem.unit}</div>
          <div><strong>Reorder Level:</strong> ${selectedItem.reorder_level} ${selectedItem.unit}</div>
        `;
      }
      stockInfo.style.display = 'block';
    }
    
  } catch (error) {
    console.error('Error fetching stock info:', error);
  }
}

// Open add movement modal
window.openAddMovementModal = function() {
  document.getElementById('addMovementModal').style.display = 'block';
  // Reset form
  document.getElementById('addMovementForm').reset();
  document.getElementById('currentStockInfo').style.display = 'none';
}

// Close add movement modal
window.closeAddMovementModal = function() {
  document.getElementById('addMovementModal').style.display = 'none';
}
// Validate movement form
function validateMovementForm(data) {
    if (!data.item_type) {
        showFormMessage('Please select item type', 'error');
        return false;
    }
    
    if (!data.item_id) {
        showFormMessage('Please select an item', 'error');
        return false;
    }
    
    if (!data.movement_type) {
        showFormMessage('Please select movement type', 'error');
        return false;
    }
    
    if (!data.quantity_change || isNaN(data.quantity_change)) {
        showFormMessage('Please enter a valid quantity', 'error');
        return false;
    }
    
    if (data.quantity_change === 0) {
        showFormMessage('Quantity change cannot be zero', 'error');
        return false;
    }
    
    return true;
}

// Add event listeners for movement modal
document.addEventListener('DOMContentLoaded', function() {
    const movementItem = document.getElementById('movementItem');
    if (movementItem) {
        movementItem.addEventListener('change', updateStockInfo);
    }
    
    // Close modal when clicking outside
    const movementModal = document.getElementById('addMovementModal');
    if (movementModal) {
        movementModal.addEventListener('click', function(event) {
            if (event.target === movementModal) {
                closeAddMovementModal();
            }
        });
    }
    
    // Close modal with Escape key
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            closeAddMovementModal();
        }
    });
});








// Auto-initialize when page is shown
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM loaded - admin_inventory.js ready');
});