function showLoading() {
  const loader = document.getElementById('loading-screen');
  loader.style.display = 'flex';
  loader.style.opacity = '1';
  setTimeout(() => {
    loader.style.opacity = '0';
    setTimeout(() => (loader.style.display = 'none'), 500);
  }, 1500);
}

const navLinks = document.querySelectorAll('.nav-links a');
const pages = document.querySelectorAll('.page');

navLinks.forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    showLoading();
    setTimeout(() => {
      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      const target = link.dataset.page;
      pages.forEach(p => p.classList.remove('active'));
      document.getElementById(target).classList.add('active');
      
      if (target === 'history') {
        loadOrderHistory();
      } else if (target === 'home') {
        loadOrderUpdates(); 
      }
    }, 600);
  });
});

document.getElementById('date').textContent = new Date().toLocaleDateString('en-US', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
});

let userData = {};
let selectedAvatarFile = null; 

const barangayData = {
  'Marilao': [
    'Abangan Norte', 'Abangan Sur', 'Ibayo', 'Lambakin', 'Lias', 'Poblacion 1', 'Poblacion 2.0', 'Prenza', 'Saog', 'Patubig'
  ],
  'Malolos': [
    'Anilao', 'Atlag', 'Babatnin', 'Bagna', 'Bagong Bayan', 'Balayong',
    'Balite', 'Bangkal', 'Barihan', 'Bulihan', 'Bungahan', 'Caingin',
    'Calero', 'Caliligawan', 'Canalate', 'Caniogan', 'Catmon', 'Cofradia',
    'Dakila', 'Guinhawa', 'Ligas', 'Liyang', 'Longos', 'Look 1st', 'Look 2nd',
    'Lugam', 'Mabolo', 'Mambog', 'Masile', 'Matimbo', 'Mojon', 'Namayan',
    'Niugan', 'Pamarawan', 'Panasahan', 'Pinagbakahan', 'San Agustin',
    'San Gabriel', 'San Juan', 'San Pablo', 'San Vicente', 'Santiago',
    'Santisima Trinidad', 'Santo Cristo', 'Santo Nino', 'Santo Rosario',
    'Sikatuna', 'Sumapang Matanda', 'Sumapang Bata', 'Taal', 'Tikay'
  ],
  'Meycauayan': [
    'Bagbaguin', 'Bancal', 'Bangah', 'Bayugo', 'Caingin', 'Calvario',
    'Camalig', 'Gasak', 'Hulo', 'Iba', 'Langka', 'Lawang', 'Libtong',
    'Liputan', 'Longos', 'Malhacan', 'Pajo', 'Pandayan', 'Pantoc',
    'Perez', 'Poblacion', 'Saluysoy', 'Tugatog', 'Ubihan', 'Zamora'
  ]
};


function setupAddressDropdowns() {
  const municipalitySelect = document.getElementById('municipality');
  const barangaySelect = document.getElementById('barangay');
  
  municipalitySelect.addEventListener('change', function() {
    const selectedMunicipality = this.value;
    barangaySelect.innerHTML = '<option value="">Select Barangay</option>';
    
    if (selectedMunicipality && barangayData[selectedMunicipality]) {
      barangayData[selectedMunicipality].forEach(barangay => {
        const option = document.createElement('option');
        option.value = barangay;
        option.textContent = barangay;
        barangaySelect.appendChild(option);
      });
    }
  });
}


