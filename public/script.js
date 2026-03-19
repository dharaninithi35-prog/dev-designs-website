/* ====== THEME TOGGLE ====== */
const themeToggle = document.getElementById('theme-toggle');
if (themeToggle) {
    const currentTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);

    themeToggle.addEventListener('click', () => {
        const theme = document.documentElement.getAttribute('data-theme');
        const nextTheme = theme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', nextTheme);
        localStorage.setItem('theme', nextTheme);
    });
}

// Ensure theme is applied on every page load globally
document.documentElement.setAttribute('data-theme', localStorage.getItem('theme') || 'dark');

// Auth Navbar Update
document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('loginBtn');
    const dashboardMenuBtn = document.getElementById('dashboardMenuBtn');

    if (loginBtn && dashboardMenuBtn) {
        const userJson = sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser');
        if (userJson) {
            loginBtn.style.display = 'none';
            dashboardMenuBtn.style.display = 'inline-block';
        } else {
            loginBtn.style.display = 'inline-block';
            dashboardMenuBtn.style.display = 'none';
        }
    }
});

/* ====== AUTHENTICATION UI LOGIC ====== */
function switchTab(tabId) {
    document.querySelectorAll('.auth-form').forEach(f => f.style.display = 'none');
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    
    document.getElementById('form-' + tabId).style.display = 'block';
    event.target.classList.add('active');
}

function togglePassword(inputId, btn) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') {
        input.type = 'text';
        btn.classList.remove('fa-eye');
        btn.classList.add('fa-eye-slash');
        btn.title = 'Hide Password';
    } else {
        input.type = 'password';
        btn.classList.remove('fa-eye-slash');
        btn.classList.add('fa-eye');
        btn.title = 'Show Password';
    }
}

/* AUTHENTICATION SIMULATOR & BACKEND FALLBACK 
   (If backend isn't mounted, we fall back to LocalStorage) */

const API_BASE = 'http://localhost:5000/api';

// --- Simulator Utilities ---
function getMockUsers() {
    return JSON.parse(localStorage.getItem('mockUsers') || '[]');
}

function saveMockUser(user) {
    const users = getMockUsers();
    users.push(user);
    localStorage.setItem('mockUsers', JSON.stringify(users));
}

// Initialize default mock users
function initMockData() {
    const defaultUsers = [
        { id: 'u1', name: 'Demo User', email: 'demo@user.com', password: 'password', role: 'user' },
        { id: 'a1', name: 'Admin', email: 'admin@devdesigns.com', password: 'admin123', role: 'admin' }
    ];
    let users = getMockUsers();
    
    // Add defaults if they don't exist
    defaultUsers.forEach(def => {
        if (!users.find(u => u.email === def.email)) {
            users.push(def);
        } else if (def.role === 'admin') {
            // Force update admin password to admin123 for consistency
            const idx = users.findIndex(u => u.email === def.email);
            users[idx].password = def.password;
        }
    });
    localStorage.setItem('mockUsers', JSON.stringify(users));
}
initMockData();


async function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const pass = document.getElementById('reg-pass').value;

    try {
        const res = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password: pass })
        });
        const data = await res.json();
        if (res.ok) {
            alert('Registration Successful! Please login.');
            switchTab('user-login');
        } else {
            alert(data.error || 'Registration failed');
        }
    } catch (err) {
        console.warn("API Registration failed, using mock registration", err);
        const users = getMockUsers();
        if (users.find(u => u.email === email)) {
            alert('Email already registered (Simulator)');
            return;
        }
        const newUser = { id: 'u' + Date.now(), name, email, password: pass, role: 'user' };
        saveMockUser(newUser);
        alert('Simulator: Registration Successful! (Local fallback)');
        switchTab('user-login');
    }
}

