// auth.js

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
document.querySelectorAll('.lpCompanyCard, .testimonialCard').forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(card);
});

// ============================================
// AUTHENTICATION SYSTEM
// ============================================
let selectedRole = 'applicant';
let currentPanel = 1;
let selectedProfileImageBase64 = '';

const DB_CONFIG = {
    userTable: 'UserTbl',
    applicantTable: 'ApplicantTbl',
    employerTable: 'EmployerTbl',

    userIdColumn: 'UserID',
    emailColumn: 'Email',
    usernameColumn: 'Username',
    imageColumn: 'UserImage',
    descriptionColumn: 'UserDescription',
    userTypeColumn: 'UserType',
    passwordColumn: 'PasswordHash',

    applicantUserIdColumn: 'UserID',
    applicantLastNameColumn: 'LastName',
    applicantFirstNameColumn: 'FirstName',
    applicantMiddleNameColumn: 'MiddleName',
    applicantAddressColumn: 'Address',
    applicantEducationColumn: 'EducationAttained',
    applicantBirthDateColumn: 'BirthDate',
    applicantGenderColumn: 'Gender',
    applicantContactColumn: 'ContactNumber',

    employerUserIdColumn: 'UserID',
    employerCompanyNameColumn: 'CompanyName',
    employerCompanyAddressColumn: 'CompanyAddress',
    employerCompanyContactColumn: 'CompanyContact',
    employerIndustryColumn: 'Industry',
    employerFullNameColumn: 'EmployerFullName',
    employerPositionColumn: 'EmployerPosition',
    employerEmailColumn: 'EmployerEmail',
    employerContactColumn: 'EmployerContact'
};

const SESSION_KEY = 'applaiSession';

document.addEventListener('DOMContentLoaded', function() {
    initializePasswordToggles();
    initializeLoginForm();
    initializeRegisterFlow();
    initializeBackButtons();
    initializeProfileUpload();
    updateFinalPreview();
});

function getSupabaseClient() {
    if (!window.supabaseClient) {
        alert('Supabase is not connected. Please make sure supabase.js is loaded before auth.js.');
        throw new Error('Supabase client not found');
    }
    return window.supabaseClient;
}

function saveUserSession(userId, userType, rememberMe = false) {
    const payload = {
        UserID: userId,
        UserType: userType
    };

    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_KEY);

    if (rememberMe) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(payload));
    } else {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload));
    }
}

function initializePasswordToggles() {
    document.querySelectorAll('.togglePassword').forEach(toggle => {
        toggle.addEventListener('click', function () {
            const formInput = this.closest('.formInput');
            const passwordField = formInput ? formInput.querySelector('input') : null;

            if (!passwordField) return;

            if (passwordField.type === 'password') {
                passwordField.type = 'text';
                this.classList.add('show');
            } else {
                passwordField.type = 'password';
                this.classList.remove('show');
            }
        });
    });
}

function initializeLoginForm() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;

    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const loginValue = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;

        if (!loginValue || !password) {
            alert('Please fill in all fields');
            return;
        }

        const submitBtn = loginForm.querySelector('button[type="submit"]');
        setButtonLoading(submitBtn, true, 'Logging in...');

        try {
            const supabase = getSupabaseClient();
            const isEmailLogin = loginValue.includes('@');
            const loginColumn = isEmailLogin ? DB_CONFIG.emailColumn : DB_CONFIG.usernameColumn;

            const { data: user, error } = await supabase
                .from(DB_CONFIG.userTable)
                .select(`
                    ${DB_CONFIG.userIdColumn},
                    ${DB_CONFIG.userTypeColumn},
                    ${DB_CONFIG.passwordColumn}
                `)
                .eq(loginColumn, loginValue)
                .maybeSingle();

            if (error) {
                console.error('Login query error:', error);
                alert(error.message || 'Unable to log in.');
                return;
            }

            if (!user) {
                alert('No account found with that username or email.');
                return;
            }

            if ((user[DB_CONFIG.passwordColumn] || '') !== password) {
                alert('Incorrect password.');
                return;
            }

            const rememberMe = !!document.querySelector('input[name="remember"]')?.checked;

            saveUserSession(
                user[DB_CONFIG.userIdColumn],
                user[DB_CONFIG.userTypeColumn],
                rememberMe
            );

            alert('Login successful!');
            window.location.href = 'main.html';
        } catch (err) {
            console.error('Login failed:', err);
            alert('Something went wrong during login.');
        } finally {
            setButtonLoading(submitBtn, false);
        }
    });
}