async function updateProfileStatistics() {
  try {
    console.log('📊 Calculating statistics from order history...');
    
    if (!allOrders || allOrders.length === 0) {
      console.log('📊 No orders found in history');
      document.querySelector('.profile-stats p:nth-child(1) strong').textContent = '0';
      document.querySelector('.profile-stats p:nth-child(2) strong').textContent = '₱0.00';
      return;
    }
   
    const completedOrders = allOrders.filter(order => 
      order.order_status?.toLowerCase() === 'completed'
    );
    
    const completed_count = completedOrders.length;
    const total_spent = completedOrders.reduce((sum, order) => {
      return sum + (parseFloat(order.total_amount) || 0);
    }, 0);
    
    console.log('📊 Calculated statistics:', {
      completed_orders: completed_count,
      total_spent: total_spent.toFixed(2)
    });
    
  
    document.querySelector('.profile-stats p:nth-child(1) strong').textContent = completed_count;
    document.querySelector('.profile-stats p:nth-child(2) strong').textContent = `₱${total_spent.toFixed(2)}`;
    
  } catch (err) {
    console.error('Error calculating profile statistics:', err);

    document.querySelector('.profile-stats p:nth-child(1) strong').textContent = '0';
    document.querySelector('.profile-stats p:nth-child(2) strong').textContent = '₱0.00';
  }
}

async function loadOrderUpdates() {
  try {
    const orderUpdates = document.getElementById('orderUpdates');
    
    if (!allOrders || allOrders.length === 0) {
      orderUpdates.innerHTML = '<p>No recent orders found.</p>';
      return;
    }

  
    const activeOrders = allOrders.filter(order => 
      order.order_status && 
      order.order_status.toLowerCase() !== 'completed' &&
      order.order_status.toLowerCase() !== 'cancelled'
    );

    if (activeOrders.length === 0) {
      orderUpdates.innerHTML = '<p>All orders are completed! 🎉</p>';
      return;
    }

    let updatesHTML = '';
    
    activeOrders.forEach(order => {
      const orderNumber = order.order_number || `ORD${order.order_id}`;
      const status = order.order_status;
      const totalAmount = parseFloat(order.total_amount) || 0;
      
      let statusIcon = '•';
      let statusMessage = '';
      
      switch(status.toLowerCase()) {
        case 'pending':
          statusIcon = '•';
          statusMessage = 'is under review.';
          break;
        case 'approved':
          statusIcon = '•';
          statusMessage = 'has been approved';
          break;
        case 'in production':
          statusIcon = '•';
          statusMessage = 'is being prepared.';
          break;
        case 'packed':
          statusIcon = '•';
          statusMessage = 'is packed and ready.';
          break;
        case 'out for delivery':
        case 'out_for_delivery':
          statusIcon = '•';
          statusMessage = 'is out for delivery.';
          break;
        case 'delivered':
          statusIcon = '•';
          statusMessage = 'has been delivered.';
          break;
        default:
          statusIcon = '•';
          statusMessage = `is ${status}`;
      }
      
      updatesHTML += `
        <p class="order-update">
          ${statusIcon} Your <strong>${orderNumber}</strong> ${statusMessage}
          ${status.toLowerCase() === 'delivered' ? ' - Please confirm receipt' : ''}
        </p>
      `;
    });

    orderUpdates.innerHTML = updatesHTML;
    
  } catch (err) {
    console.error('Error loading order updates:', err);
    document.getElementById('orderUpdates').innerHTML = '<p>Error loading updates.</p>';
  }
}

function resetUnsavedAvatar() {
  if (selectedAvatarFile) {
 
    document.getElementById('avatarPreview').src = userData.profile_picture_url || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
    document.getElementById('avatarPreview').style.border =  '4px solid #d4a856';
    selectedAvatarFile = null;
    document.getElementById('avatarInput').value = '';
  }
}

async function fetchResellerDetails(userId) {
  try {
    const res = await fetch(`/api/reseller/details/${userId}`);
    if (!res.ok) throw new Error('Failed to fetch reseller details');
    return await res.json();
  } catch (err) {
    console.error('Error fetching reseller details:', err);
    return null;
  }
}


let currentSearchTerm = '';
let currentSortBy = 'newest';
let currentStatusFilter = 'all';


