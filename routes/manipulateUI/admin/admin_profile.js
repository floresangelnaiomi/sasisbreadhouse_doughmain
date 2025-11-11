// routes/manipulateUI/admin/admin_profile.js

const adminProfileImage = document.getElementById('adminProfileImage');
const profileImageUpload = document.getElementById('profileImageUpload');
const profileForm = document.getElementById('profileForm');
const editProfileBtn = document.getElementById('editProfileBtn');
const changePhotoBtn = document.getElementById('changePhotoBtn');
const saveCancelSection = document.getElementById('saveCancelSection');
const usernameField = document.getElementById('username');
const roleField = document.getElementById('role');
const firstNameField = document.getElementById('firstName');
const lastNameField = document.getElementById('lastName');
const emailField = document.getElementById('email');
const contactNumberField = document.getElementById('contactNumber');
const provinceField = document.getElementById('province');
const municipalityField = document.getElementById('municipality');
const barangayField = document.getElementById('barangay');
const streetNameField = document.getElementById('streetName');
const houseNumberField = document.getElementById('houseNumber');
const currentPasswordField = document.getElementById('currentPassword');
const newPasswordField = document.getElementById('newPassword');
const confirmPasswordField = document.getElementById('confirmPassword');

let adminId = null;
let originalData = {};
let isEditing = false;

const municipalityBarangays = {
    "Malolos": ["Anilao", "Atlag", "Babatnin", "Bagna", "Bagong Bayan", "Balayong", "Balite", "Bangkal", "Barihan", "Bulihan", "Bungahan", "Caingin", "Calero", "Caliligawan", "Canalate", "Caniogan", "Catmon", "Cofradia", "Dakila", "Guinhawa", "Ligas", "Liyang", "Longos", "Look 1st", "Look 2nd", "Lugam", "Mabolo", "Mambog", "Masile", "Matimbo", "Mojon", "Namayan", "Niugan", "Pamarawan", "Panasahan", "Pinagbakahan", "San Agustin", "San Gabriel", "San Juan", "San Pablo", "San Vicente", "Santiago", "Santisima Trinidad", "Santo Cristo", "Santo Nino", "Santo Rosario", "Sikatuna", "Sumapang Bata", "Sumapang Matanda", "Taal", "Tikay"],
    "Marilao": ["Abangan Norte", "Abangan Sur", "Ibayo", "Lambakin", "Lias", "Loma de Gato", "Nagbalon", "Patubig", "Poblacion 1st", "Poblacion 2nd", "Prenza", "Santa Rosa 1st", "Santa Rosa 2nd", "Saog"],
    "Meycauayan": ["Bagbaguin", "Bahay Pare", "Bancal", "Bangbang", "Bayan", "Caingin", "Calero", "Camalig", "Hulo", "Iba", "Langka", "Lawang", "Libtong", "Liputan", "Longos", "Malhacan", "Pajo", "Pandayan", "Pantoc", "Perez", "Poblacion", "Saluysoy", "Tugatog", "Ubihan", "Zamora"]
};

document.addEventListener('DOMContentLoaded', function() {
    console.log('🔄 Profile page initialized');
    getAdminSession().then(id => {
        adminId = id;
        if (adminId) {
            console.log('👤 Admin ID:', adminId);
            loadAdminProfile(adminId);
        } else {
            console.error('❌ No admin ID found');
        }
    });
    
    setupEventListeners();
    populateMunicipalities();
});

async function getAdminSession() {
    try {
        const response = await fetch('/api/user/session');
        if (response.ok) {
            const data = await response.json();
            console.log('🔐 Session data:', data);
            return data.user.id;
        }
    } catch (error) {
        console.error('❌ Error getting session:', error);
    }
    return null;
}

function setupEventListeners() {
    profileForm.addEventListener('submit', handleFormSubmit);
    profileImageUpload.addEventListener('change', handleImageUpload);
    
    municipalityField.addEventListener('change', function() {
        console.log('🏢 Municipality changed to:', this.value);
        loadBarangays();
    });
    
    usernameField.addEventListener('input', validateUsername);
    firstNameField.addEventListener('input', validateName);
    lastNameField.addEventListener('input', validateName);
    emailField.addEventListener('input', validateEmail);
    contactNumberField.addEventListener('input', validatePhoneNumber);
    municipalityField.addEventListener('change', validateAddress);
    barangayField.addEventListener('change', validateAddress);
    
    usernameField.addEventListener('blur', checkUsernameAvailability);
    emailField.addEventListener('blur', validateEmail);
}