function initializeRegisterFlow() {
    const registerForm1 = document.getElementById('registerForm1');
    const applicantForm1 = document.getElementById('applicantForm1');
    const applicantForm2 = document.getElementById('applicantForm2');
    const employerForm1 = document.getElementById('employerForm1');
    const employerForm2 = document.getElementById('employerForm2');
    const finalForm = document.getElementById('finalForm');

    if (registerForm1) {
        registerForm1.addEventListener('submit', async function(e) {
            e.preventDefault();

            const accountType = document.getElementById('accountType').value;
            const email = document.getElementById('regEmail').value.trim();
            const username = document.getElementById('regUsername').value.trim();
            const password = document.getElementById('regPassword').value;

            if (!accountType) {
                alert('Please select an account type');
                return;
            }

            if (!email || !username || !password) {
                alert('Please fill in all fields');
                return;
            }

            if (typeof validateEmail === 'function' && !validateEmail(email)) {
                alert('Please enter a valid email address');
                return;
            }

            if (password.length < 6) {
                alert('Password must be at least 6 characters long');
                return;
            }

            const submitBtn = registerForm1.querySelector('button[type="submit"]');
            setButtonLoading(submitBtn, true, 'Checking...');

            try {
                const duplicateCheck = await checkDuplicateUser(email, username);

                if (duplicateCheck.emailExists && duplicateCheck.usernameExists) {
                    alert('Both email and username are already in use.');
                    return;
                }

                if (duplicateCheck.emailExists) {
                    alert('This email is already in use.');
                    return;
                }

                if (duplicateCheck.usernameExists) {
                    alert('This username is already in use.');
                    return;
                }

                selectedRole = accountType;
                currentPanel = 2;

                document.getElementById('panel1').classList.add('formHidden');

                if (selectedRole === 'applicant') {
                    document.getElementById('panel2Applicant').classList.remove('formHidden');
                } else {
                    document.getElementById('panel2Employer').classList.remove('formHidden');
                }

                updateFinalPreview();
            } catch (err) {
                console.error('Duplicate check failed:', err);
                alert('Unable to validate account details right now.');
            } finally {
                setButtonLoading(submitBtn, false);
            }
        });
    }

    if (applicantForm1) {
        applicantForm1.addEventListener('submit', function(e) {
            e.preventDefault();

            const lastName = document.getElementById('surname').value.trim();
            const firstName = document.getElementById('firstName').value.trim();
            const address = document.getElementById('address').value.trim();

            if (!lastName || !firstName || !address) {
                alert('Please fill in all required fields');
                return;
            }

            currentPanel = 3;
            document.getElementById('panel2Applicant').classList.add('formHidden');
            document.getElementById('panel3Applicant').classList.remove('formHidden');
            updateFinalPreview();
        });
    }

    if (applicantForm2) {
        applicantForm2.addEventListener('submit', function(e) {
            e.preventDefault();

            const educationAttained = document.getElementById('educationAttained').value;
            const birthDate = document.getElementById('birthDate').value;
            const gender = document.getElementById('sex').value;
            const contactNumber = document.getElementById('contactNumber').value.trim();

            if (!educationAttained || !birthDate || !gender || !contactNumber) {
                alert('Please fill in all fields');
                return;
            }

            currentPanel = 4;
            document.getElementById('panel3Applicant').classList.add('formHidden');
            document.getElementById('panel4Final').classList.remove('formHidden');
            updateFinalPreview();
        });
    }

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
            document.getElementById('panel2Employer').classList.add('formHidden');
            document.getElementById('panel3Employer').classList.remove('formHidden');
            updateFinalPreview();
        });
    }

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

            if (typeof validateEmail === 'function' && !validateEmail(employerEmail)) {
                alert('Please enter a valid email address');
                return;
            }

            currentPanel = 4;
            document.getElementById('panel3Employer').classList.add('formHidden');
            document.getElementById('panel4Final').classList.remove('formHidden');
            updateFinalPreview();
        });
    }

    if (finalForm) {
        finalForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const terms = document.querySelector('input[name="terms"]')?.checked;

            if (!terms) {
                alert('Please agree to the Terms and Conditions');
                return;
            }

            const submitBtn = finalForm.querySelector('button[type="submit"]');
            setButtonLoading(submitBtn, true, 'Creating account...');

            try {
                const result = await createUserAccount();

                if (!result.success) {
                    alert(result.message || 'Unable to create account.');
                    return;
                }

                alert('Account created successfully!');
                window.location.href = 'login.html';
            } catch (err) {
                console.error('Account creation failed:', err);
                alert('Something went wrong while creating the account.');
            } finally {
                setButtonLoading(submitBtn, false);
            }
        });
    }

    const livePreviewInputs = [
        'accountType',
        'regUsername',
        'surname',
        'firstName',
        'companyName',
        'employerFullName'
    ];

    livePreviewInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', updateFinalPreview);
            el.addEventListener('change', updateFinalPreview);
        }
    });
}

