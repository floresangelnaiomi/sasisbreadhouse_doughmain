// routes/manipulateUI/admin/admin_users.js

let allUsers = [];
let filteredUsers = [];
let allPendingUsers = [];
let filteredPendingUsers = [];
let currentUserRole = 'Admin'; 

document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ admin_users.js loaded');

    setupUserTabs();
    
 
    checkAddUserPermission();
});

function setupUserTabs() {
    const manageTab = document.querySelector('[data-page="manage-users"]');
    const pendingTab = document.querySelector('[data-page="pending-verification"]');
    
    if (manageTab) {
        manageTab.addEventListener('click', function() {
            console.log('📋 Switching to Manage Users tab');
            loadManageUsers();
        });
    }
    
    if (pendingTab) {
        pendingTab.addEventListener('click', function() {
            console.log('⏳ Switching to Pending Users tab');
            loadPendingUsers();
        });
    }
}

function checkAddUserPermission() {
    const addUserBtn = document.getElementById('addUserBtn');
    if (addUserBtn) {
    
        if (currentUserRole === 'Admin' || currentUserRole === 'Cashier') {
            addUserBtn.style.display = 'flex';
        } else {
            addUserBtn.style.display = 'none';
        }
    }
}

async function loadManageUsers() {
    try {
        showLoadingState('usersTableBody', 9);
        
        const response = await fetch('/api/admin/users');
        if (!response.ok) throw new Error('Failed to fetch users');
        
        const users = await response.json();
        console.log('📊 Loaded users:', users.length);
        
        allUsers = users;
        filteredUsers = [...allUsers];
        displayUsers();
    } catch (error) {
        console.error('Error loading users:', error);
        showErrorState('usersTableBody', 'Failed to load users');
        showNotification('Error loading users', 'error');
    }
}

async function loadPendingUsers() {
    try {
        showLoadingState('pendingUsersTableBody', 8);
        
        const response = await fetch('/api/admin/users/pending');
        if (!response.ok) throw new Error('Failed to fetch pending users');
        
        const result = await response.json();
        const pendingUsers = result.users || result;
        console.log('⏳ Loaded pending users:', pendingUsers.length);
        
        allPendingUsers = pendingUsers;
        filteredPendingUsers = [...allPendingUsers];
        displayPendingUsers();
    } catch (error) {
        console.error('Error loading pending users:', error);
        showErrorState('pendingUsersTableBody', 'Failed to load pending users');
        showNotification('Error loading pending users', 'error');
    }
}

