// routes/manipulateUI/admin/adminUI.js
document.addEventListener('DOMContentLoaded', async function() {
  console.log('adminUI.js loaded');
  
  initSubmenus();
  initNavigation();
  updateDate();

  
  if (window.loadDashboard) {
    await window.loadDashboard();
  } else {
    console.error(' loadDashboard function not found!');
  }

});

const originalShowPage = window.showPage;

window.showPage = function(pageId) {
    console.log('🔄 Switching to page:', pageId);
    
      if (typeof originalShowPage === 'function') {
        originalShowPage(pageId);
    } else {
  
        document.querySelectorAll('.page-content').forEach(page => {
            page.classList.remove('active');
        });
        const selectedPage = document.getElementById(pageId + '-page');
        if (selectedPage) {
            selectedPage.classList.add('active');
        }
    }
    
  
    initializePage(pageId);
};

function initializePage(pageId) {
    console.log('🎯 Initializing page:', pageId);
    
    switch(pageId) {
        // Dashboard
        case 'dashboard':
            if (typeof loadDashboard === 'function') {
                console.log('🚀 Calling loadDashboard...');
                loadDashboard();
            }
            break;
            
        // Inventory 
        case 'overview':
            if (typeof loadInventoryOverview === 'function') {
                console.log('🚀 Calling loadInventoryOverview...');
                loadInventoryOverview();
            }
            break;
        case 'items':
            if (typeof loadItemsPage === 'function') {
                console.log('🚀 Calling loadItemsPage...');
                loadItemsPage();
            }
            break;
        case 'stock-management':
            if (typeof loadStockManagement === 'function') {
                console.log('🚀 Calling loadStockManagement...');
                loadStockManagement();
            }
            break;
            
        // Orders 
        case 'order-history':
            if (typeof initializeOrderHistory === 'function') {
                console.log('🚀 Calling initializeOrderHistory...');
                initializeOrderHistory();
            }
            break;
        case 'returns-damaged':
            if (typeof loadReturnsPage === 'function') {
                console.log('🚀 Calling loadReturnsPage...');
                loadReturnsPage();
            }
            break;
        case 'delivery':
            if (typeof initializeDeliveryPage === 'function') {
                console.log('🚀 Calling initializeDeliveryPage...');
                initializeDeliveryPage();
            }
            break;
            
        // Users 
        case 'manage-users':
            if (typeof loadManageUsers === 'function') {
                console.log('🚀 Calling loadManageUsers...');
                loadManageUsers();
            }
            break;
        case 'pending-verification':
            if (typeof loadPendingUsers === 'function') {
                console.log('🚀 Calling loadPendingUsers...');
                loadPendingUsers();
            }
            break;
            
        case 'reports':
            if (typeof loadReports === 'function') {
                console.log('🚀 Calling loadReports...');
                loadReports();
            }
            break;
        case 'profile':
            if (typeof loadProfile === 'function') {
                console.log('🚀 Calling loadProfile...');
                loadProfile();
            }
            break;
            
        default:
            console.log('⚠️ No specific initialization for page:', pageId);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 Re-attaching navigation event listeners...');
    

    document.querySelectorAll('.menu-item[data-page]').forEach(item => {
        item.addEventListener('click', function() {
            const page = this.getAttribute('data-page');
            showPage(page);
        });
    });
    
  
    document.querySelectorAll('.submenu-item[data-page]').forEach(item => {
        item.addEventListener('click', function() {
            const page = this.getAttribute('data-page');
            showPage(page);
        });
    });
});


function switchToPage(page) {
  
  document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
  
 
  const targetPage = document.getElementById(`${page}-page`);
  if (targetPage) targetPage.classList.add('active');

  const pageTitle = page.charAt(0).toUpperCase() + page.slice(1).replace(/-/g, ' ');
  const headerTitle = document.querySelector('.header h1');
  if (headerTitle) headerTitle.textContent = pageTitle;


  loadPageData(page);
}


function showPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page-content').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show selected page
    const selectedPage = document.getElementById(pageId + '-page');
    if (selectedPage) {
        selectedPage.classList.add('active');
        
        // Initialize specific pages when shown
        if (pageId === 'items') {
            if (typeof loadItemsPage === 'function') {
                loadItemsPage();
            }
        } else if (pageId === 'overview') {
            if (typeof loadInventoryOverview === 'function') {
                loadInventoryOverview();
            }
        } else if (pageId === 'dashboard') {
            if (typeof loadDashboard === 'function') {
                loadDashboard();
            }
        }
    }
}

function loadPageData(page) {
  switch(page) {
    // Dashboard
    case 'dashboard':
      if (window.loadDashboard) window.loadDashboard();
      break;
      
    // Inventory Submenu
    case 'overview':
      if (window.loadInventoryOverview) window.loadInventoryOverview();
      break;
    case 'items':
      if (window.loadInventoryItems) window.loadInventoryItems();
      break;
    case 'stock-management':
      if (window.loadStockManagement) window.loadStockManagement();
      break;
      
    // Orders Submenu
    case 'order-history':
      if (window.initializeOrderHistory) window.initializeOrderHistory();
      break;
    case 'returns-damaged':
      if (window.loadReturnsPage) window.loadReturnsPage();
      break;
    case 'delivery':
      if (window.initializeDeliveryPage) window.initializeDeliveryPage();
      break;
      
    // Users 
    case 'manage-users':
      if (window.loadManageUsers) window.loadManageUsers();
      break;
    case 'pending-verification':
      if (window.loadPendingUsers) window.loadPendingUsers();
      break;
      

    case 'reports':
      if (window.loadReports) window.loadReports();
      break;
    case 'profile':
      if (window.loadProfile) window.loadProfile();
      break;
      
    default:
      console.log('⚠️ No data loader for page:', page);
  }
}
function initSubmenus() {
  const submenus = document.querySelectorAll('.menu-item.has-submenu');
  
  submenus.forEach(menu => {
    const submenu = menu.nextElementSibling;
    if (!submenu) return;

    menu.addEventListener('click', e => {
      e.stopPropagation();
      const isOpen = submenu.classList.contains('open');
      
   
      document.querySelectorAll('.submenu').forEach(sm => {
        if (sm !== submenu) {
          sm.classList.remove('open');
        }
      });
      
      submenu.classList.toggle('open', !isOpen);
    });

    submenu.addEventListener('click', e => e.stopPropagation());
  });


  document.addEventListener('click', (e) => {
    if (!e.target.closest('.sidebar')) {
      document.querySelectorAll('.submenu').forEach(sm => sm.classList.remove('open'));
    }
  });
}

function initNavigation() {
 
  document.querySelectorAll('.menu-item:not(.has-submenu)').forEach(item => {
    item.addEventListener('click', function() {
      const page = this.getAttribute('data-page');
      if (page) {
        switchToPage(page);
        
       
        document.querySelectorAll('.menu-item, .submenu-item').forEach(i => i.classList.remove('active'));
        
    
        this.classList.add('active');
        
     
        document.querySelectorAll('.submenu').forEach(sm => sm.classList.remove('open'));
      }
    });
  });


  document.querySelectorAll('.submenu-item').forEach(item => {
    item.addEventListener('click', function() {
      const page = this.getAttribute('data-page');
      if (page) {
        switchToPage(page);
        
       
        document.querySelectorAll('.menu-item, .submenu-item').forEach(i => i.classList.remove('active'));
        
      
        this.classList.add('active');
        
    
        const parentMenu = this.closest('.submenu').previousElementSibling;
        if (parentMenu && parentMenu.classList.contains('has-submenu')) {
          parentMenu.classList.add('active');
        }
        
   
        const submenu = this.closest('.submenu');
        if (submenu) {
          submenu.classList.add('open');
        }
      }
    });
  });
}


function updateDate() {
  const now = new Date();
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const month = months[now.getMonth()];
  const day = now.getDate();
  const year = now.getFullYear();
  const dateString = `${month} ${day}, ${year}`;
  const dateEl = document.getElementById("date");
  if (dateEl) dateEl.textContent = dateString;
}

