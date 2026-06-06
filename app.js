// ============================================================
// NutriPrint — app.js  (UPDATED — All 7 Phases)
// Phase 1: Login / Signup
// Phase 2: Class Dashboard
// Phase 3: Auto-fill from BMI to Planner
// Phase 4: QR Code + Recipes
// Phase 5: PWA Offline
// Phase 6: Voice Input
// + All previous 4 fixes preserved
// ============================================================

const FOOD_EMOJIS = {
  'Ragi Mudde': '🌾', 'Ragi Dosa': '🥞', 'Ragi Roti': '🫓',
  'Jowar Roti': '🫓', 'Jowar Dosa': '🥞', 'Sprout Upma': '🥗',
  'Idli': '🍥', 'Sambar Rice': '🍚', 'Coconut Rice': '🥥',
  'Khichdi': '🍲', 'Curd Rice': '🍚', 'Vegetable Pulao': '🍚',
  'Sweet Potato': '🍠', 'Banana': '🍌', 'Groundnut Chikki': '🍬',
  'Egg Curry': '🥚', 'Fish Curry': '🐟', 'Chicken Curry': '🍗',
  'Dal Rice': '🍲', 'Chapati': '🫓', 'Poha': '🥣',
  'Rava Upma': '🥣', 'Pongal': '🍲', 'Mixed Veg Curry': '🥦',
  'Green Gram Usli': '🫘', 'Horse Gram Usli': '🫘',
};

function getFoodEmoji(name) {
  if (!name) return '🍽️';
  for (const key in FOOD_EMOJIS) {
    if (name.toLowerCase().includes(key.toLowerCase())) return FOOD_EMOJIS[key];
  }
  return '🍽️';
}

const SECTION_MAP = {
  'home':      'home-section',
  'bmi':       'bmi-section',
  'generator': 'generator-section',
  'library':   'library-section',
  'about':     'about-section',
  'dashboard': 'dashboard-section',
};

const HASH_TO_KEY = {
  '#home':      'home',
  '#bmi':       'bmi',
  '#generator': 'generator',
  '#library':   'library',
  '#about':     'about',
  '#dashboard': 'dashboard',
};

function getSectionKeyFromHash() {
  const hash = window.location.hash.toLowerCase();
  return HASH_TO_KEY[hash] || 'home';
}

