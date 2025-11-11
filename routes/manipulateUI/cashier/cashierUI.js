// routes/manipulateUI/cashier/cashierUI.js
// Keep the same function name but add delivery status check
async function collectPayment(orderId, amount, orderNumber, resellerName, deliveryStatus) {
    // Check if order is delivered
    if (deliveryStatus !== 'Delivered') {
        alert(`🚚 Order Not Ready for Collection\n\n` +
              `Order: ${orderNumber}\n` +
              `Reseller: ${resellerName}\n` +
              `Delivery Status: ${deliveryStatus || 'Not Delivered'}\n\n` +
              `Please wait until the order is marked as "Delivered" before collecting payment.`);
        return;
    }
    
    // If delivered, proceed with payment collection
    const confirmCollect = confirm(
        ` Confirm Payment Collection\n\n` +
        `Order: ${orderNumber}\n` +
        `Reseller: ${resellerName}\n` +
        `Amount: ₱${parseFloat(amount).toFixed(2)}\n\n` +
        `Are you sure you want to mark this payment as collected?`
    );
    
    if (!confirmCollect) return;
    
    try {
        console.log("💵 Collecting payment for order:", orderId);
        
        const res = await fetch("/api/cashier/pending-payments/collect", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ order_id: orderId })
        });
        
        const data = await res.json();
        console.log("Payment collection response:", data);
        
        if (data.status === "success") {
            alert(`✅ Payment collected successfully!\nOrder: ${orderNumber}\nAmount: ₱${parseFloat(amount).toFixed(2)}`);
            
            // Remove the row immediately without reloading
            const row = document.querySelector(`tr[data-order-id="${orderId}"]`);
            if (row) {
                row.style.opacity = '0.5';
                setTimeout(() => {
                    row.remove();
                    
                    // Check if table is empty after removal
                    const tbody = document.getElementById("pendingOrdersList");
                    const noPendingMessage = document.getElementById("noPendingMessage");
                    if (tbody.children.length === 0) {
                        noPendingMessage.style.display = 'block';
                    }
                }, 500);
            } else {
                // Fallback: reload if row not found
                await loadPendingPayments();
            }
            
        } else {
            alert(`❌ Failed to collect payment: ${data.message || "Unknown error"}`);
        }
        
    } catch (err) {
        console.error("❌ Error collecting payment:", err);
        alert("❌ Could not connect to server. Please try again.");
    }
}
document.addEventListener("DOMContentLoaded", () => {
  // --- DOM references ---
  const breadContainer = document.getElementById("breadContainer");
  const searchBar = document.getElementById("searchBar");
  const sortFilter = document.getElementById("sortFilter");

  const quantityModal = document.getElementById("quantityModal");
  const closeModal = document.getElementById("closeModal");
  const quantityInput = document.getElementById("quantityInput");
  const increaseQty = document.getElementById("increaseQty");
  const decreaseQty = document.getElementById("decreaseQty");
  const confirmAdd = document.getElementById("confirmAdd");
  const modalBreadName = document.getElementById("modalBreadName");

  const orderList = document.getElementById("orderList");
  const totalAmountEl = document.getElementById("totalAmount");
  const clearOrderBtn = document.getElementById("clearOrder");
  const placeOrderBtn = document.getElementById("placeOrder");

  const cashGivenInput = document.getElementById("cashGiven");
  const changeAmount = document.getElementById("changeAmount");

  const menuModal = document.getElementById("menuModal");
  const profileModal = document.getElementById("profileModal");
  const pendingModal = document.getElementById("pendingModal");
  const logoutModal = document.getElementById("logoutModal");

  const menuBtn = document.getElementById("menuBtn");
  const profileBtn = document.getElementById("profileBtn");
  const pendingBtn = document.getElementById("pendingBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const closeMenu = document.getElementById("closeMenu");

  const closePending = document.getElementById("closePending");
  const closeProfile = document.getElementById("closeProfile");
  const confirmLogout = document.getElementById("confirmLogout");
  const cancelLogout = document.getElementById("cancelLogout");

  // Profile elements
  const profileImg = document.getElementById("profileImg");
  const profileImageInput = document.getElementById("profileImageInput");
  const profileImagePreview = document.getElementById("profileImagePreview");
  const cashierName = document.getElementById("cashierName");
  const usernameInput = document.getElementById("usernameInput");
  const saveProfile = document.getElementById("saveProfile");
  const resetProfile = document.getElementById("resetProfile");

  // State
  let allProducts = [];
  let currentProduct = null;
  const orders = {};
  let total = 0;
  let currentUser = { username: null, name: null, profile_picture_url: null };
  let originalProfileData = { username: null, profile_picture_url: null };

  // --- Modal utilities ---
  function showModal(modalEl) {
    if (!modalEl) return;
    modalEl.style.display = "flex";
    setTimeout(() => modalEl.classList.add("visible"), 10);
  }

  function hideModal(modalEl) {
    if (!modalEl) return;
    modalEl.classList.remove("visible");
    setTimeout(() => (modalEl.style.display = "none"), 200);
  }

  // -----------------------
  // Products & Ordering
  // -----------------------
  async function loadProducts() {
    try {
      const res = await fetch("/api/cashier/products");
      if (!res.ok) throw new Error("Network error");
      const products = await res.json();
      allProducts = Array.isArray(products) ? products : [];
      renderProducts(allProducts);
    } catch (err) {
      console.error("Failed to load products:", err);
      // Fallback data
      allProducts = [
        { product_id: 1, name: "Ensaymada", price: 20, image_url: "Ensaymada.png" },
        { product_id: 2, name: "Spanish Bread", price: 25, image_url: "SpanishBread.png" },
        { product_id: 3, name: "Monay", price: 30, image_url: "MonayBuns.png" },
        { product_id: 4, name: "Pandesal", price: 10, image_url: "Pandesal.png" },
      ];
      renderProducts(allProducts);
    }
  }


let loadPendingCount = 0;


async function loadPendingPayments() {
  const tbody = document.getElementById("pendingOrdersList");
  const noPendingMessage = document.getElementById("noPendingMessage");
  const loadingMessage = document.getElementById("loadingMessage");
  
  // Show loading, hide other messages
  tbody.innerHTML = "";
  noPendingMessage.style.display = 'none';
  loadingMessage.style.display = 'block';
  
  try {
    console.log("🔄 Loading pending payments...");
    
    // FIXED: Add /api prefix
    const res = await fetch("/api/cashier/pending-payments");
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    
    const orders = await res.json();
    console.log("✅ Pending orders loaded:", orders.length);
    
    // Hide loading
    loadingMessage.style.display = 'none';
    
    renderPendingOrders(orders);
    
  } catch (err) {
    console.error("❌ Failed to load pending payments:", err);
    // Hide loading, show error
    loadingMessage.style.display = 'none';
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; color: red; padding: 20px;">
          Error loading pending payments: ${err.message}
        </td>
      </tr>
    `;
  }
}

// Render pending orders table
function renderPendingOrders(orders) {
  const tbody = document.getElementById("pendingOrdersList");
  const noPendingMessage = document.getElementById("noPendingMessage");
  
  console.log("🎨 Rendering orders:", orders);
  
  if (!orders || orders.length === 0) {
    console.log("📭 No orders to display");
    tbody.innerHTML = "";
    noPendingMessage.style.display = 'block';
    return;
  }
  
  console.log(`📊 Displaying ${orders.length} orders`);
  noPendingMessage.style.display = 'none';
  
  tbody.innerHTML = orders.map(order => {
    console.log("🛒 Processing order:", order);
    
    const isDelivered = order.delivery_status === 'Delivered';
    const buttonText = isDelivered ? 'Collect Payment' : 'Not Ready for Collection';
    const buttonClass = isDelivered ? 'collect-payment-btn' : 'collect-payment-btn disabled';
    
    return `
    <tr data-order-id="${order.order_id}">
      <td><strong>${order.order_number}</strong></td>
      <td>${order.reseller_name || 'N/A'}</td>
      <td>${order.contact_number || 'N/A'}</td>
      <td>₱${parseFloat(order.total_amount).toFixed(2)}</td>
      <td>${new Date(order.order_date).toLocaleDateString()}</td>
      <td>
        <span class="payment-status ${isDelivered ? 'status-delivered' : 'status-pending'}">
          ${order.delivery_status || 'Pending'}
        </span>
      </td>
      <td>${order.external_driver_name || 'N/A'}</td>
      <td>
        <button class="${buttonClass}" 
                onclick="collectPayment(${order.order_id}, ${order.total_amount}, '${order.order_number}', '${order.reseller_name}', '${order.delivery_status}')">
           ${buttonText}
        </button>
      </td>
    </tr>
  `}).join('');
  
  console.log("✅ Table HTML updated");
}

function renderProducts(products) {
    breadContainer.innerHTML = "";
    if (!products || products.length === 0) {
      breadContainer.innerHTML = "<p style='color:#fff;'>No products found.</p>";
      return;
    }

    products.forEach((bread) => {
      const card = document.createElement("div");
      card.className = "bread-card";
      card.dataset.id = bread.product_id;
      card.dataset.name = bread.name;
      card.dataset.price = bread.price;
      card.dataset.stock = bread.stock_quantity || 0; // Add stock to dataset

      // FIXED: Remove the extra slash - use bread.image_url directly
      const imgPath = bread.image_url || "/assets/productimages/default-bread.png";

      card.innerHTML = `
        <img src="${imgPath}" alt="${bread.name}" class="bread-image" onerror="this.src='/design/default-bread.png'">
        <h4>${bread.name}</h4>
        <p>₱${bread.price}</p>
        <div class="stock-info ${(bread.stock_quantity || 0) <= 0 ? 'out-of-stock' : 'in-stock'}">
          ${(bread.stock_quantity || 0) > 0 ? `Stock: ${bread.stock_quantity}` : 'Out of Stock'}
        </div>
      `;

      // Disable clicking if out of stock
      if ((bread.stock_quantity || 0) <= 0) {
        card.classList.add('out-of-stock-card');
        card.style.opacity = '0.6';
        card.style.cursor = 'not-allowed';
      } else {
        card.addEventListener("click", () => {
          currentProduct = { 
            id: bread.product_id, 
            name: bread.name, 
            price: parseFloat(bread.price),
            stock: parseInt(bread.stock_quantity) || 0
          };
          modalBreadName.textContent = currentProduct.name;
          quantityInput.value = 1;
          showModal(quantityModal);
        });
      }

      breadContainer.appendChild(card);
    });
  }

  // Quantity modal handlers
  closeModal.addEventListener("click", () => hideModal(quantityModal));
  
  increaseQty.addEventListener("click", () => {
    quantityInput.value = parseInt(quantityInput.value || 1) + 1;
  });
  
  decreaseQty.addEventListener("click", () => {
    const currentValue = parseInt(quantityInput.value) || 1;
    if (currentValue > 1) {
      quantityInput.value = currentValue - 1;
    }
  });

confirmAdd.addEventListener("click", () => {
  const qty = Math.max(1, parseInt(quantityInput.value) || 1);
  if (!currentProduct) return hideModal(quantityModal);

  // Check if quantity exceeds available stock
  if (currentProduct.stock && qty > currentProduct.stock) {
    alert(`❌ Not enough stock! Only ${currentProduct.stock} items available.`);
    return;
  }

  const name = currentProduct.name;
  
  // Ensure all values are valid numbers
  const product_id = parseInt(currentProduct.id) || 0;
  const price = parseFloat(currentProduct.price) || 0;
  
  if (orders[name]) {
    const newTotalQty = orders[name].qty + qty;
    // Check if total quantity exceeds stock
    if (currentProduct.stock && newTotalQty > currentProduct.stock) {
      alert(`❌ Cannot add more items! Only ${currentProduct.stock - orders[name].qty} additional items available.`);
      return;
    }
    orders[name].qty += qty;
  } else {
    orders[name] = { 
      id: product_id, 
      price: price, 
      qty: qty 
    };
  }

  updateOrderTable();
  hideModal(quantityModal);
});

 function updateOrderTable() {
  orderList.innerHTML = "";
  let newTotal = 0;

  Object.entries(orders).forEach(([name, item]) => {
    // Ensure all values are valid numbers
    const product_id = parseInt(item.id) || 0;
    const price = parseFloat(item.price) || 0;
    const qty = parseInt(item.qty) || 0;
    const subtotal = price * qty;
    
    newTotal += subtotal;
    
    const tr = document.createElement("tr");
    tr.dataset.id = product_id;
    tr.dataset.name = name;
    tr.dataset.price = price;
    tr.dataset.qty = qty;

    tr.innerHTML = `
      <td>${name}</td>
      <td class="price-cell">₱${subtotal.toFixed(2)}</td>
      <td>
        <div class="quantity-controls">
          <button class="qty-btn minus-btn" data-name="${name}">−</button>
          <span class="qty-value">${qty}</span>
          <button class="qty-btn plus-btn" data-name="${name}">+</button>
        </div>
      </td>
    `;
    orderList.appendChild(tr);
  });

  total = newTotal;
  totalAmountEl.textContent = `₱${total.toFixed(2)}`;
  attachQtyButtons();
  computeChange();
}

  function attachQtyButtons() {
    document.querySelectorAll(".plus-btn").forEach(btn => {
      btn.onclick = () => {
        const name = btn.dataset.name;
        const productCard = document.querySelector(`.bread-card[data-name="${name}"]`);
        const availableStock = parseInt(productCard?.dataset.stock) || 0;
        
        if (orders[name].qty >= availableStock) {
          alert(`❌ Cannot add more! Only ${availableStock} items available in stock.`);
          return;
        }
        
        orders[name].qty++;
        updateOrderTable();
      };
    });
    
    document.querySelectorAll(".minus-btn").forEach(btn => {
      btn.onclick = () => {
        const name = btn.dataset.name;
        if (orders[name].qty > 1) {
          orders[name].qty--;
        } else {
          delete orders[name];
        }
        updateOrderTable();
      };
    });
  }

  clearOrderBtn.addEventListener("click", () => {
    for (const key in orders) {
      delete orders[key];
    }
    cashGivenInput.value = "";
    changeAmount.textContent = "₱0.00";
    updateOrderTable();
  });

  function computeChange() {
    const cash = parseFloat(cashGivenInput.value) || 0;
    const change = cash - total;
    changeAmount.textContent = `₱${(change >= 0 ? change : 0).toFixed(2)}`;
    changeAmount.style.color = change < 0 ? "red" : "#4a3b1e";
  }

  cashGivenInput.addEventListener("input", computeChange);

  // Search & sort
  searchBar.addEventListener("input", () => {
    const query = searchBar.value.trim().toLowerCase();
    Array.from(breadContainer.children).forEach(card => {
      const name = (card.dataset.name || "").toLowerCase();
      card.style.display = name.includes(query) ? "block" : "none";
    });
  });

  sortFilter.addEventListener("change", () => {
    const value = sortFilter.value;
    const cards = Array.from(document.querySelectorAll(".bread-card"));
    let sortedCards = [...cards];
    
    switch (value) {
      case "az":
        sortedCards.sort((a, b) => a.dataset.name.localeCompare(b.dataset.name));
        break;
      case "za":
        sortedCards.sort((a, b) => b.dataset.name.localeCompare(a.dataset.name));
        break;
      case "low":
        sortedCards.sort((a, b) => parseFloat(a.dataset.price) - parseFloat(b.dataset.price));
        break;
      case "high":
        sortedCards.sort((a, b) => parseFloat(b.dataset.price) - parseFloat(a.dataset.price));
        break;
      default:
        return;
    }
    
    breadContainer.innerHTML = "";
    sortedCards.forEach(card => breadContainer.appendChild(card));
  });

  // Place order
placeOrderBtn.addEventListener("click", async () => {
  const rows = Array.from(orderList.querySelectorAll("tr"));
  const cash = parseFloat(cashGivenInput.value) || 0;

  if (rows.length === 0) {
    alert(" Please add at least one product before placing an order.");
    return;
  }
  
  if (cash < total) {
    alert(` Insufficient cash! Total is ₱${total.toFixed(2)} but only ₱${cash.toFixed(2)} given.`);
    return;
  }

  // Build cart with proper validation
  const cart = rows.map(row => {
    const product_id = parseInt(row.dataset.id) || 0;
    const quantity = parseInt(row.dataset.qty) || 0;
    const unit_price = parseFloat(row.dataset.price) || 0;
    const subtotal = unit_price * quantity;
    
    return {
      product_id: product_id,
      quantity: quantity,
      unit_price: unit_price,
      subtotal: subtotal
    };
  });

  const total_amount = total;
// In cashierUI.js - update the loadPendingPayments function



// Update the collectPayment function

  try {
    const res = await fetch("/api/cashier/orders/place", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        total_amount: total_amount,
        cart: cart 
      })
    });
    
    const data = await res.json();
    
    if (data.status === "success") {
      const change = cash - total;
      alert(`✅ Order placed successfully!\nOrder Number: ${data.order_number}\nChange: ₱${change.toFixed(2)}`);
      
      // Clear order
      for (const key in orders) {
        delete orders[key];
      }
      
      total = 0;
      totalAmountEl.textContent = "₱0.00";
      cashGivenInput.value = "";
      changeAmount.textContent = "₱0.00";
      orderList.innerHTML = "";
    } else {
      alert(`❌ Failed to place order: ${data.message || "Unknown error"}`);
    }
  } catch (err) {
    console.error("Error placing order:", err);
    alert("❌ Could not connect to the server.");
  }
});
  // -----------------------
  // Profile Management - IMPROVED
  // -----------------------

  // Load cashier profile from server
// -----------------------
// Profile Management - FIXED
// -----------------------

// Load cashier profile from server
async function loadCashierProfile() {
  try {
    console.log("🔄 Loading cashier profile...");
    const res = await fetch("/api/user/me");
    
    if (!res.ok) {
      if (res.status === 401) {
        console.error("❌ Not authenticated - redirecting to login");
        window.location.href = "/login";
        return;
      }
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    
    const userData = await res.json();
    console.log("✅ Profile data received:", userData);
    
    const placeholderImg = "https://cdn-icons-png.flaticon.com/512/149/149071.png";
    
    // Update header display
    cashierName.textContent = userData.name || userData.username || "Cashier";
    
    // Update modal inputs
    usernameInput.value = userData.username || "";
    
    // Update images - FIXED: Handle image paths properly
    if (userData.profile_picture_url && userData.profile_picture_url.trim() !== "") {
      let imagePath = userData.profile_picture_url;
      
      // Ensure the path starts with / for absolute URLs
      if (!imagePath.startsWith('/') && !imagePath.startsWith('http')) {
        imagePath = '/' + imagePath;
      }
      
      console.log("🖼️ Setting profile image to:", imagePath);
      profileImg.src = imagePath;
      profileImagePreview.src = imagePath;
    } else {
      console.log("🖼️ Using placeholder image");
      profileImg.src = placeholderImg;
      profileImagePreview.src = placeholderImg;
    }
    
    // Set error handlers for images
    profileImg.onerror = () => {
      console.warn("❌ Header profile image failed to load, using placeholder");
      profileImg.src = placeholderImg;
    };
    
    profileImagePreview.onerror = () => {
      console.warn("❌ Modal profile image failed to load, using placeholder");
      profileImagePreview.src = placeholderImg;
    };
    
    // Store current user data
    currentUser = {
      username: userData.username,
      name: userData.name,
      profile_picture_url: userData.profile_picture_url
    };
    
    // Store original data for comparison
    originalProfileData = {
      username: userData.username,
      profile_picture_url: userData.profile_picture_url
    };
    
    console.log("💾 Original profile data stored:", originalProfileData);
    
  } catch (err) {
    console.error("❌ Failed to load profile:", err);
    const placeholderImg = "https://cdn-icons-png.flaticon.com/512/149/149071.png";
    
    cashierName.textContent = "Cashier";
    profileImg.src = placeholderImg;
    profileImagePreview.src = placeholderImg;
    usernameInput.value = "";
    
    originalProfileData = { username: null, profile_picture_url: null };
    
    // Show error message to user
    if (err.message.includes("401")) {
      alert("Session expired. Please login again.");
      window.location.href = "/login";
    }
  }
}
  // Check if profile has unsaved changes
  function hasUnsavedChanges() {
    const currentUsername = usernameInput.value.trim();
    const hasImageChange = profileImageInput.files.length > 0;
    
    // Check if username changed
    const usernameChanged = currentUsername !== originalProfileData.username;
    
    console.log("Checking unsaved changes:", {
      currentUsername,
      originalUsername: originalProfileData.username,
      usernameChanged,
      hasImageChange
    });
    
    return usernameChanged || hasImageChange;
  }

  // Profile image preview
  profileImageInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (ev) => {
      profileImagePreview.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });

  // Save profile
  saveProfile.addEventListener("click", async () => {
    const newUsername = usernameInput.value.trim();
    const file = profileImageInput.files[0];
    
    // Validation
    if (!newUsername) {
      alert("Please enter a username before saving.");
      return;
    }
    
    const formData = new FormData();
    formData.append("username", newUsername);
    if (file) {
      formData.append("profileImage", file);
    }
    
    try {
      console.log("Saving profile...");
      const res = await fetch("/api/user/updateProfile", {
        method: "POST",
        body: formData
      });
      
      const data = await res.json();
      console.log("Save profile response:", data);
      
      if (data.status === "success") {
        // Update original data to match current state
        originalProfileData.username = newUsername;
        if (file) {
          originalProfileData.profile_picture_url = data.profile_picture_url || originalProfileData.profile_picture_url;
        }
        
        // Clear file input
        profileImageInput.value = "";
        
        // Reload profile to get updated data
        await loadCashierProfile();
        hideModal(profileModal);
        alert(" Profile updated successfully!");
      } else {
        alert(` Failed to update profile: ${data.message || "Unknown error"}`);
      }
    } catch (err) {
      console.error("Profile update error:", err);
      alert(" Error connecting to server. Please try again.");
    }
  });

  resetProfile.addEventListener("click", async () => {
    const confirmReset = confirm(" Are you sure you want to reset your profile? This will remove your username and profile picture.");
    if (!confirmReset) return;
    
    try {
      console.log("Resetting profile...");
      const res = await fetch("/api/user/resetProfile", { 
        method: "POST" 
      });
      
      const data = await res.json();
      console.log("Reset profile response:", data);
      
      if (data.status === "success") {
        // Update original data
        originalProfileData = { username: null, profile_picture_url: null };
        
        // Reload profile to reflect changes
        await loadCashierProfile();
        
        // Clear the modal inputs but KEEP MODAL OPEN
        usernameInput.value = "";
        profileImageInput.value = "";
        
        // Focus on username input
        usernameInput.focus();
        alert("✅ Profile reset! Please set a new username.");
      } else {
        alert(`❌ Failed to reset profile: ${data.message || "Unknown error"}`);
      }
    } catch (err) {
      console.error("Reset profile error:", err);
      alert(" Error connecting to server. Please try again.");
    }
  });

  // Close profile with unsaved changes check
  closeProfile.addEventListener("click", (e) => {
    if (hasUnsavedChanges()) {
      const confirmClose = confirm(" You have unsaved changes. Are you sure you want to close without saving?");
      if (!confirmClose) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      
      // User confirmed - discard changes and reload original data
      loadCashierProfile().then(() => {
        hideModal(profileModal);
      });
    } else {
      // No changes - just close
      hideModal(profileModal);
    }
  });

  // Handle clicking outside modal
  profileModal.addEventListener("click", (e) => {
    if (e.target === profileModal) {
      if (hasUnsavedChanges()) {
        const confirmClose = confirm(" You have unsaved changes. Are you sure you want to close without saving?");
        if (!confirmClose) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        
        // User confirmed - discard changes and reload original data
        loadCashierProfile().then(() => {
          hideModal(profileModal);
        });
      } else {
        // No changes - just close
        hideModal(profileModal);
      }
    }
  });

  // Handle ESC key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && profileModal.style.display === 'flex') {
      if (hasUnsavedChanges()) {
        const confirmClose = confirm(" You have unsaved changes. Are you sure you want to close without saving?");
        if (!confirmClose) {
          e.preventDefault();
          e.stopImmediatePropagation();
          return;
        }
        
        // User confirmed - discard changes and reload original data
        loadCashierProfile().then(() => {
          hideModal(profileModal);
        });
      } else {
        // No changes - just close
        hideModal(profileModal);
      }
    }
  });

  // -----------------------
  // Menu & Modal Handlers
  // -----------------------
  menuBtn.addEventListener("click", () => showModal(menuModal));
  closeMenu.addEventListener("click", () => hideModal(menuModal));
  
  profileBtn.addEventListener("click", () => { 
    hideModal(menuModal); 
    // Reload profile data when opening modal to get fresh original data
    loadCashierProfile().then(() => {
      showModal(profileModal);
    });
  });
  
  pendingBtn.addEventListener("click", () => { 
    hideModal(menuModal); 
    showModal(pendingModal); 
    loadPendingPayments();
  });
  
  logoutBtn.addEventListener("click", () => { 
    hideModal(menuModal); 
    showModal(logoutModal); 
  });
  
  closePending.addEventListener("click", () => hideModal(pendingModal));
  cancelLogout.addEventListener("click", () => hideModal(logoutModal));
  confirmLogout.addEventListener("click", () => {
    window.location.href = "/logout";
  });

  // Initial load
  loadCashierProfile();
  loadProducts();


  // =======================
  // RETURN REQUEST MODAL
  // =======================
  
  // DOM references for return modal
  const returnRequestModal = document.getElementById('returnRequestModal');
  const closeReturnRequest = document.getElementById('closeReturnRequest');
  const cancelReturn = document.getElementById('cancelReturn');
  const returnRequestForm = document.getElementById('returnRequestForm');
  const orderNumber = document.getElementById('orderNumber');
  const productSelect = document.getElementById('productSelect');
  const returnQuantity = document.getElementById('returnQuantity');
  const decreaseReturnQty = document.getElementById('decreaseReturnQty');
  const increaseReturnQty = document.getElementById('increaseReturnQty');
  const returnReason = document.getElementById('returnReason');
  const actionTaken = document.getElementById('actionTaken');
  const refundAmountGroup = document.getElementById('refundAmountGroup');
  const refundAmount = document.getElementById('refundAmount');
  const submitReturn = document.getElementById('submitReturn');
  const returnNotes = document.getElementById('returnNotes');

  // Return button event listener
  returnBtn.addEventListener('click', () => { 
    hideModal(menuModal); 
    openReturnRequestModal();
  });

  // Return modal event listeners
  closeReturnRequest.addEventListener('click', closeReturnRequestModal);
  cancelReturn.addEventListener('click', closeReturnRequestModal);

  // Form event listeners
  returnRequestForm.addEventListener('submit', handleReturnSubmit);
  actionTaken.addEventListener('change', toggleRefundAmount);
  decreaseReturnQty.addEventListener('click', () => adjustReturnQuantity(-1));
  increaseReturnQty.addEventListener('click', () => adjustReturnQuantity(1));
  returnQuantity.addEventListener('input', calculateRefundAmount);
  productSelect.addEventListener('change', calculateRefundAmount);

  // Return modal functions
  function openReturnRequestModal() {
    returnRequestModal.style.display = "flex";
    setTimeout(() => returnRequestModal.classList.add("visible"), 10);
    loadProductsForReturn();
    resetReturnForm();
  }

  function closeReturnRequestModal() {
    returnRequestModal.classList.remove("visible");
    setTimeout(() => (returnRequestModal.style.display = "none"), 200);
  }

  async function loadProductsForReturn() {
    try {
      const response = await fetch('/api/cashier/products');
      if (!response.ok) throw new Error('Failed to fetch products');
      
      const products = await response.json();
      productSelect.innerHTML = '<option value="">Select a product</option>';
      
      products.forEach(product => {
        const option = document.createElement('option');
        option.value = product.product_id;
        option.textContent = `${product.name} - ₱${product.price}`;
        option.dataset.price = product.price;
        productSelect.appendChild(option);
      });
    } catch (error) {
      console.error('Error loading products:', error);
      productSelect.innerHTML = '<option value="">Error loading products</option>';
    }
  }

  function resetReturnForm() {
    returnRequestForm.reset();
    returnQuantity.value = 1;
    refundAmountGroup.style.display = 'none';
    refundAmount.value = '';
    submitReturn.disabled = false;
    submitReturn.textContent = 'Submit Return Request';
  }

  function adjustReturnQuantity(change) {
    const currentValue = parseInt(returnQuantity.value) || 1;
    const newValue = Math.max(1, currentValue + change);
    returnQuantity.value = newValue;
    calculateRefundAmount();
  }

  function toggleRefundAmount() {
    if (actionTaken.value === 'Refund') {
      refundAmountGroup.style.display = 'block';
      calculateRefundAmount();
    } else {
      refundAmountGroup.style.display = 'none';
      refundAmount.value = '';
    }
  }

  function calculateRefundAmount() {
    if (actionTaken.value === 'Refund' && productSelect.value) {
      const selectedProduct = productSelect.options[productSelect.selectedIndex];
      const productPrice = parseFloat(selectedProduct?.dataset.price) || 0;
      const quantity = parseInt(returnQuantity.value) || 1;
      const refundTotal = productPrice * quantity;
      refundAmount.value = refundTotal.toFixed(2);
    }
  }

async function handleReturnSubmit(event) {
  event.preventDefault();
  
  // Get form data
  const orderNumberValue = orderNumber.value.trim();
  const productId = productSelect.value;
  const quantity = returnQuantity.value;
  const returnReasonValue = returnReason.value;
  const actionTakenValue = actionTaken.value;
  const refundAmountValue = refundAmount.value || 0;
  const notesValue = returnNotes.value;

  // Validation
  if (!orderNumberValue) {
    alert('❌ Please enter an order number');
    return;
  }

  if (!productId) {
    alert('❌ Please select a product');
    return;
  }

  if (!returnReasonValue) {
    alert('❌ Please select a return reason');
    return;
  }

  if (!actionTakenValue) {
    alert('❌ Please select an action to take');
    return;
  }

  console.log('📦 Starting return submission process...');

  // Disable submit button
  submitReturn.disabled = true;
  submitReturn.textContent = 'Submitting...';

  try {
    let orderId;

    // ✅ METHOD 1: If user entered a numeric ID directly
    if (/^\d+$/.test(orderNumberValue)) {
      orderId = parseInt(orderNumberValue);
      console.log('🔍 Using numeric order ID:', orderId);
    } 
    // ✅ METHOD 2: If user entered order number like "ORD1001"
    else if (orderNumberValue.startsWith('ORD')) {
      console.log('🔍 Looking up order number:', orderNumberValue);
      
      const lookupResponse = await fetch('/api/cashier/orders/lookup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ order_number: orderNumberValue })
      });

      if (lookupResponse.ok) {
        const lookupData = await lookupResponse.json();
        if (lookupData.status === 'success' && lookupData.order_id) {
          orderId = lookupData.order_id;
          console.log('✅ Found order ID:', orderId, 'for order number:', orderNumberValue);
        } else {
          throw new Error(lookupData.message || `Order "${orderNumberValue}" not found`);
        }
      } else {
        throw new Error(`Lookup failed for order: ${orderNumberValue}`);
      }
    } else {
      throw new Error('Please enter a valid order number (like ORD1001) or order ID');
    }

    // Prepare data for API
    const returnData = {
      order_id: orderId,
      product_id: parseInt(productId),
      quantity: parseInt(quantity),
      return_reason: returnReasonValue,
      action_taken: actionTakenValue,
      refund_amount: parseFloat(refundAmountValue),
      notes: notesValue
    };

    console.log('📦 Submitting return request:', returnData);

    const response = await fetch('/api/cashier/returns/request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(returnData)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || `HTTP ${response.status}`);
    }

    if (result.status === 'success') {
      alert('✅ Return request submitted successfully!');
      closeReturnRequestModal();
      resetReturnForm();
    } else {
      throw new Error(result.message || 'Failed to submit return request');
    }
  } catch (error) {
    console.error('❌ Error submitting return:', error);
    alert(`❌ Error: ${error.message}`);
  } finally {
    submitReturn.disabled = false;
    submitReturn.textContent = 'Submit Return Request';
  }
}
  // Close modal when clicking outside
  window.addEventListener('click', (event) => {
    if (event.target === returnRequestModal) {
      closeReturnRequestModal();
    }
  });

});

//