function displayUsers() {
    const tbody = document.getElementById('usersTableBody');
    
    if (!tbody) {
        console.error('Users table body not found');
        return;
    }
    
    if (filteredUsers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; color: #666; padding: 2rem;">No users found matching your criteria</td></tr>';
        return;
    }
    
    tbody.innerHTML = filteredUsers.map(user => {
        const status = user.account_status || user.status || 'Unknown';
        
        return `
        <tr>
            <td>${user.user_id}</td>
            <td>${user.first_name} ${user.last_name}</td>
            <td>${user.username}</td>
            <td><span class="badge badge-${getRoleBadgeClass(user.role)}">${user.role}</span></td>
            <td><span class="badge badge-${getStatusBadgeClass(status)}">${status}</span></td>
            <td>${user.contact_number || '-'}</td>
            <td>${formatFullAddress(user)}</td>
            <td>${formatDate(user.created_at)}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-view" onclick="viewUser(${user.user_id})" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-edit" onclick="editUser(${user.user_id})" title="Edit User">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-delete" onclick="deleteUser(${user.user_id})" title="Delete User">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
        `;
    }).join('');
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

function displayPendingUsers() {
    const tbody = document.getElementById('pendingUsersTableBody');
    
    if (!tbody) {
        console.error('Pending users table body not found');
        return;
    }
    
    if (filteredPendingUsers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color: #666;">No pending users for verification</td></tr>';
        return;
    }
    
    tbody.innerHTML = filteredPendingUsers.map(user => `
        <tr>
            <td>${user.user_id}</td>
            <td>${user.first_name} ${user.last_name}</td>
            <td>${user.username}</td>
            <td><span class="badge badge-${getRoleBadgeClass(user.role)}">${user.role}</span></td>
            <td>${user.contact_number || '-'}</td>
            <td>${formatFullAddress(user)}</td>
            <td>${formatDate(user.created_at)}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-approve" onclick="approveUser(${user.user_id})" title="Approve User">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="btn-reject" onclick="rejectUser(${user.user_id})" title="Reject User">
                        <i class="fas fa-times"></i>
                    </button>
                    <button class="btn-view" onclick="viewUser(${user.user_id})" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function filterPendingUsers() {
    const roleFilter = document.getElementById('pendingRoleFilter').value;
    
    filteredPendingUsers = allPendingUsers.filter(user => {
        const roleMatch = !roleFilter || user.role === roleFilter;
        return roleMatch;
    });
    
    displayPendingUsers();
}

function searchUsers() {
    const searchTerm = document.getElementById('userSearch').value.toLowerCase();
    filteredUsers = allUsers.filter(user => 
        user.first_name.toLowerCase().includes(searchTerm) ||
        user.last_name.toLowerCase().includes(searchTerm) ||
        user.username.toLowerCase().includes(searchTerm) ||
        user.email?.toLowerCase().includes(searchTerm) ||
        user.contact_number?.includes(searchTerm)
    );
      filterUsers();
    displayUsers();
}

function filterUsers() {
    const roleFilter = document.getElementById('roleFilter')?.value || '';
    const statusFilter = document.getElementById('statusFilter')?.value || '';
    const searchTerm = document.getElementById('userSearch')?.value.toLowerCase() || '';
    
    console.log('🔍 Filtering users:', { roleFilter, statusFilter, searchTerm });
    
    filteredUsers = allUsers.filter(user => {
    
        const roleMatch = !roleFilter || user.role === roleFilter;
        
     
        const userStatus = user.account_status || user.status;
        const statusMatch = !statusFilter || userStatus === statusFilter;
        
 
        const searchMatch = !searchTerm || 
                           user.first_name?.toLowerCase().includes(searchTerm) ||
                           user.last_name?.toLowerCase().includes(searchTerm) ||
                           user.username?.toLowerCase().includes(searchTerm) ||
                           user.email?.toLowerCase().includes(searchTerm) ||
                           user.contact_number?.includes(searchTerm);
        
        return roleMatch && statusMatch && searchMatch;
    });
    
    console.log(`✅ Filtered ${filteredUsers.length} out of ${allUsers.length} users`);
    displayUsers();
}

function searchPendingUsers() {
    const searchTerm = document.getElementById('pendingSearch').value.toLowerCase();
    const roleFilter = document.getElementById('pendingRoleFilter').value;
    
   
    let tempFiltered = allPendingUsers;
    

    if (roleFilter) {
        tempFiltered = tempFiltered.filter(user => user.role === roleFilter);
    }
    
    
    filteredPendingUsers = tempFiltered.filter(user => 
        user.first_name.toLowerCase().includes(searchTerm) ||
        user.last_name.toLowerCase().includes(searchTerm) ||
        user.username.toLowerCase().includes(searchTerm) ||
        user.email?.toLowerCase().includes(searchTerm) ||
        user.contact_number?.includes(searchTerm)
    );
    
    displayPendingUsers();
}

function openAddUserModal() {
    const modal = document.getElementById('addUserModal');
    if (modal) {
        modal.style.display = 'block';
    
        loadBarangaysForUser();
    }
}

function closeAddUserModal() {
    const modal = document.getElementById('addUserModal');
    if (modal) {
        modal.style.display = 'none';

        document.getElementById('addUserForm').reset();
    }
}


function loadBarangaysForUser() {
    const municipality = document.getElementById('userMunicipality');
    const barangay = document.getElementById('userBarangay');
    
    if (!municipality || !barangay) return;
    

    barangay.innerHTML = '<option value="">Select Barangay</option>';
    
    const barangays = {
        'Malolos': [
            'Santo Niño', 'Santo Rosario', 'Santiago', 'San Agustin', 'San Gabriel', 
            'San Juan', 'San Pablo', 'San Vicente', 'Santisima Trinidad', 'Santa Cruz',
            'Santa Isabel', 'Santa Lucia', 'Santa Monica', 'Santisima Trinidad', 'Tikay',
            'Anilao', 'Atlag', 'Babatnin', 'Bagna', 'Bagong Bayan', 'Balayong',
            'Balite', 'Bangkal', 'Barihan', 'Bulihan', 'Bungahan', 'Caingin',
            'Calero', 'Caliligawan', 'Canalate', 'Caniogan', 'Catmon', 'Cofradia',
            'Dakila', 'Guinhawa', 'Ligas', 'Llong', 'Look 1st', 'Look 2nd',
            'Lugam', 'Mabolo', 'Mambog', 'Masile', 'Matimbo', 'Mojon',
            'Namayan', 'Niugan', 'Pamarawan', 'Panasahan', 'Pinagbakahan', 'San Jose',
            'San Marcos', 'Santo Cristo', 'Santo Rosario', 'Sumapang Matanda', 'Sumapang Bata',
            'Taal', 'Tikay'
        ],
        'Marilao': [
            'Abangan Norte', 'Abangan Sur', 'Ibayo', 'Lambakin', 'Lias', 'Loma de Gato',
            'Nagbalon', 'Patubig', 'Poblacion 1st', 'Poblacion 2nd', 'Prenza 1st',
            'Prenza 2nd', 'Santa Rosa 1st', 'Santa Rosa 2nd', 'Saog', 'Tabing Ilog'
        ],
        'Meycauayan': [
            'Poblacion', 'Caingin', 'Banga', 'Bayan', 'Calvario', 'Camalig', 'Gasak',
            'Hulo', 'Iba', 'Langka', 'Lawang', 'Libtong', 'Liputan', 'Longos',
            'Malhacan', 'Pajo', 'Pandayan', 'Pantoc', 'Perez', 'Saluysoy', 'St. Francis',
            'St. John', 'St. Mary', 'St. Michael', 'Tugatog', 'Ubihan', 'Zamora',
            'Bahay Pare', 'Bancal', 'Castillo', 'Deca', 'Gomez', 'Manggahan',
            'Niugan', 'Sampa loco', 'Tawiran'
        ]
    };
    
    const selectedMunicipality = municipality.value;
    if (selectedMunicipality && barangays[selectedMunicipality]) {
        barangays[selectedMunicipality].forEach(barangayName => {
            const option = document.createElement('option');
            option.value = barangayName;
            option.textContent = barangayName;
            barangay.appendChild(option);
        });
    }
}


async function submitUserForm(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const userData = {
        first_name: formData.get('first_name'),
        last_name: formData.get('last_name'),
        username: formData.get('username'),
        password: formData.get('password'),
        email: formData.get('email'),
        contact_number: formData.get('contact_number'),
        role: formData.get('role'),
        account_status: formData.get('account_status'),
        province: formData.get('province'),
        municipality: formData.get('municipality'),
        barangay: formData.get('barangay'),
        street_name: formData.get('street_name'),
        house_number: formData.get('house_number')
    };
    
    console.log('📤 Sending user data:', userData);
    
    try {
        const response = await fetch('/api/admin/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });
        
        console.log('📥 Response status:', response.status);
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || `Server error: ${response.status}`);
        }
        
        console.log('✅ User created successfully:', result);
        showNotification('User created successfully', 'success');
        closeAddUserModal();
        
      
        loadManageUsers();
        
    } catch (error) {
        console.error('❌ Error creating user:', error);
        showNotification(`Error creating user: ${error.message}`, 'error');
    }
}

async function viewUser(userId) {
    try {
        const response = await fetch(`/api/admin/users/${userId}`);
        if (!response.ok) throw new Error('Failed to fetch user details');
        
        const user = await response.json();
        
        document.getElementById('viewUserName').textContent = `${user.first_name} ${user.last_name}`;
        document.getElementById('viewUserUsername').textContent = user.username;
        document.getElementById('viewUserEmail').textContent = user.email || 'N/A';
        document.getElementById('viewUserContact').textContent = user.contact_number || 'N/A';
        document.getElementById('viewUserRole').textContent = user.role;
        document.getElementById('viewUserStatus').textContent = user.account_status;
        document.getElementById('viewUserCreated').textContent = formatDate(user.created_at);
        document.getElementById('viewUserAddress').textContent = formatFullAddress(user);
        
 
        const modal = document.getElementById('viewUserModal');
        if (modal) {
            modal.style.display = 'block';
        }
        
    } catch (error) {
        console.error('Error loading user details:', error);
        showNotification('Error loading user details', 'error');
    }
}

async function editUser(userId) {
    try {
        const response = await fetch(`/api/admin/users/${userId}`);
        if (!response.ok) throw new Error('Failed to fetch user for edit');
        
        const user = await response.json();
        
     
        document.getElementById('editUserId').value = user.user_id;
        document.getElementById('editUserName').textContent = `${user.first_name} ${user.last_name}`;
        document.getElementById('editUserUsername').textContent = user.username;
        document.getElementById('editUserRole').textContent = user.role;
        document.getElementById('editUserStatus').value = user.account_status;
   
        const modal = document.getElementById('editUserModal');
        if (modal) {
            modal.style.display = 'block';
        }
        
    } catch (error) {
        console.error('Error loading user for edit:', error);
        showNotification('Error loading user details', 'error');
    }
}

function closeViewUserModal() {
    const modal = document.getElementById('viewUserModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function closeEditUserModal() {
    const modal = document.getElementById('editUserModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

async function submitEditUserForm(event) {
    event.preventDefault();
    
    const userId = document.getElementById('editUserId').value;
    const newStatus = document.getElementById('editUserStatus').value;
    
    try {
        const response = await fetch(`/api/admin/users/${userId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        });
        
        if (!response.ok) throw new Error('Failed to update user status');
        
        showNotification(`User status updated to ${newStatus}`, 'success');
        closeEditUserModal();
        
      
        loadManageUsers();
        
    } catch (error) {
        console.error('Error updating user status:', error);
        showNotification('Error updating user status', 'error');
    }
}
async function deleteUser(userId) {
    const user = allUsers.find(u => u.user_id === userId) || allPendingUsers.find(u => u.user_id === userId);
    
    if (!user) {
        showNotification('User not found', 'error');
        return;
    }
    
    if (confirm(`Are you sure you want to delete user "${user.first_name} ${user.last_name}"? This action cannot be undone.`)) {
        try {
            const response = await fetch(`/api/admin/users/${userId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) throw new Error('Failed to delete user');
            
            showNotification('User deleted successfully', 'success');
            
           
            loadManageUsers();
            loadPendingUsers();
            
        } catch (error) {
            console.error('Error deleting user:', error);
            showNotification('Error deleting user', 'error');
        }
    }
}

async function approveUser(userId) {
    const user = allPendingUsers.find(u => u.user_id === userId);
    
    if (!user) {
        showNotification('User not found', 'error');
        return;
    }
    
    if (confirm(`Approve user "${user.first_name} ${user.last_name}"?`)) {
        try {
            const response = await fetch(`/api/admin/users/${userId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: 'Active' })
            });
            
            if (!response.ok) throw new Error('Failed to approve user');
            
            showNotification('User approved successfully', 'success');
            
         
            loadManageUsers();
            loadPendingUsers();
            
        } catch (error) {
            console.error('Error approving user:', error);
            showNotification('Error approving user', 'error');
        }
    }
}