// ============================================================
// MAIN APP OBJECT
// ============================================================
const app = {

  currentSection: 'home',
  lastPlanData:   null,
  lastBMIData:    null,
  currentTeacher: null,
  students:       [],
  voiceListening: false,

  // ── Init ────────────────────────────────────────────────
  async init() {
    this.setupNavigation();
    this.setupHashRouting();
    this.animateStats();
    this.loadLibrary();
    this.setupMobileMenu();
    this.registerServiceWorker();

    // Check if already logged in
    await this.checkAuthStatus();

    const initialKey = getSectionKeyFromHash();
    this.showSection(initialKey, false);
  },

  // ── Hash Routing ─────────────────────────────────────────
  setupHashRouting() {
    window.addEventListener('popstate', () => {
      const key = getSectionKeyFromHash();
      this.showSection(key, false);
    });
  },

  // ── Navigation ───────────────────────────────────────────
  setupNavigation() {
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = link.getAttribute('data-target');
        if (target) this.navigateTo(target);
      });
    });
  },

  navigateTo(sectionKey) {
    this.showSection(sectionKey, true);
    const nav = document.getElementById('nav-links');
    if (nav) nav.classList.remove('open');
  },

  showSection(sectionKey, pushState = true) {
    if (!SECTION_MAP[sectionKey]) sectionKey = 'home';
    this.currentSection = sectionKey;

    document.querySelectorAll('.app-section').forEach(s => s.classList.remove('active'));

    const targetEl = document.getElementById(SECTION_MAP[sectionKey]);
    if (targetEl) {
      targetEl.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.toggle('active', link.getAttribute('data-target') === sectionKey);
    });

    if (pushState) {
      history.pushState({ section: sectionKey }, '', `#${sectionKey}`);
    } else {
      history.replaceState({ section: sectionKey }, '', `#${sectionKey}`);
    }

    if (sectionKey === 'library')   this.loadLibrary();
    if (sectionKey === 'dashboard') this.loadDashboard();
  },

  // ── Mobile Menu ──────────────────────────────────────────
  setupMobileMenu() {
    const btn = document.getElementById('menu-toggle');
    const nav = document.getElementById('nav-links');
    if (btn && nav) btn.addEventListener('click', () => nav.classList.toggle('open'));
  },

  // ── Stats ────────────────────────────────────────────────
  animateStats() {
    const targets = {
      'stat-junk-india': 93,
      'stat-junk-kar':   60,
      'stat-obesity':     9,
      'stat-students':    1,
    };
    Object.entries(targets).forEach(([id, target]) => {
      const el = document.getElementById(id);
      if (!el) return;
      let current = 0;
      const step = target / 60;
      const interval = setInterval(() => {
        current = Math.min(current + step, target);
        el.textContent = id === 'stat-students' ? current.toFixed(1) : Math.round(current);
        if (current >= target) clearInterval(interval);
      }, 25);
    });
  },

  // ════════════════════════════════════════════════════════
  // PHASE 1 — LOGIN / SIGNUP
  // ════════════════════════════════════════════════════════
  async checkAuthStatus() {
    try {
      const resp = await fetch('/api/auth/me', { credentials: 'include' });
      const data = await resp.json();
      if (data.logged_in) {
        this.currentTeacher = data.teacher;
        this.updateNavForLoggedIn();
        this.autoFillTeacherDetails();
      }
    } catch (e) {
      console.log('Auth check failed:', e);
    }
  },

  updateNavForLoggedIn() {
    // Add teacher name to nav
    const nav = document.getElementById('nav-links');
    if (!nav) return;

    // Remove existing auth buttons
    nav.querySelectorAll('.nav-auth-btn').forEach(el => el.remove());

    if (this.currentTeacher) {
      nav.insertAdjacentHTML('beforeend', `
        <div class="nav-teacher-info nav-auth-btn">
          <span class="nav-teacher-name">👨‍🏫 ${this.currentTeacher.name}</span>
          <button class="nav-logout-btn" onclick="app.logout()">Logout</button>
        </div>
      `);
    } else {
      nav.insertAdjacentHTML('beforeend', `
        <button class="nav-login-btn nav-auth-btn" onclick="app.showAuthModal('login')">
          Login
        </button>
      `);
    }
  },

  showAuthModal(mode = 'login') {
    let modal = document.getElementById('auth-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'auth-modal';
      modal.className = 'auth-modal-overlay';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="auth-modal-box">
        <button class="auth-modal-close" onclick="document.getElementById('auth-modal').style.display='none'">✕</button>
        <div class="auth-modal-header">
          <div class="auth-logo">🌾</div>
          <h2>NutriPrint</h2>
          <p>Karnataka School Nutrition Platform</p>
        </div>

        <div class="auth-tabs">
          <button class="auth-tab ${mode === 'login' ? 'active' : ''}"
            onclick="app.switchAuthTab('login')">Login</button>
          <button class="auth-tab ${mode === 'signup' ? 'active' : ''}"
            onclick="app.switchAuthTab('signup')">Sign Up</button>
        </div>

        <!-- LOGIN FORM -->
        <div id="auth-login-form" style="display:${mode === 'login' ? 'block' : 'none'}">
          <div class="auth-field">
            <label>Phone Number</label>
            <input type="tel" id="login-phone" placeholder="Enter your phone number">
          </div>
          <div class="auth-field">
            <label>Password</label>
            <input type="password" id="login-password" placeholder="Enter password">
          </div>
          <div class="auth-error" id="login-error" style="display:none"></div>
          <button class="auth-submit-btn" onclick="app.login()">Login →</button>
          <p class="auth-switch">Don't have an account?
            <a href="#" onclick="app.switchAuthTab('signup')">Sign up here</a>
          </p>
        </div>

        <!-- SIGNUP FORM -->
        <div id="auth-signup-form" style="display:${mode === 'signup' ? 'block' : 'none'}">
          <div class="auth-field">
            <label>Your Full Name</label>
            <input type="text" id="signup-name" placeholder="e.g. Smt. Kavitha Rao">
          </div>
          <div class="auth-field">
            <label>School Name</label>
            <input type="text" id="signup-school" placeholder="e.g. Govt. High School Mangalore">
          </div>
          <div class="auth-field">
            <label>District</label>
            <select id="signup-district">
              <option value="">Select District</option>
              <option>Dakshina Kannada</option>
              <option>Udupi</option>
              <option>Mangalore</option>
              <option>Shivamogga</option>
              <option>Bengaluru Rural</option>
              <option>Hassan</option>
              <option>Mysuru</option>
              <option>Other</option>
            </select>
          </div>
          <div class="auth-field">
            <label>Phone Number</label>
            <input type="tel" id="signup-phone" placeholder="10-digit mobile number">
          </div>
          <div class="auth-field">
            <label>Password</label>
            <input type="password" id="signup-password" placeholder="Minimum 6 characters">
          </div>
          <div class="auth-error" id="signup-error" style="display:none"></div>
          <button class="auth-submit-btn" onclick="app.signup()">Create Account →</button>
          <p class="auth-switch">Already registered?
            <a href="#" onclick="app.switchAuthTab('login')">Login here</a>
          </p>
        </div>
      </div>
    `;

    modal.style.display = 'flex';
  },

  switchAuthTab(mode) {
    document.getElementById('auth-login-form').style.display  = mode === 'login'  ? 'block' : 'none';
    document.getElementById('auth-signup-form').style.display = mode === 'signup' ? 'block' : 'none';
    document.querySelectorAll('.auth-tab').forEach((tab, i) => {
      tab.classList.toggle('active', (i === 0 && mode === 'login') || (i === 1 && mode === 'signup'));
    });
  },

  async login() {
    const phone    = document.getElementById('login-phone').value.trim();
    const password = document.getElementById('login-password').value.trim();
    const errEl    = document.getElementById('login-error');

    if (!phone || !password) {
      errEl.textContent = 'Please enter phone and password.';
      errEl.style.display = 'block';
      return;
    }

    try {
      const resp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ phone, password }),
      });
      const data = await resp.json();

      if (!resp.ok) {
        errEl.textContent = data.error || 'Login failed.';
        errEl.style.display = 'block';
        return;
      }

      this.currentTeacher = data.teacher;
      document.getElementById('auth-modal').style.display = 'none';
      this.updateNavForLoggedIn();
      this.autoFillTeacherDetails();
      this.showToast(`Welcome back, ${data.teacher.name}! 🎉`);

    } catch (e) {
      errEl.textContent = 'Connection error. Please try again.';
      errEl.style.display = 'block';
    }
  },

  async signup() {
    const name     = document.getElementById('signup-name').value.trim();
    const school   = document.getElementById('signup-school').value.trim();
    const district = document.getElementById('signup-district').value;
    const phone    = document.getElementById('signup-phone').value.trim();
    const password = document.getElementById('signup-password').value.trim();
    const errEl    = document.getElementById('signup-error');

    if (!name || !school || !district || !phone || !password) {
      errEl.textContent = 'Please fill all fields.';
      errEl.style.display = 'block';
      return;
    }

    try {
      const resp = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, school_name: school, district, phone, password }),
      });
      const data = await resp.json();

      if (!resp.ok) {
        errEl.textContent = data.error || 'Signup failed.';
        errEl.style.display = 'block';
        return;
      }

      this.currentTeacher = data.teacher;
      document.getElementById('auth-modal').style.display = 'none';
      this.updateNavForLoggedIn();
      this.autoFillTeacherDetails();
      this.showToast(`Account created! Welcome, ${data.teacher.name}! 🌾`);

    } catch (e) {
      errEl.textContent = 'Connection error. Please try again.';
      errEl.style.display = 'block';
    }
  },

  async logout() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    this.currentTeacher = null;
    this.updateNavForLoggedIn();
    this.showToast('Logged out successfully.');
    this.navigateTo('home');
  },

  // PHASE 1 — Auto-fill teacher details everywhere
  autoFillTeacherDetails() {
    if (!this.currentTeacher) return;

    const schoolEl  = document.getElementById('school_name');
    const teacherEl = document.getElementById('teacher_name');

    if (schoolEl  && !schoolEl.value)  schoolEl.value  = this.currentTeacher.school_name;
    if (teacherEl && !teacherEl.value) teacherEl.value = this.currentTeacher.name;

    // Show welcome banner if exists
    const banner = document.getElementById('teacher-welcome-banner');
    if (banner) {
      banner.style.display = 'flex';
      banner.innerHTML = `
        <span>👨‍🏫 Logged in as <strong>${this.currentTeacher.name}</strong>
        — ${this.currentTeacher.school_name}</span>
        <button onclick="app.navigateTo('dashboard')" class="banner-dash-btn">
          My Dashboard →
        </button>
      `;
    }
  },

  // ════════════════════════════════════════════════════════
  // PHASE 2 — CLASS DASHBOARD
  // ════════════════════════════════════════════════════════
  async loadDashboard() {
    if (!this.currentTeacher) {
      this.showAuthModal('login');
      return;
    }

    const container = document.getElementById('dashboard-section');
    if (!container) return;

    container.innerHTML = `
      <div class="dashboard-wrapper">
        <div class="dashboard-header">
          <div>
            <h2>My Class Dashboard</h2>
            <p>${this.currentTeacher.school_name} • ${this.currentTeacher.district}</p>
          </div>
          <button class="add-student-btn" onclick="app.showAddStudentModal()">
            + Add Student
          </button>
        </div>
        <div id="dashboard-stats" class="dashboard-stats"></div>
        <div id="students-grid" class="students-grid">
          <div class="loading-spinner">Loading students...</div>
        </div>
      </div>
    `;

    try {
      const resp = await fetch('/api/students', { credentials: 'include' });
      const students = await resp.json();
      this.students = students;
      this.renderStudentsGrid(students);
      this.renderDashboardStats(students);
    } catch (e) {
      document.getElementById('students-grid').innerHTML =
        '<p style="color:#EF4444;text-align:center">Error loading students.</p>';
    }
  },

  renderDashboardStats(students) {
    const el = document.getElementById('dashboard-stats');
    if (!el) return;

    const total       = students.length;
    const underweight = students.filter(s => s.latest_bmi?.status === 'Underweight').length;
    const normal      = students.filter(s => s.latest_bmi?.status === 'Normal').length;
    const overweight  = students.filter(s =>
      s.latest_bmi?.status === 'Overweight' || s.latest_bmi?.status === 'Obese').length;

    el.innerHTML = `
      <div class="stat-card total-card">
        <div class="stat-num">${total}</div>
        <div class="stat-label">Total Students</div>
      </div>
      <div class="stat-card normal-card">
        <div class="stat-num">${normal}</div>
        <div class="stat-label">✅ Normal BMI</div>
      </div>
      <div class="stat-card under-card">
        <div class="stat-num">${underweight}</div>
        <div class="stat-label">⚠️ Underweight</div>
      </div>
      <div class="stat-card over-card">
        <div class="stat-num">${overweight}</div>
        <div class="stat-label">🔴 Overweight</div>
      </div>
    `;
  },

  renderStudentsGrid(students) {
    const grid = document.getElementById('students-grid');
    if (!grid) return;

    if (!students.length) {
      grid.innerHTML = `
        <div class="empty-students">
          <div style="font-size:48px">👩‍🎓</div>
          <p>No students added yet.</p>
          <button class="add-student-btn" onclick="app.showAddStudentModal()">
            + Add First Student
          </button>
        </div>
      `;
      return;
    }

    grid.innerHTML = students.map(s => {
      const bmi    = s.latest_bmi;
      const status = bmi ? bmi.status : 'Not measured';
      const color  = status === 'Normal' ? '#10B981'
        : status === 'Underweight'       ? '#F59E0B'
        : status === 'Overweight' || status === 'Obese' ? '#EF4444'
        : '#94A3B8';

      // Mini BMI history sparkline
      const history = s.bmi_history || [];
      const sparkline = history.length > 1
        ? this.renderSparkline(history.map(h => h.bmi))
        : '';

      return `
        <div class="student-card">
          <div class="student-card-top">
            <div class="student-avatar">${s.gender === 'Girl' ? '👧' : '👦'}</div>
            <div class="student-info">
              <h4>${s.name}</h4>
              <p>Age: ${s.age} • ${s.gender}</p>
            </div>
            <button class="student-delete-btn"
              onclick="app.deleteStudent(${s.id}, '${s.name}')">🗑️</button>
          </div>

          <div class="student-bmi-row">
            <span class="bmi-status-tag" style="background:${color}20;color:${color}">
              ${status}
            </span>
            ${bmi ? `<span class="bmi-value-tag">BMI: ${bmi.bmi}</span>` : ''}
          </div>

          ${sparkline ? `
            <div class="sparkline-label">BMI Progress</div>
            <div class="sparkline-container">${sparkline}</div>
          ` : ''}

          <div class="student-card-actions">
            <button class="btn-measure" onclick="app.openBMIForStudent(${s.id}, '${s.name}', ${s.age}, '${s.gender}')">
              📏 Measure BMI
            </button>
            <button class="btn-generate" onclick="app.generateForStudent(${s.id}, '${s.name}', '${status}', ${s.age})">
              🍽️ Generate Plan
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  renderSparkline(bmiValues) {
    if (bmiValues.length < 2) return '';
    const min = Math.min(...bmiValues) - 1;
    const max = Math.max(...bmiValues) + 1;
    const w = 120, h = 30;
    const pts = bmiValues.map((v, i) => {
      const x = (i / (bmiValues.length - 1)) * w;
      const y = h - ((v - min) / (max - min)) * h;
      return `${x},${y}`;
    }).join(' ');
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <polyline points="${pts}" fill="none" stroke="#1D9E75" stroke-width="2"/>
    </svg>`;
  },

  showAddStudentModal() {
    const modal = document.createElement('div');
    modal.className = 'auth-modal-overlay';
    modal.id = 'add-student-modal';
    modal.innerHTML = `
      <div class="auth-modal-box">
        <button class="auth-modal-close"
          onclick="document.getElementById('add-student-modal').remove()">✕</button>
        <h3 style="margin-bottom:16px">Add New Student</h3>
        <div class="auth-field">
          <label>Student Name</label>
          <input type="text" id="new-student-name" placeholder="Full name">
        </div>
        <div class="auth-field">
          <label>Age</label>
          <input type="number" id="new-student-age" placeholder="Age" min="5" max="15" value="10">
        </div>
        <div class="auth-field">
          <label>Gender</label>
          <select id="new-student-gender">
            <option value="Boy">Boy</option>
            <option value="Girl">Girl</option>
          </select>
        </div>
        <button class="auth-submit-btn" onclick="app.addStudent()">Add Student →</button>
      </div>
    `;
    document.body.appendChild(modal);
    modal.style.display = 'flex';
  },

  async addStudent() {
    const name   = document.getElementById('new-student-name').value.trim();
    const age    = parseInt(document.getElementById('new-student-age').value);
    const gender = document.getElementById('new-student-gender').value;

    if (!name) { alert('Please enter student name.'); return; }

    try {
      const resp = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, age, gender }),
      });
      if (resp.ok) {
        document.getElementById('add-student-modal')?.remove();
        this.showToast(`${name} added successfully! 🎉`);
        this.loadDashboard();
      }
    } catch (e) {
      alert('Error adding student.');
    }
  },

  async deleteStudent(id, name) {
    if (!confirm(`Remove ${name} from your class?`)) return;
    await fetch(`/api/students/${id}`, { method: 'DELETE', credentials: 'include' });
    this.showToast(`${name} removed.`);
    this.loadDashboard();
  },

  openBMIForStudent(id, name, age, gender) {
    // Pre-fill BMI form with student data
    const nameEl   = document.getElementById('bmi_student_name');
    const ageEl    = document.getElementById('bmi_age');
    const genderEl = document.getElementById('bmi_gender');
    if (nameEl)   nameEl.value   = name;
    if (ageEl)    ageEl.value    = age;
    if (genderEl) genderEl.value = gender;

    // Store student id to save BMI record after calculation
    document.getElementById('bmi_student_name').dataset.studentId = id;
    this.navigateTo('bmi');
  },

  generateForStudent(id, name, bmiStatus, age) {
    // Pre-fill planner with student data
    const studentNameEl = document.getElementById('student_name');
    const bmiStatusEl   = document.getElementById('bmi_status_hidden');
    const ageGroupEl    = document.getElementById('age_group');

    if (studentNameEl) studentNameEl.value = name;
    if (bmiStatusEl)   bmiStatusEl.value   = bmiStatus;
    if (ageGroupEl) {
      if (age >= 5  && age <= 8)  ageGroupEl.value = '5-8';
      else if (age >= 9 && age <= 12) ageGroupEl.value = '9-12';
      else ageGroupEl.value = '13-15';
    }

    this.autoFillTeacherDetails();
    this.navigateTo('generator');

    // Auto-generate after navigation
    setTimeout(() => {
      const schoolEl  = document.getElementById('school_name');
      const teacherEl = document.getElementById('teacher_name');
      if (schoolEl?.value && teacherEl?.value) {
        const form = document.getElementById('generator-form');
        if (form) form.dispatchEvent(new Event('submit', { cancelable: true }));
      }
    }, 500);
  },

  // ════════════════════════════════════════════════════════
  // PHASE 3 — BMI AUTO-FILL TO PLANNER (Fixed)
  // ════════════════════════════════════════════════════════
  submitBMIForm(event) {
    event.preventDefault();

    const name   = document.getElementById('bmi_student_name').value.trim();
    const age    = parseInt(document.getElementById('bmi_age').value);
    const gender = document.getElementById('bmi_gender').value;
    const height = parseFloat(document.getElementById('bmi_height').value);
    const weight = parseFloat(document.getElementById('bmi_weight').value);

    if (!height || !weight || height < 80 || weight < 10) {
      alert('Please enter valid height and weight values.');
      return;
    }

    const heightM = height / 100;
    const bmi     = parseFloat((weight / (heightM * heightM)).toFixed(1));

    let status, color, advice, portionAdvice;

    if (bmi < 16.5) {
      status = 'Underweight'; color = '#F59E0B';
      advice = 'The child is underweight. Increase protein and calorie-rich foods. Ragi Mudde, eggs, and pulses are highly recommended.';
      portionAdvice = 'High-Protein & Energy-dense portions (130%) to assist healthy weight gain.';
    } else if (bmi <= 23) {
      status = 'Normal'; color = '#10B981';
      advice = 'The child has healthy growth parameters. Maintain a balanced diet using fresh vegetables, pulses, and locally grown millets.';
      portionAdvice = 'Standard balanced portions (100%) for healthy growth.';
    } else if (bmi <= 27.5) {
      status = 'Overweight'; color = '#FBBF24';
      advice = 'The child is overweight. Reduce fried and sugary foods. Increase fiber-rich foods like Jowar Roti, dal, and green vegetables.';
      portionAdvice = 'High-fiber, mineral-dense, controlled portions (70%) for weight control.';
    } else {
      status = 'Obese'; color = '#EF4444';
      advice = 'The child is obese. Consult a doctor or nutritionist. Focus on fruits, vegetables, and millet-based foods.';
      portionAdvice = 'Strictly controlled portions (70%) with high-fiber foods for weight management.';
    }

    this.lastBMIData = { name, age, gender, height, weight, bmi, status };

    document.getElementById('bmi-empty').style.display = 'none';
    const reportEl = document.getElementById('bmi-report-view');
    reportEl.style.display = 'flex';

    document.getElementById('rep-student-name').textContent  = name || 'Student';
    document.getElementById('rep-meta-desc').textContent     =
      `Age: ${age} • Gender: ${gender} • Height: ${height}cm • Weight: ${weight}kg`;
    document.getElementById('rep-bmi-val').textContent       = bmi;
    document.getElementById('rep-status-advice').textContent = advice;
    document.getElementById('rep-portion-advice').textContent = portionAdvice;

    const badge = document.getElementById('rep-status-badge');
    badge.textContent          = status.toUpperCase();
    badge.style.backgroundColor = color;

    const pointerPct = Math.min(Math.max(((bmi - 12) / 26) * 100, 2), 98);
    const pointer    = document.getElementById('rep-bmi-pointer');
    if (pointer) pointer.style.left = `${pointerPct}%`;

    document.getElementById('bmi_status_hidden').value = status;

    // Save BMI to database if student_id present
    const studentId = document.getElementById('bmi_student_name').dataset.studentId;
    if (studentId && this.currentTeacher) {
      fetch(`/api/students/${studentId}/bmi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ height, weight, bmi, status }),
      }).catch(e => console.log('BMI save error:', e));
    }

    this.showAIAdvisorPanel(name, age, gender, status, bmi, 'Vegetarian', 'Karnataka');
  },

  // PHASE 3 — Auto-generate plan from BMI result
  applyBMIToPlan() {
    if (this.lastBMIData) {
      const studentNameEl = document.getElementById('student_name');
      const bmiStatusEl   = document.getElementById('bmi_status_hidden');
      const ageGroupEl    = document.getElementById('age_group');
      const opt           = document.getElementById('bmi_optimization_focus');
      const strategy      = document.getElementById('optimization_strategy');

      if (studentNameEl) studentNameEl.value = this.lastBMIData.name || '';
      if (bmiStatusEl)   bmiStatusEl.value   = this.lastBMIData.status;
      if (opt && strategy) strategy.value = opt.value;

      // Auto-set age group
      const age = this.lastBMIData.age;
      if (ageGroupEl) {
        if (age >= 5 && age <= 8)   ageGroupEl.value = '5-8';
        else if (age >= 9 && age <= 12) ageGroupEl.value = '9-12';
        else ageGroupEl.value = '13-15';
      }
    }

    // Auto-fill teacher details if logged in
    this.autoFillTeacherDetails();
    this.navigateTo('generator');

    // Auto-generate if school + teacher already filled
    setTimeout(() => {
      const schoolEl  = document.getElementById('school_name');
      const teacherEl = document.getElementById('teacher_name');

      if (schoolEl?.value?.trim() && teacherEl?.value?.trim()) {
        const form = document.getElementById('generator-form');
        if (form) form.dispatchEvent(new Event('submit', { cancelable: true }));
      } else {
        // Highlight empty fields
        if (schoolEl && !schoolEl.value.trim()) {
          schoolEl.style.borderColor = '#E8562A';
          schoolEl.placeholder = '⚠️ Enter school name to auto-generate';
          schoolEl.focus();
        }
        if (teacherEl && !teacherEl.value.trim()) {
          teacherEl.style.borderColor = '#E8562A';
          teacherEl.placeholder = '⚠️ Enter teacher name to auto-generate';
        }
      }
    }, 400);
  },

  // ════════════════════════════════════════════════════════
  // MEAL PLAN GENERATOR
  // ════════════════════════════════════════════════════════
  async submitForm(event) {
    event.preventDefault();

    // If logged in, auto-fill from teacher profile
    this.autoFillTeacherDetails();

    const school_name           = document.getElementById('school_name').value.trim();
    const teacher_name          = document.getElementById('teacher_name').value.trim();
    const student_name          = document.getElementById('student_name').value.trim();
    const bmi_status            = document.getElementById('bmi_status_hidden').value;
    const age_group             = document.getElementById('age_group').value;
    const preference            = document.getElementById('preference').value;
    const region                = document.getElementById('region').value;
    const month                 = document.getElementById('month').value;
    const optimization_strategy = document.getElementById('optimization_strategy').value;

    let valid = true;
    if (!school_name) {
      document.getElementById('err-school').style.display = 'block'; valid = false;
    } else {
      document.getElementById('err-school').style.display = 'none';
    }
    if (!teacher_name) {
      document.getElementById('err-teacher').style.display = 'block'; valid = false;
    } else {
      document.getElementById('err-teacher').style.display = 'none';
    }
    if (!valid) return;

    document.getElementById('gen-loading').style.display  = 'flex';
    document.getElementById('gen-empty').style.display    = 'none';
    document.getElementById('gen-success').style.display  = 'none';

    try {
      const resp = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          school_name, teacher_name, student_name,
          bmi_status, age_group, preference,
          region, month, optimization_strategy,
          bmi_value: this.lastBMIData?.bmi || '',
          height: this.lastBMIData?.height || 0,
          weight: this.lastBMIData?.weight || 0,
        }),
      });

      const data = await resp.json();
      if (data.error) { alert(data.error); return; }

      this.lastPlanData = data;
      this.renderPoster(data);

      document.getElementById('gen-success').style.display = 'flex';
      document.getElementById('gen-success').scrollIntoView({ behavior: 'smooth' });

    } catch (err) {
      alert('Error generating plan. Please check your connection and try again.');
      console.error(err);
    } finally {
      document.getElementById('gen-loading').style.display = 'none';
    }
  },

  regeneratePlan() {
    const form = document.getElementById('generator-form');
    if (form) form.dispatchEvent(new Event('submit', { cancelable: true }));
  },

  // ════════════════════════════════════════════════════════
  // POSTER RENDERER (FIX 2 + FIX 3 + QR Code)
  // ════════════════════════════════════════════════════════
  renderPoster(data) {
    const { school_details, meal_plan } = data;

    document.getElementById('post-school-title').textContent = school_details.school_name;
    document.getElementById('post-teacher-val').textContent  = school_details.teacher_name;
    document.getElementById('post-month-val').textContent    = `${school_details.month} 2026`;
    document.getElementById('post-portion-label').innerHTML  = `
      <strong>Portion Guideline / ಭಾಗದ ಪ್ರಮಾಣ:</strong> ${school_details.portion_label_en}
      <span class="lang-kn">${school_details.portion_label_kn || ''}</span>
    `;

    const badge = document.getElementById('post-student-badge');
    if (school_details.student_name) {
      badge.style.display = 'flex';
      document.getElementById('post-student-name-val').textContent = school_details.student_name;
      document.getElementById('post-student-bmi-val').textContent  =
        `Growth Status: ${school_details.bmi_status || 'Normal'}`;
    } else {
      badge.style.display = 'none';
    }

    // PHASE 4 — QR Code display
    const qrContainer = document.getElementById('poster-qr-container');
    if (qrContainer && data.qr_code) {
      const planUrl = `${window.location.origin}/plan/${data.qr_code}`;
      // Generate QR using free API
      qrContainer.innerHTML = `
        <div class="qr-box">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(planUrl)}"
               alt="QR Code" width="100" height="100" loading="lazy">
          <div class="qr-label">Scan for recipes & digital plan</div>
          <div class="qr-code-text">${data.qr_code}</div>
        </div>
      `;
    }

    const canvas    = document.getElementById('poster-grid-canvas');
    const days      = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const mealSlots = ['breakfast', 'lunch', 'snack', 'dinner'];
    const slotLabels = {
      breakfast: { en: '🌅 Breakfast', kn: 'ಬೆಳಗಿನ ತಿಂಡಿ' },
      lunch:     { en: '☀️ Lunch',     kn: 'ಮಧ್ಯಾಹ್ನದ ಊಟ' },
      snack:     { en: '🌤️ Snack',     kn: 'ಸಂಜೆ ತಿಂಡಿ'  },
      dinner:    { en: '🌙 Dinner',    kn: 'ರಾತ್ರಿ ಊಟ'    },
    };

    const allCells = canvas.querySelectorAll('.grid-cell');
    allCells.forEach((cell, i) => { if (i >= 7) cell.remove(); });

    mealSlots.forEach(slot => {
      const labelCell = document.createElement('div');
      labelCell.className = 'grid-cell meal-slot-label';
      labelCell.innerHTML = `
        <span class="slot-en">${slotLabels[slot].en}</span>
        <span class="kn-day">${slotLabels[slot].kn}</span>
      `;
      canvas.appendChild(labelCell);

      days.forEach(day => {
        const dayData = meal_plan[day];
        const food    = dayData ? dayData[slot] : null;
        const cell    = document.createElement('div');
        cell.className = 'grid-cell meal-data-cell';

        if (food) {
          const emoji = getFoodEmoji(food.name_en);
          cell.innerHTML = `
            <div class="food-emoji">${emoji}</div>
            <div class="food-name-en">${food.name_en || '-'}</div>
            <div class="food-name-kn">${food.name_kn || ''}</div>
            <div class="food-nutrition-row">
              <span>📏 ${food.serving_size || '1 portion'}</span>
              <span>P: ${food.scaled_protein  ?? food.protein  ?? 0}g</span>
              <span>Ca: ${food.scaled_calcium ?? food.calcium ?? 0}mg</span>
              <span>Fe: ${food.scaled_iron    ?? food.iron    ?? 0}mg</span>
            </div>
            <div class="food-cost-tag">₹${food.scaled_cost ?? food.cost ?? 0}</div>
          `;
        } else {
          cell.innerHTML = '<span class="no-meal">—</span>';
        }
        canvas.appendChild(cell);
      });
    });

    // Summary row
    const summaryLabel = document.createElement('div');
    summaryLabel.className = 'grid-cell summary-label-cell';
    summaryLabel.innerHTML = `
      <span class="slot-en">📊 Daily Total</span>
      <span class="kn-day">ದಿನದ ಒಟ್ಟು</span>
    `;
    canvas.appendChild(summaryLabel);

    days.forEach(day => {
      const dayData = meal_plan[day];
      const cell    = document.createElement('div');
      cell.className = 'grid-cell summary-data-cell';
      if (dayData?.nutrients) {
        const n = dayData.nutrients;
        cell.innerHTML = `
          <div class="summary-row">P: <strong>${n.protein}g</strong></div>
          <div class="summary-row">Ca: <strong>${n.calcium}mg</strong></div>
          <div class="summary-row">Fe: <strong>${n.iron}mg</strong></div>
          <div class="summary-cost">₹${n.cost}</div>
        `;
      }
      canvas.appendChild(cell);
    });
  },

  // ════════════════════════════════════════════════════════
  // NUTRITION LIBRARY
  // ════════════════════════════════════════════════════════
  async loadLibrary() {
    const canvas = document.getElementById('library-cards-canvas');
    if (!canvas) return;

    const search  = document.getElementById('lib-search')?.value || '';
    const cat     = document.getElementById('lib-filter-cat')?.value || '';
    const vegOnly = document.getElementById('lib-filter-veg')?.value === 'veg';

    let url = `/api/nutrition?search=${encodeURIComponent(search)}`;
    if (cat)     url += `&category=${encodeURIComponent(cat)}`;
    if (vegOnly) url += '&veg_only=true';

    try {
      const resp  = await fetch(url);
      const foods = await resp.json();
      canvas.innerHTML = '';

      if (!foods.length) {
        canvas.innerHTML = `<p style="color:#64748B;text-align:center;padding:40px;">No foods found.</p>`;
        return;
      }

      foods.forEach(food => {
        const emoji = getFoodEmoji(food.name_en);
        const card  = document.createElement('div');
        card.className = 'food-card';

        // PHASE 4 — Show full recipe with ingredients + steps
        const stepsHtml = food.recipe_steps
          ? food.recipe_steps.split('.').filter(s => s.trim()).map((s, i) =>
              `<div class="recipe-step"><span class="step-num">${i+1}</span>${s.trim()}.</div>`
            ).join('')
          : '';

        card.innerHTML = `
          <div class="food-card-emoji">${emoji}</div>
          <div class="food-card-body">
            <h4>${food.name_en} <span class="kn-name">${food.name_kn || ''}</span></h4>
            <div class="food-card-macros">
              <div class="macro-pill">
                <span class="macro-label">Serving</span>
                <span class="macro-val">${food.serving_size || '1 portion'}</span>
              </div>
              <div class="macro-pill">
                <span class="macro-label">Protein</span>
                <span class="macro-val">${food.protein}g</span>
              </div>
              <div class="macro-pill">
                <span class="macro-label">Calcium</span>
                <span class="macro-val">${food.calcium}mg</span>
              </div>
              <div class="macro-pill">
                <span class="macro-label">Iron</span>
                <span class="macro-val">${food.iron}mg</span>
              </div>
              <div class="macro-pill cost-pill">
                <span class="macro-label">Cost</span>
                <span class="macro-val">₹${food.cost}</span>
              </div>
            </div>
            ${food.ingredients ? `
              <div class="recipe-section">
                <div class="recipe-title">🛒 Ingredients</div>
                <div class="recipe-ingredients">${food.ingredients}</div>
              </div>
            ` : ''}
            ${stepsHtml ? `
              <div class="recipe-section">
                <div class="recipe-title">👩‍🍳 How to Make</div>
                <div class="recipe-steps">${stepsHtml}</div>
              </div>
            ` : ''}
            <div class="recipe-section">
              <div class="recipe-title">💡 Tip / ಸಲಹೆ</div>
              <div class="recipe-tip">${food.recipe_tip_en || ''}</div>
              ${food.recipe_tip_kn ? `<div class="recipe-tip kn">${food.recipe_tip_kn}</div>` : ''}
            </div>
            <div class="food-card-tags">
              <span class="tag cat-tag">${food.category}</span>
              ${food.is_veg ? '<span class="tag veg-tag">🌿 Veg</span>' : ''}
              ${food.is_egg ? '<span class="tag egg-tag">🥚 Egg</span>'  : ''}
            </div>
          </div>
        `;
        canvas.appendChild(card);
      });

    } catch (err) {
      canvas.innerHTML = `<p style="color:#EF4444;text-align:center;padding:40px;">Error loading. Please refresh.</p>`;
    }
  },

  filterLibrary() { this.loadLibrary(); },

  // ════════════════════════════════════════════════════════
  // PHASE 5 — PWA: Service Worker Registration
  // ════════════════════════════════════════════════════════
  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('SW registered:', reg.scope))
        .catch(err => console.log('SW error:', err));
    }
  },

  // ════════════════════════════════════════════════════════
  // PHASE 6 — VOICE INPUT
  // ════════════════════════════════════════════════════════
  startVoiceInput(targetFieldId) {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      this.showToast('Voice input not supported in this browser. Try Chrome.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    const btn = document.getElementById(`voice-btn-${targetFieldId}`);
    if (btn) {
      btn.textContent = '🔴 Listening...';
      btn.style.background = '#EF4444';
    }

    recognition.start();
    this.voiceListening = true;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      const field = document.getElementById(targetFieldId);
      if (field) {
        field.value = transcript;
        field.dispatchEvent(new Event('input'));
      }
      this.showToast(`Heard: "${transcript}"`);
    };

    recognition.onerror = (event) => {
      this.showToast('Voice input error. Please try again.');
      console.error('Voice error:', event.error);
    };

    recognition.onend = () => {
      this.voiceListening = false;
      if (btn) {
        btn.textContent = '🎤';
        btn.style.background = '';
      }
    };
  },

  // ════════════════════════════════════════════════════════
  // GEMINI AI ADVISOR (preserved from previous version)
  // ════════════════════════════════════════════════════════
  showAIAdvisorPanel(name, age, gender, bmiStatus, bmiValue, preference, region) {
    let panel = document.getElementById('ai-advisor-panel');

    if (!panel) {
      panel = document.createElement('div');
      panel.id        = 'ai-advisor-panel';
      panel.className = 'ai-advisor-panel';
      panel.innerHTML = `
        <div class="ai-advisor-header">
          <div class="ai-advisor-title">
            <span class="ai-icon">🤖</span>
            <div>
              <h3>NutriPrint AI Advisor</h3>
              <p>Powered by Gemini AI • ಕರ್ನಾಟಕ ಪೌಷ್ಟಿಕಾಂಶ ಸಲಹೆಗಾರ</p>
            </div>
          </div>
          <button class="ai-advisor-close"
            onclick="document.getElementById('ai-advisor-panel').style.display='none'">✕</button>
        </div>
        <div class="ai-advisor-body">
          <div class="ai-advisor-context" id="ai-context-box"></div>
          <div class="ai-chat-area">
            <div class="ai-thinking" id="ai-thinking" style="display:none;">
              <div class="thinking-dots"><span></span><span></span><span></span></div>
              <p>AI is thinking...</p>
            </div>
            <div id="ai-reply-box"></div>
          </div>
          <div class="ai-quick-questions">
            <p class="quick-q-label">Quick Questions:</p>
            <div class="quick-q-chips" id="quick-q-chips"></div>
          </div>
          <div class="ai-input-row">
            <input type="text" id="ai-question-input" class="ai-input"
              placeholder="Ask about nutrition... (ಪ್ರಶ್ನೆ ಕೇಳಿ)">
            <button class="ai-send-btn" onclick="app.askAI()">Ask AI ⚡</button>
          </div>
        </div>
      `;
      const bmiSection = document.getElementById('bmi-section');
      if (bmiSection) bmiSection.appendChild(panel);
    }

    panel.style.display = 'block';
    panel.dataset.name      = name;
    panel.dataset.age       = age;
    panel.dataset.gender    = gender;
    panel.dataset.bmiStatus = bmiStatus;
    panel.dataset.bmiValue  = bmiValue;
    panel.dataset.preference = preference;
    panel.dataset.region    = region;

    const statusColor = bmiStatus === 'Normal' ? '#10B981'
      : bmiStatus === 'Underweight'             ? '#F59E0B'
      : '#EF4444';

    document.getElementById('ai-context-box').innerHTML = `
      <strong>${name || 'Student'}</strong> • Age: ${age} • ${gender} •
      BMI: <span style="color:${statusColor}">${bmiStatus} (${bmiValue})</span>
    `;

    const quickQs = bmiStatus === 'Underweight'
      ? ['What foods help gain weight?', 'Best protein foods for kids?', 'How much should child eat daily?']
      : bmiStatus === 'Normal'
      ? ['What maintains healthy weight?', 'Best Karnataka foods for kids?', 'How much water daily?']
      : ['What foods to avoid?', 'Best low-calorie meals?', 'How to reduce junk food?'];

    const chipsEl = document.getElementById('quick-q-chips');
    chipsEl.innerHTML = '';
    quickQs.forEach(q => {
      const chip = document.createElement('button');
      chip.className  = 'quick-q-chip';
      chip.textContent = q;
      chip.onclick    = () => {
        document.getElementById('ai-question-input').value = q;
        app.askAI();
      };
      chipsEl.appendChild(chip);
    });

    setTimeout(() => this.askAI(''), 300);
  },

  async askAI(customQuestion) {
    const panel = document.getElementById('ai-advisor-panel');
    if (!panel) return;

    const question = customQuestion !== undefined
      ? customQuestion
      : (document.getElementById('ai-question-input')?.value?.trim() || '');

    const thinkingEl = document.getElementById('ai-thinking');
    const replyBox   = document.getElementById('ai-reply-box');

    if (thinkingEl) thinkingEl.style.display = 'flex';
    if (replyBox)   replyBox.innerHTML = '';

    try {
      const resp = await fetch('/api/ai-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_name: panel.dataset.name,
          age:          panel.dataset.age,
          gender:       panel.dataset.gender,
          bmi_status:   panel.dataset.bmiStatus,
          bmi_value:    panel.dataset.bmiValue,
          preference:   panel.dataset.preference,
          region:       panel.dataset.region,
          question,
        }),
      });

      const data = await resp.json();
      if (thinkingEl) thinkingEl.style.display = 'none';

      if (replyBox) {
        replyBox.innerHTML = `
          <div class="ai-reply-card">
            <div class="ai-reply-icon">🤖</div>
            <div class="ai-reply-text">
              ${(data.reply || '').replace(/\n/g, '<br>')}
            </div>
          </div>
        `;
      }

      const input = document.getElementById('ai-question-input');
      if (input) input.value = '';

    } catch (err) {
      if (thinkingEl) thinkingEl.style.display = 'none';
      if (replyBox) {
        replyBox.innerHTML = `
          <div class="ai-reply-card">
            <div class="ai-reply-text">AI Advisor is temporarily unavailable.</div>
          </div>
        `;
      }
    }
  },

  // ════════════════════════════════════════════════════════
  // UTILITY: Toast notifications
  // ════════════════════════════════════════════════════════
  showToast(message) {
    let toast = document.getElementById('nutriprint-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'nutriprint-toast';
      toast.className = 'nutriprint-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
  },
};

