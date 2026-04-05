// ============================================
// ANCHOR GLOBAL STATE MANAGEMENT
// ============================================

// AppState: Stores the current state of the application
// This object maintains the runtime state including user role, current page, and cached components
const AppState = {
    currentPage: 'home',
    currentRole: 'applicant',
    currentUser: {
        id: 1,
        name: 'John Doe',
        role: 'Software Developer',
        location: 'Manila, Philippines'
    },
    savedJobs: [],
    appliedJobs: [],
    componentCache: {}
};

// ComponentData: Mock data for the application
// In a production app, this would be fetched from a backend API
const ComponentData = {
    jobs: [
        {
            id: 1,
            companyName: 'Jollibee Foods Corp.',
            companyIndustry: '@jollibee',
            companyLogo: 'assets/featured-companies/jollibee.png',
            profileLink: 'profile',
            description: 'Jollibee Inc. is hiring a Customer Service Representative to join our team.Jollibee Inc. is hiring a Customer Service Representative to join our team.Jollibee Inc. is hiring a Customer Service Representative to join our team.Jollibee Inc. is hiring a Customer Service Representative to join our team.Jollibee Inc. is hiring a Customer Service Representative to join our team.Jollibee Inc. is hiring a Customer Service Representative to join our team.Jollibee Inc. is hiring a Customer Service Representative to join our team.Jollibee Inc. is hiring a Customer Service Representative to join our team.Jollibee Inc. is hiring a Customer Service Representative to join our team.',
            image: 'assets/featured-companies/jollibee.png',
            date: 'January 31, 2026 - March 31, 2026',
            appliedCount: '2.7k Applied',
            isSaved: false,
            isApplied: false,
            status: ''
        },
        {
            id: 1,
            companyName: 'Jollibee Foods Corp.',
            companyIndustry: '@jollibee',
            companyLogo: 'assets/featured-companies/jollibee.png',
            profileLink: 'profile',
            description: 'Jollibee Inc. is hiring a Customer Service Representative to join our team.',
            image: 'assets/featured-companies/jollibee.png',
            date: 'January 31, 2026 - March 31, 2026',
            appliedCount: '2.7k Applied',
            isSaved: false,
            isApplied: false,
            status: ''
        },
        {
            id: 1,
            companyName: 'Jollibee Foods Corp.',
            companyIndustry: '@jollibee',
            companyLogo: 'assets/featured-companies/jollibee.png',
            profileLink: 'profile',
            description: 'Jollibee Inc. is hiring a Customer Service Representative to join our team.',
            image: 'assets/featured-companies/jollibee.png',
            date: 'January 31, 2026 - March 31, 2026',
            appliedCount: '2.7k Applied',
            isSaved: false,
            isApplied: false,
            status: ''
        },
        {
            id: 3,
            companyName: 'PLDT Inc.',
            companyIndustry: 'Telecommunications',
            companyLogo: 'assets/featured-companies/jollibee.png',
            profileLink: 'profile',
            description: 'PLDT Inc. is hiring a Customer Service Representative to join our team.',
            image: 'assets/featured-companies/jollibee.png',
            date: 'January 31, 2026 - March 31, 2026',
            appliedCount: '2.7k Applied',
            isSaved: true,
            isApplied: true,
            status: 'approved'
        }
    ],

    applicants: [
        { id: 1, name: 'Bam Adebayo', status: 'matched', statusIcon: '<polyline points="20 6 9 17 4 12"></polyline>' },
        { id: 2, name: 'Bam Adebayo', status: 'matched', statusIcon: '<polyline points="20 6 9 17 4 12"></polyline>' },
        { id: 3, name: 'Bam Adebayo', status: 'matched', statusIcon: '<polyline points="20 6 9 17 4 12"></polyline>' }
    ],

    notifications: {
        new: [
            {
                companyName: 'Jollibee Foods Corp.',
                message: 'Approved your job application',
                time: 'Jan 1, 2026',
                image: 'assets/featured-companies/jollibee.png',
                profileLink: 'profile-employer.html?company=pldt'
            }
        ],
        earlier: [
            {
                companyName: 'PUMA',
                message: 'Rejected your job application',
                time: 'Jan 1, 2026',
                image: 'assets/featured-companies/puma.png',
                profileLink: 'profile-employer.html?company=pldt'
            },
            {
                companyName: 'Samsung Electronics',
                message: 'Rejected your job application',
                time: 'Jan 1, 2026',
                image: 'assets/featured-companies/samsung.png',
                profileLink: 'profile-employer.html?company=pldt'
            }
        ]
    },

    companies: [
        {
            name: 'Jollibee Foods Corp.',
            industry: 'Food and Beverage',
            image: 'assets/featured-companies/jollibee.png',
            profileLink: 'profile-employer.html?company=pldt'
        },
        {
            name: 'PUMA',
            industry: 'Footwear, and Accessories',
            image: 'assets/featured-companies/puma.png',
            profileLink: 'profile-employer.html?company=pldt'
        },
        {
            name: 'Samsung Electronics',
            industry: 'Electronics',
            image: 'assets/featured-companies/samsung.png',
            profileLink: 'profile-employer.html?company=pldt'
        },
        {
            name: 'Shopee',
            industry: 'E-commerce',
            image: 'assets/featured-companies/shopee.png',
            profileLink: 'profile-employer.html?company=pldt'
        },
        {
            name: 'Shopee',
            industry: 'E-commerce',
            image: 'assets/featured-companies/shopee.png',
            profileLink: 'profile-employer.html?company=pldt'
        },
        {
            name: 'Shopee',
            industry: 'E-commerce',
            image: 'assets/featured-companies/shopee.png',
            profileLink: 'profile-employer.html?company=pldt'
        },
        {
            name: 'Meta Platforms, Inc.',
            industry: 'Technology',
            image: 'assets/featured-companies/meta.png',
            profileLink: 'profile-employer.html?company=pldt'
        }
    ]
};

