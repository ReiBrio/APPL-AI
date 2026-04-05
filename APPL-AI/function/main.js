// ============================================
// ANCHOR GLOBAL STATE MANAGEMENT
// ============================================

const SESSION_KEY = 'applaiSession';

const AppState = {
    currentPage: 'home',
    currentRole: '',
    currentUser: null,
    currentApplicantID: null,
    currentEmployerID: null,
    viewedProfile: null,
    selectedJobId: null,
    savedJobs: [],
    appliedJobs: [],
    componentCache: {},
    pendingProfileImage: '',
    pendingProfileImageFile: null,
    pendingPostImage: '',
    pendingPostImageFile: null
};

const ComponentData = {
    jobs: [],
    applicants: [],
    notifications: {
        new: [],
        earlier: []
    },
    companies: []
};

// ============================================
// ANCHOR APPLICATION INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', async function () {
    initializeApp();
    setupEventListeners();

    await loadCurrentUser();

    loadFeaturedCompanies();
    loadNotifications();
    loadPage('home');
});

function initializeApp() {
    updateRoleBasedUI();
}

// ============================================
// ANCHOR SESSION HELPERS
// ============================================

function getStoredSession() {
    const sessionData = sessionStorage.getItem(SESSION_KEY);
    const localData = localStorage.getItem(SESSION_KEY);
    const raw = sessionData || localData;

    if (!raw) return null;

    try {
        return JSON.parse(raw);
    } catch (error) {
        console.error('Failed to parse stored session:', error);
        return null;
    }
}

function clearStoredSession() {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_KEY);
}

// ============================================
// ANCHOR CURRENT USER + PROFILE STATE
// ============================================

async function loadCurrentUser() {
    const supabase = window.supabaseClient;

    if (!supabase) {
        console.error('Supabase client is not available.');
        return;
    }

    const storedSession = getStoredSession();

    if (!storedSession || !storedSession.UserID || !storedSession.UserType) {
        console.warn('No stored session found. Redirecting to login.');
        window.location.href = 'login.html';
        return;
    }

    const { data, error } = await supabase
        .from('UserTbl')
        .select('*')
        .eq('UserID', storedSession.UserID)
        .single();

    if (error || !data) {
        console.error('Error fetching user from UserTbl:', error);
        clearStoredSession();
        window.location.href = 'login.html';
        return;
    }

    AppState.currentUser = {
        UserID: data.UserID,
        UserType: data.UserType,
        Email: data.Email,
        Username: data.Username,
        UserImage: data.UserImage,
        UserDescription: data.UserDescription
    };

    AppState.currentRole = String(data.UserType || '').toLowerCase();

    if (AppState.currentRole === 'applicant') {
        const { data: applicantRow, error: applicantError } = await supabase
            .from('ApplicantTbl')
            .select('ApplicantID')
            .eq('UserID', data.UserID)
            .single();

        if (applicantError) {
            console.error('Error fetching ApplicantTbl:', applicantError);
        } else {
            AppState.currentApplicantID = applicantRow.ApplicantID;
        }
    }

    if (AppState.currentRole === 'employer') {
        const { data: employerRow, error: employerError } = await supabase
            .from('EmployerTbl')
            .select('EmployerID')
            .eq('UserID', data.UserID)
            .single();

        if (employerError) {
            console.error('Error fetching EmployerTbl:', employerError);
        } else {
            AppState.currentEmployerID = employerRow.EmployerID;
        }
    }

    AppState.viewedProfile = {
        UserID: AppState.currentUser.UserID,
        UserType: AppState.currentRole
    };

    await loadUserJobRelations();

    console.log('Current User Loaded:', AppState.currentUser);
    console.log('UserID:', AppState.currentUser.UserID);
    console.log('UserType:', AppState.currentUser.UserType);
    console.log('ApplicantID:', AppState.currentApplicantID);
    console.log('EmployerID:', AppState.currentEmployerID);

    renderNavbarProfilePic();
    updateRoleBasedUI();
}

function isEmployer() {
    return AppState.currentRole === 'employer';
}

function isApplicant() {
    return AppState.currentRole === 'applicant';
}

function isOwnProfile() {
    if (!AppState.currentUser || !AppState.viewedProfile) return false;
    return Number(AppState.currentUser.UserID) === Number(AppState.viewedProfile.UserID);
}

async function openProfileByUserId(userId, userType) {
    AppState.viewedProfile = {
        UserID: Number(userId),
        UserType: String(userType || '').toLowerCase()
    };

    loadPage('profile');
}

// ============================================
// ANCHOR LOAD USER JOB RELATIONS
// ============================================

async function loadUserJobRelations() {
    const supabase = window.supabaseClient;

    AppState.savedJobs = [];
    AppState.appliedJobs = [];

    if (!supabase || !AppState.currentApplicantID) return;

    const { data: savedRows, error: savedError } = await supabase
        .from('SavePostTbl')
        .select('PostID')
        .eq('ApplicantID', AppState.currentApplicantID);

    if (savedError) {
        console.error('Error loading saved jobs:', savedError);
    } else {
        AppState.savedJobs = (savedRows || []).map(row => Number(row.PostID));
    }

    const { data: appliedRows, error: appliedError } = await supabase
        .from('AppliedTbl')
        .select('PostID, Status')
        .eq('ApplicantID', AppState.currentApplicantID);

    if (appliedError) {
        console.error('Error loading applied jobs:', appliedError);
    } else {
        AppState.appliedJobs = (appliedRows || []).map(row => ({
            PostID: Number(row.PostID),
            Status: row.Status || 'Pending'
        }));
    }
}

function isJobSavedByCurrentUser(postId) {
    return AppState.savedJobs.includes(Number(postId));
}

function isJobAppliedByCurrentUser(postId) {
    return AppState.appliedJobs.some(item => Number(item.PostID) === Number(postId));
}

function getAppliedStatus(postId) {
    const row = AppState.appliedJobs.find(item => Number(item.PostID) === Number(postId));
    return row ? row.Status : '';
}

// ============================================
// ANCHOR NAVBAR PROFILE PIC
// ============================================

function renderNavbarProfilePic() {
    const profilePic = document.querySelector('.profilePic');
    if (!profilePic) return;

    const imageUrl = AppState.currentUser?.UserImage;

    if (imageUrl && String(imageUrl).trim() !== '') {
        profilePic.style.backgroundImage = `url("${imageUrl}")`;
        profilePic.style.backgroundSize = 'cover';
        profilePic.style.backgroundPosition = 'center';
        profilePic.style.backgroundRepeat = 'no-repeat';
    } else {
        profilePic.style.backgroundImage = 'none';
    }
}