async function loadResellerDetails() {
  try {
    const resUser = await fetch('/api/user/session');
    if (!resUser.ok) throw new Error('Not logged in');
    const sessionData = await resUser.json();
    const userId = sessionData.user?.id;
    if (!userId) throw new Error('User ID not found in session');

    console.log('🔍 Fetching user details for ID:', userId);

    const details = await fetchResellerDetails(userId);
    if (!details) return;

    userData = details;

 
    console.log('👤 User data loaded:', details);
    console.log('🏠 Address data:', {
      province: details.province,
      municipality: details.municipality,
      barangay: details.barangay,
      street_name: details.street_name,
      house_number: details.house_number
    });

    resetUnsavedAvatar();

    document.getElementById('username').value = details.username || '';
    document.getElementById('firstName').value = details.first_name || '';
    document.getElementById('lastName').value = details.last_name || '';
    document.getElementById('email').value = details.email || '';
    document.getElementById('phone').value = details.contact_number || '';
    
 
    const provinceSelect = document.getElementById('province');
    const municipalitySelect = document.getElementById('municipality');
    const barangaySelect = document.getElementById('barangay');
    

    if (details.province) {
      provinceSelect.value = details.province;
    } else {
      provinceSelect.value = 'Bulacan'; 
    }
    
    if (details.municipality) {
      municipalitySelect.value = details.municipality;
      console.log('📍 Setting municipality:', details.municipality);
      
      municipalitySelect.dispatchEvent(new Event('change'));
      
     
      setTimeout(() => {
        if (details.barangay) {
          barangaySelect.value = details.barangay;
          console.log('📍 Set barangay to:', details.barangay);
        }
      }, 200);
    }
    

    document.getElementById('streetName').value = details.street_name || '';
    document.getElementById('houseNumber').value = details.house_number || '';
    
    console.log('📝 Populated form fields');

    document.getElementById('password').value = '';

    
    const preview = document.getElementById('avatarPreview');
    preview.src = details.profile_picture_url || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
    preview.onerror = () => preview.src = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';

    const displayName = `${details.first_name || ''} ${details.last_name || ''}`.trim() || details.username;
    document.getElementById('welcomeMessage').textContent = `Welcome, ${displayName}!`;
    document.getElementById('profileName').textContent = displayName;
    document.getElementById('profileEmail').textContent = details.email || '';
    
    await updateProfileStatistics();
    
  } catch (err) {
    console.error('❌ Error loading reseller details:', err);
  }
}