// ============================================
// ANCHOR APPLICATION INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    loadFeaturedCompanies();
    loadNotifications();
    loadPage('view-application');
});

function initializeApp() {
    const FORCE_ROLE = 'applicant';

    AppState.currentRole = FORCE_ROLE;
    localStorage.setItem('userRole', FORCE_ROLE);

    updateRoleBasedUI();
}

function setupEventListeners() {
    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', toggleSidebar);
    }

    const searchToggleBtn = document.getElementById('searchToggleBtn');
    if (searchToggleBtn) {
        searchToggleBtn.addEventListener('click', openSearch);
    }

    const searchPopupClose = document.getElementById('searchPopupClose');
    if (searchPopupClose) {
        searchPopupClose.addEventListener('click', closeSearch);
    }

    const searchPopupInput = document.getElementById('searchPopupInput');
    if (searchPopupInput) {
        searchPopupInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handlePopupSearch();
            }
        });
    }

    const notificationBtn = document.getElementById('notificationBtn');
    if (notificationBtn) {
        notificationBtn.addEventListener('click', toggleNotificationPanel);
    }

    const profileBtn = document.getElementById('profileBtn');
    if (profileBtn) {
        profileBtn.addEventListener('click', () => loadPage('profile'));
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    document.querySelectorAll('.navLink[data-page]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.getAttribute('data-page');
            loadPage(page);
        });
    });

    document.addEventListener('click', function(e) {
        const companyCard = e.target.closest('.featuredCompany');
        if (companyCard && companyCard.dataset.link) {
            loadPage(companyCard.dataset.link);
            return;
        }

        const notificationItem = e.target.closest('.notification');
        if (notificationItem && notificationItem.dataset.link) {
            loadPage(notificationItem.dataset.link);
            return;
        }

        const jobProfile = e.target.closest('.jobCompany');
        if (jobProfile && jobProfile.dataset.link) {
            loadPage(jobProfile.dataset.link);
            return;
        }

        const applicantProfile = e.target.closest('.applicantProfile');
        if (applicantProfile && applicantProfile.dataset.link) {
            loadPage(applicantProfile.dataset.link);
            return;
        }
    });

    document.addEventListener('click', function(e) {
        const seeMoreBtn = e.target.closest('.seeMoreBtn');
        if (!seeMoreBtn) return;

        e.preventDefault();
        e.stopPropagation();

        const jobDescription = seeMoreBtn.closest('.jobDescription');
        if (!jobDescription) return;

        jobDescription.classList.toggle('expanded');
        seeMoreBtn.textContent = jobDescription.classList.contains('expanded')
            ? 'see less...'
            : 'see more...';
    });

    document.querySelectorAll('.closeBtn[data-modal]').forEach(btn => {
        btn.addEventListener('click', function() {
            const modalId = this.getAttribute('data-modal');
            closeModal(modalId);
        });
    });

    document.querySelectorAll('.backBtn[data-modal]').forEach(btn => {
        btn.addEventListener('click', function() {
            const modalId = this.getAttribute('data-modal');
            closeModal(modalId);
        });
    });

    const browseBtn = document.getElementById('browseBtn');
    if (browseBtn) {
        browseBtn.addEventListener('click', () => {
            const fileInput = document.getElementById('fileInput');
            if (fileInput) {
                fileInput.click();
            }
        });
    }

    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }

    const submitApplicationBtn = document.getElementById('submitApplicationBtn');
    if (submitApplicationBtn) {
        submitApplicationBtn.addEventListener('click', handleSubmitApplication);
    }
}