// ============================================
// ANCHOR EVENT LISTENERS
// ============================================

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
        searchPopupInput.addEventListener('keypress', function (e) {
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
        profileBtn.addEventListener('click', () => {
            AppState.viewedProfile = {
                UserID: AppState.currentUser?.UserID,
                UserType: AppState.currentRole
            };
            loadPage('profile');
        });
    }

    document.addEventListener('click', function (e) {
        if (e.target.closest('.logoutBtn')) {
            handleLogout();
        }
    });

    document.querySelectorAll('.navLink[data-page]').forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const page = this.getAttribute('data-page');

            if (page === 'profile') {
                AppState.viewedProfile = {
                    UserID: AppState.currentUser?.UserID,
                    UserType: AppState.currentRole
                };
            }

            loadPage(page);
        });
    });

    document.addEventListener('click', function (e) {
        const companyCard = e.target.closest('.featuredCompany');
        if (companyCard) {
            const userId = companyCard.getAttribute('data-user-id');
            const userType = companyCard.getAttribute('data-user-type') || 'employer';

            if (userId) {
                openProfileByUserId(userId, userType);
                return;
            }

            if (companyCard.dataset.link) {
                loadPage(companyCard.dataset.link);
                return;
            }
        }

        const notificationItem = e.target.closest('.notification');
        if (notificationItem && notificationItem.dataset.link) {
            loadPage(notificationItem.dataset.link);
            return;
        }

        const jobProfile = e.target.closest('.jobCompany');
        if (jobProfile) {
            const userId = jobProfile.getAttribute('data-user-id');
            const userType = jobProfile.getAttribute('data-user-type');

            if (userId && userType) {
                openProfileByUserId(userId, userType);
                return;
            }

            if (jobProfile.dataset.link) {
                loadPage(jobProfile.dataset.link);
                return;
            }
        }

        const applicantProfile = e.target.closest('.applicantProfile');
        if (applicantProfile) {
            const userId = applicantProfile.getAttribute('data-user-id');
            const userType = applicantProfile.getAttribute('data-user-type') || 'applicant';

            if (userId) {
                openProfileByUserId(userId, userType);
                return;
            }

            if (applicantProfile.dataset.link) {
                loadPage(applicantProfile.dataset.link);
                return;
            }
        }
    });

    document.addEventListener('click', function (e) {
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

    document.addEventListener('click', function (e) {
        const closeBtn = e.target.closest('.closeBtn[data-modal], .backBtn[data-modal]');
        if (!closeBtn) return;

        const modalId = closeBtn.getAttribute('data-modal');
        if (modalId) {
            closeModal(modalId);
        }
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
        submitApplicationBtn.addEventListener('click', async function () {
            await handleSubmitApplication();
        });
    }
}

// ============================================
// ANCHOR COMPONENT LOADING SYSTEM
// ============================================

async function loadComponent(name) {
    if (AppState.componentCache[name]) {
        return AppState.componentCache[name];
    }

    const res = await fetch(`components/${name}.html`);
    const html = await res.text();

    AppState.componentCache[name] = html;
    return html;
}

function renderTemplate(template, data) {
    return template.replace(/{{(.*?)}}/g, (match, key) => {
        const value = data[key.trim()];
        return value !== undefined && value !== null ? value : '';
    });
}

// ============================================
// ANCHOR DYNAMIC CONTENT RENDERING
// ============================================

async function loadJobCards(containerId, jobsData = []) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const template = await loadComponent('job-card');
    container.innerHTML = '';

    if (!template || !Array.isArray(jobsData) || jobsData.length === 0) {
        container.innerHTML = '<p>No jobs found.</p>';
        return;
    }

    const ownProfile = isOwnProfile();

    jobsData.forEach(job => {
        const postId = Number(job.id);
        const isApplied = isJobAppliedByCurrentUser(postId);
        const isSaved = isJobSavedByCurrentUser(postId);
        const status = getAppliedStatus(postId);

        const showStatusBadge = isApplicant() && isApplied;
        const showApplyButton = isApplicant();
        const showSaveButton = isApplicant();
        const showEditPostButton =
            isEmployer() &&
            ownProfile &&
            Number(job.ownerEmployerID) === Number(AppState.currentEmployerID);

        let statusBadge = '';
        let applyButton = '';
        let employerActions = '';

        if (showStatusBadge) {
            const statusClass = String(status || 'pending').toLowerCase();
            statusBadge = `<span class="statusBadge ${statusClass}">${capitalizeFirst(status || 'Pending')}</span>`;
        }

        if (showApplyButton) {
            applyButton = isApplied
                ? `<button class="btnApplied" disabled>Applied</button>`
                : `<button class="btnApply" data-apply="${postId}">Apply</button>`;
        }

        if (showEditPostButton) {
            employerActions = `
                <button class="actionBtn editPostBtn" data-edit="${postId}" data-owner-employer-id="${job.ownerEmployerID}" title="Edit Post">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 20h9"/>
                        <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>
                    </svg>
                </button>
            `;
        }

        const saveButtonMarkup = showSaveButton
            ? `
                <button class="saveBtn ${isSaved ? 'saved' : ''}" data-save="${postId}" title="Save Job">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="${isSaved ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                    </svg>
                </button>
            `
            : '';

        const data = {
            jobId: postId,
            companyName: job.companyName || '',
            industry: job.companyIndustry || '',
            companyLogo: job.companyLogo || '',
            profileLink: job.profileLink || '',
            profileUserId: job.ownerUserID || '',
            profileUserType: job.ownerUserType || 'employer',
            description: job.description || '',
            jobImage: job.image || '',
            dateRange: job.date || '',
            appliedCount: job.appliedCount || 0,
            saveClass: isSaved ? 'saved' : '',
            saveFill: isSaved ? 'currentColor' : 'none',
            saveButton: saveButtonMarkup,
            employerActions,
            statusBadge,
            applyButton
        };

        const rendered = renderTemplate(template, data);
        container.innerHTML += rendered;
    });

    initializeJobCardEvents();
    initializeDescriptionToggles(container);
    updateRoleBasedUI();
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
    const text = String(value || '');
    return text.charAt(0).toUpperCase() + text.slice(1);
}

async function loadApplicantCards(containerId, applicantsData = []) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const template = await loadComponent('applicant-card');
    container.innerHTML = '';

    if (!template || !Array.isArray(applicantsData) || applicantsData.length === 0) {
        return;
    }

    applicantsData.forEach(applicant => {
        const cardData = {
            applicantId: applicant.id || '',
            applicantName: applicant.name || '',
            applicantUserId: applicant.userId || '',
            applicantUserType: 'applicant',
            statusClass: applicant.status || '',
            statusIcon: applicant.statusIcon || '',
            statusText: applicant.status ? capitalizeFirst(applicant.status) : ''
        };

        const rendered = renderTemplate(template, cardData);
        container.innerHTML += rendered;
    });
}

async function loadNotifications() {
    const container = document.getElementById('notificationContentContainer');
    if (!container) return;

    const template = await loadComponent('notification-card');
    if (!template) {
        container.innerHTML = '';
        return;
    }

    let html = '';

    if (ComponentData.notifications.new.length > 0) {
        html += '<div class="notification-section"><h4>New</h4>';
        ComponentData.notifications.new.forEach(notif => {
            const data = {
                companyName: notif.companyName || '',
                notificationMessage: notif.message || '',
                notificationTime: notif.time || '',
                companyImage: notif.image || '',
                profileLink: notif.profileLink || ''
            };
            html += renderTemplate(template, data);
        });
        html += '</div>';
    }

    if (ComponentData.notifications.earlier.length > 0) {
        html += '<div class="notification-section"><h4>Earlier</h4>';
        ComponentData.notifications.earlier.forEach(notif => {
            const data = {
                companyName: notif.companyName || '',
                notificationMessage: notif.message || '',
                notificationTime: notif.time || '',
                companyImage: notif.image || '',
                profileLink: notif.profileLink || ''
            };
            html += renderTemplate(template, data);
        });
        html += '</div>';
    }

    container.innerHTML = html;
}

async function loadFeaturedCompanies() {
    const container = document.getElementById('featuredListContainer');
    if (!container) return;

    const template = await loadComponent('company-card');
    container.innerHTML = '';

    if (!template) return;

    try {
        const supabase = window.supabaseClient;
        if (!supabase) return;

        const { data: featuredRows, error: featuredError } = await supabase
            .from('FeaturedCompaniesTbl')
            .select('EmployerID');

        if (featuredError) {
            console.error('Failed to load featured companies:', featuredError);
            container.innerHTML = '<p>Failed to load featured companies.</p>';
            return;
        }

        if (!featuredRows || featuredRows.length === 0) {
            container.innerHTML = '<p>No featured companies available.</p>';
            return;
        }

        const employerIds = featuredRows.map(row => row.EmployerID);

        const { data: employerRows, error: employerError } = await supabase
            .from('EmployerTbl')
            .select('EmployerID, UserID, CompanyName, CompanyIndustry')
            .in('EmployerID', employerIds);

        if (employerError) {
            console.error('Failed to load EmployerTbl:', employerError);
            container.innerHTML = '<p>Failed to load featured companies.</p>';
            return;
        }

        const userIds = (employerRows || []).map(row => row.UserID);

        const { data: userRows, error: userError } = await supabase
            .from('UserTbl')
            .select('UserID, UserImage')
            .in('UserID', userIds);

        if (userError) {
            console.error('Failed to load UserTbl for featured companies:', userError);
            container.innerHTML = '<p>Failed to load featured companies.</p>';
            return;
        }

        const userMap = {};
        (userRows || []).forEach(user => {
            userMap[user.UserID] = user;
        });

        (employerRows || []).forEach(employer => {
            const rendered = renderTemplate(template, {
                companyName: employer.CompanyName,
                companyIndustry: employer.CompanyIndustry,
                companyImage: userMap[employer.UserID]?.UserImage || 'assets/default-company.png',
                profileLink: `#profile-employer?employerId=${employer.EmployerID}`,
                userId: employer.UserID,
                userType: 'employer'
            });

            container.innerHTML += rendered;
        });
    } catch (error) {
        console.error(error);
        container.innerHTML = '<p>Failed to load featured companies.</p>';
    }
}

// ============================================
// ANCHOR DATABASE LOADERS
// ============================================