function initializeBackButtons() {
    document.querySelectorAll('.backBtn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            if (btn.hasAttribute('onclick')) return;

            e.preventDefault();

            if (currentPanel === 2) {
                document.getElementById('panel2Applicant')?.classList.add('formHidden');
                document.getElementById('panel2Employer')?.classList.add('formHidden');
                document.getElementById('panel1')?.classList.remove('formHidden');
                currentPanel = 1;
            } else if (currentPanel === 3) {
                if (selectedRole === 'applicant') {
                    document.getElementById('panel3Applicant')?.classList.add('formHidden');
                    document.getElementById('panel2Applicant')?.classList.remove('formHidden');
                } else {
                    document.getElementById('panel3Employer')?.classList.add('formHidden');
                    document.getElementById('panel2Employer')?.classList.remove('formHidden');
                }
                currentPanel = 2;
            } else if (currentPanel === 4) {
                document.getElementById('panel4Final')?.classList.add('formHidden');
                if (selectedRole === 'applicant') {
                    document.getElementById('panel3Applicant')?.classList.remove('formHidden');
                } else {
                    document.getElementById('panel3Employer')?.classList.remove('formHidden');
                }
                currentPanel = 3;
            }

            updateFinalPreview();
        });
    });
}

function initializeProfileUpload() {
    const uploadBtn = document.querySelector('.regUploadProfileBtn');
    const profileInput = document.getElementById('profileImageInput');

    if (!uploadBtn || !profileInput) return;

    uploadBtn.addEventListener('click', function() {
        profileInput.click();
    });

    profileInput.addEventListener('change', async function(e) {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Please upload a valid image file.');
            profileInput.value = '';
            return;
        }

        try {
            selectedProfileImageBase64 = await fileToBase64(file);
            renderProfilePreview(selectedProfileImageBase64);
        } catch (err) {
            console.error('Image conversion failed:', err);
            alert('Failed to load selected image.');
        }
    });
}

function updateFinalPreview() {
    const previewName = document.getElementById('finalPreviewName');
    const previewUsername = document.getElementById('finalPreviewUsername');

    if (!previewName || !previewUsername) return;

    const username = document.getElementById('regUsername')?.value.trim() || 'Username';
    const firstName = document.getElementById('firstName')?.value.trim() || '';
    const lastName = document.getElementById('surname')?.value.trim() || '';
    const companyName = document.getElementById('companyName')?.value.trim() || '';
    const employerFullName = document.getElementById('employerFullName')?.value.trim() || '';

    if (selectedRole === 'employer') {
        previewName.textContent = companyName || employerFullName || 'Company Name';
    } else {
        const fullName = [firstName, lastName].filter(Boolean).join(' ');
        previewName.textContent = fullName || 'Applicant Name';
    }

    previewUsername.textContent = `@${username}`;
}

async function checkDuplicateUser(email, username) {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
        .from(DB_CONFIG.userTable)
        .select(`${DB_CONFIG.emailColumn}, ${DB_CONFIG.usernameColumn}`)
        .or(`${DB_CONFIG.emailColumn}.eq.${escapeSupabaseValue(email)},${DB_CONFIG.usernameColumn}.eq.${escapeSupabaseValue(username)}`);

    if (error) {
        throw error;
    }

    let emailExists = false;
    let usernameExists = false;

    (data || []).forEach(item => {
        if ((item[DB_CONFIG.emailColumn] || '').toLowerCase() === email.toLowerCase()) {
            emailExists = true;
        }
        if ((item[DB_CONFIG.usernameColumn] || '').toLowerCase() === username.toLowerCase()) {
            usernameExists = true;
        }
    });

    return { emailExists, usernameExists };
}