// ============================================
// COMPONENT LOADING SYSTEM
// ============================================

async function loadComponent(componentName) {
    try {
        const response = await fetch(`components/${componentName}.html?v=${Date.now()}`);
        if (!response.ok) {
            throw new Error(`Failed to load component: ${componentName}`);
        }

        return await response.text();
    } catch (error) {
        console.error(`Error loading component ${componentName}:`, error);
        return '';
    }
}

function renderTemplate(template, data) {
    let rendered = template;

    Object.keys(data).forEach(key => {
        const value = data[key] ?? '';
        rendered = rendered.split(`{{${key}}}`).join(String(value));
    });

    return rendered;
}

// ============================================
// DYNAMIC CONTENT RENDERING
// ============================================

async function loadJobCards(containerId, jobsData) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const template = await loadComponent('job-card');
    container.innerHTML = '';

    const isEmployer = AppState.currentRole === 'employer';
    const isApplicant = AppState.currentRole === 'applicant';

    jobsData.forEach(job => {
        let statusBadge = '';
        let applyButton = '';
        let employerActions = '';

        if (isApplicant && job.isApplied && job.status) {
            statusBadge = `<span class="statusBadge ${job.status}">${capitalizeFirst(job.status)}</span>`;
        }

        if (isApplicant) {
            applyButton = job.isApplied
                ? `<button class="btnApplied" disabled>Applied</button>`
                : `<button class="btnApply" data-apply="${job.id}">Apply</button>`;
        }

        if (isEmployer) {
            employerActions = `
                <button class="actionBtn editPostBtn" data-edit="${job.id}" title="Edit Post">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 20h9"/>
                        <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>
                    </svg>
                </button>

                <button class="actionBtn removeFeedBtn" data-remove="${job.id}" title="Remove from Feed">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            `;
        }

        const data = {
            jobId: job.id,
            companyName: job.companyName,
            industry: job.companyIndustry,
            companyLogo: job.companyLogo,
            profileLink: job.profileLink,
            description: job.description,
            jobImage: job.image,
            dateRange: job.date,
            appliedCount: job.appliedCount,
            saveClass: job.isSaved ? 'saved' : '',
            saveFill: job.isSaved ? 'currentColor' : 'none',
            employerActions: employerActions,
            statusBadge: statusBadge,
            applyButton: applyButton
        };

        const rendered = renderTemplate(template, data);
        container.innerHTML += rendered;
    });

    initializeJobCardEvents();
    initializeDescriptionToggles(container);
}

function initializeDescriptionToggles(container) {
    const descriptions = container.querySelectorAll('.jobDescription');

    descriptions.forEach(description => {
        const descText = description.querySelector('.descText');
        const seeMoreBtn = description.querySelector('.seeMoreBtn');

        if (!descText || !seeMoreBtn) return;

        description.classList.remove('expanded');
        seeMoreBtn.textContent = 'see more...';

        requestAnimationFrame(() => {
            const isOverflowing = descText.scrollHeight > descText.clientHeight + 1;
            seeMoreBtn.style.display = isOverflowing ? 'inline-flex' : 'none';
        });
    });
}

function capitalizeFirst(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
}

async function loadApplicantCards(containerId, applicantsData) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const template = await loadComponent('applicant-card');
    container.innerHTML = '';

    applicantsData.forEach(applicant => {
        const cardData = {
            applicantId: applicant.id,
            applicantName: applicant.name,
            statusClass: applicant.status,
            statusIcon: applicant.statusIcon,
            statusText: applicant.status.charAt(0).toUpperCase() + applicant.status.slice(1)
        };

        const rendered = renderTemplate(template, cardData);
        container.innerHTML += rendered;
    });
}