async function loadAllJobs() {
    const supabase = window.supabaseClient;
    if (!supabase) return [];

    try {
        const { data: postRows, error: postError } = await supabase
            .from('JobPostTbl')
            .select('*')
            .order('DatePosted', { ascending: false });

        if (postError) {
            console.error('Failed to load jobs:', postError);
            return [];
        }

        if (!postRows || postRows.length === 0) return [];

        const employerIds = [...new Set(postRows.map(post => post.EmployerID).filter(Boolean))];

        const { data: employerRows, error: employerError } = await supabase
            .from('EmployerTbl')
            .select('EmployerID, UserID, CompanyName, CompanyIndustry')
            .in('EmployerID', employerIds);

        if (employerError) {
            console.error('Failed to load employers:', employerError);
            return [];
        }

        const employerMap = {};
        (employerRows || []).forEach(row => {
            employerMap[row.EmployerID] = row;
        });

        const userIds = [...new Set((employerRows || []).map(row => row.UserID).filter(Boolean))];
        let userMap = {};
        if (userIds.length > 0) {
            const { data: userRows, error: userError } = await supabase
                .from('UserTbl')
                .select('UserID, UserImage')
                .in('UserID', userIds);

            if (userError) {
                console.error('Failed to load job owner images:', userError);
            } else {
                (userRows || []).forEach(row => {
                    userMap[row.UserID] = row;
                });
            }
        }

        return postRows.map(post => {
            const employer = employerMap[post.EmployerID] || {};

            return {
                id: post.PostID,
                ownerEmployerID: post.EmployerID,
                ownerUserID: employer.UserID || '',
                ownerUserType: 'employer',
                companyName: employer.CompanyName || '',
                companyIndustry: employer.CompanyIndustry || '',
                companyLogo: userMap[employer.UserID]?.UserImage || '',
                profileLink: employer.UserID ? `#profile?userId=${employer.UserID}` : '',
                description: post.JobDescription || post.PostDescription || '',
                image: post.JobImage || '',
                date: formatPostDates(post.DatePosted, post.PostDeadline),
                appliedCount: post.AppliedCount || 0
            };
        });
    } catch (error) {
        console.error('loadAllJobs error:', error);
        return [];
    }
}

async function loadProfileJobs() {
    const supabase = window.supabaseClient;
    const containerId = 'jobFeedContainer';

    if (!supabase || !AppState.viewedProfile) return;

    try {
        if (AppState.viewedProfile.UserType === 'employer') {
            const { data: employerRow, error: employerError } = await supabase
                .from('EmployerTbl')
                .select('EmployerID, UserID, CompanyName, CompanyIndustry')
                .eq('UserID', AppState.viewedProfile.UserID)
                .single();

            if (employerError || !employerRow) {
                console.error('Failed to load employer profile:', employerError);
                await loadJobCards(containerId, []);
                return;
            }

            const { data: postRows, error: postError } = await supabase
                .from('JobPostTbl')
                .select('*')
                .eq('EmployerID', employerRow.EmployerID)
                .order('DatePosted', { ascending: false });

            if (postError) {
                console.error('Failed to load employer posts:', postError);
                await loadJobCards(containerId, []);
                return;
            }

            const { data: userRow, error: userError } = await supabase
                .from('UserTbl')
                .select('UserImage')
                .eq('UserID', employerRow.UserID)
                .single();

            if (userError) {
                console.error('Failed to load employer user image:', userError);
            }

            const jobs = (postRows || []).map(post => ({
                id: post.PostID,
                ownerEmployerID: post.EmployerID,
                ownerUserID: employerRow.UserID,
                ownerUserType: 'employer',
                companyName: employerRow.CompanyName,
                companyIndustry: employerRow.CompanyIndustry,
                companyLogo: userRow?.UserImage || '',
                profileLink: `#profile?userId=${employerRow.UserID}`,
                description: post.JobDescription || post.PostDescription || '',
                image: post.JobImage || '',
                date: formatPostDates(post.DatePosted, post.PostDeadline),
                appliedCount: post.AppliedCount || 0
            }));

            await loadJobCards(containerId, jobs);
            return;
        }

        if (AppState.viewedProfile.UserType === 'applicant') {
            const { data: applicantRow, error: applicantError } = await supabase
                .from('ApplicantTbl')
                .select('ApplicantID')
                .eq('UserID', AppState.viewedProfile.UserID)
                .single();

            if (applicantError || !applicantRow) {
                console.error('Failed to load applicant profile:', applicantError);
                await loadJobCards(containerId, []);
                return;
            }

            const { data: appliedRows, error: appliedError } = await supabase
                .from('AppliedTbl')
                .select('PostID')
                .eq('ApplicantID', applicantRow.ApplicantID);

            if (appliedError) {
                console.error('Failed to load applicant applied rows:', appliedError);
                await loadJobCards(containerId, []);
                return;
            }

            const postIds = (appliedRows || []).map(row => row.PostID);

            if (postIds.length === 0) {
                await loadJobCards(containerId, []);
                return;
            }

            const { data: postRows, error: postError } = await supabase
                .from('JobPostTbl')
                .select('*')
                .in('PostID', postIds)
                .order('DatePosted', { ascending: false });

            if (postError) {
                console.error('Failed to load applicant applied posts:', postError);
                await loadJobCards(containerId, []);
                return;
            }

            const employerIds = [...new Set((postRows || []).map(post => post.EmployerID).filter(Boolean))];

            const { data: employerRows, error: employerRowsError } = await supabase
                .from('EmployerTbl')
                .select('EmployerID, UserID, CompanyName, CompanyIndustry')
                .in('EmployerID', employerIds);

            if (employerRowsError) {
                console.error('Failed to load employers for applicant profile:', employerRowsError);
                await loadJobCards(containerId, []);
                return;
            }

            const employerMap = {};
            (employerRows || []).forEach(row => {
                employerMap[row.EmployerID] = row;
            });

            const userIds = [...new Set((employerRows || []).map(row => row.UserID).filter(Boolean))];

            let userMap = {};
            if (userIds.length > 0) {
                const { data: userRows, error: userError } = await supabase
                    .from('UserTbl')
                    .select('UserID, UserImage')
                    .in('UserID', userIds);

                if (userError) {
                    console.error('Failed to load employer user images:', userError);
                } else {
                    (userRows || []).forEach(row => {
                        userMap[row.UserID] = row;
                    });
                }
            }

            const jobs = (postRows || []).map(post => {
                const employer = employerMap[post.EmployerID] || {};
                return {
                    id: post.PostID,
                    ownerEmployerID: post.EmployerID,
                    ownerUserID: employer.UserID || '',
                    ownerUserType: 'employer',
                    companyName: employer.CompanyName || '',
                    companyIndustry: employer.CompanyIndustry || '',
                    companyLogo: userMap[employer.UserID]?.UserImage || '',
                    profileLink: employer.UserID ? `#profile?userId=${employer.UserID}` : '',
                    description: post.JobDescription || post.PostDescription || '',
                    image: post.JobImage || '',
                    date: formatPostDates(post.DatePosted, post.PostDeadline),
                    appliedCount: post.AppliedCount || 0
                };
            });

            await loadJobCards(containerId, jobs);
        }
    } catch (error) {
        console.error('loadProfileJobs error:', error);
        await loadJobCards(containerId, []);
    }
}

// ============================================
// ANCHOR PROFILE RENDER HELPERS
// ============================================

function setElementText(selector, value) {
    const element = document.querySelector(selector);
    if (!element) return;
    element.textContent = value ?? '';
}

function setDetailItemText(id, value) {
    const element = document.getElementById(id);
    if (!element) return;

    const textNode = element.querySelector('p');
    if (textNode) {
        textNode.textContent = value ?? '';
    } else {
        const svg = element.querySelector('svg');
        element.innerHTML = '';

        if (svg) {
            element.appendChild(svg);
        }

        const text = document.createTextNode(value ?? '');
        element.appendChild(text);
    }
}