async function createUserAccount() {
    const supabase = getSupabaseClient();

    const accountType = document.getElementById('accountType')?.value;
    const email = document.getElementById('regEmail')?.value.trim();
    const username = document.getElementById('regUsername')?.value.trim();
    const password = document.getElementById('regPassword')?.value;
    const description = document.getElementById('description')?.value.trim() || '';

    const duplicateCheck = await checkDuplicateUser(email, username);

    if (duplicateCheck.emailExists) {
        return { success: false, message: 'This email is already in use.' };
    }

    if (duplicateCheck.usernameExists) {
        return { success: false, message: 'This username is already in use.' };
    }

    const userPayload = {
        [DB_CONFIG.emailColumn]: email,
        [DB_CONFIG.usernameColumn]: username,
        [DB_CONFIG.imageColumn]: selectedProfileImageBase64 || null,
        [DB_CONFIG.descriptionColumn]: description || null,
        [DB_CONFIG.userTypeColumn]: accountType,
        [DB_CONFIG.passwordColumn]: password
    };

    const { data: createdUser, error: userError } = await supabase
        .from(DB_CONFIG.userTable)
        .insert(userPayload)
        .select()
        .single();

    if (userError) {
        console.error('UserTbl insert failed:', userError);
        return { success: false, message: userError.message || 'Failed to save user account.' };
    }

    const newUserId = createdUser[DB_CONFIG.userIdColumn];

    if (!newUserId) {
        return { success: false, message: 'User created but UserID was not returned.' };
    }

    if (accountType === 'applicant') {
        const applicantPayload = {
            [DB_CONFIG.applicantUserIdColumn]: newUserId,
            [DB_CONFIG.applicantLastNameColumn]: document.getElementById('surname')?.value.trim() || '',
            [DB_CONFIG.applicantFirstNameColumn]: document.getElementById('firstName')?.value.trim() || '',
            [DB_CONFIG.applicantMiddleNameColumn]: document.getElementById('middleName')?.value.trim() || null,
            [DB_CONFIG.applicantAddressColumn]: document.getElementById('address')?.value.trim() || '',
            [DB_CONFIG.applicantEducationColumn]: document.getElementById('educationAttained')?.value || '',
            [DB_CONFIG.applicantBirthDateColumn]: document.getElementById('birthDate')?.value || null,
            [DB_CONFIG.applicantGenderColumn]: document.getElementById('sex')?.value || '',
            [DB_CONFIG.applicantContactColumn]: document.getElementById('contactNumber')?.value.trim() || ''
        };

        const { error: applicantError } = await supabase
            .from(DB_CONFIG.applicantTable)
            .insert(applicantPayload);

        if (applicantError) {
            console.error('ApplicantTbl insert failed:', applicantError);

            await supabase
                .from(DB_CONFIG.userTable)
                .delete()
                .eq(DB_CONFIG.userIdColumn, newUserId);

            return { success: false, message: applicantError.message || 'Failed to save applicant details.' };
        }
    } else {
        const employerPayload = {
            [DB_CONFIG.employerUserIdColumn]: newUserId,
            [DB_CONFIG.employerCompanyNameColumn]: document.getElementById('companyName')?.value.trim() || '',
            [DB_CONFIG.employerCompanyAddressColumn]: document.getElementById('companyAddress')?.value.trim() || '',
            [DB_CONFIG.employerCompanyContactColumn]: document.getElementById('companyContact')?.value.trim() || '',
            [DB_CONFIG.employerIndustryColumn]: document.getElementById('industry')?.value.trim() || '',
            [DB_CONFIG.employerFullNameColumn]: document.getElementById('employerFullName')?.value.trim() || '',
            [DB_CONFIG.employerPositionColumn]: document.getElementById('employerPosition')?.value.trim() || '',
            [DB_CONFIG.employerEmailColumn]: document.getElementById('employerEmail')?.value.trim() || '',
            [DB_CONFIG.employerContactColumn]: document.getElementById('employerContact')?.value.trim() || ''
        };

        const { error: employerError } = await supabase
            .from(DB_CONFIG.employerTable)
            .insert(employerPayload);

        if (employerError) {
            console.error('EmployerTbl insert failed:', employerError);

            await supabase
                .from(DB_CONFIG.userTable)
                .delete()
                .eq(DB_CONFIG.userIdColumn, newUserId);

            return { success: false, message: employerError.message || 'Failed to save employer details.' };
        }
    }

    return { success: true, userId: newUserId, userType: accountType };
}

function escapeSupabaseValue(value) {
    return String(value)
        .replace(/,/g, '\\,')
        .replace(/\(/g, '\\(')
        .replace(/\)/g, '\\)');
}

function setButtonLoading(button, isLoading, loadingText = 'Loading...') {
    if (!button) return;

    if (isLoading) {
        button.dataset.originalText = button.innerHTML;
        button.disabled = true;
        button.innerHTML = loadingText;
    } else {
        button.disabled = false;
        if (button.dataset.originalText) {
            button.innerHTML = button.dataset.originalText;
        }
    }
}

function renderProfilePreview(imageSrc) {
    const preview = document.getElementById('regAvatarPreview');
    if (!preview) return;

    preview.innerHTML = `
        <img 
            src="${imageSrc}" 
            alt="Profile Preview" 
            style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;"
        >
    `;
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}