async function handleLogin(e, role) {
    e.preventDefault();
    const isUser = role === 'user';
    const email = document.getElementById(isUser ? 'login-email' : 'admin-email').value;
    const pass = document.getElementById(isUser ? 'login-pass' : 'admin-pass').value;
    const rememberMe = document.getElementById(isUser ? 'user-remember' : 'admin-remember').checked;

    const saveSession = (userData) => {
        if (rememberMe) localStorage.setItem('currentUser', JSON.stringify(userData));
        else sessionStorage.setItem('currentUser', JSON.stringify(userData));
        window.location.href = 'dashboard.html';
    };

    try {
        const endpoint = isUser ? `${API_BASE}/auth/login` : `${API_BASE}/auth/admin-login`;
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: pass })
        });
        const data = await res.json();
        
        if (res.ok) {
            // Store token and user data
            if (data.token) localStorage.setItem('token', data.token);
            saveSession(data.user || data.admin);
        } else {
            document.getElementById(isUser ? 'user-login-error' : 'admin-login-error').innerText = data.error;
        }
    } catch (err) {
        console.warn("API Login failed, using mock authentication", err);
        const users = getMockUsers();
        const user = users.find(u => u.email === email && u.password === pass);

        if (user) {
            if (!isUser && user.role !== 'admin') {
                document.getElementById('admin-login-error').innerText = "Access Denied. Simulator Admin only.";
                return;
            }
            saveSession(user);
        } else {
            document.getElementById(isUser ? 'user-login-error' : 'admin-login-error').innerText = "Invalid credentials (Simulator Mode)";
        }
    }
}

function logout() {
    localStorage.removeItem('currentUser');
    sessionStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}

/* ====== DASHBOARD LOGIC ====== */
function initDashboard() {
    // Automatically deduplicate any existing mock projects globally (fix for past rapid clicks)
    let rawProjects = JSON.parse(localStorage.getItem('mockProjects') || '[]');
    if (rawProjects.length > 0) {
        let unique = [];
        let seen = new Set();
        rawProjects.forEach(p => {
            let sig = p.userId + '|' + p.serviceType + '|' + p.description;
            if (!seen.has(sig)) { unique.push(p); seen.add(sig); }
        });
        localStorage.setItem('mockProjects', JSON.stringify(unique));
        rawProjects = unique;
    }



    const userJson = sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser');
    if(!userJson) {
        window.location.href = 'login.html'; return;
    }
    const user = JSON.parse(userJson);
    if (user.role === 'admin') {
        document.getElementById('welcome-msg').innerText = 'Welcome back Admin!';
        document.getElementById('admin-menu').style.display = 'block';
        showSection('all-requests');
        loadAdminProjects();
    } else {
        document.getElementById('welcome-msg').innerText = `Welcome, ${user.name}!`;
        document.getElementById('user-menu').style.display = 'block';
        showSection('new-request');
    }
}

function showSection(id) {
    document.querySelectorAll('.dash-section').forEach(el => el.style.display = 'none');
    const sec = document.getElementById(id);
    if(sec) sec.style.display = 'block';
}