function setProfileAvatar(imageUrl) {
    const avatar = document.querySelector('.profileAvatar');
    if (!avatar) return;

    if (imageUrl && String(imageUrl).trim() !== '') {
        avatar.innerHTML = '';
        avatar.style.backgroundImage = `url("${imageUrl}")`;
        avatar.style.backgroundSize = 'cover';
        avatar.style.backgroundPosition = 'center';
        avatar.style.backgroundRepeat = 'no-repeat';
    } else {
        avatar.style.backgroundImage = 'none';

        if (!avatar.querySelector('svg')) {
            avatar.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                </svg>
            `;
        }
    }
}

function formatBirthDate(dateValue) {
    if (!dateValue) return '';

    const parsedDate = new Date(dateValue);
    if (Number.isNaN(parsedDate.getTime())) {
        return dateValue;
    }

    return parsedDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function buildApplicantFullName(applicantRow) {
    const parts = [
        applicantRow.FirstName,
        applicantRow.MiddleName,
        applicantRow.LastName
    ].filter(part => part && String(part).trim() !== '');

    return parts.join(' ');
}

function getSafeUsername(username) {
    const clean = String(username || '').trim();
    if (!clean) return '@user';
    return clean.startsWith('@') ? clean : `@${clean}`;
}

async function renderApplicantProfile(userRow) {
    const supabase = window.supabaseClient;
    if (!supabase || !userRow) return;

    const { data: applicantRow, error: applicantError } = await supabase
        .from('ApplicantTbl')
        .select('*')
        .eq('UserID', userRow.UserID)
        .single();

    if (applicantError || !applicantRow) {
        console.error('Failed to load applicant details:', applicantError);
        return;
    }

    const fullName = buildApplicantFullName(applicantRow) || userRow.Username || 'Applicant';

    setProfileAvatar(userRow.UserImage);
    setElementText('.profileName', fullName);
    setElementText('.profileUsername', getSafeUsername(userRow.Username));
    setElementText('.profileAbout p', userRow.UserDescription || 'No description available.');

    setDetailItemText('applicantEmail', userRow.Email || '');
    setDetailItemText('applicantContactNumber', applicantRow.ContactNumber || '');
    setDetailItemText('applicantAddress', applicantRow.Address || '');
    setDetailItemText('applicantEducAttain', applicantRow.EducationAttained || '');
    setDetailItemText('applicantBday', formatBirthDate(applicantRow.BirthDate));
    setDetailItemText('applicantSex', applicantRow.Gender || '');

    const pageTitle = document.querySelector('.pageTitle');
    if (pageTitle) {
        pageTitle.textContent = isOwnProfile() ? 'Applied Jobs' : 'Applied Jobs';
    }
}

async function renderEmployerProfile(userRow) {
    const supabase = window.supabaseClient;
    if (!supabase || !userRow) return;

    const { data: employerRow, error: employerError } = await supabase
        .from('EmployerTbl')
        .select('*')
        .eq('UserID', userRow.UserID)
        .single();

    if (employerError || !employerRow) {
        console.error('Failed to load employer details:', employerError);
        return;
    }

    setProfileAvatar(userRow.UserImage);
    setElementText('.profileName', employerRow.CompanyName || userRow.Username || 'Employer');
    setElementText('.profileUsername', getSafeUsername(userRow.Username));
    setElementText('.profileAbout p', userRow.UserDescription || 'No description available.');

    setDetailItemText('companyEmail', employerRow.EmployerEmail || userRow.Email || '');
    setDetailItemText('companyContactNumber', employerRow.CompanyContact || '');
    setDetailItemText('companyAddress', employerRow.CompanyAddress || '');
    setDetailItemText('companyIndustry', employerRow.CompanyIndustry || '');

    setDetailItemText('employerName', employerRow.EmployerFullName || '');
    setDetailItemText('employerPosition', employerRow.EmployerPosition || '');
    setDetailItemText('employerEmail', employerRow.EmployerEmail || '');
    setDetailItemText('employerContactNumber', employerRow.EmployerContact || '');

    const pageTitle = document.querySelector('.pageTitle');
    if (pageTitle) {
        pageTitle.textContent = 'Posted Jobs';
    }
}

async function loadViewedProfileData() {
    const supabase = window.supabaseClient;

    if (!supabase || !AppState.viewedProfile?.UserID) return;

    const { data: userRow, error: userError } = await supabase
        .from('UserTbl')
        .select('*')
        .eq('UserID', AppState.viewedProfile.UserID)
        .single();

    if (userError || !userRow) {
        console.error('Failed to load viewed profile user:', userError);
        return;
    }

    const viewedType = String(
        AppState.viewedProfile?.UserType ||
        userRow.UserType ||
        ''
    ).toLowerCase();

    AppState.viewedProfile = {
        UserID: userRow.UserID,
        UserType: viewedType
    };

    if (viewedType === 'applicant') {
        await renderApplicantProfile(userRow);
        return;
    }

    if (viewedType === 'employer') {
        await renderEmployerProfile(userRow);
    }
}

function formatPostDates(datePosted, deadline) {
    function formatDate(date) {
        if (!date) return null;

        const d = new Date(date);
        if (isNaN(d)) return null;

        return d.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    const posted = formatDate(datePosted);
    const due = formatDate(deadline);

    if (posted && due) {
        return `${posted} • Deadline: ${due}`;
    }

    if (posted) return posted;
    if (due) return `Deadline: ${due}`;

    return '';
}

// ============================================
// ANCHOR PAGE NAVIGATION SYSTEM
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

    const layoutMode = [
        'profile',
        'profile-employer',
        'edit-profile',
        'edit-profile-employer',
        'create-post',
        'edit-post',
        'view-applicants',
        'view-application'
    ].includes(pageName);

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
        const viewedType = AppState.viewedProfile?.UserType || AppState.currentRole;
        pageFile = viewedType === 'employer' ? 'profile-employer' : 'profile';
    }

    if (pageName === 'edit-profile') {
        pageFile = AppState.currentRole === 'employer' ? 'edit-profile-employer' : 'edit-profile';
    }

    fetch(`pages/${pageFile}.html?v=${Date.now()}`)
        .then(response => response.text())
        .then(html => {
            const content = document.getElementById('mainContent');
            if (content) {
                content.innerHTML = html;
                initializePageSpecificEvents(pageName);
            }
        })
        .catch(error => {
            console.error('Error loading page:', error);
            const content = document.getElementById('mainContent');
            if (content) {
                content.innerHTML = `
                    <div class="page-content">
                        <div class="page-simple">
                            <h2>Page Not Found</h2>
                            <p>The requested page could not be loaded.</p>
                        </div>
                    </div>
                `;
            }
        });
}

async function initializePageSpecificEvents(pageName) {
    switch (pageName) {
        case 'home': {
            await loadUserJobRelations();
            const jobs = await loadAllJobs();
            await loadJobCards('jobFeedContainer', jobs);
            break;
        }

        case 'search-results': {
            await loadUserJobRelations();
            const jobs = await loadAllJobs();
            const searchQuery = (localStorage.getItem('searchQuery') || '').trim().toLowerCase();

            if (!searchQuery) {
                await loadJobCards('jobFeedContainer', jobs);
                break;
            }

            const filteredJobs = jobs.filter(job => {
                return [
                    job.companyName,
                    job.companyIndustry,
                    job.description
                ].some(value => String(value || '').toLowerCase().includes(searchQuery));
            });

            await loadJobCards('jobFeedContainer', filteredJobs);
            break;
        }

        case 'saved': {
            await loadUserJobRelations();
            const jobs = await loadAllJobs();
            const savedJobs = jobs.filter(job => isJobSavedByCurrentUser(job.id));
            await loadJobCards('jobFeedContainer', savedJobs);
            break;
        }

        case 'scan':
            initializeScanPage();
            break;

        case 'profile':
            await initializeProfilePage();
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
// ANCHOR ROLE-BASED FUNCTIONALITY
// ============================================

function updateRoleBasedUI() {
    const ownProfile = isOwnProfile();

    document.querySelectorAll('#editProfileBtn').forEach(btn => {
        btn.style.display = ownProfile ? 'inline-flex' : 'none';
    });

    document.querySelectorAll('#createPostBtn').forEach(btn => {
        btn.style.display = (isEmployer() && ownProfile) ? 'inline-flex' : 'none';
    });

    document.querySelectorAll('.btnApply, .btnApplied').forEach(btn => {
        btn.style.display = isApplicant() ? 'inline-flex' : 'none';
    });

    document.querySelectorAll('.saveBtn').forEach(btn => {
        btn.style.display = isApplicant() ? 'inline-flex' : 'none';
    });

    document.querySelectorAll('.editPostBtn').forEach(btn => {
        const ownerEmployerId = Number(btn.getAttribute('data-owner-employer-id'));
        const canEdit =
            isEmployer() &&
            ownProfile &&
            Number(AppState.currentEmployerID) === ownerEmployerId;

        btn.style.display = canEdit ? 'inline-flex' : 'none';
    });
}

// ============================================
// ANCHOR UI INTERACTION HANDLERS
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
// ANCHOR JOB CARD INTERACTIONS
// ============================================
function openEditPost(postId) {
    if (!postId) return;
    localStorage.setItem('selectedPostId', String(postId));
    loadPage('edit-post');
}

function initializeJobCardEvents() {
    document.querySelectorAll('.saveBtn').forEach(btn => {
        btn.addEventListener('click', async function (e) {
            e.stopPropagation();
            const jobId = this.getAttribute('data-save');
            await toggleSaveJob(jobId, this);
        });
    });

    document.querySelectorAll('.btnApply').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            const jobId = this.getAttribute('data-apply');

            if (AppState.currentRole === 'applicant') {
                openApplyModal(jobId);
            }
        });
    });

    document.querySelectorAll('.companyName').forEach(name => {
        name.addEventListener('click', function (e) {
            e.stopPropagation();

            const card = this.closest('.jobCard');
            if (!card) return;

            const userId = card.getAttribute('data-user-id');
            const userType = card.getAttribute('data-user-type');

            if (userId && userType) {
                openProfileByUserId(userId, userType);
            }
        });
    });

    document.querySelectorAll('.editPostBtn').forEach(btn => {
    btn.addEventListener('click', function (e) {
        e.stopPropagation();
        openEditPost(this.getAttribute('data-edit'));
    });
});

    document.querySelectorAll('.removeFeedBtn').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            const jobId = this.getAttribute('data-remove');
            removeJobFromFeed(jobId);
        });
    });

    updateRoleBasedUI();
}

function removeJobFromFeed(jobId) {
    const card = document.querySelector(`.jobCard[data-job-id="${jobId}"]`);
    if (card) {
        card.remove();
    }
}

async function toggleSaveJob(jobId, button) {
    if (!isApplicant() || !AppState.currentApplicantID) return;

    const supabase = window.supabaseClient;
    const postId = Number(jobId);
    const isSaved = button.classList.contains('saved');

    if (!isSaved) {
        const { error } = await supabase
            .from('SavePostTbl')
            .insert({
                PostID: postId,
                ApplicantID: AppState.currentApplicantID,
                DateSave: new Date().toISOString()
            });

        if (error) {
            console.error('Save failed:', error);
            return;
        }

        button.classList.add('saved');

        const svg = button.querySelector('svg');
        if (svg) {
            svg.setAttribute('fill', '#F5A302');
            svg.setAttribute('stroke', '#F5A302');
        }

        if (!AppState.savedJobs.includes(postId)) {
            AppState.savedJobs.push(postId);
        }
    } else {
        const { error } = await supabase
            .from('SavePostTbl')
            .delete()
            .eq('PostID', postId)
            .eq('ApplicantID', AppState.currentApplicantID);

        if (error) {
            console.error('Unsave failed:', error);
            return;
        }

        button.classList.remove('saved');

        const svg = button.querySelector('svg');
        if (svg) {
            svg.setAttribute('fill', 'none');
            svg.setAttribute('stroke', 'currentColor');
        }

        AppState.savedJobs = AppState.savedJobs.filter(id => Number(id) !== postId);
    }

    if (AppState.currentPage === 'saved') {
        const jobs = await loadAllJobs();
        const savedOnly = jobs.filter(job => isJobSavedByCurrentUser(job.id));
        await loadJobCards('jobFeedContainer', savedOnly);
    }
}

function openApplyModal(jobId) {
    AppState.selectedJobId = Number(jobId);

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

async function handleSubmitApplication() {
    if (!isApplicant() || !AppState.currentApplicantID || !AppState.selectedJobId) return;

    const fileInput = document.getElementById('fileInput');
    if (!fileInput || fileInput.files.length === 0) {
        alert('Please attach a resume file.');
        return;
    }

    const supabase = window.supabaseClient;
    const postId = Number(AppState.selectedJobId);

    const { error } = await supabase
        .from('AppliedTbl')
        .insert({
            ApplicantID: AppState.currentApplicantID,
            PostID: postId,
            DateApplied: new Date().toISOString(),
            Status: 'Pending'
        });

    if (error) {
        console.error('Application failed:', error);
        alert('Failed to submit application.');
        return;
    }

    AppState.appliedJobs.push({
        PostID: postId,
        Status: 'Pending'
    });

    alert('Application submitted successfully!');
    closeModal('applyModal');
    AppState.selectedJobId = null;

    const submitBtn = document.querySelector(`.btnApply[data-apply="${postId}"]`);
    if (submitBtn) {
        submitBtn.classList.remove('btnApply');
        submitBtn.classList.add('btnApplied');
        submitBtn.textContent = 'Applied';
        submitBtn.disabled = true;
        submitBtn.removeAttribute('data-apply');
    }

    if (AppState.currentPage === 'profile' && AppState.viewedProfile?.UserType === 'applicant') {
        await loadProfileJobs();
    }
}

// ============================================
// ANCHOR PAGE-SPECIFIC INITIALIZATION
// ============================================

function initializeScanPage() {
    const scanBrowseBtn = document.getElementById('scanBrowseBtn');
    const scanFileInput = document.getElementById('scanFileInput');
    const scanResumeBtn = document.getElementById('scanResumeBtn');
    const scanResults = document.getElementById('scanResults');
    const addFileBtn = document.getElementById('addFileBtn');
    const scrollTopBtn = document.getElementById('scrollTopBtn');

    if (scanBrowseBtn) {
        scanBrowseBtn.addEventListener('click', function (e) {
            e.preventDefault();
            if (scanFileInput) scanFileInput.click();
        });
    }

    if (scanFileInput) {
        scanFileInput.addEventListener('change', function () {
            if (this.files.length > 0) {
                console.log('Scan file selected:', this.files[0].name);
            }
        });
    }

    if (scanResumeBtn) {
        scanResumeBtn.addEventListener('click', function () {
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
        addFileBtn.addEventListener('click', function () {
            if (scanFileInput) scanFileInput.click();
        });
    }

    if (scrollTopBtn) {
        scrollTopBtn.addEventListener('click', function () {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
}

async function initializeProfilePage() {
    const editProfileBtn = document.getElementById('editProfileBtn');
    const createPostBtn = document.getElementById('createPostBtn');

    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', function () {
            if (isOwnProfile()) {
                loadPage('edit-profile');
            }
        });
    }

    if (createPostBtn) {
        createPostBtn.addEventListener('click', function () {
            if (isEmployer() && isOwnProfile()) {
                loadPage('create-post');
            }
        });
    }

    await loadUserJobRelations();
    await loadViewedProfileData();
    await loadProfileJobs();
    updateRoleBasedUI();

    document.querySelectorAll('.edit-job-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            loadPage('edit-post');
        });
    });

    document.querySelectorAll('.view-post-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            loadPage('view-applicants');
        });
    });
}

async function initializeEditProfilePage() {
    const supabase = window.supabaseClient;
    const backBtn = document.getElementById('backToProfileBtn');
    const cancelBtn = document.getElementById('cancelEditBtn');
    const form = document.getElementById('editProfileForm');
    const deleteBtn = document.querySelector('.deleteAccountBtn');
    const browseBtn = document.getElementById('browseBtn');
    const fileInput = document.getElementById('fileInput');

    if (!supabase || !AppState.currentUser?.UserID) {
        console.error('Cannot initialize edit profile page.');
        return;
    }

    AppState.pendingProfileImage = '';
    AppState.pendingProfileImageFile = null;

    if (backBtn) {
        backBtn.addEventListener('click', function () {
            loadPage('profile');
        });
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', function () {
            loadPage('profile');
        });
    }

    if (browseBtn && fileInput) {
        browseBtn.addEventListener('click', function () {
            fileInput.click();
        });
    }

    if (fileInput) {
        fileInput.addEventListener('change', handleEditProfileImageChange);
    }

    await populateEditProfileForm();

    if (form) {
        form.addEventListener('submit', async function (e) {
            e.preventDefault();
            await saveEditProfileForm(form);
        });
    }

    if (deleteBtn) {
        deleteBtn.addEventListener('click', async function () {
            const confirmed = confirm('Are you sure you want to delete your account? This action cannot be undone.');
            if (!confirmed) return;

            alert('Delete account logic is not connected yet.');
        });
    }
}

function handleEditProfileImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file.');
        e.target.value = '';
        return;
    }

    AppState.pendingProfileImageFile = file;

    const reader = new FileReader();

    reader.onload = function (event) {
        const imageData = event.target?.result || '';
        AppState.pendingProfileImage = imageData;

        const avatar = document.querySelector('.profileAvatar');
        if (avatar) {
            avatar.innerHTML = '';
            avatar.style.backgroundImage = `url("${imageData}")`;
            avatar.style.backgroundSize = 'cover';
            avatar.style.backgroundPosition = 'center';
            avatar.style.backgroundRepeat = 'no-repeat';
        }
    };

    reader.onerror = function () {
        console.error('Failed to read image file.');
        alert('Failed to preview image.');
    };

    reader.readAsDataURL(file);
}

function getInputByLabel(inputs, labelText) {
    const normalizedTarget = String(labelText).trim().toLowerCase();

    for (const input of inputs) {
        const formInput = input.closest('.formInput');
        const label = formInput?.querySelector('label');

        if (label && label.textContent.trim().toLowerCase() === normalizedTarget) {
            return input.value.trim();
        }
    }

    return '';
}

function setInputByLabel(inputs, labelText, value) {
    const normalizedTarget = String(labelText).trim().toLowerCase();

    for (const input of inputs) {
        const formInput = input.closest('.formInput');
        const label = formInput?.querySelector('label');

        if (label && label.textContent.trim().toLowerCase() === normalizedTarget) {
            input.value = value ?? '';
            return;
        }
    }
}

async function populateEditProfileForm() {
    const supabase = window.supabaseClient;
    const userId = AppState.currentUser?.UserID;

    if (!supabase || !userId) return;

    const avatar = document.querySelector('.profileAvatar');
    if (avatar) {
        if (AppState.currentUser?.UserImage) {
            avatar.style.backgroundImage = `url("${AppState.currentUser.UserImage}")`;
            avatar.style.backgroundSize = 'cover';
            avatar.style.backgroundPosition = 'center';
            avatar.style.backgroundRepeat = 'no-repeat';
            avatar.innerHTML = '';
        } else {
            avatar.style.backgroundImage = 'none';
        }
    }

    const descriptionField = document.getElementById('description');
    if (descriptionField) {
        descriptionField.value = AppState.currentUser?.UserDescription || '';
    }

    const allInputs = document.querySelectorAll('#editProfileForm input, #editProfileForm select, #editProfileForm textarea');

    if (isApplicant()) {
        const { data: applicantRow, error } = await supabase
            .from('ApplicantTbl')
            .select('*')
            .eq('UserID', userId)
            .single();

        if (error) {
            console.error('Failed to load applicant edit data:', error);
            return;
        }

        setInputByLabel(allInputs, 'Username', AppState.currentUser?.Username || '');
        setInputByLabel(allInputs, 'Email', AppState.currentUser?.Email || '');
        setInputByLabel(allInputs, 'Surname', applicantRow.LastName || '');
        setInputByLabel(allInputs, 'First Name', applicantRow.FirstName || '');
        setInputByLabel(allInputs, 'Middle Name', applicantRow.MiddleName || '');
        setInputByLabel(allInputs, 'Address', applicantRow.Address || '');
        setInputByLabel(allInputs, 'Sex', (applicantRow.Gender || '').toLowerCase());
        setInputByLabel(allInputs, 'Birth Date', applicantRow.BirthDate || '');
        setInputByLabel(allInputs, 'Contact Number', applicantRow.ContactNumber || '');
    }

    if (isEmployer()) {
        const { data: employerRow, error } = await supabase
            .from('EmployerTbl')
            .select('*')
            .eq('UserID', userId)
            .single();

        if (error) {
            console.error('Failed to load employer edit data:', error);
            return;
        }

        setInputByLabel(allInputs, 'Username', AppState.currentUser?.Username || '');
        setInputByLabel(allInputs, 'Email', AppState.currentUser?.Email || '');
        setInputByLabel(allInputs, 'Company Name', employerRow.CompanyName || '');
        setInputByLabel(allInputs, 'Company Address', employerRow.CompanyAddress || '');
        setInputByLabel(allInputs, 'Company Contact Number', employerRow.CompanyContact || '');
        setInputByLabel(allInputs, 'Industry', employerRow.CompanyIndustry || '');
        setInputByLabel(allInputs, 'Employer Full Name', employerRow.EmployerFullName || '');
        setInputByLabel(allInputs, 'Employer Position', employerRow.EmployerPosition || '');
        setInputByLabel(allInputs, 'Employer Email', employerRow.EmployerEmail || '');
        setInputByLabel(allInputs, 'Employer Contact Number', employerRow.EmployerContact || '');
    }
}

async function uploadProfileImage(file, userId) {
    const supabase = window.supabaseClient;

    if (!supabase || !file || !userId) {
        throw new Error('Missing Supabase client, file, or user ID.');
    }

    const fileExt = file.name.split('.').pop() || 'png';
    const filePath = `profile-images/user-${userId}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true
        });

    if (uploadError) {
        throw uploadError;
    }

    const { data: publicUrlData } = supabase.storage
        .from('profile-images')
        .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
}

