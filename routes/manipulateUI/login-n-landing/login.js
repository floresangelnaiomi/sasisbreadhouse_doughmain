// path:routes/manipulateUI/login-n-landing/login.js

const barangays = {
    Marilao: ["Abangan Norte", "Abangan Sur", "Ibayo", "Lias", "Lambakin", "Loma de Gato", "Poblacion I", "Poblacion II", "Patubig", "Prenza I", "Prenza II", "Santa Rosa I", "Santa Rosa II", "Saog"],
    Malolos: ["Anilao", "Atlag", "Bagna", "Bagong Bayan", "Babatnin", "Balayong", "Bungahan", "Bulihan", "Caingin", "Caniogan", "Dakila", "Guinhawa", "Longos", "Look 1st", "Look 2nd", "Lugam", "Mabolo", "Mambog", "Pinagbakahan", "San Gabriel", "Santisima Trinidad", "Santiago"],
    Meycauayan: ["Bagbaguin", "Bahay Pare", "Bancal", "Banga", "Bayugo", "Caingin", "Calvario", "Camalig", "Hulo", "Iba", "Langka", "Lawa", "Malhacan", "Pantoc", "Perez", "Poblacion", "Saluysoy", "Ubihan", "Zamora"]
};

document.addEventListener('DOMContentLoaded', function() {
    const municipalitySelect = document.getElementById("municipality");
    if (municipalitySelect) {
        municipalitySelect.addEventListener("change", function () {
            const val = this.value;
            const barangaySelect = document.getElementById("barangay");
            if (barangaySelect) {
                barangaySelect.innerHTML = '<option value="" disabled selected>Select Barangay</option>';
                if (barangays[val]) {
                    barangays[val].forEach(b => {
                        const opt = document.createElement("option");
                        opt.value = b;
                        opt.textContent = b;
                        barangaySelect.appendChild(opt);
                    });
                }
            }
        });
    }

    const container = document.querySelector('.container');
    const registerBtn = document.querySelector('.register-btn');
    const loginBtn = document.querySelector('.login-btn');
    if (registerBtn) registerBtn.addEventListener('click', () => container.classList.add('active'));
    if (loginBtn) loginBtn.addEventListener('click', () => container.classList.remove('active'));

    const loginPasswordField = document.querySelector('#loginForm input[type="password"]');
    const showPasswordCheckbox = document.getElementById('showPasswordCheckbox');
    if (showPasswordCheckbox && loginPasswordField) {
        showPasswordCheckbox.addEventListener('change', function() {
            const type = this.checked ? 'text' : 'password';
            loginPasswordField.setAttribute('type', type);
            const eyeIcon = this.nextElementSibling.querySelector('i');
            if (this.checked) {
                eyeIcon.classList.remove('bxs-show');
                eyeIcon.classList.add('bxs-hide');
            } else {
                eyeIcon.classList.remove('bxs-hide');
                eyeIcon.classList.add('bxs-show');
            }
        });
    }

    const registerPasswordField = document.getElementById('password');
    const registerPasswordCheckbox = document.getElementById('showRegisterPassword');
    if (registerPasswordCheckbox && registerPasswordField) {
        registerPasswordCheckbox.addEventListener('change', function() {
            const type = this.checked ? 'text' : 'password';
            registerPasswordField.setAttribute('type', type);
        });
    }

    const confirmPasswordField = document.getElementById('confirmPassword');
    const confirmPasswordCheckbox = document.getElementById('showConfirmPassword');
    if (confirmPasswordCheckbox && confirmPasswordField) {
        confirmPasswordCheckbox.addEventListener('change', function() {
            const type = this.checked ? 'text' : 'password';
            confirmPasswordField.setAttribute('type', type);
        });
    }

    const closePopupBtn = document.getElementById("closePopup");
    if (closePopupBtn) {
        closePopupBtn.addEventListener("click", () => {
            const popup = document.getElementById("popup");
            popup.style.opacity = "0";
            setTimeout(() => {
                popup.classList.remove("show");
                popup.style.opacity = "";
            }, 300);
        });
    }

    const registerForm = document.getElementById("registerForm");
    if (registerForm) {
        registerForm.addEventListener("submit", async function (event) {
            event.preventDefault();
            const firstName = document.getElementById("firstName").value.trim();
            const lastName = document.getElementById("lastName").value.trim();
            const contact = document.getElementById("contact").value.trim();
            const province = document.getElementById("province").value;
            const municipality = document.getElementById("municipality").value;
            const barangay = document.getElementById("barangay").value;
            const streetName = document.getElementById("streetName").value.trim();
            const houseNumber = document.getElementById("houseNumber").value.trim();
            const username = document.getElementById("username").value.trim();
            const password = document.getElementById("password").value;
            const confirmPassword = document.getElementById("confirmPassword").value;
            const termsAccepted = document.getElementById("termsCheckbox").checked;

            if (!firstName || !lastName || !contact || !province || !municipality || !barangay || !streetName || !houseNumber || !username || !password || !confirmPassword) {
                showPopup("Please fill up all fields!");
                return;
            }

            if (/\d/.test(firstName) || /\d/.test(lastName)) {
                showPopup("Name should not contain numbers.");
                return;
            }

            if (contact.length !== 11 || !/^\d+$/.test(contact)) {
                showPopup("Contact number must be exactly 11 digits.");
                return;
            }

            if (password.length < 8) {
                showPopup("Password must be at least 8 characters.");
                return;
            }

            if (password !== confirmPassword) {
                showPopup("Passwords do not match.");
                return;
            }

            if (!termsAccepted) {
                showPopup("You must agree to the Terms and Conditions and Privacy Policy to register.");
                return;
            }

            try {
                const response = await fetch('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        firstName, lastName, contact,
                        province: document.getElementById('province').value,
                        municipality: document.getElementById('municipality').value,
                        barangay: document.getElementById('barangay').value,
                        streetName, houseNumber, username, password
                    })
                });

                const result = await response.json();
                if (response.ok) {
                    showPopup("Registration successful! Please wait for admin verification.");
                    this.reset();
                    const barangaySelect = document.getElementById("barangay");
                    if (barangaySelect) barangaySelect.innerHTML = '<option value="" disabled selected>Select Barangay</option>';
                    container.classList.remove('active');
                } else {
                    showPopup(result.error || 'Registration failed!');
                }
            } catch (error) {
                console.error('Registration error:', error);
                showPopup('Network error! Please try again.');
            }
        });
    }
});

document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    if (error) showLoginAlert(error);
});

function showLoginAlert(errorType) {
    let message = '';
    switch(errorType) {
        case '1': message = 'Invalid username or password.'; break;
        case 'pending': message = 'Your account is pending approval. Please wait for admin verification.'; break;
        case 'suspended': message = 'Your account has been suspended. Please contact administrator.'; break;
        case 'rejected': message = 'Your account registration was rejected. Please contact administrator.'; break;
        case 'inactive': message = 'Your account is inactive. Please contact administrator.'; break;
        default: message = 'Login failed. Please try again.';
    }
    alert(message);
}

function showPopup(message) {
    const popup = document.getElementById("popup");
    const popupMessage = document.getElementById("popup-message");
    if (popup && popupMessage) {
        popupMessage.innerHTML = message;
        popup.classList.add("show");
    }
}

function showTerms() {
    showPopup("Terms and Conditions: By creating an account, you agree to abide by our community guidelines and terms of service. We reserve the right to suspend accounts that violate our policies.");
}

function showPrivacy() {
    showPopup("Privacy Policy: We value your privacy and will not share your data with third parties without your consent.");
}