async function rejectUser(userId) {
    const user = allPendingUsers.find(u => u.user_id === userId);
    
    if (!user) {
        showNotification('User not found', 'error');
        return;
    }
    
    if (confirm(`Reject user "${user.first_name} ${user.last_name}"?`)) {
        try {
            const response = await fetch(`/api/admin/users/${userId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: 'Rejected' })
            });
            
            if (!response.ok) throw new Error('Failed to reject user');
            
            showNotification('User rejected successfully', 'success');
            
          
            loadManageUsers();
            loadPendingUsers();
            
        } catch (error) {
            console.error('Error rejecting user:', error);
            showNotification('Error rejecting user', 'error');
        }
    }
}

async function updateUserStatus(userId, status) {
    try {
        const response = await fetch(`/api/admin/users/${userId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status })
        });
        
        if (!response.ok) throw new Error('Failed to update user status');
        
        showNotification(`User status updated to ${status}`, 'success');
        
        loadManageUsers();
        
    } catch (error) {
        console.error('Error updating user status:', error);
        showNotification('Error updating user status', 'error');
    }
}


function getRoleBadgeClass(role) {
    switch(role) {
        case 'Admin': return 'danger';
        case 'Cashier': return 'warning';
        case 'Reseller': return 'success';
        default: return 'secondary';
    }
}