async function saveEditProfileForm(form) {
    const supabase = window.supabaseClient;
    const userId = AppState.currentUser?.UserID;
    const allInputs = form.querySelectorAll('input, select, textarea');

    if (!supabase || !userId) {
        alert('Missing Supabase client or user ID.');
        return;
    }

    const description = document.getElementById('description')?.value.trim() || '';
    const username = getInputByLabel(allInputs, 'Username');
    const email = getInputByLabel(allInputs, 'Email');

    if (!username || !email) {
        alert('Username and Email are required.');
        return;
    }

    let finalImageUrl = AppState.currentUser?.UserImage || '';

    try {
        if (AppState.pendingProfileImageFile) {
            finalImageUrl = await uploadProfileImage(AppState.pendingProfileImageFile, userId);
        }

        const userPayload = {
            Username: username,
            Email: email,
            UserDescription: description,
            UserImage: finalImageUrl
        };

        const { error: userError } = await supabase
            .from('UserTbl')
            .update(userPayload)
            .eq('UserID', userId);

        if (userError) {
            alert(`Failed to update user: ${userError.message}`);
            return;
        }

        if (isApplicant()) {
            const applicantPayload = {
                LastName: getInputByLabel(allInputs, 'Surname'),
                FirstName: getInputByLabel(allInputs, 'First Name'),
                MiddleName: getInputByLabel(allInputs, 'Middle Name'),
                Address: getInputByLabel(allInputs, 'Address'),
                Gender: getInputByLabel(allInputs, 'Sex'),
                BirthDate: getInputByLabel(allInputs, 'Birth Date'),
                ContactNumber: getInputByLabel(allInputs, 'Contact Number')
            };

            const { error: applicantError } = await supabase
                .from('ApplicantTbl')
                .update(applicantPayload)
                .eq('UserID', userId);

            if (applicantError) {
                alert(`Failed to update applicant details: ${applicantError.message}`);
                return;
            }
        }

        if (isEmployer()) {
            const employerPayload = {
                CompanyName: getInputByLabel(allInputs, 'Company Name'),
                CompanyAddress: getInputByLabel(allInputs, 'Company Address'),
                CompanyContact: getInputByLabel(allInputs, 'Company Contact Number'),
                CompanyIndustry: getInputByLabel(allInputs, 'Industry'),
                EmployerFullName: getInputByLabel(allInputs, 'Employer Full Name'),
                EmployerPosition: getInputByLabel(allInputs, 'Employer Position'),
                EmployerEmail: getInputByLabel(allInputs, 'Employer Email'),
                EmployerContact: getInputByLabel(allInputs, 'Employer Contact Number')
            };

            const { error: employerError } = await supabase
                .from('EmployerTbl')
                .update(employerPayload)
                .eq('UserID', userId);

            if (employerError) {
                alert(`Failed to update employer details: ${employerError.message}`);
                return;
            }
        }

        AppState.currentUser.Username = username;
        AppState.currentUser.Email = email;
        AppState.currentUser.UserDescription = description;
        AppState.currentUser.UserImage = finalImageUrl;

        AppState.pendingProfileImage = '';
        AppState.pendingProfileImageFile = null;

        renderNavbarProfilePic();

        alert('Profile updated successfully!');

        await loadCurrentUser();

        AppState.viewedProfile = {
            UserID: AppState.currentUser.UserID,
            UserType: AppState.currentRole
        };

        loadPage('profile');
    } catch (error) {
        console.error('Save profile error:', error);
        alert(`Failed to save profile: ${error.message}`);
    }
}

