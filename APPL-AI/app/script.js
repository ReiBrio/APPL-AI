// Smooth scroll for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Intersection Observer for fade-in animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe cards for animation
document.querySelectorAll('.company-card, .testimonial-card').forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(card);
});

// ============================================
// AUTHENTICATION SYSTEM
// ============================================
// Store selected role for registration
let selectedRole = 'applicant';
let currentPanel = 1;

// Login Form Handler
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;
            
            if (!username || !password) {
                alert('Please fill in all fields');
                return;
            }
            
            alert('Login successful!');
        });
    }
    
    // Forgot Password Form Handler
    const forgotForm = document.getElementById('forgotForm');
    if (forgotForm) {
        forgotForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = document.getElementById('forgotEmail').value.trim();
            const code = document.getElementById('verificationCode').value.trim();
            
            if (!email || !code) {
                alert('Please fill in all fields');
                return;
            }
            
            if (!validateEmail(email)) {
                alert('Please enter a valid email address');
                return;
            }
            
            // Hide forgot container, show reset container
            document.getElementById('forgotContainer').classList.add('hidden');
            document.getElementById('resetContainer').classList.remove('hidden');
        });
    }
    
    // Reset Password Form Handler
    const resetForm = document.getElementById('resetForm');
    if (resetForm) {
        resetForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            if (!newPassword || !confirmPassword) {
                alert('Please fill in all fields');
                return;
            }
            
            if (newPassword !== confirmPassword) {
                alert('Passwords do not match!');
                return;
            }
            
            if (newPassword.length < 6) {
                alert('Password must be at least 6 characters long');
                return;
            }
            
            alert('Password reset successful! Please login with your new password.');
            window.location.href = 'login.html';
        });
    }
    
    // Send Verification Code Button
    const sendCodeBtn = document.querySelector('.send-code-btn');
    if (sendCodeBtn) {
        sendCodeBtn.addEventListener('click', function() {
            const email = document.getElementById('forgotEmail').value.trim();
            if (!email) {
                alert('Please enter your email address first');
                return;
            }
            if (!validateEmail(email)) {
                alert('Please enter a valid email address');
                return;
            }
            alert('Verification code sent to ' + email);
        });
    }
    
    // Registration Panel 1 Handler
    const registerForm1 = document.getElementById('registerForm1');
    if (registerForm1) {
        registerForm1.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const accountType = document.getElementById('accountType').value;
            const email = document.getElementById('regEmail').value.trim();
            const username = document.getElementById('regUsername').value.trim();
            const password = document.getElementById('regPassword').value;
            
            if (!email || !username || !password) {
                alert('Please fill in all fields');
                return;
            }
            
            if (!validateEmail(email)) {
                alert('Please enter a valid email address');
                return;
            }
            
            if (password.length < 6) {
                alert('Password must be at least 6 characters long');
                return;
            }
            
            selectedRole = accountType;
            currentPanel = 2;
            
            document.getElementById('panel1').classList.add('hidden');
            
            if (selectedRole === 'applicant') {
                document.getElementById('panel2Applicant').classList.remove('hidden');
            } else {
                document.getElementById('panel2Employer').classList.remove('hidden');
            }
        });
    }
    
    // Applicant Panel 2 Handler
    const applicantForm1 = document.getElementById('applicantForm1');
    if (applicantForm1) {
        applicantForm1.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const surname = document.getElementById('surname').value.trim();
            const firstName = document.getElementById('firstName').value.trim();
            const address = document.getElementById('address').value.trim();
            
            if (!surname || !firstName || !address) {
                alert('Please fill in all required fields');
                return;
            }
            
            currentPanel = 3;
            document.getElementById('panel2Applicant').classList.add('hidden');
            document.getElementById('panel3Applicant').classList.remove('hidden');
        });
    }
    
    // Applicant Panel 3 Handler
    const applicantForm2 = document.getElementById('applicantForm2');
    if (applicantForm2) {
        applicantForm2.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const birthDay = document.getElementById('birthDay').value.trim();
            const birthMonth = document.getElementById('birthMonth').value.trim();
            const birthYear = document.getElementById('birthYear').value.trim();
            const sex = document.getElementById('sex').value;
            const contactNumber = document.getElementById('contactNumber').value.trim();
            
            if (!birthDay || !birthMonth || !birthYear || !sex || !contactNumber) {
                alert('Please fill in all fields');
                return;
            }
            
            if (!validateDate(birthDay, birthMonth, birthYear)) {
                alert('Please enter a valid date');
                return;
            }
            
            currentPanel = 4;
            document.getElementById('panel3Applicant').classList.add('hidden');
            document.getElementById('panel4Final').classList.remove('hidden');
        });
    }
    
    // Employer Panel 2 Handler
    const employerForm1 = document.getElementById('employerForm1');
    if (employerForm1) {
        employerForm1.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const companyName = document.getElementById('companyName').value.trim();
            const companyAddress = document.getElementById('companyAddress').value.trim();
            const companyContact = document.getElementById('companyContact').value.trim();
            const industry = document.getElementById('industry').value.trim();
            
            if (!companyName || !companyAddress || !companyContact || !industry) {
                alert('Please fill in all fields');
                return;
            }
            
            currentPanel = 3;
            document.getElementById('panel2Employer').classList.add('hidden');
            document.getElementById('panel3Employer').classList.remove('hidden');
        });
    }
    
    // Employer Panel 3 Handler
    const employerForm2 = document.getElementById('employerForm2');
    if (employerForm2) {
        employerForm2.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const employerFullName = document.getElementById('employerFullName').value.trim();
            const employerPosition = document.getElementById('employerPosition').value.trim();
            const employerEmail = document.getElementById('employerEmail').value.trim();
            const employerContact = document.getElementById('employerContact').value.trim();
            
            if (!employerFullName || !employerPosition || !employerEmail || !employerContact) {
                alert('Please fill in all fields');
                return;
            }
            
            if (!validateEmail(employerEmail)) {
                alert('Please enter a valid email address');
                return;
            }
            
            currentPanel = 4;
            document.getElementById('panel3Employer').classList.add('hidden');
            document.getElementById('panel4Final').classList.remove('hidden');
        });
    }
    
    // Final Panel Handler
    const finalForm = document.getElementById('finalForm');
    if (finalForm) {
        finalForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const terms = document.querySelector('input[name="terms"]').checked;
            
            if (!terms) {
                alert('Please agree to the Terms and Conditions');
                return;
            }
            
            alert('Account created successfully!');
            window.location.href = 'login.html';
        });
    }
    
    // Previous Button Handlers
    document.querySelectorAll('.prev-panel').forEach(btn => {
        btn.addEventListener('click', function() {
            if (currentPanel === 2) {
                document.getElementById('panel2Applicant').classList.add('hidden');
                document.getElementById('panel2Employer').classList.add('hidden');
                document.getElementById('panel1').classList.remove('hidden');
                currentPanel = 1;
            } else if (currentPanel === 3) {
                if (selectedRole === 'applicant') {
                    document.getElementById('panel3Applicant').classList.add('hidden');
                    document.getElementById('panel2Applicant').classList.remove('hidden');
                } else {
                    document.getElementById('panel3Employer').classList.add('hidden');
                    document.getElementById('panel2Employer').classList.remove('hidden');
                }
                currentPanel = 2;
            } else if (currentPanel === 4) {
                document.getElementById('panel4Final').classList.add('hidden');
                if (selectedRole === 'applicant') {
                    document.getElementById('panel3Applicant').classList.remove('hidden');
                } else {
                    document.getElementById('panel3Employer').classList.remove('hidden');
                }
                currentPanel = 3;
            }
        });
    });
    
    // Upload File Button Handler
    const uploadBtn = document.querySelector('.upload-btn');
    if (uploadBtn) {
        uploadBtn.addEventListener('click', function() {
            alert('File upload functionality coming soon!');
        });
    }
});

// Validation Helpers
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validateDate(day, month, year) {
    const d = parseInt(day);
    const m = parseInt(month);
    const y = parseInt(year);
    
    if (isNaN(d) || isNaN(m) || isNaN(y)) return false;
    if (d < 1 || d > 31) return false;
    if (m < 1 || m > 12) return false;
    if (y < 1900 || y > new Date().getFullYear()) return false;
    
    return true;
}