async function loadNotifications() {
    const container = document.getElementById('notificationContentContainer');
    if (!container) return;

    const template = await loadComponent('notification-card');
    let html = '';

    html += '<div class="notification-section"><h4>New</h4>';
    ComponentData.notifications.new.forEach(notif => {
        const data = {
            companyName: notif.companyName,
            notificationMessage: notif.message,
            notificationTime: notif.time,
            companyImage: notif.image,
            profileLink: notif.profileLink
        };
        html += renderTemplate(template, data);
    });
    html += '</div>';

    html += '<div class="notification-section"><h4>Earlier</h4>';
    ComponentData.notifications.earlier.forEach(notif => {
        const data = {
            companyName: notif.companyName,
            notificationMessage: notif.message,
            notificationTime: notif.time,
            companyImage: notif.image,
            profileLink: notif.profileLink
        };
        html += renderTemplate(template, data);
    });
    html += '</div>';

    container.innerHTML = html;
}

async function loadFeaturedCompanies() {
    const container = document.getElementById('featuredListContainer');
    if (!container) return;

    const template = await loadComponent('company-card');
    container.innerHTML = '';

    ComponentData.companies.forEach(company => {
        const data = {
            companyName: company.name,
            companyIndustry: company.industry,
            companyImage: company.image,
            profileLink: company.profileLink
        };

        const rendered = renderTemplate(template, data);
        container.innerHTML += rendered;
    });
}

// ============================================
// PAGE NAVIGATION SYSTEM (SPA)
// ============================================