// ============================================================
// CSS — All new styles injected
// ============================================================
(function injectStyles() {
  const css = `
    /* ── Poster cells ────────────────────────────────────── */
    .food-emoji { font-size: 20px; margin-bottom: 2px; }
    .food-name-en { font-size: 9px; font-weight: 700; color: #1A1A2E; line-height: 1.2; }
    .food-name-kn { font-size: 7.5px; color: #64748B; line-height: 1.2; margin-bottom: 2px; }
    .food-nutrition-row { display: flex; flex-wrap: wrap; gap: 2px; margin-top: 3px; font-size: 7px; font-weight: 600; }
    .food-nutrition-row span { background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 3px; padding: 1px 3px; color: #166534; }
    .food-cost-tag { margin-top: 3px; font-size: 8px; font-weight: 700; color: #B45309; background: #FEF3C7; border-radius: 3px; padding: 1px 4px; display: inline-block; }
    .meal-slot-label { background: linear-gradient(135deg,#1D9E75,#15796A) !important; color: white !important; text-align: center; }
    .meal-slot-label .slot-en { font-size: 9px; font-weight: 700; color: white; }
    .meal-slot-label .kn-day { font-size: 8px; color: rgba(255,255,255,0.85); }
    .summary-label-cell { background: #1A1A2E !important; color: white !important; }
    .summary-label-cell .slot-en { color: white; font-size: 9px; font-weight: 700; }
    .summary-label-cell .kn-day { color: rgba(255,255,255,0.8); font-size: 8px; }
    .summary-data-cell { background: #F8FAFC !important; }
    .summary-row { font-size: 8px; color: #475569; }
    .summary-row strong { color: #1D9E75; }
    .summary-cost { font-size: 9px; font-weight: 700; color: #B45309; margin-top: 2px; }
    .no-meal { color: #CBD5E1; font-size: 16px; }

    /* ── QR Box ──────────────────────────────────────────── */
    .qr-box { text-align: center; padding: 12px; background: white; border-radius: 8px; border: 1px solid #E2E8F0; }
    .qr-label { font-size: 10px; color: #64748B; margin-top: 6px; }
    .qr-code-text { font-size: 11px; font-weight: 700; color: #1D9E75; margin-top: 4px; letter-spacing: 2px; }

    /* ── Auth Modal ──────────────────────────────────────── */
    .auth-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 9999; }
    .auth-modal-box { background: white; border-radius: 20px; padding: 32px; width: 90%; max-width: 400px; position: relative; max-height: 90vh; overflow-y: auto; }
    .auth-modal-close { position: absolute; top: 16px; right: 16px; background: #F1F5F9; border: none; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; font-size: 14px; }
    .auth-modal-header { text-align: center; margin-bottom: 24px; }
    .auth-logo { font-size: 40px; margin-bottom: 8px; }
    .auth-modal-header h2 { font-size: 22px; font-weight: 800; color: #1A1A2E; margin: 0; }
    .auth-modal-header p { font-size: 12px; color: #64748B; margin: 4px 0 0; }
    .auth-tabs { display: flex; gap: 4px; background: #F1F5F9; border-radius: 10px; padding: 4px; margin-bottom: 24px; }
    .auth-tab { flex: 1; padding: 8px; border: none; background: transparent; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600; color: #64748B; transition: all 0.2s; }
    .auth-tab.active { background: white; color: #1D9E75; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .auth-field { margin-bottom: 14px; }
    .auth-field label { font-size: 12px; font-weight: 700; color: #475569; display: block; margin-bottom: 6px; }
    .auth-field input, .auth-field select { width: 100%; padding: 10px 14px; border: 1.5px solid #E2E8F0; border-radius: 8px; font-size: 13px; outline: none; box-sizing: border-box; transition: border-color 0.2s; }
    .auth-field input:focus, .auth-field select:focus { border-color: #1D9E75; }
    .auth-error { background: #FEE2E2; color: #DC2626; padding: 10px 14px; border-radius: 8px; font-size: 12px; margin-bottom: 12px; }
    .auth-submit-btn { width: 100%; padding: 12px; background: linear-gradient(135deg,#1D9E75,#15796A); color: white; border: none; border-radius: 10px; font-size: 15px; font-weight: 700; cursor: pointer; margin-bottom: 12px; transition: opacity 0.2s; }
    .auth-submit-btn:hover { opacity: 0.9; }
    .auth-switch { text-align: center; font-size: 12px; color: #64748B; }
    .auth-switch a { color: #1D9E75; font-weight: 600; }

    /* ── Nav auth elements ───────────────────────────────── */
    .nav-teacher-info { display: flex; align-items: center; gap: 8px; }
    .nav-teacher-name { font-size: 13px; font-weight: 600; color: #1D9E75; }
    .nav-logout-btn { background: #FEE2E2; color: #DC2626; border: none; border-radius: 6px; padding: 4px 10px; font-size: 11px; font-weight: 700; cursor: pointer; }
    .nav-login-btn { background: #1D9E75; color: white; border: none; border-radius: 8px; padding: 8px 16px; font-size: 13px; font-weight: 700; cursor: pointer; }

    /* ── Teacher welcome banner ──────────────────────────── */
    .teacher-welcome-banner { background: linear-gradient(135deg,#F0FDF4,#DCFCE7); border: 1px solid #BBF7D0; border-radius: 10px; padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; font-size: 13px; color: #166534; }
    .banner-dash-btn { background: #1D9E75; color: white; border: none; border-radius: 6px; padding: 6px 12px; font-size: 12px; font-weight: 700; cursor: pointer; }

    /* ── Dashboard ───────────────────────────────────────── */
    .dashboard-wrapper { padding: 24px; max-width: 1200px; margin: 0 auto; }
    .dashboard-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .dashboard-header h2 { font-size: 22px; font-weight: 800; color: #1A1A2E; margin: 0; }
    .dashboard-header p { font-size: 13px; color: #64748B; margin: 4px 0 0; }
    .add-student-btn { background: linear-gradient(135deg,#1D9E75,#15796A); color: white; border: none; border-radius: 10px; padding: 10px 20px; font-size: 13px; font-weight: 700; cursor: pointer; }
    .dashboard-stats { display: grid; grid-template-columns: repeat(4,1fr); gap: 16px; margin-bottom: 24px; }
    .stat-card { background: white; border-radius: 12px; padding: 16px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .stat-num { font-size: 32px; font-weight: 800; }
    .stat-label { font-size: 12px; color: #64748B; margin-top: 4px; }
    .total-card .stat-num { color: #1D9E75; }
    .normal-card .stat-num { color: #10B981; }
    .under-card .stat-num { color: #F59E0B; }
    .over-card .stat-num { color: #EF4444; }
    .students-grid { display: grid; grid-template-columns: repeat(auto-fill,minmax(280px,1fr)); gap: 16px; }
    .student-card { background: white; border-radius: 12px; padding: 16px; border: 1px solid #E2E8F0; }
    .student-card-top { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
    .student-avatar { font-size: 32px; }
    .student-info { flex: 1; }
    .student-info h4 { font-size: 14px; font-weight: 700; color: #1A1A2E; margin: 0; }
    .student-info p { font-size: 12px; color: #64748B; margin: 2px 0 0; }
    .student-delete-btn { background: none; border: none; cursor: pointer; font-size: 16px; opacity: 0.5; }
    .student-delete-btn:hover { opacity: 1; }
    .student-bmi-row { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
    .bmi-status-tag { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; }
    .bmi-value-tag { font-size: 11px; color: #64748B; }
    .sparkline-label { font-size: 10px; color: #94A3B8; margin-bottom: 4px; }
    .student-card-actions { display: flex; gap: 8px; margin-top: 12px; }
    .btn-measure, .btn-generate { flex: 1; padding: 8px; border: none; border-radius: 8px; font-size: 11px; font-weight: 700; cursor: pointer; transition: opacity 0.2s; }
    .btn-measure { background: #EFF6FF; color: #3B82F6; }
    .btn-generate { background: #F0FDF4; color: #1D9E75; }
    .btn-measure:hover, .btn-generate:hover { opacity: 0.8; }
    .empty-students { text-align: center; padding: 48px; color: #64748B; }
    @media(max-width:600px) { .dashboard-stats { grid-template-columns: repeat(2,1fr); } }

    /* ── Recipe cards in library ─────────────────────────── */
    .food-card { display: flex; gap: 16px; background: white; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px; transition: box-shadow 0.2s; margin-bottom: 16px; }
    .food-card:hover { box-shadow: 0 4px 16px rgba(29,158,117,0.12); }
    .food-card-emoji { font-size: 40px; flex-shrink: 0; width: 56px; text-align: center; }
    .food-card-body { flex: 1; }
    .food-card-body h4 { font-size: 14px; font-weight: 700; color: #1A1A2E; margin-bottom: 8px; }
    .kn-name { font-size: 12px; font-weight: 400; color: #64748B; }
    .food-card-macros { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
    .macro-pill { background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 6px; padding: 3px 8px; }
    .macro-pill .macro-label { font-size: 9px; font-weight: 700; color: #64748B; display: block; }
    .macro-pill .macro-val { font-size: 12px; font-weight: 700; color: #1D9E75; }
    .cost-pill { background: #FEF3C7; border-color: #FDE68A; }
    .cost-pill .macro-val { color: #B45309; }
    .recipe-section { margin-top: 12px; }
    .recipe-title { font-size: 11px; font-weight: 700; color: #475569; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
    .recipe-ingredients { font-size: 12px; color: #64748B; line-height: 1.5; background: #F8FAFC; border-radius: 6px; padding: 8px; }
    .recipe-steps { display: flex; flex-direction: column; gap: 4px; }
    .recipe-step { display: flex; gap: 8px; font-size: 12px; color: #475569; line-height: 1.5; }
    .step-num { background: #1D9E75; color: white; width: 18px; height: 18px; border-radius: 50%; font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px; }
    .recipe-tip { font-size: 12px; color: #64748B; font-style: italic; line-height: 1.5; }
    .recipe-tip.kn { margin-top: 4px; color: #94A3B8; }
    .food-card-tags { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 10px; }
    .tag { font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 20px; }
    .cat-tag { background: #EFF6FF; color: #3B82F6; }
    .veg-tag { background: #F0FDF4; color: #16A34A; }
    .egg-tag { background: #FFFBEB; color: #D97706; }
    @media(max-width:600px) { .food-card { flex-direction: column; } }

    /* ── AI Advisor ──────────────────────────────────────── */
    .ai-advisor-panel { margin: 24px; border-radius: 16px; border: 2px solid #1D9E75; background: linear-gradient(135deg,#F0FDF9,#ECFDF5); box-shadow: 0 8px 32px rgba(29,158,117,0.15); overflow: hidden; }
    .ai-advisor-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; background: linear-gradient(135deg,#1D9E75,#15796A); }
    .ai-advisor-title { display: flex; align-items: center; gap: 12px; }
    .ai-icon { font-size: 28px; }
    .ai-advisor-title h3 { font-size: 16px; font-weight: 700; color: white; margin: 0; }
    .ai-advisor-title p { font-size: 11px; color: rgba(255,255,255,0.8); margin: 0; }
    .ai-advisor-close { background: rgba(255,255,255,0.2); border: none; color: white; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; font-size: 14px; }
    .ai-advisor-body { padding: 16px 20px; display: flex; flex-direction: column; gap: 12px; }
    .ai-advisor-context { background: white; border-radius: 8px; padding: 10px 14px; font-size: 12px; color: #475569; border: 1px solid #E2E8F0; }
    .ai-thinking { display: flex; align-items: center; gap: 10px; padding: 12px 0; }
    .thinking-dots { display: flex; gap: 4px; }
    .thinking-dots span { width: 8px; height: 8px; border-radius: 50%; background: #1D9E75; animation: bounce 1.2s infinite; }
    .thinking-dots span:nth-child(2) { animation-delay: 0.2s; }
    .thinking-dots span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes bounce { 0%,80%,100%{transform:scale(0)} 40%{transform:scale(1)} }
    .ai-reply-card { display: flex; gap: 12px; background: white; border-radius: 10px; padding: 14px; border: 1px solid #BBF7D0; }
    .ai-reply-icon { font-size: 24px; flex-shrink: 0; }
    .ai-reply-text { font-size: 13px; color: #334155; line-height: 1.6; }
    .quick-q-label { font-size: 11px; font-weight: 700; color: #64748B; margin-bottom: 6px; }
    .quick-q-chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .quick-q-chip { background: white; border: 1.5px solid #1D9E75; color: #1D9E75; border-radius: 20px; padding: 4px 12px; font-size: 11px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
    .quick-q-chip:hover { background: #1D9E75; color: white; }
    .ai-input-row { display: flex; gap: 8px; }
    .ai-input { flex: 1; padding: 10px 14px; border: 1.5px solid #E2E8F0; border-radius: 8px; font-size: 13px; outline: none; transition: border-color 0.2s; }
    .ai-input:focus { border-color: #1D9E75; }
    .ai-send-btn { background: #1D9E75; color: white; border: none; border-radius: 8px; padding: 10px 16px; font-size: 13px; font-weight: 700; cursor: pointer; white-space: nowrap; transition: background 0.2s; }
    .ai-send-btn:hover { background: #15796A; }

    /* ── Toast ───────────────────────────────────────────── */
    .nutriprint-toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%) translateY(100px); background: #1A1A2E; color: white; padding: 12px 24px; border-radius: 30px; font-size: 13px; font-weight: 600; z-index: 9999; transition: transform 0.3s; pointer-events: none; white-space: nowrap; }
    .nutriprint-toast.show { transform: translateX(-50%) translateY(0); }

    /* ── Mobile ──────────────────────────────────────────── */
    @media(max-width:600px) {
      .ai-input-row { flex-direction: column; }
      .quick-q-chips { gap: 4px; }
    }
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
})();

// ── Boot ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => app.init());