function populateMunicipalities() {
    const municipalitySelect = document.getElementById('municipality');
    municipalitySelect.innerHTML = '<option value="">Select Municipality</option>';
    
    Object.keys(municipalityBarangays).forEach(municipality => {
        const option = document.createElement('option');
        option.value = municipality;
        option.textContent = municipality;
        municipalitySelect.appendChild(option);
    });
}

function loadBarangays() {
    const municipality = municipalityField.value;
    const barangaySelect = document.getElementById('barangay');
    
    console.log('📦 Loading barangays for:', municipality);
    
    barangaySelect.innerHTML = '<option value="">Select Barangay</option>';
    
    if (municipality && municipalityBarangays[municipality]) {
        municipalityBarangays[municipality].forEach(barangay => {
            const option = document.createElement('option');
            option.value = barangay;
            option.textContent = barangay;
            barangaySelect.appendChild(option);
        });
        console.log(`✅ Loaded ${municipalityBarangays[municipality].length} barangays for ${municipality}`);
    } else {
        console.log('❌ No barangays found for municipality:', municipality);
    }
    
    validateAddress();
}


function showTooltip(element, message) {
    const existingTooltips = document.querySelectorAll('.simple-tooltip');
    existingTooltips.forEach(tooltip => tooltip.remove());
    
    const tooltip = document.createElement('div');
    tooltip.className = 'simple-tooltip';
    tooltip.textContent = message;
    
    tooltip.style.cssText = `
        position: fixed;
        top: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: #333;
        color: white;
        padding: 10px 16px;
        border-radius: 6px;
        font-size: 14px;
        z-index: 10000;
        font-family: 'Poppins', sans-serif;
    `;
    
    document.body.appendChild(tooltip);
    
    setTimeout(() => {
        if (tooltip.parentNode) {
            tooltip.remove();
        }
    }, 3000);
}

function hideTooltip(element) {
    const tooltips = document.querySelectorAll('.simple-tooltip');
    tooltips.forEach(tooltip => tooltip.remove());
}


async function logoutAdmin() {
    try {
        const confirmLogout = confirm('Are you sure you want to log out?');
        if (!confirmLogout) return;

        const logoutBtn = document.getElementById('logoutBtn');
        logoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging out...';
        logoutBtn.disabled = true;

        const response = await fetch('/api/admin/logout', {
            method: 'POST',
            credentials: 'include'
        });

    
        localStorage.clear();
        sessionStorage.clear();

     window.location.href = '/login';

    } catch (error) {
        console.error('Logout error:', error);
        window.location.href = '/login';
    }
}

async function getAdminSession() {
    try {
        const response = await fetch('/api/user/session');
        if (response.ok) {
            const data = await response.json();
            console.log('🔐 Session data:', data);
                if (data.user && data.user.role === 'Admin') {
                return data.user.id;
            } else {
                console.error('❌ User is not an admin');
                window.location.href = '../login.html';
                return null;
            }
        } else {
            window.location.href = '../login.html';
            return null;
        }
    } catch (error) {
        console.error('❌ Error getting session:', error);
        window.location.href = '../login.html';
        return null;
    }
}
function validateUsername() {
    const username = usernameField.value.trim();
    const usernameRegex = /^(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;
    
    if (!username) {
        showTooltip(usernameField, 'Username is required');
        return false;
    } else if (username.length < 8) {
        showTooltip(usernameField, 'Username must be at least 8 characters long');
        return false;
    } else if (!usernameRegex.test(username)) {
        showTooltip(usernameField, 'Username must contain at least one capital letter and one number');
        return false;
    } else {
        hideTooltip(usernameField);
        return true;
    }
}

function validateName() {
    const field = this;
    const name = field.value.trim();
    const nameRegex = /^[a-zA-ZÀ-ÿ\s]{2,30}$/;
    
    if (!name) {
        showTooltip(field, `${field === firstNameField ? 'First name' : 'Last name'} is required`);
        return false;
    } else if (name.length < 2) {
        showTooltip(field, `${field === firstNameField ? 'First name' : 'Last name'} must be at least 2 characters long`);
        return false;
    } else if (!nameRegex.test(name)) {
        showTooltip(field, `${field === firstNameField ? 'First name' : 'Last name'} can only contain letters and spaces`);
        return false;
    } else {
        hideTooltip(field);
        return true;
    }
}

function validateEmail() {
    const email = emailField.value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!email) {
        showTooltip(emailField, 'Email address is required');
        return false;
    } else if (!emailRegex.test(email)) {
        showTooltip(emailField, 'Please enter a valid email address');
        return false;
    } else {
        hideTooltip(emailField);
        return true;
    }
}