function buildPostDisplayDescription(fields) {
    const rawPostDescription = String(fields.postDescription || '').trim();

    if (!fields.attachJobInfo) {
        return rawPostDescription;
    }

    const jobInfoLines = [
        fields.jobTitle ? `Job Title: ${fields.jobTitle}` : null,
        fields.department ? `Department / Team: ${fields.department}` : null,
        fields.deploymentType ? `Deployment Type: ${fields.deploymentType}` : null,
        fields.workSetup ? `Work Setup: ${fields.workSetup}` : null,
        fields.deploymentLocation ? `Deployment Location: ${fields.deploymentLocation}` : null,
        fields.workingHours ? `Working Hours: ${fields.workingHours}` : null,
        fields.salaryRange ? `Salary Range: ${fields.salaryRange}` : null,
        fields.slotsAvailable ? `Slots Available: ${fields.slotsAvailable}` : null,
        fields.idealAge ? `Ideal Age Range: ${fields.idealAge}` : null,
        fields.idealEducationAttained ? `Ideal Education Attained: ${fields.idealEducationAttained}` : null,
        fields.idealYearsOfExperience ? `Ideal Years of Experience: ${fields.idealYearsOfExperience}` : null,
        fields.idealSkills ? `Ideal Skills: ${fields.idealSkills}` : null
    ].filter(Boolean);

    if (jobInfoLines.length === 0) {
        return rawPostDescription;
    }

    return [
        rawPostDescription,
        '',
        'Job Information:',
        ...jobInfoLines
    ].filter(Boolean).join('\n');
}