function loadPage(pageName) {
    AppState.currentPage = pageName;

    document.querySelectorAll('.navLink').forEach(link => {
        link.classList.remove('active');
    });

    const activeLink = document.querySelector(`.navLink[data-page="${pageName}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }

    const savedJobs = ComponentData.jobs.filter(job => job.isSaved);
    loadJobCards('jobFeedContainer', savedJobs);

    const layoutMode = ['profile', 'profile-employer', 'edit-profile', 'edit-profile-employer', 'create-post', 'edit-post', 'view-applicants', 'view-application'].includes(pageName);

    const sidebar = document.getElementById('sidebar');
    const featuredSidebar = document.getElementById('featuredSidebar');
    const mainContent = document.getElementById('mainContent');

    if (layoutMode) {
        if (sidebar) sidebar.classList.add('hidden');
        if (featuredSidebar) featuredSidebar.classList.add('focus-mode');
        if (mainContent) mainContent.classList.add('focus-mode');
    } else {
        if (sidebar) sidebar.classList.remove('hidden');
        if (featuredSidebar) featuredSidebar.classList.remove('focus-mode');
        if (mainContent) mainContent.classList.remove('focus-mode');
    }

    let pageFile = pageName;
    if (pageName === 'profile') {
        pageFile = AppState.currentRole === 'employer' ? 'profile-employer' : 'profile';
    }
    if (pageName === 'edit-profile') {
        pageFile = AppState.currentRole === 'employer' ? 'edit-profile-employer' : 'edit-profile';
    }

    console.log('Current role:', AppState.currentRole);
    console.log('Loading page file:', pageFile);

    fetch(`pages/${pageFile}.html?v=${Date.now()}`)
        .then(response => response.text())
        .then(html => {
            const mainContent = document.getElementById('mainContent');
            if (mainContent) {
                mainContent.innerHTML = html;
                initializePageSpecificEvents(pageName);
            }
        })
        .catch(error => {
            console.error('Error loading page:', error);
            const mainContent = document.getElementById('mainContent');
            if (mainContent) {
                mainContent.innerHTML =
                    '<div class="page-content"><div class="page-simple"><h2>Page Not Found</h2><p>The requested page could not be loaded.</p></div></div>';
            }
        });
}

function initializePageSpecificEvents(pageName) {
    switch(pageName) {
        case 'home':
            loadJobCards('jobFeedContainer', ComponentData.jobs);
            break;

        case 'search-results':
            loadJobCards('jobFeedContainer', ComponentData.jobs);
            break;

        case 'saved':
            const savedJobs = ComponentData.jobs.filter(job => job.isSaved);
            loadJobCards('jobFeedContainer', savedJobs);
            break;

        case 'scan':
            initializeScanPage();
            break;

        case 'profile':
            initializeProfilePage();
            break;

        case 'edit-profile':
            initializeEditProfilePage();
            break;

        case 'create-post':
            initializeCreatePostPage();
            break;

        case 'edit-post':
            initializeEditPostPage();
            break;

        case 'view-applicants':
            loadApplicantCards('applicantsListContainer', ComponentData.applicants);
            initializeViewApplicantsPage();
            break;

        case 'view-application':
            initializeViewApplicationPage();
            break;
    }
}

// ============================================
// ROLE-BASED FUNCTIONALITY
// ============================================

function updateRoleBasedUI() {
    const isEmployer = AppState.currentRole === 'employer';

    if (isEmployer) {
        document.querySelectorAll('.btnApply, .btnApplied').forEach(btn => {
            btn.style.display = 'none';
        });
    } else {
        document.querySelectorAll('.createPostBtn').forEach(btn => {
            btn.style.display = 'none';
        });
    }
}

function toggleRole() {
    AppState.currentRole = AppState.currentRole === 'applicant' ? 'employer' : 'applicant';
    localStorage.setItem('userRole', AppState.currentRole);
    updateRoleBasedUI();
    loadPage(AppState.currentPage);
}

// ============================================
// UI INTERACTION HANDLERS
// ============================================

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('hidden');
    }
}

function openSearch() {
    const searchPopup = document.getElementById('searchPopup');
    const input = document.getElementById('searchPopupInput');

    if (searchPopup) {
        searchPopup.classList.add('active');
    }

    if (input) {
        setTimeout(() => input.focus(), 100);
    }
}

function closeSearch() {
    const searchPopup = document.getElementById('searchPopup');

    if (searchPopup) {
        searchPopup.classList.remove('active');
    }
}

function handlePopupSearch() {
    const input = document.getElementById('searchPopupInput');
    if (!input) return;

    const searchTerm = input.value.trim();

    if (searchTerm) {
        localStorage.setItem('searchQuery', searchTerm);
        loadPage('search-results');
        closeSearch();
    }
}

function toggleNotificationPanel() {
    const modal = document.getElementById('notificationModal');
    if (modal) {
        modal.classList.toggle('active');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

// ============================================
// JOB CARD INTERACTIONS
// ============================================

function initializeJobCardEvents() {
    document.querySelectorAll('.saveBtn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const jobId = this.getAttribute('data-save');
            toggleSaveJob(jobId, this);
        });
    });

    document.querySelectorAll('.btnApply').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const jobId = this.getAttribute('data-apply');

            if (AppState.currentRole === 'applicant') {
                openApplyModal(jobId);
            }
        });
    });

    document.querySelectorAll('.companyName').forEach(name => {
        name.addEventListener('click', function(e) {
            e.stopPropagation();
            loadPage('profile');
        });
    });

    document.querySelectorAll('.editPostBtn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const jobId = this.getAttribute('data-edit');
            console.log('Edit post:', jobId);
            loadPage('edit-post');
        });
    });

    document.querySelectorAll('.removeFeedBtn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const jobId = this.getAttribute('data-remove');
            removeJobFromFeed(jobId);
        });
    });
}

function removeJobFromFeed(jobId) {
    const card = document.querySelector(`.jobCard[data-job-id="${jobId}"]`);
    if (card) {
        card.remove();
    }
}

function toggleSaveJob(jobId, button) {
    if (AppState.currentRole === 'applicant') {
        button.classList.toggle('saved');

        const svg = button.querySelector('svg');
        if (button.classList.contains('saved')) {
            svg.setAttribute('fill', '#F5A302');
            svg.setAttribute('stroke', '#F5A302');
            AppState.savedJobs.push(jobId);
        } else {
            svg.setAttribute('fill', 'none');
            svg.setAttribute('stroke', 'currentColor');
            AppState.savedJobs = AppState.savedJobs.filter(id => id !== jobId);
        }
    }
}

function openApplyModal(jobId) {
    const modal = document.getElementById('applyModal');
    if (modal) {
        modal.classList.add('active');
    }
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        console.log('File selected:', file.name);
    }
}

function handleSubmitApplication() {
    const fileInput = document.getElementById('fileInput');
    if (!fileInput) return;

    if (fileInput.files.length === 0) {
        alert('Please attach a resume file.');
        return;
    }

    alert('Application submitted successfully!');
    closeModal('applyModal');

    document.querySelectorAll('.btnApply').forEach(btn => {
        btn.classList.remove('btnApply');
        btn.classList.add('btnApplied');
        btn.textContent = 'Applied';
        btn.disabled = true;
        btn.removeAttribute('data-apply');
    });
}

// ============================================
// PAGE-SPECIFIC INITIALIZATION FUNCTIONS
// ============================================

function initializeScanPage() {
    const scanBrowseBtn = document.getElementById('scanBrowseBtn');
    const scanFileInput = document.getElementById('scanFileInput');
    const scanResumeBtn = document.getElementById('scanResumeBtn');
    const scanResults = document.getElementById('scanResults');
    const addFileBtn = document.getElementById('addFileBtn');
    const scrollTopBtn = document.getElementById('scrollTopBtn');

    if (scanBrowseBtn) {
        scanBrowseBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (scanFileInput) {
                scanFileInput.click();
            }
        });
    }

    if (scanFileInput) {
        scanFileInput.addEventListener('change', function() {
            if (this.files.length > 0) {
                console.log('Scan file selected:', this.files[0].name);
            }
        });
    }

    if (scanResumeBtn) {
        scanResumeBtn.addEventListener('click', function() {
            if (!scanFileInput || scanFileInput.files.length === 0) {
                alert('Please select a file first.');
                return;
            }

            if (scanResults) {
                scanResults.style.display = 'block';

                setTimeout(() => {
                    scanResults.scrollIntoView({ behavior: 'smooth' });
                }, 100);
            }
        });
    }

    if (addFileBtn) {
        addFileBtn.addEventListener('click', function() {
            if (scanFileInput) {
                scanFileInput.click();
            }
        });
    }

    if (scrollTopBtn) {
        scrollTopBtn.addEventListener('click', function() {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
}

function initializeProfilePage() {
    const editProfileBtn = document.getElementById('editProfileBtn');
    const createPostBtn = document.getElementById('createPostBtn');

    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', function() {
            loadPage('edit-profile');
        });
    }

    if (createPostBtn) {
        createPostBtn.addEventListener('click', function() {
            loadPage('create-post');
        });
    }

    const savedJobs = ComponentData.jobs.filter(job => job.isSaved);
    loadJobCards('jobFeedContainer', savedJobs);

    document.querySelectorAll('.edit-job-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            loadPage('edit-post');
        });
    });

    document.querySelectorAll('.view-post-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            loadPage('view-applicants');
        });
    });
}

function initializeEditProfilePage() {
    const cancelBtn = document.getElementById('cancelEditBtn');
    const backBtn = document.getElementById('backToProfileBtn');
    const editProfileForm = document.getElementById('editProfileForm');
    const editProfileEmployerForm = document.getElementById('editProfileEmployerForm');
    const deleteBtn = document.querySelector('.delete-account-btn');

    if (cancelBtn) {
        cancelBtn.addEventListener('click', function() {
            loadPage('profile');
        });
    }

    if (backBtn) {
        backBtn.addEventListener('click', function() {
            loadPage('profile');
        });
    }

    if (editProfileForm) {
        editProfileForm.addEventListener('submit', function(e) {
            e.preventDefault();
            alert('Profile updated successfully!');
            loadPage('profile');
        });
    }

    if (editProfileEmployerForm) {
        editProfileEmployerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            alert('Profile updated successfully!');
            loadPage('profile');
        });
    }

    if (deleteBtn) {
        deleteBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
                alert('Account deleted.');
            }
        });
    }
}

function initializeCreatePostPage() {
    const backBtn = document.getElementById('backToProfileBtn');
    const createPostForm = document.getElementById('createPostForm');

    if (backBtn) {
        backBtn.addEventListener('click', function() {
            loadPage('profile');
        });
    }

    if (createPostForm) {
        createPostForm.addEventListener('submit', function(e) {
            e.preventDefault();
            alert('Job post created successfully!');
            loadPage('profile');
        });
    }

    const browseInlineBtn = document.querySelector('.browse-inline-btn');
    if (browseInlineBtn) {
        browseInlineBtn.addEventListener('click', function(e) {
            e.preventDefault();
            const fileInput = this.nextElementSibling;
            if (fileInput) fileInput.click();
        });
    }
}

function initializeEditPostPage() {
    const cancelBtn = document.getElementById('cancelEditPostBtn');
    const editPostForm = document.getElementById('editPostForm');

    if (cancelBtn) {
        cancelBtn.addEventListener('click', function() {
            loadPage('profile');
        });
    }

    if (editPostForm) {
        editPostForm.addEventListener('submit', function(e) {
            e.preventDefault();
            alert('Job post updated successfully!');
            loadPage('profile');
        });
    }
}

function initializeViewApplicantsPage() {
    const applicantsList = document.getElementById('applicantsListContainer');
    const approveBtn = document.querySelector('.approveSelectedBtn');
    const rejectBtn = document.querySelector('.rejectSelectedBtn');
    const selectAllBtn = document.querySelector('.selectAllBtn');
    const countElement = document.querySelector('.selectedCount');

    if (!applicantsList) return;

    applicantsList.addEventListener('click', function(e) {
        const checkbox = e.target.closest('.applicantSelect');
        if (checkbox) {
            e.stopPropagation();
            return;
        }

        const card = e.target.closest('.applicantCard');
        if (!card) return;

        const applicantCheckbox = card.querySelector('.applicantSelect');
        const applicantId = applicantCheckbox ? applicantCheckbox.getAttribute('data-applicant-id') : null;

        if (applicantId) {
            localStorage.setItem('selectedApplicantId', applicantId);
        }

        loadPage('view-application');
    });

    applicantsList.addEventListener('change', function(e) {
        if (e.target.classList.contains('applicantSelect')) {
            updateSelectedCount();
            updateSelectAllState();
        }
    });

    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', function() {
            const applicantCheckboxes = document.querySelectorAll('.applicantSelect');
            const total = applicantCheckboxes.length;
            const checked = document.querySelectorAll('.applicantSelect:checked').length;
            const shouldSelectAll = checked !== total;

            applicantCheckboxes.forEach(function(checkbox) {
                checkbox.checked = shouldSelectAll;
            });

            updateSelectedCount();
            updateSelectAllState();
        });
    }

    if (approveBtn) {
        approveBtn.addEventListener('click', function() {
            const selected = document.querySelectorAll('.applicantSelect:checked');

            if (selected.length === 0) {
                alert('Please select at least one applicant.');
                return;
            }

            alert(`${selected.length} applicant(s) approved.`);

            selected.forEach(function(checkbox) {
                checkbox.checked = false;
            });

            updateSelectedCount();
            updateSelectAllState();
        });
    }

    if (rejectBtn) {
        rejectBtn.addEventListener('click', function() {
            const selected = document.querySelectorAll('.applicantSelect:checked');

            if (selected.length === 0) {
                alert('Please select at least one applicant.');
                return;
            }

            alert(`${selected.length} applicant(s) rejected.`);

            selected.forEach(function(checkbox) {
                checkbox.checked = false;
            });

            updateSelectedCount();
            updateSelectAllState();
        });
    }

    function updateSelectedCount() {
        const selected = document.querySelectorAll('.applicantSelect:checked').length;

        if (countElement) {
            countElement.textContent = `${selected} Selected`;
        }
    }

    function updateSelectAllState() {
    if (!selectAllBtn) return;

    const applicantCheckboxes = document.querySelectorAll('.applicantSelect');
    const total = applicantCheckboxes.length;
    const selected = document.querySelectorAll('.applicantSelect:checked').length;

    if (selected === total && total > 0) {
        selectAllBtn.textContent = 'Deselect All';
        selectAllBtn.classList.add('active'); 
    } else {
        selectAllBtn.textContent = 'Select All';
        selectAllBtn.classList.remove('active'); 
    }
}

    updateSelectedCount();
    updateSelectAllState();
}

function initializeViewApplicationPage() {
    const backBtn = document.getElementById('backToApplicantsBtn');

    if (backBtn) {
        backBtn.addEventListener('click', function() {
            loadPage('view-applicants');
        });
    }

    const acceptBtnFull = document.querySelector('.accept-btn-full');
    const rejectBtnFull = document.querySelector('.reject-btn-full');

    if (acceptBtnFull) {
        acceptBtnFull.addEventListener('click', function() {
            alert('Application accepted!');
            loadPage('view-applicants');
        });
    }

    if (rejectBtnFull) {
        rejectBtnFull.addEventListener('click', function() {
            alert('Application rejected!');
            loadPage('view-applicants');
        });
    }
}


// ============================================
// AUTHENTICATION & UTILITY FUNCTIONS
// ============================================

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('userRole');
        window.location.href = 'login.html';
    }
}