function validatePhoneNumber() {
    const phone = contactNumberField.value.trim();
    const phoneRegex = /^09\d{9}$/;
    
    if (!phone) {
        showTooltip(contactNumberField, 'Contact number is required');
        return false;
    } else if (!phoneRegex.test(phone)) {
        showTooltip(contactNumberField, 'Phone number must be 11 digits starting with 09');
        return false;
    } else {
        hideTooltip(contactNumberField);
        return true;
    }
}

function validateAddress() {
    let isValid = true; 
    if (!municipalityField.value) {
        showTooltip(municipalityField, 'Municipality is required');
        isValid = false;
    } else {
        hideTooltip(municipalityField);
    }
    
    if (!barangayField.value) {
        showTooltip(barangayField, 'Barangay is required');
        isValid = false;
    } else {
        hideTooltip(barangayField);
    }
    
    return isValid;
}

async function checkUsernameAvailability() {
    const username = usernameField.value.trim();
    if (!username || username === originalData.username) {
        return;
    }
    if (!validateUsername()) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/check-username?username=${encodeURIComponent(username)}`);
        if (response.ok) {
            const result = await response.json();
            
            if (!result.available) {
                showTooltip(usernameField, 'Username is already taken');
                return false;
            } else {
                hideTooltip(usernameField);
                return true;
            }
        }
    } catch (error) {
        console.error('Error checking username availability:', error);
    }
}

async function loadAdminProfile(adminId) {
    try {
        const response = await fetch(`/api/admin/profile/${adminId}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const adminData = await response.json();
        console.log('📋 Admin data loaded:', adminData);
        displayAdminProfile(adminData);
        originalData = { ...adminData };
        
    } catch (error) {
        console.error('Error loading admin profile:', error);
        showTooltip(profileForm, 'Error loading profile data');
    }
}

function displayAdminProfile(adminData) {
    console.log('🔄 Displaying profile data');
    
    usernameField.value = adminData.username || '';
    roleField.value = adminData.role || 'Admin';
    firstNameField.value = adminData.first_name || '';
    lastNameField.value = adminData.last_name || '';
    emailField.value = adminData.email || '';
    contactNumberField.value = adminData.contact_number || '';
    provinceField.value = adminData.province || 'Bulacan';
    
  
    if (adminData.municipality) {
        console.log('📍 Setting municipality:', adminData.municipality);
        municipalityField.value = adminData.municipality;
        
   
        loadBarangays();
        
     
        if (adminData.barangay) {
            setTimeout(() => {
                console.log('📍 Setting barangay:', adminData.barangay);
                barangayField.value = adminData.barangay;
            }, 200);
        }
    }
    
    streetNameField.value = adminData.street_name || '';
    houseNumberField.value = adminData.house_number || '';
    

    currentPasswordField.value = '';
    newPasswordField.value = '';
    confirmPasswordField.value = '';
    
 
    if (adminData.profile_image) {
        adminProfileImage.src = adminData.profile_image;
        adminProfileImage.alt = `${adminData.first_name} ${adminData.last_name} Profile Picture`;
        
        adminProfileImage.onerror = function() {
            this.src = '../uploads/default_admin.png';
        };
    } else {
        adminProfileImage.src = '../uploads/default_admin.png';
    }
    
    resetValidationStyles();
    disableEditing(); 
}

function resetValidationStyles() {
    const fields = [usernameField, firstNameField, lastNameField, emailField, contactNumberField, 
                   municipalityField, barangayField];
    fields.forEach(field => hideTooltip(field));
}

function enableEditing() {
    console.log('✏️ Enabling edit mode');
    isEditing = true;
    
    const fields = [usernameField, firstNameField, lastNameField, emailField, contactNumberField, 
                   municipalityField, barangayField, streetNameField, houseNumberField];
    
    fields.forEach(field => {
        field.readOnly = false;
        field.classList.remove('readonly-field');
        field.classList.add('editable-field');
    });
    
    municipalityField.style.backgroundColor = '#fff';
    barangayField.style.backgroundColor = '#fff';
    changePhotoBtn.disabled = false;
    editProfileBtn.style.display = 'none';
    saveCancelSection.style.display = 'flex';
}