document.getElementById('saveProfile').addEventListener('click', async () => {
  const newPassword = document.getElementById('password').value;
  if (newPassword && newPassword.length < 6) {
    alert("Password must be at least 6 characters long!");
    return;
  }


  const firstName = document.getElementById('firstName').value.trim();
  const lastName = document.getElementById('lastName').value.trim();
  const municipality = document.getElementById('municipality').value;
  const barangay = document.getElementById('barangay').value;
  const streetName = document.getElementById('streetName').value.trim();
  const houseNumber = document.getElementById('houseNumber').value.trim();

  if (!firstName || !lastName) {
    alert("First name and last name are required!");
    return;
  }

  if (!municipality || !barangay || !streetName || !houseNumber) {
    alert("Please complete all address fields!");
    return;
  }

  try {
    let newAvatarUrl = userData.profile_picture_url; // keep current pfp


    if (selectedAvatarFile) {
      console.log('📤 Uploading avatar...');
      const avatarFormData = new FormData();
      avatarFormData.append('avatar', selectedAvatarFile);

      const avatarRes = await fetch(`/api/reseller/details/avatar/${userData.user_id}`, {
        method: 'POST',
        body: avatarFormData
      });
      
      if (!avatarRes.ok) {
        const errorText = await avatarRes.text();
        console.error('Avatar upload failed:', errorText);
        throw new Error('Failed to upload avatar: ' + errorText);
      }
      
      const avatarData = await avatarRes.json();
      console.log('✅ Avatar uploaded:', avatarData);
      
 
      if (avatarData.avatar) {
        newAvatarUrl = avatarData.avatar;
        console.log('🔄 New avatar URL:', newAvatarUrl);
      }
    }

  
    const updateData = {
      username: document.getElementById('username').value,
      first_name: firstName,
      last_name: lastName,
      email: document.getElementById('email').value,
      contact_number: document.getElementById('phone').value,
      province: 'Bulacan',
      municipality: municipality,
      barangay: barangay,
      street_name: streetName,
      house_number: houseNumber,
      profile_picture_url: newAvatarUrl 
    };

    if (newPassword) updateData.password = newPassword;

    console.log('📝 Updating profile with data:', updateData);
    const res = await fetch(`/api/reseller/details/update/${userData.user_id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('Profile update failed:', errorText);
      throw new Error('Failed to update profile: ' + errorText);
    }
    
    const responseData = await res.json();
    console.log('✅ Profile updated:', responseData);

    if (newAvatarUrl && newAvatarUrl !== userData.profile_picture_url) {
      console.log('🖼️ Updating avatar preview to:', newAvatarUrl);
      document.getElementById('avatarPreview').src = newAvatarUrl + '?t=' + new Date().getTime();
    }

    selectedAvatarFile = null;
    document.getElementById('avatarInput').value = '';

 
    userData = { 
      ...userData, 
      ...updateData,
      profile_picture_url: newAvatarUrl
    };

    const displayName = `${responseData.first_name || ''} ${responseData.last_name || ''}`.trim() || responseData.username;
    document.getElementById('welcomeMessage').textContent = `Welcome, ${displayName}!`;
    document.getElementById('profileName').textContent = displayName;
    document.getElementById('profileEmail').textContent = responseData.email;

    
    document.getElementById('password').value = '';
    

    alert('Profile saved successfully!');
    
  } catch (err) {
    console.error('❌ Error saving profile:', err);
    alert(`Failed to save profile: ${err.message}`);
  }
});

function applyFiltersAndDisplay() {
  let filteredOrders = [...allOrders];

  if (currentSearchTerm) {
    const searchTerm = currentSearchTerm.toLowerCase();
    filteredOrders = filteredOrders.filter(order => {
      const orderId = order.order_id?.toString() || '';
      const orderNumber = order.order_number?.toLowerCase() || '';
      const productNames = order.items?.map(item => 
        item.product_name?.toLowerCase() || ''
      ).join(' ') || '';
      
      return orderId.includes(searchTerm) ||
             orderNumber.includes(searchTerm) || 
             productNames.includes(searchTerm);
    });
  }
  

  if (currentStatusFilter !== 'all') {
    filteredOrders = filteredOrders.filter(order => 
      order.order_status?.toLowerCase() === currentStatusFilter.toLowerCase()
    );
  }
  
 
  filteredOrders.sort((a, b) => {
    const amountA = parseFloat(a.total_amount) || 0;
    const amountB = parseFloat(b.total_amount) || 0;
    
    const dateA = new Date(a.order_date || 0);
    const dateB = new Date(b.order_date || 0);
    
    switch (currentSortBy) {
      case 'newest':
        return dateB - dateA; 
      case 'oldest':
        return dateA - dateB; 
      case 'highest':
        return amountB - amountA; 
      case 'lowest':
        return amountA - amountB; 
      default:
        return dateB - dateA;
    }
  });
  
  displayOrderHistory(filteredOrders);
}


let currentOrder = [];
let availableProducts = [];
let isOrdering = false;
let currentStep = 'start';
let allOrders = [];




async function initializeChatSystem() {
    await fetchAvailableProducts();
    setupChatListeners();
}


async function fetchAvailableProducts() {
    try {
       
        const res = await fetch('/api/reseller/products');
        if (!res.ok) throw new Error('Failed to fetch products');
        const products = await res.json();
        console.log('Products from API:', products);

        if (products.length === 0) {
            console.warn('⚠️ No products returned from API');
            return [];
        }

        availableProducts = products.map(p => ({
            ...p,
            stock_quantity: p.stock_quantity || 999, 
            availability_status: p.availability_status || 'Active'
        }));
        
        console.log('Available products:', availableProducts);
        return availableProducts;
    } catch (err) {
        console.error('Error fetching products:', err);
        return [];
    }
}


function setupChatListeners() {

    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('quick-reply')) {
            const reply = e.target.dataset.reply;
            handleQuickReply(reply);
        }
    });

  
    document.getElementById('placeOrder').addEventListener('click', placeOrder);
 
    document.getElementById('clearOrder').addEventListener('click', clearOrder);
}


function handleQuickReply(reply) {
    if (reply === 'yes' && !isOrdering) {
        startOrdering();
    } else if (reply === 'no') {
        addBotMessage("No problem! Let me know when you're ready to order. 😊");
    }
}


function startOrdering() {
    isOrdering = true;
    
    addBotMessage(`Great! Here are our available products:`);
 
    showProductCards();
}


document.querySelector('.avatar-upload').addEventListener('click', () => {
  document.getElementById('avatarInput').click();
});

document.getElementById('avatarInput').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (!file) return;

 
  if (!file.type.startsWith('image/')) {
    alert('Please select an image file');
    return;
  }

  selectedAvatarFile = file;
  

  const reader = new FileReader();
  reader.onload = function(e) {
    document.getElementById('avatarPreview').src = e.target.result;
    document.getElementById('avatarPreview').style.border = '2px solid #d4a856';
  };
  reader.readAsDataURL(file);
});

document.getElementById('avatarInput').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (!file) return;


  selectedAvatarFile = file;
  

  const reader = new FileReader();
  reader.onload = function(e) {
    document.getElementById('avatarPreview').src = e.target.result;
    document.getElementById('avatarPreview').style.border = '2px solid #d4a856'; // Highlight that it's unsaved
  };
  reader.readAsDataURL(file);
});


function showProductCards() {
    const messagesContainer = document.getElementById('messagesContainer');
    
    const existingCards = messagesContainer.querySelectorAll('.product-carousel-container');
    existingCards.forEach(card => card.remove());
    
    const container = document.createElement('div');
    container.className = 'product-carousel-container';

   
    const searchInput = document.createElement('input');
    searchInput.className = 'product-search';
    searchInput.placeholder = 'Search products...';
    container.appendChild(searchInput);

   
    const productCarousel = document.createElement('div');
    productCarousel.className = 'product-carousel';
    container.appendChild(productCarousel);

    availableProducts.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.innerHTML = `
            <img src="${product.image_url}" alt="${product.name}" 
                 onerror="this.src='assets/productimages/default.jpg'">
            <div class="product-name">${product.name}</div>
            <div class="product-price">₱${product.price}</div>
            <button class="add-to-cart-btn" data-product-id="${product.product_id}">
                Add
            </button>
        `;
        productCarousel.appendChild(productCard);
    });

    const messageDiv = document.createElement('div');
    messageDiv.className = 'message bot-message';
    messageDiv.appendChild(container);
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

   
    searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase();
        productCarousel.querySelectorAll('.product-card').forEach(card => {
            const name = card.querySelector('.product-name').textContent.toLowerCase();
            card.style.display = name.includes(query) ? 'block' : 'none';
        });
    });


    productCarousel.querySelectorAll('.add-to-cart-btn').forEach(button => {
        button.addEventListener('click', function() {
            const productId = parseInt(this.dataset.productId);
            const product = availableProducts.find(p => p.product_id === productId);
            if (product) showQuantityModal(product);
        });
    });
}

function showQuantityModal(product) {
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    modalOverlay.innerHTML = `
        <div class="quantity-modal">
            <div class="modal-header">
                <h3>Add ${product.name}</h3>
                <button class="close-modal">&times;</button>
            </div>
            <div class="modal-body">
                <img src="${product.image_url}" alt="${product.name}" class="modal-product-image"
                     onerror="this.src='assets/productimages/default.jpg'">
                <div class="modal-product-info">
                    <p class="modal-price">₱${product.price} each</p>
                    <div class="quantity-selector">
                        <button class="quantity-btn minus">-</button>
                        <input type="number" class="quantity-input" value="1" min="1" max="${product.stock_quantity}">
                        <button class="quantity-btn plus">+</button>
                    </div>
                    <!-- Add stock level display here -->
                    <div class="stock-level">
                        <p class="modal-stock">Stock: ${product.stock_quantity}</p>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="cancel-btn">Cancel</button>
                <button class="add-to-order-btn">Add to Order</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modalOverlay);
    
    const quantityInput = modalOverlay.querySelector('.quantity-input');
    const minusBtn = modalOverlay.querySelector('.minus');
    const plusBtn = modalOverlay.querySelector('.plus');
    const closeBtn = modalOverlay.querySelector('.close-modal');
    const cancelBtn = modalOverlay.querySelector('.cancel-btn');
    const addBtn = modalOverlay.querySelector('.add-to-order-btn');
    

    minusBtn.addEventListener('click', () => {
        const currentValue = parseInt(quantityInput.value);
        if (currentValue > 1) {
            quantityInput.value = currentValue - 1;
        }
    });
    
    plusBtn.addEventListener('click', () => {
        const currentValue = parseInt(quantityInput.value);
        if (currentValue < product.stock_quantity) {
            quantityInput.value = currentValue + 1;
        }
    });
    
    quantityInput.addEventListener('change', () => {
        let value = parseInt(quantityInput.value);
        if (isNaN(value) || value < 1) value = 1;
        if (value > product.stock_quantity) value = product.stock_quantity;
        quantityInput.value = value;
    });
    
    function closeModal() {
        document.body.removeChild(modalOverlay);
    }
    
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
    });
    
    addBtn.addEventListener('click', () => {
        const quantity = parseInt(quantityInput.value);
        addToOrder(product, quantity);
        closeModal();
    });
}