function getPostFormFields(form) {
    if (!form) {
        return {
            jobTitle: '',
            department: '',
            deploymentType: '',
            workSetup: '',
            deploymentLocation: '',
            workingHours: '',
            salaryRange: '',
            slotsAvailable: '',
            idealAge: '',
            idealEducationAttained: '',
            idealYearsOfExperience: '',
            idealSkills: '',
            postDescription: '',
            postDeadline: null,
            attachJobInfo: false,
            skills: false,
            achievements: false,
            experience: false,
            resumeQuality: false,
            education: false,
            age: false,
            targetScore: ''
        };
    }

    return {
        jobTitle: form.querySelector('#jobTitle')?.value.trim() || '',
        department: form.querySelector('#department')?.value.trim() || '',
        deploymentType: form.querySelector('#deploymentType')?.value || '',
        workSetup: form.querySelector('#workSetup')?.value || '',
        deploymentLocation: form.querySelector('#deploymentLocation')?.value.trim() || '',
        workingHours: form.querySelector('#workingHours')?.value.trim() || '',
        salaryRange: form.querySelector('#salaryRange')?.value || '',
        slotsAvailable: form.querySelector('#slotsAvailable')?.value.trim() || '',
        idealAge: form.querySelector('#idealAge')?.value || '',
        idealEducationAttained: form.querySelector('#educationAttained')?.value || '',
        idealYearsOfExperience: form.querySelector('#idealYearsOfExperience')?.value.trim() || '',
        idealSkills: form.querySelector('#idealSkills')?.value.trim() || '',
        postDescription: form.querySelector('#postDescription')?.value.trim() || '',
        postDeadline: form.querySelector('#postDeadline')?.value || null,
        attachJobInfo: form.querySelector('#attachJobInfo')?.checked || false,

        skills: form.querySelector('#skills')?.checked || false,
        achievements: form.querySelector('#achievements')?.checked || false,
        experience: form.querySelector('#experience')?.checked || false,
        resumeQuality: form.querySelector('#resumeQuality')?.checked || false,
        education: form.querySelector('#education')?.checked || false,
        age: form.querySelector('#age')?.checked || false,
        targetScore: form.querySelector('#targetScore')?.value || ''
    };
}

function setPostFormFields(form, post) {
    if (!form || !post) return;

    const setValue = (selector, value) => {
        const el = form.querySelector(selector);
        if (el) el.value = value ?? '';
    };

    const setChecked = (selector, value) => {
        const el = form.querySelector(selector);
        if (el) el.checked = Boolean(value);
    };

    setValue('#jobTitle', post.JobTitle);
    setValue('#department', post.Department);
    setValue('#deploymentType', post.DeploymentType);
    setValue('#workSetup', post.WorkSetup);
    setValue('#deploymentLocation', post.DeploymentLocation);
    setValue('#workingHours', post.WorkingHours);
    setValue('#salaryRange', post.SalaryRange);
    setValue('#slotsAvailable', post.SlotsAvailable);
    setValue('#idealAge', post.IdealAge);
    setValue('#educationAttained', post.IdealEductaionAttained);
    setValue('#idealYearsOfExperience', post.IdealYearsOfExperience);
    setValue('#idealSkills', post.IdealSkills);
    setValue('#postDescription', post.PostDescription);
    setValue('#postDeadline', post.PostDeadline);
    setValue('#targetScore', post.TargetScore);

    setChecked('#skills', post.Skills);
    setChecked('#achievements', post.Achievements);
    setChecked('#experience', post.Experience);
    setChecked('#resumeQuality', post.ResumeQuality);
    setChecked('#education', post.Education);
    setChecked('#age', post.Age);

    const builtDescription = String(post.JobDescription || '').trim();
    const rawDescription = String(post.PostDescription || '').trim();

    setChecked(
        '#attachJobInfo',
        builtDescription !== '' &&
        rawDescription !== '' &&
        builtDescription !== rawDescription
    );
}

function buildJobPostPayload(fields, imageUrl = '') {
    return {
        PostDescription: fields.postDescription,
        JobDescription: buildPostDisplayDescription(fields),

        JobTitle: fields.jobTitle,
        Department: fields.department,
        DeploymentType: fields.deploymentType,
        WorkSetup: fields.workSetup,
        DeploymentLocation: fields.deploymentLocation,
        WorkingHours: fields.workingHours,
        SalaryRange: fields.salaryRange,
        SlotsAvailable: fields.slotsAvailable,
        IdealAge: fields.idealAge || null,
        IdealEductaionAttained: fields.idealEducationAttained || null,
        IdealYearsOfExperience: fields.idealYearsOfExperience || null,
        IdealSkills: fields.idealSkills || null,

        Skills: fields.skills,
        Achievements: fields.achievements,
        Experience: fields.experience,
        ResumeQuality: fields.resumeQuality,
        Education: fields.education,
        Age: fields.age,
        TargetScore: fields.targetScore || null,

        PostDeadline: fields.postDeadline || null,
        JobImage: imageUrl || ''
    };
}

function handlePostImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file.');
        e.target.value = '';
        return;
    }

    AppState.pendingPostImageFile = file;

    const reader = new FileReader();

    reader.onload = function (event) {
        const imageData = event.target?.result || '';
        AppState.pendingPostImage = imageData;

        const dropZone = document.querySelector('.fileDropZone');
        if (!dropZone) return;

        let previewImg = dropZone.querySelector('.postImagePreview');

        if (!previewImg) {
            previewImg = document.createElement('img');
            previewImg.className = 'postImagePreview';
            previewImg.alt = 'Post image preview';
            previewImg.style.maxWidth = '200px';
            previewImg.style.width = '100%';
            previewImg.style.borderRadius = '12px';
            previewImg.style.marginBottom = '12px';
            previewImg.style.display = 'block';
            dropZone.prepend(previewImg);
        }

        previewImg.src = imageData;
    };

    reader.onerror = function () {
        console.error('Failed to read image file.');
        alert('Failed to preview image.');
    };

    reader.readAsDataURL(file);
}