function disableEditing() {
    console.log('🔒 Disabling edit mode');
    const fields = [usernameField, firstNameField, lastNameField, emailField, contactNumberField, 
                   municipalityField, barangayField, streetNameField, houseNumberField,
                   currentPasswordField, newPasswordField, confirmPasswordField];
    
    fields.forEach(field => {
        field.readOnly = true;
        field.classList.add('readonly-field');
        field.classList.remove('editable-field');
    });
    
    municipalityField.style.backgroundColor = '#f5f5f5';
    barangayField.style.backgroundColor = '#f5f5f5';
    changePhotoBtn.disabled = true;
    resetValidationStyles();
}

function cancelEditing() {
    console.log('🚫 Canceling edits');
    isEditing = false;
    displayAdminProfile(originalData); // Reload original data
    editProfileBtn.style.display = 'block';
    saveCancelSection.style.display = 'none';
}

async function handleFormSubmit(event) {
    event.preventDefault();
    console.log('💾 Form submission started');
    
    if (!isEditing) {
        console.log('❌ Not in edit mode, ignoring submit');
        return;
    }
    
    if (!validateForm()) {
        console.log('❌ Form validation failed');
        return;
    }
    
    await saveProfileChanges();
}

function validateForm() {
    let isValid = true;
    
    resetValidationStyles();
    
    console.log('🔍 DEBUG - Starting form validation...');
    console.log('📊 Current form values:');
    console.log('- Username:', usernameField.value, 'Length:', usernameField.value.length);
    console.log('- First Name:', firstNameField.value, 'Length:', firstNameField.value.length);
    console.log('- Last Name:', lastNameField.value, 'Length:', lastNameField.value.length);
    console.log('- Email:', emailField.value);
    console.log('- Phone:', contactNumberField.value, 'Length:', contactNumberField.value.length);
    console.log('- Municipality:', municipalityField.value);
    console.log('- Barangay:', barangayField.value);
    
    const validations = [
        { name: 'Username', result: validateUsername(), field: usernameField },
        { name: 'First Name', result: validateName.call(firstNameField), field: firstNameField },
        { name: 'Last Name', result: validateName.call(lastNameField), field: lastNameField },
        { name: 'Email', result: validateEmail(), field: emailField },
        { name: 'Phone', result: validatePhoneNumber(), field: contactNumberField },
        { name: 'Address', result: validateAddress(), field: municipalityField }
    ];
    
    console.log('🧪 Validation Results:');
    validations.forEach(validation => {
        console.log(`- ${validation.name}: ${validation.result ? '✅ PASS' : '❌ FAIL'}`);
        if (!validation.result) {
            isValid = false;
            console.log(`  🚨 ${validation.name} validation failed!`);
        }
    });
    
    console.log('🔧 Manual validation checks:');
    

    const username = usernameField.value.trim();
    if (!username) {
        console.log('  ❌ Username: EMPTY');
    } else if (username.length < 8) {
        console.log('  ❌ Username: Too short (need 8 chars, got', username.length + ')');
    } else if (!/(?=.*[A-Z])(?=.*\d)/.test(username)) {
        console.log('  ❌ Username: Missing capital letter or number');
    } else {
        console.log('  ✅ Username: VALID');
    }
    
    const firstName = firstNameField.value.trim();
    if (!firstName) {
        console.log('  ❌ First Name: EMPTY');
    } else if (firstName.length < 2) {
        console.log('  ❌ First Name: Too short (need 2 chars, got', firstName.length + ')');
    } else {
        console.log('  ✅ First Name: VALID');
    }
    
    const lastName = lastNameField.value.trim();
    if (!lastName) {
        console.log('  ❌ Last Name: EMPTY');
    } else if (lastName.length < 2) {
        console.log('  ❌ Last Name: Too short (need 2 chars, got', lastName.length + ')');
    } else {
        console.log('  ✅ Last Name: VALID');
    }
    
    const email = emailField.value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
        console.log('  ❌ Email: EMPTY');
    } else if (!emailRegex.test(email)) {
        console.log('  ❌ Email: Invalid format');
    } else {
        console.log('  ✅ Email: VALID');
    }
    
    const phone = contactNumberField.value.trim();
    const phoneRegex = /^09\d{9}$/;
    if (!phone) {
        console.log('  ❌ Phone: EMPTY');
    } else if (!phoneRegex.test(phone)) {
        console.log('  ❌ Phone: Invalid format (need 09XXXXXXXXX)');
    } else {
        console.log('  ✅ Phone: VALID');
    }
    
    if (!municipalityField.value) {
        console.log('  ❌ Municipality: EMPTY');
    } else {
        console.log('  ✅ Municipality: VALID');
    }
    
    if (!barangayField.value) {
        console.log('  ❌ Barangay: EMPTY');
    } else {
        console.log('  ✅ Barangay: VALID');
    }
    
    console.log('✅ Final form validation result:', isValid);
    
    if (!isValid) {
        console.log('🚨 FORM VALIDATION FAILED - Check the validation errors above');
    
        showTooltip(profileForm, 'Please fix the validation errors highlighted above');
    }
    
    return isValid;
}
async function saveProfileChanges() {
    try {
        const submitButton = profileForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        
        const formData = new FormData();
        formData.append('username', usernameField.value.trim());
        formData.append('first_name', firstNameField.value.trim());
        formData.append('last_name', lastNameField.value.trim());
        formData.append('email', emailField.value.trim());
        formData.append('contact_number', contactNumberField.value.trim());
        formData.append('municipality', municipalityField.value);
        formData.append('barangay', barangayField.value);
        formData.append('street_name', streetNameField.value.trim());
        formData.append('house_number', houseNumberField.value.trim());
        
        console.log('💾 Saving profile data to server...');
        
        const response = await fetch(`/api/admin/profile/${adminId}`, {
            method: 'PUT',
            body: formData
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Profile saved successfully');
            
        
            originalData = { 
                ...originalData,
                username: usernameField.value.trim(),
                first_name: firstNameField.value.trim(),
                last_name: lastNameField.value.trim(),
                email: emailField.value.trim(),
                contact_number: contactNumberField.value.trim(),
                municipality: municipalityField.value,
                barangay: barangayField.value,
                street_name: streetNameField.value.trim(),
                house_number: houseNumberField.value.trim()
            };
            
            showTooltip(profileForm, 'Profile updated successfully!');
            
           
            disableEditing();
            editProfileBtn.style.display = 'block';
            saveCancelSection.style.display = 'none';
            isEditing = false;
            
        } else {
            throw new Error(result.message || 'Update failed');
        }
        
    } catch (error) {
        console.error('❌ Error updating profile:', error);
        showTooltip(profileForm, 'Error: ' + error.message);
    } finally {
        const submitButton = profileForm.querySelector('button[type="submit"]');
        submitButton.disabled = false;
        submitButton.innerHTML = '<i class="fas fa-save"></i> Save Changes';
    }
}

function triggerImageUpload() {
    if (!isEditing) return;
    profileImageUpload.click();
}

async function handleImageUpload(event) {
    const file = event.target.files[0];
    
    if (!file) return;
    
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
        showTooltip(profileImageUpload, 'Please select a valid image file');
        return;
    }
    
    if (file.size > 2 * 1024 * 1024) {
        showTooltip(profileImageUpload, 'Image size must be less than 2MB');
        return;
    }
    
    try {
        const formData = new FormData();
        formData.append('profile_image', file);

        formData.append('username', usernameField.value.trim());
        formData.append('first_name', firstNameField.value.trim());
        formData.append('last_name', lastNameField.value.trim());
        formData.append('email', emailField.value.trim());
        formData.append('contact_number', contactNumberField.value.trim());
        formData.append('municipality', municipalityField.value);
        formData.append('barangay', barangayField.value);
        formData.append('street_name', streetNameField.value.trim());
        formData.append('house_number', houseNumberField.value.trim());
        
        const response = await fetch(`/api/admin/profile/${adminId}`, {
            method: 'PUT',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            showTooltip(profileImageUpload, 'Profile picture updated!');
            await loadAdminProfile(adminId); // Reload to get new image URL
        }
        
    } catch (error) {
        console.error('Error uploading profile image:', error);
        showTooltip(profileImageUpload, 'Error updating profile picture');
    } finally {
        profileImageUpload.value = '';
    }
}