function addToOrder(product, quantity) {
    const price = parseFloat(product.price);
    const existingItem = currentOrder.find(item => item.product_id === product.product_id);
    
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        currentOrder.push({
            product_id: product.product_id,
            product_name: product.name,
            price: price,
            quantity: quantity,
            image_url: product.image_url
        });
    }
    
    updateOrderDisplay();
    addBotMessage(`✅ Added ${quantity} ${product.name}(s) to your order.`);
}


function updateOrderDisplay() {
    const orderItems = document.getElementById('orderItems');
    const orderTotal = document.getElementById('orderTotal');
    
    let total = 0;
    let html = '';
    
    currentOrder.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        html += `
            <tr>
                <td>
                    <div class="order-item">
                        <img src="${item.image_url}" alt="${item.product_name}" class="order-item-image"
                             onerror="this.src='assets/productimages/default.jpg'">
                        <span>${item.product_name}</span>
                    </div>
                </td>
                <td>₱${item.price.toFixed(2)}</td>
                <td>${item.quantity}</td>
            </tr>
        `;
    });
    
    if (currentOrder.length === 0) {
        html = `<tr><td colspan="3" class="empty-order">No items in your order</td></tr>`;
    }
    
    orderItems.innerHTML = html;
    orderTotal.textContent = total.toFixed(2);
}