async function uploadPostImage(file, employerId) {
    const supabase = window.supabaseClient;

    if (!supabase || !file || !employerId) {
        throw new Error('Missing Supabase client, file, or employer ID.');
    }

    const fileExt = file.name.split('.').pop() || 'png';
    const filePath = `job-post-images/employer-${employerId}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
        .from('job-post-images')
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true
        });

    if (uploadError) {
        throw uploadError;
    }

    const { data } = supabase.storage
        .from('job-post-images')
        .getPublicUrl(filePath);

    return data.publicUrl;
}

async function initializeCreatePostPage() {
    const supabase = window.supabaseClient;
    const backBtn = document.getElementById('backToProfileBtn');
    const createPostForm = document.getElementById('createPostForm');
    const browseBtn = document.getElementById('browseBtn');
    const fileInput = document.getElementById('fileInput');

    if (!supabase || !AppState.currentEmployerID) {
        console.error('Cannot initialize create post page.');
        loadPage('profile');
        return;
    }

    AppState.pendingPostImage = '';
    AppState.pendingPostImageFile = null;

    if (backBtn) {
        backBtn.addEventListener('click', function (e) {
            e.preventDefault();
            loadPage('profile');
        });
    }

    if (browseBtn && fileInput) {
        browseBtn.addEventListener('click', function (e) {
            e.preventDefault();
            fileInput.click();
        });
    }

    if (fileInput) {
        fileInput.setAttribute('accept', 'image/*');
        fileInput.removeEventListener('change', handlePostImageChange);
        fileInput.addEventListener('change', handlePostImageChange);
    }

    if (createPostForm) {
        createPostForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const fields = getPostFormFields(createPostForm);

            if (!fields.jobTitle || !fields.department || !fields.deploymentType || !fields.workSetup) {
                alert('Please fill out the required job information.');
                return;
            }

            let jobImageUrl = '';

            try {
                if (AppState.pendingPostImageFile) {
                    jobImageUrl = await uploadPostImage(
                        AppState.pendingPostImageFile,
                        AppState.currentEmployerID
                    );
                }

                const payload = buildJobPostPayload(fields, jobImageUrl);
                payload.EmployerID = AppState.currentEmployerID;
                payload.DatePosted = new Date().toISOString();
                payload.AppliedCount = 0;

                const { error } = await supabase
                    .from('JobPostTbl')
                    .insert(payload);

                if (error) {
                    alert(`Failed to create post: ${error.message}`);
                    return;
                }

                AppState.pendingPostImage = '';
                AppState.pendingPostImageFile = null;

                alert('Job post created successfully!');

                AppState.viewedProfile = {
                    UserID: AppState.currentUser?.UserID,
                    UserType: AppState.currentRole
                };

                loadPage('profile');
            } catch (error) {
                console.error('Create post error:', error);
                alert(`Failed to create post: ${error.message}`);
            }
        });
    }
}

async function initializeEditPostPage() {
    const supabase = window.supabaseClient;
    const backBtn = document.getElementById('backToProfileBtn');
    const editPostForm = document.getElementById('editPostForm');
    const deleteBtn = document.querySelector('.deletePostBtn');
    const browseBtn = document.getElementById('browseBtn');
    const fileInput = document.getElementById('fileInput');

    if (!supabase || !AppState.currentEmployerID) {
        console.error('Cannot initialize edit post page.');
        loadPage('profile');
        return;
    }

    const selectedPostId = Number(localStorage.getItem('selectedPostId'));
    if (!selectedPostId) {
        alert('No post selected.');
        loadPage('profile');
        return;
    }

    AppState.pendingPostImage = '';
    AppState.pendingPostImageFile = null;

    if (backBtn) {
        backBtn.addEventListener('click', function (e) {
            e.preventDefault();
            localStorage.removeItem('selectedPostId');
            loadPage('profile');
        });
    }

    if (browseBtn && fileInput) {
        browseBtn.addEventListener('click', function (e) {
            e.preventDefault();
            fileInput.click();
        });
    }

    if (fileInput) {
        fileInput.setAttribute('accept', 'image/*');
        fileInput.removeEventListener('change', handlePostImageChange);
        fileInput.addEventListener('change', handlePostImageChange);
    }

    const { data: post, error: postError } = await supabase
        .from('JobPostTbl')
        .select('*')
        .eq('PostID', selectedPostId)
        .eq('EmployerID', AppState.currentEmployerID)
        .single();

    if (postError || !post) {
        console.error('Failed to load job post:', postError);
        alert('Failed to load job post.');
        loadPage('profile');
        return;
    }

    if (editPostForm) {
        setPostFormFields(editPostForm, post);

        const dropZone = document.querySelector('.fileDropZone');
        if (dropZone && post.JobImage) {
            let previewImg = dropZone.querySelector('.postImagePreview') || dropZone.querySelector('img');

            if (!previewImg) {
                previewImg = document.createElement('img');
                previewImg.className = 'postImagePreview';
                previewImg.alt = 'Current poster';
                previewImg.style.maxWidth = '200px';
                previewImg.style.width = '100%';
                previewImg.style.borderRadius = '12px';
                previewImg.style.marginBottom = '12px';
                previewImg.style.display = 'block';
                dropZone.prepend(previewImg);
            }

            previewImg.src = post.JobImage;
        }

        editPostForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const fields = getPostFormFields(editPostForm);
            let jobImageUrl = post.JobImage || '';

            try {
                if (AppState.pendingPostImageFile) {
                    jobImageUrl = await uploadPostImage(
                        AppState.pendingPostImageFile,
                        AppState.currentEmployerID
                    );
                }

                const payload = buildJobPostPayload(fields, jobImageUrl);

                const { error: updateError } = await supabase
                    .from('JobPostTbl')
                    .update(payload)
                    .eq('PostID', selectedPostId)
                    .eq('EmployerID', AppState.currentEmployerID);

                if (updateError) {
                    console.error('Update failed:', updateError);
                    alert(`Failed to update post: ${updateError.message}`);
                    return;
                }

                AppState.pendingPostImage = '';
                AppState.pendingPostImageFile = null;
                localStorage.removeItem('selectedPostId');

                alert('Job post updated successfully!');

                AppState.viewedProfile = {
                    UserID: AppState.currentUser?.UserID,
                    UserType: AppState.currentRole
                };

                loadPage('profile');
            } catch (error) {
                console.error('Edit post error:', error);
                alert(`Failed to update post: ${error.message}`);
            }
        });
    }

    if (deleteBtn) {
        deleteBtn.addEventListener('click', async function () {
            const confirmed = confirm('Are you sure you want to delete this post?');
            if (!confirmed) return;

            const { error: deleteError } = await supabase
                .from('JobPostTbl')
                .delete()
                .eq('PostID', selectedPostId)
                .eq('EmployerID', AppState.currentEmployerID);

            if (deleteError) {
                console.error('Delete failed:', deleteError);
                alert(`Failed to delete post: ${deleteError.message}`);
                return;
            }

            AppState.pendingPostImage = '';
            AppState.pendingPostImageFile = null;
            localStorage.removeItem('selectedPostId');

            alert('Job post deleted successfully!');

            AppState.viewedProfile = {
                UserID: AppState.currentUser?.UserID,
                UserType: AppState.currentRole
            };

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

    applicantsList.addEventListener('click', function (e) {
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

    applicantsList.addEventListener('change', function (e) {
        if (e.target.classList.contains('applicantSelect')) {
            updateSelectedCount();
            updateSelectAllState();
        }
    });

    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', function () {
            const applicantCheckboxes = document.querySelectorAll('.applicantSelect');
            const total = applicantCheckboxes.length;
            const checked = document.querySelectorAll('.applicantSelect:checked').length;
            const shouldSelectAll = checked !== total;

            applicantCheckboxes.forEach(checkbox => {
                checkbox.checked = shouldSelectAll;
            });

            updateSelectedCount();
            updateSelectAllState();
        });
    }

    if (approveBtn) {
        approveBtn.addEventListener('click', function () {
            const selected = document.querySelectorAll('.applicantSelect:checked');

            if (selected.length === 0) {
                alert('Please select at least one applicant.');
                return;
            }

            alert(`${selected.length} applicant(s) approved.`);

            selected.forEach(checkbox => {
                checkbox.checked = false;
            });

            updateSelectedCount();
            updateSelectAllState();
        });
    }

    if (rejectBtn) {
        rejectBtn.addEventListener('click', function () {
            const selected = document.querySelectorAll('.applicantSelect:checked');

            if (selected.length === 0) {
                alert('Please select at least one applicant.');
                return;
            }

            alert(`${selected.length} applicant(s) rejected.`);

            selected.forEach(checkbox => {
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
    const acceptBtnFull = document.querySelector('.accept-btn-full');
    const rejectBtnFull = document.querySelector('.reject-btn-full');

    if (backBtn) {
        backBtn.addEventListener('click', function () {
            loadPage('view-applicants');
        });
    }

    if (acceptBtnFull) {
        acceptBtnFull.addEventListener('click', function () {
            alert('Application accepted!');
            loadPage('view-applicants');
        });
    }

    if (rejectBtnFull) {
        rejectBtnFull.addEventListener('click', function () {
            alert('Application rejected!');
            loadPage('view-applicants');
        });
    }
}

// ============================================
// ANCHOR AUTHENTICATION & UTILITY FUNCTIONS
// ============================================

async function handleLogout() {
    if (!confirm('Are you sure you want to logout?')) {
        return;
    }

    clearStoredSession();
    localStorage.removeItem('userRole');
    window.location.href = 'login.html';
}