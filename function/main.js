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

    handleResponsiveSidebar(); 
    window.addEventListener('resize', handleResponsiveSidebar);

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
        .from('SavedPostTbl')
        .select('PostID')
        .eq('ApplicantID', AppState.currentApplicantID);

    if (savedError) {
        console.error('Error loading saved jobs:', savedError);
    } else {
        AppState.savedJobs = (savedRows || []).map(row => Number(row.PostID));
    }

    const { data: applicationRows, error: applicationError } = await supabase
        .from('ApplicationTbl')
        .select('PostID, ApplicationStatus')
        .eq('ApplicantID', AppState.currentApplicantID);

    if (applicationError) {
        console.error('Error loading applied jobs:', applicationError);
    } else {
        AppState.appliedJobs = (applicationRows || []).map(row => ({
            PostID: Number(row.PostID),
            Status: row.ApplicationStatus || 'Pending'
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

    document.addEventListener('click', async function (e) {
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
        if (notificationItem) {
            const notifId = Number(notificationItem.dataset.notifId || 0);
            const actionType = String(notificationItem.dataset.actionType || 'none');
            const actionValue = Number(notificationItem.dataset.actionValue || 0);
            const postId = Number(notificationItem.dataset.postId || 0);
            const jobApplicantId = Number(notificationItem.dataset.jobApplicantId || 0);

            if (notifId) {
                await markNotificationAsRead(notifId);
                notificationItem.classList.remove('isUnread');
                notificationItem.classList.add('isRead');
                updateNotificationBadgeFromState();
            }

            if (actionType === 'view_application' && jobApplicantId) {
                localStorage.setItem('selectedJobApplicantId', String(jobApplicantId));
                loadPage('view-application');
                return;
            }

            if (actionType === 'view_applied_jobs') {
                if (actionValue) {
                    localStorage.setItem('selectedPostId', String(actionValue));
                }

                AppState.viewedProfile = {
                    UserID: AppState.currentUser?.UserID,
                    UserType: AppState.currentRole
                };

                loadPage('profile');
                return;
            }

            if (actionType === 'open_post' && postId) {
                localStorage.setItem('selectedPostId', String(postId));
                loadPage('home');
                return;
            }

            if (postId) {
                localStorage.setItem('selectedPostId', String(postId));
                loadPage('home');
                return;
            }

            return;
        }
        
        const jobProfile = e.target.closest('.clickableProfile');
        if (jobProfile) {
            const userId = jobProfile.getAttribute('data-user-id');
            const userType = jobProfile.getAttribute('data-user-type');

            if (userId && userType) {
                openProfileByUserId(userId, userType);
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

    document.addEventListener('click', function (e) {
        const settingsLink = e.target.closest('.navLink.settings');
        const helpLink = e.target.closest('.navLink.help');
        const rulesLink = e.target.closest('.navLink.rules');

        if (settingsLink) {
            e.preventDefault();
            loadPage('settings');
            return;
        }

        if (helpLink) {
            e.preventDefault();
            loadPage('help');
            return;
        }

        if (rulesLink) {
            e.preventDefault();
            loadPage('rules');
            return;
        }
    });

    document.addEventListener('click', function (e) {
        const overlay = e.target.closest('[data-close-image-preview="true"]');
        const previewContent = e.target.closest('.imagePreviewContent');

        if (overlay && !previewContent) {
            closeImagePreview();
        }
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            closeImagePreview();
        }
    });
}

// ============================================
// ANCHOR COMPONENT LOADING SYSTEM
// ============================================
function handleResponsiveSidebar() {
    applyLayoutState();
}

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

    ComponentData.jobs = Array.isArray(jobsData) ? [...jobsData] : [];

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
        const isClosed = String(job.postStatus || 'active').toLowerCase() === 'closed';

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
            if (isClosed) {
                applyButton = `<button class="btnApplied closed" disabled>Job Closed</button>`;
            } else {
                applyButton = isApplied
                    ? `<button class="btnApplied cancelApplicationBtn" data-cancel-application="${postId}">Applied</button>`
                    : `<button class="btnApply" data-apply="${postId}">Apply</button>`;
            }
        }

        if (showEditPostButton) {
            applyButton = `
                <button class="btnApply viewApplicantsBtn" data-view-applicants="${postId}">
                    View Applicants
                </button>
            `;

            employerActions = `
                <button class="actionBtn editPostBtn" data-edit="${postId}" data-owner-employer-id="${job.ownerEmployerID}" title="Edit Post">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 20h9"/>
                        <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>
                    </svg>
                </button>
            `;
        }

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
        container.innerHTML = '<p>No applicants found.</p>';
        return;
    }

    applicantsData.forEach(applicant => {
        const matchMeta = getMatchBadgeMeta(applicant.totalScore, applicant.targetScore);
        const applicationMeta = getApplicationStatusBadgeMeta(applicant.applicationStatus);

        const cardData = {
            applicantId: applicant.id || '',
            jobApplicantId: applicant.jobApplicantId || '',
            applicantName: applicant.name || '',
            applicantImage: applicant.image || '',
            ...matchMeta,
            ...applicationMeta
        };

        const rendered = renderTemplate(template, cardData);
        container.innerHTML += rendered;
    });
}

async function loadNotifications() {
    const supabase = window.supabaseClient;
    const container = document.getElementById('notificationContentContainer');
    const badge = document.getElementById('notificationBadge');

    if (!supabase || !container || !badge || !AppState.currentUser?.UserID) return;

    const template = await loadComponent('notification-card');
    if (!template) {
        container.innerHTML = '';
        badge.textContent = '0';
        badge.style.display = 'none';
        return;
    }

    try {
        const currentUserId = Number(AppState.currentUser.UserID);

        const { data: notifRows, error: notifError } = await supabase
            .from('NotificationTbl')
            .select('*')
            .eq('ReceiveBy', currentUserId)
            .order('CreatedAt', { ascending: false });

        if (notifError) {
            console.error('Failed to load notifications:', notifError);
            container.innerHTML = '<p>Failed to load notifications.</p>';
            badge.textContent = '0';
            badge.style.display = 'none';
            return;
        }

        if (!notifRows || notifRows.length === 0) {
            ComponentData.notifications = { new: [], earlier: [] };
            container.innerHTML = '<p class="emptyNotificationText">No notifications yet.</p>';
            badge.textContent = '0';
            badge.style.display = 'none';
            return;
        }

        const senderIds = [...new Set(
            notifRows.map(row => Number(row.SentBy)).filter(Boolean)
        )];

        let senderMap = {};
        if (senderIds.length > 0) {
            const { data: senderRows, error: senderError } = await supabase
                .from('UserTbl')
                .select('UserID, Username, UserImage')
                .in('UserID', senderIds);

            if (senderError) {
                console.error('Failed to load sender rows:', senderError);
            } else {
                (senderRows || []).forEach(row => {
                    senderMap[Number(row.UserID)] = row;
                });
            }
        }

        const postIds = [...new Set(
            notifRows.map(row => Number(row.PostID)).filter(Boolean)
        )];

        let postMap = {};
        if (postIds.length > 0) {
            const { data: postRows, error: postError } = await supabase
                .from('JobPostTbl')
                .select('PostID, JobTitle')
                .in('PostID', postIds);

            if (postError) {
                console.error('Failed to load post rows for notifications:', postError);
            } else {
                (postRows || []).forEach(row => {
                    postMap[Number(row.PostID)] = row;
                });
            }
        }

        const now = Date.now();

        const mappedNotifications = (notifRows || []).map(row => {
            const sender = senderMap[Number(row.SentBy)] || {};
            const post = postMap[Number(row.PostID)] || {};
            const createdAt = row.CreatedAt ? new Date(row.CreatedAt) : null;
            const ageMs = createdAt ? (now - createdAt.getTime()) : Number.MAX_SAFE_INTEGER;
            const isNewGroup = ageMs <= 24 * 60 * 60 * 1000;

            return {
                id: Number(row.NotifID),
                notificationType: row.NotificationType || '',
                postId: Number(row.PostID) || 0,
                senderUserId: Number(row.SentBy) || 0,
                receiveUserId: Number(row.ReceiveBy) || 0,
                jobApplicantId: Number(row.JobApplicantID) || 0,
                actionType: row.ActionType || 'none',
                actionValue: Number(row.ActionValue) || 0,
                isRead: Boolean(row.IsRead),
                senderName: sender.Username || 'APPL-AI',
                senderImage: sender.UserImage || 'assets/default-company.png',
                message: row.NotifMessage || buildFallbackNotificationMessage(row, post),
                time: formatNotificationTime(row.CreatedAt),
                isNewGroup
            };
        });

        ComponentData.notifications = {
            new: mappedNotifications.filter(notif => notif.isNewGroup),
            earlier: mappedNotifications.filter(notif => !notif.isNewGroup)
        };

        let html = '';

        if (ComponentData.notifications.new.length > 0) {
            html += '<div class="notification-section"><h4>New</h4>';

            ComponentData.notifications.new.forEach(notif => {
                html += renderTemplate(template, {
                    notifId: notif.id || '',
                    notificationType: notif.notificationType || '',
                    senderName: notif.senderName || '',
                    senderImage: notif.senderImage || '',
                    notificationMessage: notif.message || '',
                    notificationTime: notif.time || '',
                    actionType: notif.actionType || 'none',
                    actionValue: notif.actionValue || '',
                    postId: notif.postId || '',
                    jobApplicantId: notif.jobApplicantId || '',
                    senderUserId: notif.senderUserId || '',
                    readClass: notif.isRead ? 'isRead' : 'isUnread'
                });
            });

            html += '</div>';
        }

        if (ComponentData.notifications.earlier.length > 0) {
            html += '<div class="notification-section"><h4>Earlier</h4>';

            ComponentData.notifications.earlier.forEach(notif => {
                html += renderTemplate(template, {
                    notifId: notif.id || '',
                    notificationType: notif.notificationType || '',
                    senderName: notif.senderName || '',
                    senderImage: notif.senderImage || '',
                    notificationMessage: notif.message || '',
                    notificationTime: notif.time || '',
                    actionType: notif.actionType || 'none',
                    actionValue: notif.actionValue || '',
                    postId: notif.postId || '',
                    jobApplicantId: notif.jobApplicantId || '',
                    senderUserId: notif.senderUserId || '',
                    readClass: notif.isRead ? 'isRead' : 'isUnread'
                });
            });

            html += '</div>';
        }

        container.innerHTML = html || '<p class="emptyNotificationText">No notifications yet.</p>';

        const unreadCount = mappedNotifications.filter(notif => !notif.isRead).length;
        badge.textContent = String(unreadCount);
        badge.style.display = unreadCount > 0 ? 'inline-flex' : 'none';
    } catch (error) {
        console.error('loadNotifications error:', error);
        container.innerHTML = '<p>Failed to load notifications.</p>';
        badge.textContent = '0';
        badge.style.display = 'none';
    }
}

function formatNotificationTime(createdAtValue) {
    if (!createdAtValue) return 'Just now';

    const createdAt = new Date(createdAtValue);
    if (Number.isNaN(createdAt.getTime())) return 'Just now';

    const diffMs = Date.now() - createdAt.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} min ago`;
    if (diffHours < 24) return `${diffHours} hr ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return createdAt.toLocaleDateString();
}

function buildFallbackNotificationMessage(notificationRow, postRow) {
    const jobTitle = postRow?.JobTitle || 'a job post';
    const rawMessage = String(notificationRow?.NotifMessage || '').trim();

    if (rawMessage) return rawMessage;
    return `There is an update related to "${jobTitle}".`;
}

async function markNotificationAsRead(notifId) {
    const supabase = window.supabaseClient;
    if (!supabase || !notifId) return false;

    const { error } = await supabase
        .from('NotificationTbl')
        .update({ IsRead: true })
        .eq('NotifID', Number(notifId));

    if (error) {
        console.error('Failed to mark notification as read:', error);
        return false;
    }

    ComponentData.notifications.new = ComponentData.notifications.new.map(notif => {
        if (Number(notif.id) === Number(notifId)) {
            return { ...notif, isRead: true };
        }
        return notif;
    });

    ComponentData.notifications.earlier = ComponentData.notifications.earlier.map(notif => {
        if (Number(notif.id) === Number(notifId)) {
            return { ...notif, isRead: true };
        }
        return notif;
    });

    return true;
}

function updateNotificationBadgeFromState() {
    const badge = document.getElementById('notificationBadge');
    if (!badge) return;

    const allNotifications = [
        ...(ComponentData.notifications.new || []),
        ...(ComponentData.notifications.earlier || [])
    ];

    const unreadCount = allNotifications.filter(notif => !notif.isRead).length;
    badge.textContent = String(unreadCount);
    badge.style.display = unreadCount > 0 ? 'inline-flex' : 'none';
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

        const postIds = postRows.map(post => Number(post.PostID));
        const applicationCountsMap = await getApplicationCountsMap(postIds);

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
            const postStatus = String(post.PostStatus || 'active').toLowerCase();
            const postId = Number(post.PostID);

            return {
                id: postId,
                postStatus,

                ownerEmployerID: post.EmployerID,
                ownerUserID: employer.UserID || '',
                ownerUserType: 'employer',

                companyName: employer.CompanyName || '',
                companyIndustry: employer.CompanyIndustry || '',
                companyLogo: userMap[employer.UserID]?.UserImage || '',
                profileLink: employer.UserID ? `#profile?userId=${employer.UserID}` : '',

                jobTitle: post.JobTitle || '',
                department: post.Department || '',
                deploymentType: post.DeploymentType || '',
                workSetup: post.WorkSetup || '',
                deploymentLocation: post.DeploymentLocation || '',
                workingHours: post.WorkingHours || '',
                salaryRange: post.SalaryRange || '',
                slotsAvailable: post.SlotsAvailable || '',

                description: post.JobDescription || post.PostDescription || '',
                postDescription: post.PostDescription || '',
                jobDescription: post.JobDescription || '',

                image: post.JobImage || '',
                date: formatPostDates(post.DatePosted, post.PostDeadline),
                datePosted: post.DatePosted || '',
                postDeadline: post.PostDeadline || '',

                appliedCount: applicationCountsMap[postId] || 0
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

            const postIds = (postRows || []).map(post => Number(post.PostID));
            const applicationCountsMap = await getApplicationCountsMap(postIds);

            const jobs = (postRows || []).map(post => ({
                id: post.PostID,
                postStatus: String(post.PostStatus || 'active').toLowerCase(),
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
                datePosted: post.DatePosted || '',
                postDeadline: post.PostDeadline || '',
                appliedCount: applicationCountsMap[Number(post.PostID)] || 0
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
                .from('ApplicationTbl')
                .select('PostID')
                .eq('ApplicantID', applicantRow.ApplicantID);

            if (appliedError) {
                console.error('Failed to load applicant applied rows:', appliedError);
                await loadJobCards(containerId, []);
                return;
            }

            const postIds = (appliedRows || []).map(row => Number(row.PostID));

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

            const applicationCountsMap = await getApplicationCountsMap(postIds);

            const jobs = (postRows || []).map(post => {
                const employer = employerMap[post.EmployerID] || {};

                return {
                    id: post.PostID,
                    postStatus: String(post.PostStatus || 'active').toLowerCase(),
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
                    datePosted: post.DatePosted || '',
                    postDeadline: post.PostDeadline || '',
                    appliedCount: applicationCountsMap[Number(post.PostID)] || 0
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
// ANCHOR HELPERS
// ============================================
function getApiBaseUrl() {
    const configuredBase =
        window.APP_CONFIG?.apiBaseUrl ||
        window.VERCEL_API_BASE_URL ||
        '';

    if (configuredBase) {
        return configuredBase.replace(/\/$/, '');
    }

    const hostname = window.location.hostname;
    const isLocal =
        hostname === 'localhost' ||
        hostname === '127.0.0.1';

    if (isLocal) {
        return 'http://localhost:3000';
    }

    return '';
}

function buildNotificationMessage(notificationType, meta = {}) {
    const senderName = meta.senderName || 'Someone';
    const jobTitle = meta.jobTitle || 'your job post';
    const status = String(meta.status || '').trim();

    if (notificationType === 'application_submitted') {
        return `${senderName} applied for "${jobTitle}".`;
    }

    if (notificationType === 'application_status_updated') {
        return `${senderName} ${status.toLowerCase()} your application for "${jobTitle}".`;
    }

    return 'You have a new notification.';
}

async function upsertNotification({
    notificationType,
    sentBy,
    receiveBy,
    postId = null,
    jobApplicantId = null,
    title = '',
    message = '',
    actionType = 'none',
    actionValue = null
}) {
    const supabase = window.supabaseClient;

    if (!supabase || !notificationType || !sentBy || !receiveBy || !message) {
        return false;
    }

    let existingQuery = supabase
        .from('NotificationTbl')
        .select('NotifID')
        .eq('NotificationType', notificationType);

    if (jobApplicantId) {
        existingQuery = existingQuery.eq('JobApplicantID', Number(jobApplicantId));
    } else if (postId) {
        existingQuery = existingQuery
            .eq('PostID', Number(postId))
            .eq('SentBy', Number(sentBy))
            .eq('ReceiveBy', Number(receiveBy));
    }

    const { data: existingRow, error: existingError } = await existingQuery.maybeSingle();

    if (existingError) {
        console.error('Failed to check existing notification:', existingError);
        return false;
    }

    const payload = {
        NotificationType: String(notificationType),
        SentBy: Number(sentBy),
        ReceiveBy: Number(receiveBy),
        PostID: postId ? Number(postId) : null,
        JobApplicantID: jobApplicantId ? Number(jobApplicantId) : null,
        Title: String(title || ''),
        NotifMessage: String(message),
        ActionType: String(actionType || 'none'),
        ActionValue: actionValue ? Number(actionValue) : null,
        IsRead: false,
        UpdatedAt: new Date().toISOString()
    };

    if (existingRow) {
        const { error: updateError } = await supabase
            .from('NotificationTbl')
            .update(payload)
            .eq('NotifID', Number(existingRow.NotifID));

        if (updateError) {
            console.error('Failed to update notification:', updateError);
            return false;
        }

        return true;
    }

    payload.CreatedAt = new Date().toISOString();

    const { error: insertError } = await supabase
        .from('NotificationTbl')
        .insert(payload);

    if (insertError) {
        console.error('Failed to insert notification:', insertError);
        return false;
    }

    return true;
}

async function deleteNotificationByType({
    notificationType,
    jobApplicantId = null,
    postId = null,
    sentBy = null,
    receiveBy = null
}) {
    const supabase = window.supabaseClient;
    if (!supabase || !notificationType) return false;

    let query = supabase
        .from('NotificationTbl')
        .delete()
        .eq('NotificationType', String(notificationType));

    if (jobApplicantId !== null && jobApplicantId !== undefined) {
        query = query.eq('JobApplicantID', Number(jobApplicantId));
    }

    if (postId !== null && postId !== undefined) {
        query = query.eq('PostID', Number(postId));
    }

    if (sentBy !== null && sentBy !== undefined) {
        query = query.eq('SentBy', Number(sentBy));
    }

    if (receiveBy !== null && receiveBy !== undefined) {
        query = query.eq('ReceiveBy', Number(receiveBy));
    }

    const { error } = await query;

    if (error) {
        console.error('Failed to delete notification:', error);
        return false;
    }

    return true;
}

async function syncApplicationSubmittedNotification(jobApplicantId) {
    const supabase = window.supabaseClient;
    if (!supabase || !jobApplicantId) return false;

    const { data: applicationRow, error: applicationError } = await supabase
        .from('ApplicationTbl')
        .select('JobApplicantID, PostID, ApplicantID')
        .eq('JobApplicantID', Number(jobApplicantId))
        .single();

    if (applicationError || !applicationRow) {
        console.error('Failed to load application for submitted notification:', applicationError);
        return false;
    }

    const { data: postRow, error: postError } = await supabase
        .from('JobPostTbl')
        .select('PostID, JobTitle, EmployerID')
        .eq('PostID', Number(applicationRow.PostID))
        .single();

    if (postError || !postRow) {
        console.error('Failed to load post for submitted notification:', postError);
        return false;
    }

    const { data: employerRow, error: employerError } = await supabase
        .from('EmployerTbl')
        .select('EmployerID, UserID')
        .eq('EmployerID', Number(postRow.EmployerID))
        .single();

    if (employerError || !employerRow) {
        console.error('Failed to load employer for submitted notification:', employerError);
        return false;
    }

    const { data: applicantUserRow, error: applicantUserError } = await supabase
        .from('ApplicantTbl')
        .select('ApplicantID, UserID')
        .eq('ApplicantID', Number(applicationRow.ApplicantID))
        .single();

    if (applicantUserError || !applicantUserRow) {
        console.error('Failed to load applicant row for submitted notification:', applicantUserError);
        return false;
    }

    const { data: userRow, error: userError } = await supabase
        .from('UserTbl')
        .select('UserID, Username')
        .eq('UserID', Number(applicantUserRow.UserID))
        .single();

    if (userError || !userRow) {
        console.error('Failed to load applicant user for submitted notification:', userError);
        return false;
    }

    const message = buildNotificationMessage('application_submitted', {
        senderName: userRow.Username || 'Applicant',
        jobTitle: postRow.JobTitle || 'your job post'
    });

    return await upsertNotification({
        notificationType: 'application_submitted',
        sentBy: Number(userRow.UserID),
        receiveBy: Number(employerRow.UserID),
        postId: Number(postRow.PostID),
        jobApplicantId: Number(applicationRow.JobApplicantID),
        title: 'New Application',
        message,
        actionType: 'view_application',
        actionValue: Number(applicationRow.JobApplicantID)
    });
}

async function syncApplicationStatusNotification(jobApplicantId, newStatus) {
    const supabase = window.supabaseClient;
    if (!supabase || !jobApplicantId) return false;

    const normalizedStatus = String(newStatus || '').trim();

    if (normalizedStatus === 'Pending') {
        return await deleteNotificationByType({
            notificationType: 'application_status_updated',
            jobApplicantId: Number(jobApplicantId)
        });
    }

    if (normalizedStatus !== 'Approved' && normalizedStatus !== 'Rejected') {
        return false;
    }

    const { data: applicationRow, error: applicationError } = await supabase
        .from('ApplicationTbl')
        .select('JobApplicantID, PostID, ApplicantID')
        .eq('JobApplicantID', Number(jobApplicantId))
        .single();

    if (applicationError || !applicationRow) {
        console.error('Failed to load application for status notification:', applicationError);
        return false;
    }

    const { data: applicantRow, error: applicantError } = await supabase
        .from('ApplicantTbl')
        .select('ApplicantID, UserID')
        .eq('ApplicantID', Number(applicationRow.ApplicantID))
        .single();

    if (applicantError || !applicantRow) {
        console.error('Failed to load applicant for status notification:', applicantError);
        return false;
    }

    const { data: postRow, error: postError } = await supabase
        .from('JobPostTbl')
        .select('PostID, JobTitle, EmployerID')
        .eq('PostID', Number(applicationRow.PostID))
        .single();

    if (postError || !postRow) {
        console.error('Failed to load post for status notification:', postError);
        return false;
    }

    const { data: employerRow, error: employerError } = await supabase
        .from('EmployerTbl')
        .select('EmployerID, UserID')
        .eq('EmployerID', Number(postRow.EmployerID))
        .single();

    if (employerError || !employerRow) {
        console.error('Failed to load employer for status notification:', employerError);
        return false;
    }

    const { data: employerUserRow, error: employerUserError } = await supabase
        .from('UserTbl')
        .select('UserID, Username')
        .eq('UserID', Number(employerRow.UserID))
        .single();

    if (employerUserError || !employerUserRow) {
        console.error('Failed to load employer user for status notification:', employerUserError);
        return false;
    }

    const message = buildNotificationMessage('application_status_updated', {
        senderName: employerUserRow.Username || 'Employer',
        jobTitle: postRow.JobTitle || 'your job application',
        status: normalizedStatus
    });

    return await upsertNotification({
        notificationType: 'application_status_updated',
        sentBy: Number(employerUserRow.UserID),
        receiveBy: Number(applicantRow.UserID),
        postId: Number(postRow.PostID),
        jobApplicantId: Number(applicationRow.JobApplicantID),
        title: 'Application Status Updated',
        message,
        actionType: 'view_applied_jobs',
        actionValue: Number(postRow.PostID)
    });
}

function openViewApplicants(postId) {
    if (!postId) return;
    localStorage.setItem('selectedPostId', String(postId));
    loadPage('view-applicants');
}

async function cancelApplication(postId) {
    if (!isApplicant() || !AppState.currentApplicantID || !AppState.currentUser?.UserID) return;

    const confirmed = confirm('Are you sure you want to cancel this application?');
    if (!confirmed) return;

    const supabase = window.supabaseClient;
    const numericPostId = Number(postId);

    const { data: applicationRow, error: applicationReadError } = await supabase
        .from('ApplicationTbl')
        .select('JobApplicantID, PostID')
        .eq('PostID', numericPostId)
        .eq('ApplicantID', AppState.currentApplicantID)
        .maybeSingle();

    if (applicationReadError) {
        console.error('Failed to read application before cancel:', applicationReadError);
        alert(`Failed to cancel application: ${applicationReadError.message}`);
        return;
    }

    const { error } = await supabase
        .from('ApplicationTbl')
        .delete()
        .eq('PostID', numericPostId)
        .eq('ApplicantID', AppState.currentApplicantID);

    if (error) {
        console.error('Failed to cancel application:', error);
        alert(`Failed to cancel application: ${error.message}`);
        return;
    }

    if (applicationRow?.JobApplicantID) {
        await deleteNotificationByType({
            notificationType: 'application_submitted',
            jobApplicantId: Number(applicationRow.JobApplicantID)
        });

        await deleteNotificationByType({
            notificationType: 'application_status_updated',
            jobApplicantId: Number(applicationRow.JobApplicantID)
        });
    }

    AppState.appliedJobs = AppState.appliedJobs.filter(
        item => Number(item.PostID) !== numericPostId
    );

    await loadNotifications();

    if (AppState.currentPage === 'profile') {
        await loadProfileJobs();
        return;
    }

    if (AppState.currentPage === 'home') {
        const jobs = await loadAllJobs();
        await loadJobCards('jobFeedContainer', jobs);
        return;
    }

    if (AppState.currentPage === 'search-results') {
        await renderSearchResultsPage();
        return;
    }

    if (AppState.currentPage === 'saved') {
        await renderSavedJobsPage();
    }
}

async function getApplicationCountsMap(postIds = []) {
    const supabase = window.supabaseClient;
    const countsMap = {};

    if (!supabase || !Array.isArray(postIds) || postIds.length === 0) {
        return countsMap;
    }

    const { data, error } = await supabase
        .from('ApplicationTbl')
        .select('PostID')
        .in('PostID', postIds);

    if (error) {
        console.error('Failed to load application counts:', error);
        return countsMap;
    }

    (data || []).forEach(row => {
        const postId = Number(row.PostID);
        countsMap[postId] = (countsMap[postId] || 0) + 1;
    });

    return countsMap;
}

function buildPendingApplicationPayload(postId, applicantId, resumeValue, resumeText = null) {
    return {
        PostID: Number(postId),
        ApplicantID: Number(applicantId),

        SkillScore: null,
        ExperienceScore: null,
        EducationScore: null,
        AchievementScore: null,
        AgeScore: null,
        ResumeQualityScore: null,
        TotalScore: null,

        ApplicationStatus: 'Pending',
        ResumeOverview: null,
        OverallAssessment: null,

        Resume: resumeValue || null,
        ResumeText: resumeText || null,

        ScanStatus: 'Pending',
        ScannedAt: null,
        ScanError: null,

        DateApplied: new Date().toISOString()
    };
}

function getResumeFileTypeLabel(file) {
    if (!file) return '';

    const fileName = String(file.name || '').toLowerCase();
    const mimeType = String(file.type || '').toLowerCase();

    if (mimeType.includes('pdf') || fileName.endsWith('.pdf')) {
        return 'PDF File';
    }

    if (
        mimeType.includes('word') ||
        mimeType.includes('document') ||
        fileName.endsWith('.doc') ||
        fileName.endsWith('.docx')
    ) {
        return 'Word File';
    }

    return 'File Selected';
}

function updateResumeFilePreview(file) {
    const fileDropZone = document.getElementById('fileDropZone');
    if (!fileDropZone) return;

    if (!file) {
        fileDropZone.innerHTML = `
            <p>Drag and Drop files or <button type="button" class="browseBtn" id="browseBtn">Browse</button></p>
            <input type="file" id="fileInput" hidden accept=".pdf,.doc,.docx">
        `;
        rebindApplyModalFileElements();
        return;
    }

    const fileTypeLabel = getResumeFileTypeLabel(file);
    const safeFileName = file.name || 'Unnamed file';

    fileDropZone.innerHTML = `
        <div class="selectedFilePreview">
            <div class="selectedFileIcon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <path d="M14 2v6h6"></path>
                </svg>
            </div>

            <div class="selectedFileInfo">
                <strong>${safeFileName}</strong>
                <p>${fileTypeLabel}</p>
            </div>

            <button type="button" class="removeSelectedFileBtn" id="removeSelectedFileBtn">Remove</button>
        </div>
        <input type="file" id="fileInput" hidden accept=".pdf,.doc,.docx">
    `;

    const rebuiltInput = document.getElementById('fileInput');
    if (rebuiltInput) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        rebuiltInput.files = dataTransfer.files;
    }

    rebindApplyModalFileElements();
}

function rebindApplyModalFileElements() {
    const browseBtn = document.getElementById('browseBtn');
    const fileInput = document.getElementById('fileInput');
    const removeBtn = document.getElementById('removeSelectedFileBtn');
    const fileDropZone = document.getElementById('fileDropZone');

    if (browseBtn && fileInput) {
        browseBtn.addEventListener('click', function () {
            fileInput.click();
        });
    }

    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }

    if (removeBtn) {
        removeBtn.addEventListener('click', function () {
            updateResumeFilePreview(null);
        });
    }

    if (fileDropZone && fileInput) {
        fileDropZone.addEventListener('dragover', function (e) {
            e.preventDefault();
            fileDropZone.classList.add('dragover');
        });

        fileDropZone.addEventListener('dragleave', function () {
            fileDropZone.classList.remove('dragover');
        });

        fileDropZone.addEventListener('drop', function (e) {
            e.preventDefault();
            fileDropZone.classList.remove('dragover');

            const droppedFile = e.dataTransfer?.files?.[0];
            if (!droppedFile) return;

            const validExtensions = ['.pdf', '.docx'];
            const fileName = String(droppedFile.name || '').toLowerCase();
            const isValid = validExtensions.some(ext => fileName.endsWith(ext));

            if (!isValid) {
                alert('Please upload only PDF or DOCX files.');
                return;
            }

            updateResumeFilePreview(droppedFile);
        });
    }
}

function parseTargetScore(targetScoreValue) {
    if (targetScoreValue === null || targetScoreValue === undefined || targetScoreValue === '') {
        return null;
    }

    const numericTarget = Number(String(targetScoreValue).replace(/[^\d.-]/g, ''));
    return Number.isNaN(numericTarget) ? null : numericTarget;
}

async function loadApplicantsForSelectedPost() {
    const supabase = window.supabaseClient;
    const postId = getSelectedPostId();

    if (!supabase || !postId) {
        ComponentData.applicants = [];
        return [];
    }

    const { data: postRow, error: postError } = await supabase
        .from('JobPostTbl')
        .select('PostID, TargetScore')
        .eq('PostID', postId)
        .single();

    if (postError) {
        console.error('Failed to load selected post target score:', postError);
        ComponentData.applicants = [];
        return [];
    }

    const { data: applicationRows, error: applicationError } = await supabase
        .from('ApplicationTbl')
        .select(`
            JobApplicantID,
            PostID,
            ApplicantID,
            TotalScore,
            ApplicationStatus,
            DateApplied
        `)
        .eq('PostID', postId);

    if (applicationError) {
        console.error('Failed to load applications:', applicationError);
        ComponentData.applicants = [];
        return [];
    }

    if (!applicationRows || applicationRows.length === 0) {
        ComponentData.applicants = [];
        return [];
    }

    const applicantIds = [...new Set(applicationRows.map(row => row.ApplicantID).filter(Boolean))];

    const { data: applicantRows, error: applicantRowsError } = await supabase
        .from('ApplicantTbl')
        .select('ApplicantID, UserID, FirstName, MiddleName, LastName')
        .in('ApplicantID', applicantIds);

    if (applicantRowsError) {
        console.error('Failed to load ApplicantTbl rows:', applicantRowsError);
        ComponentData.applicants = [];
        return [];
    }

    const applicantMap = {};
    (applicantRows || []).forEach(row => {
        applicantMap[row.ApplicantID] = row;
    });

    const userIds = [...new Set((applicantRows || []).map(row => row.UserID).filter(Boolean))];

    let userMap = {};
    if (userIds.length > 0) {
        const { data: userRows, error: userError } = await supabase
            .from('UserTbl')
            .select('UserID, UserImage, Username')
            .in('UserID', userIds);

        if (userError) {
            console.error('Failed to load applicant user rows:', userError);
        } else {
            (userRows || []).forEach(row => {
                userMap[row.UserID] = row;
            });
        }
    }

    const applicants = applicationRows.map(application => {
        const applicant = applicantMap[application.ApplicantID] || {};
        const user = userMap[applicant.UserID] || {};

        const nameParts = [
            applicant.FirstName,
            applicant.MiddleName,
            applicant.LastName
        ].filter(Boolean);

        return {
            id: application.ApplicantID,
            jobApplicantId: application.JobApplicantID,
            userId: applicant.UserID || '',
            name: nameParts.join(' ') || user.Username || 'Applicant',
            image: user.UserImage || '',
            totalScore: application.TotalScore,
            targetScore: postRow?.TargetScore ?? null,
            applicationStatus: application.ApplicationStatus || 'Pending',
            dateApplied: application.DateApplied || ''
        };
    });

    ComponentData.applicants = applicants;
    return applicants;
}

function filterApplicantsData(applicants = []) {
    const dateFilter = document.getElementById('applicantsDateFilter')?.value || 'mostRecent';
    const matchFilter = document.getElementById('applicantsMatchFilter')?.value || 'all';
    const statusFilter = document.getElementById('applicantsStatusFilter')?.value || 'all';

    let filtered = [...applicants];

    if (matchFilter !== 'all') {
        filtered = filtered.filter(applicant => {
            const numericScore = Number(applicant.totalScore);
            const numericTarget = parseTargetScore(applicant.targetScore);
            const hasScore =
                applicant.totalScore !== null &&
                applicant.totalScore !== undefined &&
                applicant.totalScore !== '' &&
                !Number.isNaN(numericScore);

            if (matchFilter === 'pending') {
                return !hasScore || numericTarget === null;
            }

            if (!hasScore || numericTarget === null) {
                return false;
            }

            if (matchFilter === 'passed') return numericScore >= numericTarget;
            if (matchFilter === 'failed') return numericScore < numericTarget;

            return true;
        });
    }

    if (statusFilter !== 'all') {
        filtered = filtered.filter(applicant =>
            String(applicant.applicationStatus || 'Pending') === statusFilter
        );
    }

    filtered.sort((a, b) => {
        const aDate = new Date(a.dateApplied || 0).getTime();
        const bDate = new Date(b.dateApplied || 0).getTime();

        return dateFilter === 'oldest'
            ? aDate - bDate
            : bDate - aDate;
    });

    return filtered;
}

async function renderViewApplicantsPage() {
    const applicants = await loadApplicantsForSelectedPost();
    const filteredApplicants = filterApplicantsData(applicants);
    await loadApplicantCards('applicantsListContainer', filteredApplicants);
}

async function updateApplicationStatus(jobApplicantIds = [], newStatus = 'Pending') {
    const supabase = window.supabaseClient;
    const normalizedIds = jobApplicantIds.map(Number).filter(Boolean);

    if (!supabase || normalizedIds.length === 0) return false;

    const { error } = await supabase
        .from('ApplicationTbl')
        .update({ ApplicationStatus: newStatus })
        .in('JobApplicantID', normalizedIds);

    if (error) {
        console.error(`Failed to update applications to ${newStatus}:`, error);
        alert(`Failed to update application status: ${error.message}`);
        return false;
    }

    ComponentData.applicants = ComponentData.applicants.map(applicant => {
        if (normalizedIds.includes(Number(applicant.jobApplicantId))) {
            return {
                ...applicant,
                applicationStatus: newStatus
            };
        }
        return applicant;
    });

    for (const jobApplicantId of normalizedIds) {
        await syncApplicationStatusNotification(jobApplicantId, newStatus);
    }

    await loadNotifications();
    return true;
}

function getMatchBadgeMeta(totalScore, targetScore) {
    const numericScore = Number(totalScore);
    const numericTarget = parseTargetScore(targetScore);

    if (
        totalScore === null ||
        totalScore === undefined ||
        totalScore === '' ||
        Number.isNaN(numericScore)
    ) {
        return {
            matchStatusClass: 'pending',
            matchStatusText: 'n/a',
            matchStatusIcon: '<circle cx="12" cy="12" r="9"></circle><path d="M12 8v4"></path><path d="M12 16h.01"></path>'
        };
    }

    if (numericTarget !== null) {
        if (numericScore >= numericTarget) {
            return {
                matchStatusClass: 'passed',
                matchStatusText: 'Passed',
                matchStatusIcon: '<path d="M20 6 9 17l-5-5"></path>'
            };
        }

        return {
            matchStatusClass: 'failed',
            matchStatusText: 'Failed',
            matchStatusIcon: '<path d="M18 6 6 18"></path><path d="m6 6 12 12"></path>'
        };
    }

    return {
        matchStatusClass: 'pending',
        matchStatusText: 'n/a',
        matchStatusIcon: '<circle cx="12" cy="12" r="9"></circle><path d="M12 8v4"></path><path d="M12 16h.01"></path>'
    };
}

function getApplicationStatusBadgeMeta(statusValue) {
    const status = String(statusValue || 'Pending');

    if (status === 'Approved') {
        return {
            applicationStatusClass: 'approved',
            applicationStatusText: 'Approved',
            applicationStatusIcon: '<path d="M20 6 9 17l-5-5"></path>'
        };
    }

    if (status === 'Rejected') {
        return {
            applicationStatusClass: 'rejected',
            applicationStatusText: 'Rejected',
            applicationStatusIcon: '<path d="M18 6 6 18"></path><path d="m6 6 12 12"></path>'
        };
    }

    return {
        applicationStatusClass: 'pending',
        applicationStatusText: 'Pending',
        applicationStatusIcon: '<circle cx="12" cy="12" r="9"></circle><path d="M12 8v4"></path><path d="M12 16h.01"></path>'
    };
}

function getSelectedPostId() {
    return Number(localStorage.getItem('selectedPostId') || 0);
}

async function getSavedPostsMap() {
    const supabase = window.supabaseClient;

    if (!supabase || !AppState.currentApplicantID) return {};

    const { data, error } = await supabase
        .from('SavedPostTbl')
        .select('PostID, DateSaved')
        .eq('ApplicantID', AppState.currentApplicantID);

    if (error) {
        console.error('Failed to load saved post dates:', error);
        return {};
    }

    const savedMap = {};

    (data || []).forEach(row => {
        savedMap[Number(row.PostID)] = row.DateSaved;
    });

    return savedMap;
}

async function renderSavedJobsPage() {
    await loadUserJobRelations();

    const jobs = await loadAllJobs();
    const savedMap = await getSavedPostsMap();

    let savedJobs = jobs
        .filter(job => isJobSavedByCurrentUser(job.id))
        .map(job => ({
            ...job,
            dateSaved: savedMap[Number(job.id)] || null
        }));

    const sortFilter = document.getElementById('savedSortFilter')?.value || 'mostRecent';

    savedJobs.sort((a, b) => {
        const aDate = new Date(a.dateSaved || 0).getTime();
        const bDate = new Date(b.dateSaved || 0).getTime();

        return sortFilter === 'oldest'
            ? aDate - bDate
            : bDate - aDate;
    });

    await loadJobCards('jobFeedContainer', savedJobs);
}

function initializeSavedPageFilters() {
    const sortFilter = document.getElementById('savedSortFilter');

    if (sortFilter) {
        sortFilter.addEventListener('change', async function () {
            await renderSavedJobsPage();
        });
    }
}

function normalizeText(value) {
    return String(value || '').trim().toLowerCase();
}

function parseSalaryRangeToNumber(salaryText) {
    const text = String(salaryText || '').toLowerCase().replace(/,/g, '');
    const matches = text.match(/\d+(\.\d+)?/g);

    if (!matches || matches.length === 0) return 0;

    const values = matches.map(Number).filter(num => !Number.isNaN(num));
    if (values.length === 0) return 0;

    return Math.max(...values);
}

function matchesSearchQuery(job, query) {
    const searchText = [
        job.companyName,
        job.companyIndustry,
        job.jobTitle,
        job.department,
        job.deploymentType,
        job.workSetup,
        job.deploymentLocation,
        job.workingHours,
        job.salaryRange,
        job.slotsAvailable,
        job.idealAge,
        job.idealEducationAttained,
        job.idealYearsOfExperience,
        job.idealSkills,
        job.description,
        job.postDescription,
        job.jobDescription
    ]
        .map(value => String(value || '').toLowerCase())
        .join(' ');

    return searchText.includes(normalizeText(query));
}

function matchesDeploymentType(job, filterValue) {
    if (filterValue === 'all') return true;
    return normalizeText(job.deploymentType) === filterValue;
}

function matchesWorkSetup(job, filterValue) {
    if (filterValue === 'all') return true;
    return normalizeText(job.workSetup) === filterValue;
}

function matchesSalaryRange(job, filterValue) {
    if (filterValue === 'all') return true;

    const salaryValue = parseSalaryRangeToNumber(job.salaryRange);

    if (filterValue === 'below20k') return salaryValue > 0 && salaryValue < 20000;
    if (filterValue === '20k-50k') return salaryValue >= 20000 && salaryValue <= 50000;
    if (filterValue === '50k-100k') return salaryValue > 50000 && salaryValue <= 100000;
    if (filterValue === 'above100k') return salaryValue > 100000;

    return true;
}

async function renderSearchResultsPage() {
    await loadUserJobRelations();

    let jobs = await loadAllJobs();
    const searchQuery = (localStorage.getItem('searchQuery') || '').trim();

    const sortFilter = document.getElementById('searchSortFilter')?.value || 'mostRecent';
    const deploymentFilter = document.getElementById('searchDeploymentFilter')?.value || 'all';
    const workSetupFilter = document.getElementById('searchWorkSetupFilter')?.value || 'all';
    const salaryFilter = document.getElementById('searchSalaryFilter')?.value || 'all';

    if (searchQuery) {
        jobs = jobs.filter(job => matchesSearchQuery(job, searchQuery));
    }

    jobs = jobs.filter(job => {
        return matchesDeploymentType(job, deploymentFilter)
            && matchesWorkSetup(job, workSetupFilter)
            && matchesSalaryRange(job, salaryFilter);
    });

    jobs.sort((a, b) => {
        const aDate = new Date(a.datePosted || 0).getTime();
        const bDate = new Date(b.datePosted || 0).getTime();

        return sortFilter === 'oldest'
            ? aDate - bDate
            : bDate - aDate;
    });

    await loadJobCards('jobFeedContainer', jobs);
}

function initializeSearchResultsFilters() {
    const filterIds = [
        'searchSortFilter',
        'searchDeploymentFilter',
        'searchWorkSetupFilter',
        'searchSalaryFilter'
    ];

    filterIds.forEach(id => {
        const element = document.getElementById(id);

        if (element) {
            element.addEventListener('change', async function () {
                await renderSearchResultsPage();
            });
        }
    });
}

function getSelectedJobApplicantId() {
    return Number(localStorage.getItem('selectedJobApplicantId') || 0);
}

function getScorePercent(scoreValue) {
    const numeric = Number(scoreValue);
    if (Number.isNaN(numeric) || numeric < 0) return 0;
    if (numeric > 100) return 100;
    return Math.round(numeric);
}

function getScoreFillClass(scoreValue) {
    const percent = getScorePercent(scoreValue);

    if (percent >= 70) return 'green';
    if (percent >= 40) return 'yellow';
    return 'red';
}

function buildScoreBar(label, scoreValue) {
    const percent = getScorePercent(scoreValue);
    const fillClass = getScoreFillClass(scoreValue);

    return `
        <div class="scoreBar">
            <span class="scoreLabel">${label}</span>
            <div class="scoreProgress">
                <div class="scoreFill ${fillClass}" style="width: ${percent}%;">${percent}%</div>
            </div>
        </div>
    `;
}

async function loadSelectedApplicationDetails() {
    const supabase = window.supabaseClient;
    const jobApplicantId = getSelectedJobApplicantId();

    if (!supabase || !jobApplicantId) {
        console.error('Missing supabase or selectedJobApplicantId:', { jobApplicantId });
        return null;
    }

    const { data: applicationRow, error: applicationError } = await supabase
        .from('ApplicationTbl')
        .select(`
            JobApplicantID,
            PostID,
            ApplicantID,
            SkillScore,
            ExperienceScore,
            EducationScore,
            AchievementScore,
            AgeScore,
            ResumeQualityScore,
            TotalScore,
            ApplicationStatus,
            ResumeOverview,
            OverallAssessment,
            Resume,
            DateApplied
        `)
        .eq('JobApplicantID', Number(jobApplicantId))
        .single();

    if (applicationError || !applicationRow) {
        console.error('Failed to load selected application:', applicationError);
        return null;
    }

    const { data: applicantRow, error: applicantError } = await supabase
        .from('ApplicantTbl')
        .select('ApplicantID, UserID, FirstName, MiddleName, LastName')
        .eq('ApplicantID', applicationRow.ApplicantID)
        .single();

    if (applicantError || !applicantRow) {
        console.error('Failed to load selected applicant:', applicantError);
        return null;
    }

    const { data: userRow, error: userError } = await supabase
        .from('UserTbl')
        .select('UserID, Username, UserImage')
        .eq('UserID', applicantRow.UserID)
        .single();

    if (userError || !userRow) {
        console.error('Failed to load selected applicant user:', userError);
        return null;
    }

    const nameParts = [
        applicantRow.FirstName,
        applicantRow.MiddleName,
        applicantRow.LastName
    ].filter(Boolean);

    return {
        ...applicationRow,
        ApplicantUserID: applicantRow.UserID,
        ApplicantName: nameParts.join(' ') || userRow.Username || 'Applicant',
        ApplicantUsername: userRow.Username || 'user',
        ApplicantImage: userRow.UserImage || ''
    };
}

function downloadResumeFile(resumeValue) {
    if (!resumeValue) {
        alert('No resume available to download.');
        return;
    }

    const resumeString = String(resumeValue).trim();

    if (!resumeString) {
        alert('No resume available to download.');
        return;
    }

    // If later you store full public URLs or storage URLs, this will still work.
    const link = document.createElement('a');
    link.href = resumeString;
    link.download = '';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function renderViewApplicationDetails(application) {
    const avatar = document.getElementById('viewApplicationApplicantAvatar');
    const name = document.getElementById('viewApplicationApplicantName');
    const username = document.getElementById('viewApplicationApplicantUsername');
    const profileLink = document.getElementById('viewApplicationApplicantProfile');

    const donutChart = document.getElementById('donutChart');
    const mainPercentage = document.getElementById('mainPercentage');
    const scoreBarsContainer = document.getElementById('scoreBarsContainer');
    const resumeOverviewText = document.getElementById('resumeOverviewText');
    const overallAssessmentText = document.getElementById('overallAssessmentText');

    if (avatar) {
        if (application.ApplicantImage) {
            avatar.innerHTML = '';
            avatar.style.backgroundImage = `url("${application.ApplicantImage}")`;
            avatar.style.backgroundSize = 'cover';
            avatar.style.backgroundPosition = 'center';
            avatar.style.backgroundRepeat = 'no-repeat';
        } else {
            avatar.style.backgroundImage = 'none';
            avatar.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                </svg>
            `;
        }
    }

    if (name) {
        name.textContent = application.ApplicantName || 'Applicant';
    }

    if (username) {
        const rawUsername = String(application.ApplicantUsername || 'user');
        username.textContent = rawUsername.startsWith('@') ? rawUsername : `@${rawUsername}`;
    }

    if (profileLink) {
        profileLink.addEventListener('click', function () {
            openProfileByUserId(application.ApplicantUserID, 'applicant');
        });
    }

    const totalPercent = getScorePercent(application.TotalScore);

    if (donutChart) {
        donutChart.style.setProperty('--final-degree', `${Math.round((totalPercent / 100) * 360)}deg`);
    }

    if (mainPercentage) {
        mainPercentage.textContent = `${totalPercent}%`;
    }

    if (scoreBarsContainer) {
        scoreBarsContainer.innerHTML = `
            ${buildScoreBar('Skills', application.SkillScore)}
            ${buildScoreBar('Experience', application.ExperienceScore)}
            ${buildScoreBar('Education', application.EducationScore)}
            ${buildScoreBar('Achievements', application.AchievementScore)}
            ${buildScoreBar('Age', application.AgeScore)}
            ${buildScoreBar('Resume Quality', application.ResumeQualityScore)}
            ${buildScoreBar('Total Score', application.TotalScore)}
        `;
    }

    if (resumeOverviewText) {
        resumeOverviewText.textContent = application.ResumeOverview || 'No overview available.';
    }

    if (overallAssessmentText) {
        overallAssessmentText.textContent = application.OverallAssessment || 'No overall assessment available.';
    }
}

function sanitizeFileName(fileName) {
    return String(fileName || 'resume')
        .trim()
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9._-]/g, '');
}

async function uploadResumeToStorage(file, applicantId, postId) {
    const supabase = window.supabaseClient;

    if (!supabase || !file) {
        throw new Error('Missing Supabase client or file.');
    }

    const safeName = sanitizeFileName(file.name);
    const filePath = `applicant_${applicantId}/post_${postId}/${Date.now()}_${safeName}`;

    const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(filePath, file, {
            upsert: false,
            contentType: file.type || undefined
        });

    if (uploadError) {
        throw uploadError;
    }

    const { data: publicUrlData } = supabase.storage
        .from('resumes')
        .getPublicUrl(filePath);

    return {
        filePath,
        publicUrl: publicUrlData?.publicUrl || ''
    };
}

function downloadResumeFile(resumeValue) {
    if (!resumeValue) {
        alert('No resume available.');
        return;
    }

    const resumeUrl = String(resumeValue).trim();

    if (!resumeUrl || !/^https?:\/\//i.test(resumeUrl)) {
        alert('Resume file is not available.');
        return;
    }

    const link = document.createElement('a');
    link.href = resumeUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.download = '';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function formatNotificationTimeFromId(notifId) {
    const numericValue = Number(notifId);

    if (!numericValue) return 'Just now';

    const date = new Date(numericValue);
    if (Number.isNaN(date.getTime())) return 'Just now';

    const diffMs = Date.now() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} min ago`;
    if (diffHours < 24) return `${diffHours} hr ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return date.toLocaleDateString();
}

async function deleteStatusNotification({
    postId,
    sentBy,
    receiveBy,
    jobApplicantId
}) {
    const supabase = window.supabaseClient;

    if (!supabase || !postId || !sentBy || !receiveBy || !jobApplicantId) {
        return false;
    }

    const { error } = await supabase
        .from('NotificationTbl')
        .delete()
        .eq('PostID', Number(postId))
        .eq('SentBy', Number(sentBy))
        .eq('RecieveBy', Number(receiveBy))
        .eq('JobApplicantID', Number(jobApplicantId));

    if (error) {
        console.error('Failed to delete status notification:', error);
        return false;
    }

    return true;
}

async function upsertApplicantStatusNotification({
    postId,
    sentBy,
    receiveBy,
    message,
    jobApplicantId
}) {
    const supabase = window.supabaseClient;

    if (!supabase || !postId || !sentBy || !receiveBy || !message || !jobApplicantId) {
        return false;
    }

    const { data: existingRow, error: existingError } = await supabase
        .from('NotificationTbl')
        .select('NotifId')
        .eq('PostID', Number(postId))
        .eq('SentBy', Number(sentBy))
        .eq('RecieveBy', Number(receiveBy))
        .eq('JobApplicantID', Number(jobApplicantId))
        .maybeSingle();

    if (existingError) {
        console.error('Failed to check existing applicant notification:', existingError);
        return false;
    }

    if (existingRow) {
        const { error: updateError } = await supabase
            .from('NotificationTbl')
            .update({
                NotifMessages: String(message),
                IsRead: false,
                CreatedAt: new Date().toISOString()
            })
            .eq('NotifId', Number(existingRow.NotifId));

        if (updateError) {
            console.error('Failed to update applicant notification:', updateError);
            return false;
        }

        return true;
    }

    return await createNotification({
        postId,
        sentBy,
        receiveBy,
        message,
        jobApplicantId
    });
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

function isFocusModePage(pageName = AppState.currentPage) {
    return [
        'profile',
        'profile-employer',
        'edit-profile',
        'edit-profile-employer',
        'create-post',
        'edit-post',
        'view-applicants',
        'view-application'
    ].includes(pageName);
}

function applyLayoutState(pageName = AppState.currentPage) {
    const sidebar = document.getElementById('sidebar');
    const featuredSidebar = document.getElementById('featuredSidebar');
    const mainContent = document.getElementById('mainContent');

    const focusMode = isFocusModePage(pageName);
    const isMobileLayout = window.innerWidth <= 1200;

    if (mainContent) {
        mainContent.classList.toggle('focus-mode', focusMode);
    }

    if (featuredSidebar) {
        featuredSidebar.classList.toggle('focus-mode', focusMode);
    }

    if (!sidebar) return;

    const sidebarWasManuallyOpened = sidebar.classList.contains('manual-open');

    if (focusMode) {
        if (sidebarWasManuallyOpened) {
            sidebar.classList.remove('hidden');
        } else {
            sidebar.classList.add('hidden');
        }
        return;
    }

    if (isMobileLayout) {
        if (sidebarWasManuallyOpened) {
            sidebar.classList.remove('hidden');
        } else {
            sidebar.classList.add('hidden');
        }
    } else {
        sidebar.classList.remove('hidden');
        sidebar.classList.remove('manual-open');
    }
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

    applyLayoutState(pageName);

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
                applyLayoutState(pageName);
            }
        })
        .catch(error => {
            console.error('Error loading page:', error);
            const content = document.getElementById('mainContent');
            if (content) {
                content.innerHTML = `
                    <div class="pageContent">
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
            initializeSearchResultsFilters();
            await renderSearchResultsPage();
            break;
        }

        case 'saved': {
            initializeSavedPageFilters();
            await renderSavedJobsPage();
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
            await initializeViewApplicantsPage();
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
        if (btn.classList.contains('viewApplicantsBtn')) {
            btn.style.display = (isEmployer() && ownProfile) ? 'inline-flex' : 'none';
        } else {
            btn.style.display = isApplicant() ? 'inline-flex' : 'none';
        }
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
    if (!sidebar) return;

    if (sidebar.classList.contains('hidden')) {
        sidebar.classList.remove('hidden');
        sidebar.classList.add('manual-open');
    } else {
        sidebar.classList.add('hidden');
        sidebar.classList.remove('manual-open');
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

    localStorage.setItem('searchQuery', searchTerm);
    loadPage('search-results');
    closeSearch();
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

    if (modalId === 'applyModal') {
        AppState.selectedJobId = null;
        updateResumeFilePreview(null);
    }

    if (modalId === 'imagePreviewModal') {
        closeImagePreview();
    }
}

function openImagePreview(imageSrc, imageAlt = 'Post image') {
    const modal = document.getElementById('imagePreviewModal');
    const previewImg = document.getElementById('imagePreviewImg');

    if (!modal || !previewImg || !imageSrc) return;

    previewImg.src = imageSrc;
    previewImg.alt = imageAlt;
    modal.classList.add('active');

    document.body.style.overflow = 'hidden';
}

function closeImagePreview() {
    const modal = document.getElementById('imagePreviewModal');
    const previewImg = document.getElementById('imagePreviewImg');

    if (modal) {
        modal.classList.remove('active');
    }

    if (previewImg) {
        previewImg.src = '';
        previewImg.alt = 'Post preview image';
    }

    document.body.style.overflow = '';
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
            const job = ComponentData.jobs.find(j => Number(j.id) === Number(jobId));

            if (job && String(job.postStatus || 'active').toLowerCase() === 'closed') {
                alert('This job is closed.');
                return;
            }

            if (AppState.currentRole === 'applicant') {
                openApplyModal(jobId);
            }
        });
    });

    document.querySelectorAll('.cancelApplicationBtn').forEach(btn => {
        btn.addEventListener('click', async function (e) {
            e.stopPropagation();
            const jobId = this.getAttribute('data-cancel-application');
            await cancelApplication(jobId);
        });
    });

    document.querySelectorAll('.viewApplicantsBtn').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            const postId = this.getAttribute('data-view-applicants');
            openViewApplicants(postId);
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

    document.querySelectorAll('.previewPostImage').forEach(imageBox => {
        imageBox.addEventListener('click', function (e) {
            e.stopPropagation();

            const imageSrc = this.getAttribute('data-image');
            const imageAlt = this.getAttribute('data-alt') || 'Post image';

            if (!imageSrc || !imageSrc.trim()) return;

            openImagePreview(imageSrc, imageAlt);
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
            .from('SavedPostTbl')
            .insert({
                PostID: postId,
                ApplicantID: AppState.currentApplicantID,
                DateSaved: new Date().toISOString()
            });

        if (error) {
            console.error('Save failed:', error);
            alert('Failed to save job.');
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
            .from('SavedPostTbl')
            .delete()
            .eq('PostID', postId)
            .eq('ApplicantID', AppState.currentApplicantID);

        if (error) {
            console.error('Unsave failed:', error);
            alert('Failed to remove saved job.');
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
        await renderSavedJobsPage();
    }
}

function openApplyModal(jobId) {
    AppState.selectedJobId = Number(jobId);

    const modal = document.getElementById('applyModal');
    if (modal) {
        modal.classList.add('active');
    }

    updateResumeFilePreview(null);
}

function handleFileSelect(e) {
    const file = e.target.files?.[0];
    updateResumeFilePreview(file);
}

async function getApplicantFullName(applicantId) {
    const supabase = window.supabaseClient;
    if (!supabase || !applicantId) return 'Applicant';

    const { data, error } = await supabase
        .from('ApplicantTbl')
        .select('FirstName, MiddleName, LastName')
        .eq('ApplicantID', Number(applicantId))
        .single();

    if (error || !data) {
        console.error('Failed to load applicant full name:', error);
        return 'Applicant';
    }

    return [
        data.FirstName || '',
        data.MiddleName || '',
        data.LastName || ''
    ]
        .map(value => String(value).trim())
        .filter(Boolean)
        .join(' ') || 'Applicant';
}

async function getJobPostAIPayloadById(postId) {
    const supabase = window.supabaseClient;
    if (!supabase || !postId) return null;

    const { data, error } = await supabase
        .from('JobPostTbl')
        .select('*')
        .eq('PostID', Number(postId))
        .single();

    if (error || !data) {
        console.error('Failed to load job post for AI payload:', error);
        return null;
    }

    return buildJobPostAIPayload(data);
}

async function handleSubmitApplication() {
    if (!isApplicant()) {
        alert('Only applicants can submit applications.');
        return;
    }

    const supabase = window.supabaseClient;
    const postId = Number(AppState.selectedJobId || 0);
    const applicantId = Number(AppState.currentApplicantID || 0);

    if (!supabase || !postId || !applicantId) {
        alert('Missing application data.');
        return;
    }

    const fileInput = document.getElementById('fileInput');
    const selectedFile = fileInput?.files?.[0] || null;

    if (!selectedFile) {
        alert('Please upload a resume first.');
        return;
    }

    const allowedExtensions = ['pdf', 'docx'];
    const fileNameLower = String(selectedFile.name || '').toLowerCase();
    const extension = fileNameLower.split('.').pop() || '';

    if (!allowedExtensions.includes(extension)) {
        alert('Please upload a PDF or DOC/DOCX resume.');
        return;
    }

    const { data: existingApplication, error: existingApplicationError } = await supabase
        .from('ApplicationTbl')
        .select('JobApplicantID, PostID, ApplicationStatus')
        .eq('PostID', postId)
        .eq('ApplicantID', applicantId)
        .maybeSingle();

    if (existingApplicationError) {
        console.error('Failed to check existing application:', existingApplicationError);
        alert(`Failed to submit application: ${existingApplicationError.message}`);
        return;
    }

    if (existingApplication) {
        alert(`You already applied for this job. Current status: ${existingApplication.ApplicationStatus || 'Pending'}.`);
        return;
    }

    let uploadedResume = null;

    try {
        uploadedResume = await uploadResumeToStorage(selectedFile, applicantId, postId);
    } catch (uploadError) {
        console.error('Failed to upload resume:', uploadError);
        alert(`Failed to upload resume: ${uploadError.message}`);
        return;
    }

    const resumeValue = uploadedResume?.publicUrl || null;

    if (!resumeValue) {
        alert('Failed to generate resume file URL.');
        return;
    }

    const applicantName = await getApplicantFullName(applicantId);
    const payload = buildPendingApplicationPayload(postId, applicantId, resumeValue, null);

    const { data: insertedApplication, error: insertError } = await supabase
        .from('ApplicationTbl')
        .insert(payload)
        .select('JobApplicantID, PostID, ApplicationStatus')
        .single();

    if (insertError) {
        console.error('Failed to submit application:', insertError);

        const errorText = String(insertError.message || '').toLowerCase();

        if (
            errorText.includes('duplicate key') ||
            errorText.includes('uq_application_post_applicant') ||
            errorText.includes('unique constraint')
        ) {
            alert('You already applied for this job.');

            if (!AppState.appliedJobs.some(item => Number(item.PostID) === Number(postId))) {
                AppState.appliedJobs.push({
                    PostID: Number(postId),
                    Status: 'Pending'
                });
            }

            if (AppState.currentPage === 'home') {
                const jobs = await loadAllJobs();
                await loadJobCards('jobFeedContainer', jobs);
                return;
            }

            if (AppState.currentPage === 'search-results') {
                await renderSearchResultsPage();
                return;
            }

            if (AppState.currentPage === 'saved') {
                await renderSavedJobsPage();
                return;
            }

            if (AppState.currentPage === 'profile') {
                await loadProfileJobs();
                return;
            }

            return;
        }

        alert(`Failed to submit application: ${insertError.message}`);
        return;
    }

    AppState.appliedJobs.push({
        PostID: Number(postId),
        Status: 'Pending'
    });

    await syncApplicationSubmittedNotification(insertedApplication.JobApplicantID);
    await loadNotifications();

    closeModal('applyModal');

    try {
        console.log('Starting AI scan...');
        console.log('Resume URL:', resumeValue);
        console.log('Selected file info:', {
            name: selectedFile.name,
            type: selectedFile.type,
            size: selectedFile.size
        });

        const { data: postRow, error: postError } = await supabase
            .from('JobPostTbl')
            .select('*')
            .eq('PostID', Number(postId))
            .single();

        if (postError || !postRow) {
            throw new Error(postError?.message || 'Failed to load job post for AI scan.');
        }

        const aiJobPost = buildJobPostAIPayload(postRow);

        if (!aiJobPost || !aiJobPost.JobTitle) {
            throw new Error('AI job post payload is missing JobTitle.');
        }

        const apiUrl = `${getApiBaseUrl()}/api/resume-score`;
        console.log('Calling API URL:', apiUrl);
        console.log('AI job post payload:', aiJobPost);

        let scanResponse;
        try {
            scanResponse = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    applicantName,
                    resumeUrl: resumeValue,
                    fileName: selectedFile.name || '',
                    mimeType: selectedFile.type || '',
                    jobPost: aiJobPost
                })
            });
        } catch (networkError) {
            console.error('Network error while calling /api/resume-score:', networkError);
            throw new Error(`Failed to reach resume scan API: ${networkError.message}`);
        }

        const rawResponse = await scanResponse.text();
        console.log('API status:', scanResponse.status);
        console.log('Raw API response:', rawResponse);

        if (!scanResponse.ok) {
            throw new Error(
                rawResponse && rawResponse.trim()
                    ? `Resume scan API failed: ${rawResponse.slice(0, 500)}`
                    : `Resume scan API failed with status ${scanResponse.status}`
            );
        }

        let scanData = null;

        try {
            scanData = JSON.parse(rawResponse);
        } catch (parseError) {
            throw new Error(`API returned non-JSON response: ${rawResponse.slice(0, 300)}`);
        }

        if (!scanData.ok) {
            throw new Error(scanData.error || 'Failed to scan resume.');
        }

        const saveResult = await updateApplicationScores(
            insertedApplication.JobApplicantID,
            scanData.result
        );

        if (!saveResult) {
            throw new Error('Failed to save AI scan results.');
        }

        const { error: resumeTextUpdateError } = await supabase
            .from('ApplicationTbl')
            .update({
                ResumeText: scanData.resumeText || null
            })
            .eq('JobApplicantID', Number(insertedApplication.JobApplicantID));

        if (resumeTextUpdateError) {
            throw new Error(`Failed to save ResumeText: ${resumeTextUpdateError.message}`);
        }

        console.log('AI scan completed successfully.');
    } catch (scanError) {
        console.error('Resume scan error:', scanError);

        await markApplicationScanFailed(
            insertedApplication.JobApplicantID,
            scanError.message || 'Unknown scan error'
        );
    }

    if (AppState.currentPage === 'home') {
        const jobs = await loadAllJobs();
        await loadJobCards('jobFeedContainer', jobs);
        return;
    }

    if (AppState.currentPage === 'search-results') {
        await renderSearchResultsPage();
        return;
    }

    if (AppState.currentPage === 'saved') {
        await renderSavedJobsPage();
        return;
    }

    if (AppState.currentPage === 'profile') {
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
        setInputByLabel(allInputs, 'Education Attained', applicantRow.EducationAttained || '');
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
                ContactNumber: getInputByLabel(allInputs, 'Contact Number'),
                EducationAttained: getInputByLabel(allInputs, 'Education Attained')
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

async function updateApplicationScores(jobApplicantId, result) {
    const supabase = window.supabaseClient;
    if (!supabase || !jobApplicantId || !result) return false;

    const payload = {
        SkillScore: result.SkillScore ?? null,
        ExperienceScore: result.ExperienceScore ?? null,
        EducationScore: result.EducationScore ?? null,
        AchievementScore: result.AchievementScore ?? null,
        AgeScore: result.AgeScore ?? null,
        ResumeQualityScore: result.ResumeQualityScore ?? null,
        TotalScore: result.TotalScore ?? null,
        ResumeOverview: result.ResumeOverview || null,
        OverallAssessment: result.OverallAssessment || null,
        ScanStatus: 'Completed',
        ScannedAt: new Date().toISOString(),
        ScanError: null
    };

    const { error } = await supabase
        .from('ApplicationTbl')
        .update(payload)
        .eq('JobApplicantID', Number(jobApplicantId));

    if (error) {
        console.error('Failed to update application scores:', error);
        return false;
    }

    return true;
}

async function markApplicationScanFailed(jobApplicantId, errorMessage) {
    const supabase = window.supabaseClient;
    if (!supabase || !jobApplicantId) return false;

    const { error } = await supabase
        .from('ApplicationTbl')
        .update({
            ScanStatus: 'Failed',
            ScanError: String(errorMessage || 'Unknown scan error'),
            ScannedAt: null
        })
        .eq('JobApplicantID', Number(jobApplicantId));

    if (error) {
        console.error('Failed to mark scan as failed:', error);
        return false;
    }

    return true;
}

async function scanApplicationWithLlama(jobApplicantId, postId, applicantName, resumeText) {
    const supabase = window.supabaseClient;
    if (!supabase || !jobApplicantId || !postId || !resumeText) return false;

    const { data: postRow, error: postError } = await supabase
        .from("JobPostTbl")
        .select("*")
        .eq("PostID", Number(postId))
        .single();

    if (postError || !postRow) {
        console.error("Failed to load job post for AI scan:", postError);
        await markApplicationScanFailed(jobApplicantId, postError?.message || "Job post not found");
        return false;
    }

    try {
        const result = await scoreResumeWithLlama({
            applicantName,
            resumeText,
            jobPost: buildJobPostAIPayload(postRow)
        });

        const saved = await updateApplicationScores(jobApplicantId, result);
        return saved;
    } catch (error) {
        console.error("Llama scan failed:", error);
        await markApplicationScanFailed(jobApplicantId, error.message);
        return false;
    }
}

function buildJobPostInsertPayload(fields, imageUrl = '') {
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
        TargetScore: Number(fields.targetScore) || null,

        PostDeadline: fields.postDeadline || null,
        JobImage: imageUrl || ''
    };
}

function buildJobPostAIPayload(postRow) {
    return {
        PostID: Number(postRow.PostID),

        JobTitle: postRow.JobTitle || '',
        Department: postRow.Department || '',
        DeploymentType: postRow.DeploymentType || '',
        WorkSetup: postRow.WorkSetup || '',
        DeploymentLocation: postRow.DeploymentLocation || '',
        WorkingHours: postRow.WorkingHours || '',
        SalaryRange: postRow.SalaryRange || '',
        SlotsAvailable: postRow.SlotsAvailable || '',
        IdealAge: postRow.IdealAge || null,
        IdealEducationAttained: postRow.IdealEductaionAttained || null,
        IdealYearsOfExperience: postRow.IdealYearsOfExperience || null,
        IdealSkills: postRow.IdealSkills || '',
        PostDescription: postRow.PostDescription || '',
        JobDescription: postRow.JobDescription || '',
        TargetScore: postRow.TargetScore || null,

        Skills: Boolean(postRow.Skills),
        Achievements: Boolean(postRow.Achievements),
        Experience: Boolean(postRow.Experience),
        ResumeQuality: Boolean(postRow.ResumeQuality),
        Education: Boolean(postRow.Education),
        Age: Boolean(postRow.Age)
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

                const payload = buildJobPostInsertPayload(fields, jobImageUrl);
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

                const payload = buildJobPostInsertPayload(fields, jobImageUrl);

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

async function initializeViewApplicantsPage() {
    const applicantsList = document.getElementById('applicantsListContainer');
    const approveBtn = document.querySelector('.approveSelectedBtn');
    const rejectBtn = document.querySelector('.rejectSelectedBtn');
    const resetBtn = document.querySelector('.resetSelectedBtn');
    const selectAllBtn = document.querySelector('.selectAllBtn');
    const countElement = document.querySelector('.selectedCount');

    if (!applicantsList) return;

    await renderViewApplicantsPage();

    applicantsList.addEventListener('click', function (e) {
        const checkbox = e.target.closest('.applicantSelect');
        if (checkbox) {
            e.stopPropagation();
            return;
        }

        const card = e.target.closest('.applicantCard');
        if (!card) return;

        const applicantId = card.getAttribute('data-applicant-id');
        const jobApplicantId = card.getAttribute('data-job-applicant-id');

        if (applicantId) {
            localStorage.setItem('selectedApplicantId', applicantId);
        }

        if (jobApplicantId) {
            localStorage.setItem('selectedJobApplicantId', jobApplicantId);
        }

        loadPage('view-application');
    });

    applicantsList.addEventListener('change', function (e) {
        if (e.target.classList.contains('applicantSelect')) {
            updateSelectedCount();
            updateSelectAllState();
        }
    });

    ['applicantsDateFilter', 'applicantsMatchFilter', 'applicantsStatusFilter'].forEach(id => {
        const select = document.getElementById(id);
        if (!select) return;

        select.addEventListener('change', async function () {
            await renderViewApplicantsPage();
            updateSelectedCount();
            updateSelectAllState();
        });
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
        approveBtn.addEventListener('click', async function () {
            const selected = [...document.querySelectorAll('.applicantSelect:checked')]
                .map(checkbox => checkbox.getAttribute('data-job-applicant-id'));

            if (selected.length === 0) {
                alert('Please select at least one applicant.');
                return;
            }

            const success = await updateApplicationStatus(selected, 'Approved');
            if (!success) return;

            await renderViewApplicantsPage();
            updateSelectedCount();
            updateSelectAllState();
        });
    }

    if (rejectBtn) {
        rejectBtn.addEventListener('click', async function () {
            const selected = [...document.querySelectorAll('.applicantSelect:checked')]
                .map(checkbox => checkbox.getAttribute('data-job-applicant-id'));

            if (selected.length === 0) {
                alert('Please select at least one applicant.');
                return;
            }

            const success = await updateApplicationStatus(selected, 'Rejected');
            if (!success) return;

            await renderViewApplicantsPage();
            updateSelectedCount();
            updateSelectAllState();
        });
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', async function () {
            const selected = [...document.querySelectorAll('.applicantSelect:checked')]
                .map(checkbox => checkbox.getAttribute('data-job-applicant-id'));

            if (selected.length === 0) {
                alert('Please select at least one applicant.');
                return;
            }

            const success = await updateApplicationStatus(selected, 'Pending');
            if (!success) return;

            await renderViewApplicantsPage();
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

async function initializeViewApplicationPage() {
    const backBtn = document.getElementById('backToApplicantsBtn');
    const acceptBtnFull = document.querySelector('.accept-btn-full');
    const rejectBtnFull = document.querySelector('.reject-btn-full');
    const resetBtnFull = document.querySelector('.reset-btn-full');
    const downloadResumeButton = document.getElementById('downloadResumeButton');

    const application = await loadSelectedApplicationDetails();

    if (!application) {
        alert('Failed to load application details.');
        loadPage('view-applicants');
        return;
    }

    renderViewApplicationDetails(application);

    if (backBtn) {
        backBtn.addEventListener('click', function () {
            loadPage('view-applicants');
        });
    }

    async function updateSingleApplicationStatus(newStatus) {
        const success = await updateApplicationStatus([application.JobApplicantID], newStatus);
        if (!success) return;

        alert(`Application marked as ${newStatus}.`);
        loadPage('view-applicants');
    }

    if (acceptBtnFull) {
        acceptBtnFull.addEventListener('click', function () {
            updateSingleApplicationStatus('Approved');
        });
    }

    if (rejectBtnFull) {
        rejectBtnFull.addEventListener('click', function () {
            updateSingleApplicationStatus('Rejected');
        });
    }

    if (resetBtnFull) {
        resetBtnFull.addEventListener('click', function () {
            updateSingleApplicationStatus('Pending');
        });
    }

    if (downloadResumeButton) {
        downloadResumeButton.addEventListener('click', function () {
            downloadResumeFile(application.Resume);
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