function getStatusBadgeClass(status) {
    switch(status) {
        case 'Active': return 'success';
        case 'Inactive': return 'secondary';
        case 'Pending': return 'warning';
        case 'Verified': return 'info';
        case 'Rejected': return 'danger';
        case 'Suspended': return 'danger';
        default: return 'secondary';
    }
}

function formatFullAddress(user) {
    const parts = [];
    if (user.house_number) parts.push(user.house_number);
    if (user.street_name) parts.push(user.street_name);
    if (user.barangay) parts.push(user.barangay);
    if (user.municipality) parts.push(user.municipality);
    if (user.province) parts.push(user.province);
    
    return parts.length > 0 ? parts.join(', ') : 'No address provided';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function showLoadingState(tableBodyId, columns = 1) {
    const tbody = document.getElementById(tableBodyId);
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="${columns}" style="text-align:center; color: #666;"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>`;
    }
}

function showErrorState(tableBodyId, message = 'Error loading data', columns = 1) {
    const tbody = document.getElementById(tableBodyId);
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="${columns}" style="text-align:center; color: var(--danger);">${message}</td></tr>`;
    }
}

function showNotification(message, type = 'info') {

    alert(`${type.toUpperCase()}: ${message}`);
}


window.loadManageUsers = loadManageUsers;
window.loadPendingUsers = loadPendingUsers;
window.searchUsers = searchUsers;
window.filterUsers = filterUsers;
window.filterPendingUsers = filterPendingUsers;
window.searchPendingUsers = searchPendingUsers;
window.openAddUserModal = openAddUserModal;
window.closeAddUserModal = closeAddUserModal;
window.submitUserForm = submitUserForm;
window.loadBarangaysForUser = loadBarangaysForUser;
window.viewUser = viewUser;
window.editUser = editUser;
window.deleteUser = deleteUser;
window.approveUser = approveUser;
window.rejectUser = rejectUser;


document.addEventListener('DOMContentLoaded', function() {
    const userMunicipality = document.getElementById('userMunicipality');
    if (userMunicipality) {
        userMunicipality.addEventListener('change', loadBarangaysForUser);
    }
});

console.log('✅ admin_users.js loaded successfully');