/* PROJECT SUBMISSION (WITH MOCK FALLBACK) */
async function submitProject(e) {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    const formData = new FormData();
    formData.append('name', document.getElementById('req-name').value);
    formData.append('email', document.getElementById('req-email').value);
    formData.append('phone', (document.getElementById('req-country-code') ? document.getElementById('req-country-code').value + ' ' : '') + document.getElementById('req-phone').value);
    formData.append('serviceType', document.getElementById('req-service').value);
    formData.append('description', document.getElementById('req-desc').value);
    
    const fileInput = document.getElementById('req-file');
    if (fileInput.files[0]) {
        formData.append('file', fileInput.files[0]);
    }

    try {
        const res = await fetch(`${API_BASE}/projects`, {
            method: 'POST',
            body: formData
        });
        if (res.ok) {
            document.getElementById('req-msg').style.display = 'block';
            document.getElementById('project-form').reset();
            setTimeout(() => { document.getElementById('req-msg').style.display = 'none'; }, 3000);
        } else {
            const data = await res.json();
            alert(data.error || 'Failed to submit project');
        }
    } catch (err) {
        console.warn("Backend error, falling back to mock submission", err);
        
        // --- Full Mock Fallback ---
        const user = JSON.parse(sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser'));
        const newProject = {
            id: 'p' + Date.now(),
            userId: user ? user.id : 'anon',
            name: document.getElementById('req-name').value,
            email: document.getElementById('req-email').value,
            phone: (document.getElementById('req-country-code') ? document.getElementById('req-country-code').value + ' ' : '') + document.getElementById('req-phone').value,
            serviceType: document.getElementById('req-service').value,
            description: document.getElementById('req-desc').value,
            deadline: 'TBD', // Handled by backend usually
            status: 'Pending',
            createdAt: new Date().toISOString()
        };

        const projects = JSON.parse(localStorage.getItem('mockProjects') || '[]');
        projects.push(newProject);
        localStorage.setItem('mockProjects', JSON.stringify(projects));

        document.getElementById('req-msg').style.display = 'block';
        document.getElementById('project-form').reset();
        setTimeout(() => { document.getElementById('req-msg').style.display = 'none'; }, 3000);
    } finally {
        if (submitBtn) submitBtn.disabled = false;
    }
}

/* PROJECT LOADING (USER) */
async function loadUserProjects() {
    const list = document.getElementById('user-projects-list');
    list.innerHTML = "Loading...";
    const user = JSON.parse(sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser'));

    try {
        const res = await fetch(`${API_BASE}/projects?userId=${user.id}&role=user`);
        const data = await res.json();
        renderUserProjects(data);
    } catch (err) {
        // mock fallback
        let projects = JSON.parse(localStorage.getItem('mockProjects') || '[]');
        let myProj = projects.filter(p => p.userId === user.id);
        renderUserProjects(myProj);
    }
}

function renderUserProjects(projects) {
    const list = document.getElementById('user-projects-list');
    if (projects.length === 0) list.innerHTML = "<p>No request submitted yet.</p>";
    else {
        list.innerHTML = projects.map(p => `
            <div class="card text-left" style="position:relative;">
                <div style="position:absolute; top:15px; right:15px; display:flex; gap:5px;">
                    <button class="btn-icon" style="padding: 4px; font-size: 1rem;" title="View Details" onclick="viewProjectDetails('${p.id}')">👁️</button>
                    <button class="btn-icon" style="padding: 4px; font-size: 1rem;" title="Edit Request" onclick="editProjectDetails('${p.id}')">✏️</button>
                    <button class="btn-icon" style="padding: 4px; font-size: 1rem;" title="Delete Request" onclick="deleteProject('${p.id}')">🗑️</button>
                </div>
                <h4 style="color:var(--primary); padding-right:80px;">${p.serviceType}</h4>
                <p class="text-xs color-muted mt-2">${p.description.substring(0, 50)}...</p>
                <div style="margin-top: 15px; display:flex; justify-content:space-between;">
                    <span class="status-badge status-${p.status.replace(' ','')}">${p.status}</span>
                    <span style="font-size:0.8rem; color: var(--text-muted);">${new Date(p.createdAt).toLocaleDateString()}</span>
                </div>
            </div>
        `).join('');
    }
}

/* PROJECT MANAGING (ADMIN) */
async function loadAdminProjects() {
    const list = document.getElementById('admin-projects-list');
    list.innerHTML = "Loading...";

    try {
        const res = await fetch(`${API_BASE}/projects?role=admin`);
        const data = await res.json();
        renderAdminProjects(data);
    } catch (err) {
        let projects = JSON.parse(localStorage.getItem('mockProjects') || '[]');
        renderAdminProjects(projects);
    }
}

function renderAdminProjects(projects) {
    const list = document.getElementById('admin-projects-list');
    if (projects.length === 0) list.innerHTML = "<p>No active requests found.</p>";
    else {
        list.innerHTML = projects.map(p => `
            <div class="project-row">
                <div class="project-info">
                    <h4>${p.name} - <span style="font-weight:400; color:var(--text-muted)">${p.serviceType}</span></h4>
                    <p>${p.email} | ${p.phone}</p>
                    <p style="margin-top:5px;">Deadline: <b>${p.deadline}</b></p>
                </div>
                <div class="project-actions" style="display:flex; align-items:center;">
                    <button class="btn-icon" style="padding: 4px; font-size: 1rem; margin-right:15px;" title="View Details" onclick="viewProjectDetails('${p.id}')">👁️</button>
                    <span class="status-badge status-${p.status.replace(' ','')}">${p.status}</span>
                    <select onchange="updateMocStatus('${p.id}', this.value)" style="margin-left:15px;">
                        <option value="Pending" ${p.status==='Pending'?'selected':''}>Pending</option>
                        <option value="In Progress" ${p.status==='In Progress'?'selected':''}>In Progress</option>
                        <option value="Completed" ${p.status==='Completed'?'selected':''}>Completed</option>
                    </select>
                </div>
            </div>
        `).join('');
    }
}

function updateMocStatus(projId, newStatus) {
    // In real app, call PUT /api/projects/:id
    let projects = JSON.parse(localStorage.getItem('mockProjects') || '[]');
    let proj = projects.find(x => x.id === projId);
    if(proj) proj.status = newStatus;
    localStorage.setItem('mockProjects', JSON.stringify(projects));
    loadAdminProjects(); // Re-render logic dynamically
}

/* ====== DETAILS & EDIT MODAL LOGIC ====== */
function getProjectById(id) {
    let projects = JSON.parse(localStorage.getItem('mockProjects') || '[]');
    return projects.find(p => p.id === id);
}

window.viewProjectDetails = function(id) {
    const p = getProjectById(id);
    if(!p) return;
    const modal = document.getElementById('details-modal');
    document.getElementById('modal-title').innerText = p.serviceType + ' Details';
    document.getElementById('modal-content').innerHTML = `
        <div style="background:var(--bg-main); padding:1rem; border-radius:8px; margin-bottom:1rem; display:grid; grid-template-columns:1fr 1fr; gap:10px;">
            <div><strong>Name:</strong> <br/>${p.name}</div>
            <div><strong>Email:</strong> <br/>${p.email}</div>
            <div><strong>Phone:</strong> <br/>${p.phone}</div>
            <div><strong>Deadline:</strong> <br/>${p.deadline}</div>
            <div><strong>Status:</strong> <br/><span class="status-badge status-${p.status.replace(' ','')}">${p.status}</span></div>
            <div><strong>Submitted:</strong> <br/>${new Date(p.createdAt).toLocaleDateString()}</div>
        </div>
        <strong>Project Requirements:</strong>
        <p style="background:var(--bg-main); padding:1rem; border-radius:8px; margin-top:0.5rem; white-space:pre-wrap;">${p.description}</p>
    `;
    modal.style.display = 'flex';
}

window.editProjectDetails = function(id) {
    const p = getProjectById(id);
    if(!p) return;
    const modal = document.getElementById('details-modal');
    document.getElementById('modal-title').innerText = 'Edit ' + p.serviceType;
    document.getElementById('modal-content').innerHTML = `
        <div class="form-group">
            <label>Project Requirements</label>
            <textarea id="edit-desc" rows="6" class="w-100">${p.description}</textarea>
        </div>
        <div class="form-group">
            <label>Deadline</label>
            <input type="date" id="edit-deadline" value="${p.deadline}" class="w-100">
        </div>
        <button class="btn-primary w-100 mt-2" onclick="saveProjectDetails('${p.id}')">Save Changes</button>
    `;
    modal.style.display = 'flex';
}

window.saveProjectDetails = function(id) {
    let projects = JSON.parse(localStorage.getItem('mockProjects') || '[]');
    let idx = projects.findIndex(p => p.id === id);
    if(idx !== -1) {
        projects[idx].description = document.getElementById('edit-desc').value;
        projects[idx].deadline = document.getElementById('edit-deadline').value;
        localStorage.setItem('mockProjects', JSON.stringify(projects));
        closeDetailsModal();
        const user = JSON.parse(sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser'));
        if(user.role === 'admin') loadAdminProjects();
        else loadUserProjects();
    }
}

window.closeDetailsModal = function() {
    document.getElementById('details-modal').style.display = 'none';
}

window.deleteProject = function(id) {
    if(confirm('Are you certain you want to delete this project request?')) {
        let projects = JSON.parse(localStorage.getItem('mockProjects') || '[]');
        projects = projects.filter(p => p.id !== id);
        localStorage.setItem('mockProjects', JSON.stringify(projects));
        const user = JSON.parse(sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser'));
        if(user && user.role === 'admin') loadAdminProjects();
        else loadUserProjects();
    }
}

/* ====== REVIEWS & TESTIMONIALS LOGIC ====== */
let currentRating = 0;

window.openReviewModal = function(projectName) {
    document.getElementById('review-project-name').value = projectName;
    document.getElementById('review-text').value = '';
    currentRating = 0;
    updateStars(0);
    document.getElementById('review-modal').style.display = 'flex';
}

window.closeReviewModal = function() {
    document.getElementById('review-modal').style.display = 'none';
}

function updateStars(rating) {
    document.querySelectorAll('#star-rating span').forEach(star => {
        if (parseInt(star.getAttribute('data-value')) <= rating) {
            star.style.color = '#eab308'; // Glowing yellow
            star.style.textShadow = '0 0 10px rgba(234, 179, 8, 0.4)';
        } else {
            star.style.color = 'grey';
            star.style.textShadow = 'none';
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const starContainer = document.getElementById('star-rating');
    if (starContainer) {
        starContainer.addEventListener('click', (e) => {
            if (e.target.tagName === 'SPAN') {
                currentRating = parseInt(e.target.getAttribute('data-value'));
                updateStars(currentRating);
            }
        });
        starContainer.addEventListener('mouseover', (e) => {
            if (e.target.tagName === 'SPAN') {
                updateStars(parseInt(e.target.getAttribute('data-value')));
            }
        });
        starContainer.addEventListener('mouseleave', () => {
            updateStars(currentRating);
        });
    }
});

window.submitReview = async function() {
    if (currentRating === 0) {
        alert("Please select a star rating!"); return;
    }
    const reviewText = document.getElementById('review-text').value;
    if (!reviewText) {
        alert("Please write a short review!"); return;
    }

    const user = JSON.parse(sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser'));
    const projectName = document.getElementById('review-project-name').value;
    const payload = {
        clientName: user.name,
        projectName: projectName,
        rating: currentRating,
        reviewText: reviewText
    };

    try {
        const res = await fetch(`${API_BASE}/reviews`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            alert('Thank you for your review! It has been submitted for approval.');
            closeReviewModal();
        } else {
            const data = await res.json();
            alert(data.error || 'Failed to submit review');
        }
    } catch(err) {
        console.error("Review Submission Error:", err);
        alert('Server unreachable. Could not submit review.');
    }
}

// ADMIN LOGIC
window.loadAdminReviews = async function() {
    const list = document.getElementById('admin-reviews-list');
    list.innerHTML = "Loading...";

    try {
        const res = await fetch(`${API_BASE}/reviews`);
        const reviews = await res.json();
        renderAdminReviews(reviews);
    } catch (err) {
        let reviews = JSON.parse(localStorage.getItem('mockReviews') || '[]');
        renderAdminReviews(reviews);
    }
}

function renderAdminReviews(reviews) {
    const list = document.getElementById('admin-reviews-list');
    if (reviews.length === 0) {
        list.innerHTML = "<p>No reviews submitted yet.</p>";
        return;
    }

    list.innerHTML = reviews.map(r => `
        <div class="project-row" style="flex-direction: column; align-items: flex-start;">
            <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <h4 style="color:var(--primary); margin:0;">${r.clientName} <span style="font-weight:400; color:var(--text-muted); font-size:0.9rem;">- ${r.projectName}</span></h4>
                <div style="color: #eab308; font-size: 1.2rem;">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div>
            </div>
            <p style="margin-bottom: 15px;">"${r.reviewText}"</p>
            <div style="display:flex; justify-content: space-between; width: 100%; align-items:center;">
                <span class="status-badge" style="background: ${r.status === 'Approved' ? '#10b981' : '#f59e0b'}; color:white;">${r.status}</span>
                <div style="display:flex; gap:10px;">
                    ${r.status === 'Pending' ? `<button class="btn-primary" style="padding: 5px 15px; font-size:0.8rem;" onclick="approveReview('${r.id || r._id}')">Approve</button>` : ''}
                    <button class="btn-secondary" style="padding: 5px 15px; font-size:0.8rem;" onclick="deleteReview('${r.id || r._id}')">Delete</button>
                </div>
            </div>
        </div>
    `).join('');
}

window.approveReview = async function(id) {
    try {
        const res = await fetch(`${API_BASE}/reviews/${id}/approve`, { method: 'PUT' });
        if (res.ok) loadAdminReviews();
    } catch (err) {
        let reviews = JSON.parse(localStorage.getItem('mockReviews') || '[]');
        let idx = reviews.findIndex(r => r.id === id);
        if (idx > -1) {
            reviews[idx].status = 'Approved';
            localStorage.setItem('mockReviews', JSON.stringify(reviews));
            loadAdminReviews();
        }
    }
}

window.deleteReview = async function(id) {
    if(confirm('Delete this review permanently?')) {
        try {
            const res = await fetch(`${API_BASE}/reviews/${id}`, { method: 'DELETE' });
            if (res.ok) loadAdminReviews();
        } catch (err) {
            let reviews = JSON.parse(localStorage.getItem('mockReviews') || '[]');
            reviews = reviews.filter(r => r.id !== id);
            localStorage.setItem('mockReviews', JSON.stringify(reviews));
            loadAdminReviews();
        }
    }
}

// HOME PAGE PUBLIC REVIEWS
async function loadPublicReviews() {
    const list = document.getElementById('testimonials-list');
    if (!list) return;

    list.innerHTML = "<p>Loading Testimonials...</p>";

    let reviews = [];
    try {
        const res = await fetch(`${API_BASE}/reviews?publicOnly=true`);
        reviews = await res.json();
    } catch (err) {
        let allReviews = JSON.parse(localStorage.getItem('mockReviews') || '[]');
        reviews = allReviews.filter(r => r.status === 'Approved');
    }

    if (reviews.length === 0) {
        list.innerHTML = "<p style='color: var(--text-muted); text-align: center; width: 100%; grid-column: 1 / -1;'>No testimonials yet.</p>";
        return;
    } else {
        reviews = reviews.slice(0, 3); // Display only top 3 on homepage
    }

    list.innerHTML = reviews.map(r => `
        <div class="card" style="text-align: left; background: var(--bg-card); padding: 2rem;">
            <div style="color: #eab308; font-size: 1.5rem; margin-bottom: 10px;">
                ${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}
            </div>
            <p style="color: var(--text-muted); font-style: italic; margin-bottom: 20px; line-height: 1.6;">"${r.reviewText}"</p>
            <div>
                <h4 style="color: var(--text);">${r.clientName}</h4>
                <p style="color: var(--primary); font-size: 0.85rem; font-weight: 600;">${r.projectName}</p>
            </div>
        </div>
    `).join('');
}

document.addEventListener('DOMContentLoaded', () => {
    loadPublicReviews();
});
