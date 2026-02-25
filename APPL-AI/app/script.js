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

// Button click handlers
document.querySelectorAll('.btn').forEach(button => {
    button.addEventListener('click', function(e) {
        if (this.textContent === 'Apply Now' || this.textContent === 'Register') {
            const isCardButton = this.classList.contains('btn-card');
            if (isCardButton) {
                const companyName = this.closest('.company-card').querySelector('h3').textContent;
                alert(`Application for ${companyName} coming soon!`);
            } else {
                alert('Coming soon!');
            }
        } else if (this.textContent === 'Login') {
            alert('Login functionality coming soon!');
        } else if (this.textContent === 'Learn More') {
            document.getElementById('about').scrollIntoView({ behavior: 'smooth' });
        }
    });
});

// Add scroll effect to header
let lastScroll = 0;
const header = document.querySelector('.header');

if (header) {
    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        
        if (currentScroll > 100) {
            header.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
        } else {
            header.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
        }
        
        lastScroll = currentScroll;
    });
}

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

// Form Validation Functions
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validatePassword(password) {
    return password.length >= 6;
}

// Login Form Validation
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        
        if (!username) {
            alert('Please enter your username or email.');
            return;
        }
        
        if (!password) {
            alert('Please enter your password.');
            return;
        }
        
        if (username.includes('@') && !validateEmail(username)) {
            alert('Please enter a valid email address.');
            return;
        }
        
        alert('Login successful!');
    });
}

// Forgot Password Form Validation
const forgotForm = document.getElementById('forgotForm');
if (forgotForm) {
    forgotForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value.trim();
        const code = document.getElementById('code').value.trim();
        
        if (!email) {
            alert('Please enter your email address.');
            return;
        }
        
        if (!validateEmail(email)) {
            alert('Please enter a valid email address.');
            return;
        }
        
        if (!code) {
            alert('Please enter the verification code.');
            return;
        }
        
        // Hide forgot container and show reset container
        const forgotContainer = document.getElementById('forgotContainer');
        const resetContainer = document.getElementById('resetContainer');
        
        if (forgotContainer && resetContainer) {
            forgotContainer.classList.add('hidden');
            resetContainer.classList.remove('hidden');
        }
    });
    
    // Send Verification Code Link
    const sendCodeLink = document.getElementById('sendCodeLink');
    if (sendCodeLink) {
        sendCodeLink.addEventListener('click', function(e) {
            e.preventDefault();
            
            const email = document.getElementById('email').value.trim();
            
            if (!email) {
                alert('Please enter your email address first.');
                return;
            }
            
            if (!validateEmail(email)) {
                alert('Please enter a valid email address.');
                return;
            }
            
            alert('Verification code sent to your email!');
        });
    }
}

// Reset Password Form Validation
const resetForm = document.getElementById('resetForm');
if (resetForm) {
    resetForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        if (!newPassword) {
            alert('Please enter a new password.');
            return;
        }
        
        if (!validatePassword(newPassword)) {
            alert('Password must be at least 6 characters long.');
            return;
        }
        
        if (!confirmPassword) {
            alert('Please confirm your password.');
            return;
        }
        
        if (newPassword !== confirmPassword) {
            alert('Passwords do not match. Please try again.');
            return;
        }
        
        alert('Password reset successful! You can now log in with your new password.');
        window.location.href = 'login.html';
    });
}