async function placeOrder() {
    if (currentOrder.length === 0) {
        alert("❌ Your cart is empty!");
        return;
    }

    if (!userData || !userData.user_id) {
        console.error('❌ User data not loaded:', userData);
        alert("❌ User information not loaded. Please refresh the page.");
        return;
    }

    try {
        const orderData = {
            user_id: userData.user_id, 
            items: currentOrder.map(item => ({
                product_id: item.product_id,
                product_name: item.product_name,
                price: parseFloat(item.price),
                quantity: parseInt(item.quantity)
            })),
            total_amount: parseFloat(currentOrder.reduce((total, item) => total + (item.price * item.quantity), 0))
        };

        console.log('🛒 Placing order with user_id:', orderData.user_id);
        console.log('Order data:', orderData);

        const res = await fetch('/api/reseller/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });

        const result = await res.json();
        
        if (!res.ok) {
            throw new Error(result.error || `Failed to place order: ${result.details || 'Unknown error'}`);
        }

        addBotMessage(`🎉 Order placed successfully!\nOrder ID: ${result.order_id}\nTotal: ₱${orderData.total_amount.toFixed(2)}\n\nThank you for your order!`);
        
    
        currentOrder = [];
        updateOrderDisplay();
        isOrdering = false;
        

        loadOrderHistory();
        await updateProfileStatistics();
       
        setTimeout(() => {
            const messagesContainer = document.getElementById('messagesContainer');
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message bot-message';
            
            messageDiv.innerHTML = `
                <p>Would you like to place another order?</p>
                <div class="message-buttons">
                    <button class="quick-reply" data-reply="yes">Yes</button>
                    <button class="quick-reply" data-reply="no">No</button>
                </div>
                <div class="message-time">Just now</div>
            `;
            
            messagesContainer.appendChild(messageDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, 1500);
        
    } catch (err) {
        console.error('Error placing order:', err);
        alert(`❌ Order failed: ${err.message}`);
        addBotMessage("❌ Failed to place order. Please try again.");
    }
}

function clearOrder() {
    currentOrder = [];
    updateOrderDisplay();
    isOrdering = false;
    
    const messagesContainer = document.getElementById('messagesContainer');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message bot-message';
    
    messageDiv.innerHTML = `
        <p>Order cleared. Would you like to start a new order?</p>
        <div class="message-buttons">
            <button class="quick-reply" data-reply="yes">Yes</button>
            <button class="quick-reply" data-reply="no">No</button>
        </div>
        <div class="message-time">Just now</div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function addBotMessage(message) {
    const messagesContainer = document.getElementById('messagesContainer');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message bot-message';
    
    messageDiv.innerHTML = `
        <p>${message}</p>
        <div class="message-time">Just now</div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}


async function loadOrderHistory() {
  const historyTable = document.getElementById('historyTable');
  const noOrders = document.getElementById('noOrders');
  
  historyTable.innerHTML = `<tr><td colspan="6" style="text-align:center">Loading orders...</td></tr>`;
  noOrders.style.display = 'none';
  
  try {
    const resUser = await fetch('/api/user/session');
    const userSession = await resUser.json();
    const resellerId = userSession?.user?.id;
    if (!resellerId) throw new Error("Not logged in");

    const res = await fetch(`/api/reseller/orders/history/${resellerId}`);
    if (!res.ok) throw new Error('Failed to fetch history');
    const orders = await res.json();
    
    allOrders = orders;
    applyFiltersAndDisplay();
    
  } catch (err) {
    console.error('Error loading order history:', err);
    historyTable.innerHTML = `<tr><td colspan="6" style="text-align:center">Error loading orders.</td></tr>`;
  }
}


function setupLogout() {
  const logoutBtn = document.getElementById('logoutBtn');
  
  logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    
    let message = 'Are you sure you want to logout?';
    
 
    if (selectedAvatarFile) {
      message = 'You have an unsaved avatar change. Are you sure you want to logout without saving?';
    }
    
    if (confirm(message)) {
      showLoading();
      setTimeout(() => {
        window.location.href = '/logout';
      }, 1000);
    }
  });
}

function displayOrderHistory(orders) {
    const historyTable = document.getElementById('historyTable');
    const noOrders = document.getElementById('noOrders');
    
    if (!orders || orders.length === 0) {
        historyTable.innerHTML = '';
        noOrders.style.display = 'block';
        return;
    }
    
    noOrders.style.display = 'none';
    
    let html = '';
    
    orders.forEach((order, index) => {
        let items = order.items;
        if (typeof items === 'string') {
            try { items = JSON.parse(items); } catch { items = []; }
        }
        
        const statusClass = getStatusClass(order.order_status);
        const totalAmount = parseFloat(order.total_amount) || 0;
        
    
        const orderNumber = order.order_number || `ORD${order.order_id}`;
        
        const canCancel = ['Pending', 'Approved'].includes(order.order_status);
        const cancelButton = canCancel ? 
            `<button class="cancel-btn" onclick="cancelOrder(${order.order_id})">
                Cancel
            </button>` : 
            '<span class="no-action">-</span>';
        
     
        const itemsDisplay = items.map(i => 
            `${i.product_name || 'Unknown Product'}`
        ).join('<br>');
        
        const quantitiesDisplay = items.map(i => 
            `${i.quantity || 0}`
        ).join('<br>');
        
        html += `<tr>
            <td>
                <span class="order-number">${orderNumber}</span>
            </td>
            <td>${itemsDisplay}</td>
            <td>${quantitiesDisplay}</td>
            <td><strong>₱${totalAmount.toFixed(2)}</strong></td>
            <td>${formatOrderDate(order.order_date)}</td>
            <td>
                <div class="status-cell">
                    <span class="status-badge ${statusClass}">${order.order_status || 'Unknown'}</span>
                    ${cancelButton}
                </div>
            </td>
        </tr>`;
    });
    
    historyTable.innerHTML = html;
}


async function cancelOrder(orderId) {
    if (!confirm('Are you sure you want to cancel this order? This action cannot be undone.')) {
        return;
    }

    try {
        const resUser = await fetch('/api/user/session');
        const userSession = await resUser.json();
        const userId = userSession?.user?.id;

        if (!userId) {
            throw new Error('User not logged in');
        }

        const response = await fetch(`/api/reseller/orders/cancel/${orderId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ user_id: userId })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Failed to cancel order');
        }

        alert(' Order cancelled successfully!');

        await loadOrderHistory();
        
    } catch (err) {
        console.error('Error cancelling order:', err);
        alert(` Failed to cancel order: ${err.message}`);
    }
}


function setupOrderHistoryControls() {

  const searchInput = document.getElementById('searchOrders');
  let searchTimeout;
  
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      currentSearchTerm = e.target.value.trim();
      applyFiltersAndDisplay();
    }, 300); 
  });
  

  const sortSelect = document.getElementById('sortBy');
  sortSelect.addEventListener('change', (e) => {
    currentSortBy = e.target.value;
    applyFiltersAndDisplay();
  });

  const statusFilter = document.getElementById('filterStatus');
  statusFilter.addEventListener('change', (e) => {
    currentStatusFilter = e.target.value;
    applyFiltersAndDisplay();
  });
}

function getStatusClass(status) {
  if (!status) return 'status-pending';
  
  const statusMap = {
    'pending': 'status-pending',
    'approved': 'status-approved',
    'packed': 'status-packed',
    'out for delivery': 'status-delivery',
    'out_for_delivery': 'status-delivery',
    'completed': 'status-completed', 
    'cancelled': 'status-cancelled'
  };
  
  const normalizedStatus = status.toLowerCase().replace(/\s+/g, '_');
  return statusMap[normalizedStatus] || 'status-pending';
}


function formatOrderDate(dateString) {
  if (!dateString) return '-';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    
 
    const currentYear = new Date().getFullYear();
    
    return date.toLocaleDateString('en-PH', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    });
  } catch (err) {
    console.error('Error formatting date:', err);
    return '-';
  }
}

window.addEventListener('load', async () => {
  showLoading();
  setupAddressDropdowns();
  await loadResellerDetails();
  setupLogout();
  await initializeChatSystem();
  setupOrderHistoryControls(); 
  await loadOrderHistory();
await loadOrderUpdates();
  await updateProfileStatistics();
  
});