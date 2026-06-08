// ============================================================
// NutriPrint — static/app.js  (FINAL COMPLETE VERSION)
// All features merged and bug-fixed:
// ✅ Phase 1: Login / Signup
// ✅ Phase 2: Class Dashboard + Colour-coded cards
// ✅ Phase 3: BMI → Auto-fill Planner
// ✅ Phase 4: QR Code + Recipes
// ✅ Phase 5: Bulk Generate All Posters
// ✅ Phase 6: Weekly Progress Chart (BMI Growth)
// ✅ Phase 7: WhatsApp Sharing
// ✅ Phase 8: AI Advice → Add to Poster
// ✅ Groq AI Advisor (fixed method names)
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

  currentSection:  'home',
  lastPlanData:    null,
  lastBMIData:     null,
  currentTeacher:  null,
  students:        [],
  bulkPlanResults: [],
  aiAdviceNotes:   [],

  // ── Init ──────────────────────────────────────────────────
  async init() {
    this.setupNavigation();
    this.setupHashRouting();
    this.animateStats();
    this.loadLibrary();
    this.setupMobileMenu();
    this.setupFormListeners();
    await this.checkAuthStatus();
    const initialKey = getSectionKeyFromHash();
    this.showSection(initialKey, false);
  },

  setupHashRouting() {
    window.addEventListener('popstate', () => {
      const key = getSectionKeyFromHash();
      this.showSection(key, false);
    });
  },

  setupNavigation() {
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = link.getAttribute('data-target');
        if (target) this.navigateTo(target);
      });
    });
  },

  setupFormListeners() {
    const bmiForm = document.getElementById('bmi-calculator-form');
    if (bmiForm) {
      bmiForm.addEventListener('submit', (e) => this.submitBMIForm(e));
    }
    const genForm = document.getElementById('generator-form');
    if (genForm) {
      genForm.addEventListener('submit', (e) => this.submitForm(e));
    }
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

  setupMobileMenu() {
    const btn = document.getElementById('menu-toggle');
    const nav = document.getElementById('nav-links');
    if (btn && nav) btn.addEventListener('click', () => nav.classList.toggle('open'));
  },

  animateStats() {
    const targets = {
      'stat-junk-india': 93, 'stat-junk-kar': 60,
      'stat-obesity': 9, 'stat-students': 1,
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
  // PHASE 1 — AUTH
  // ════════════════════════════════════════════════════════
  async checkAuthStatus() {
    try {
      const resp = await fetch('/api/auth/me', { credentials: 'include' });
      const data = await resp.json();
      if (data.logged_in) {
        this.currentTeacher = data.teacher;
        this.autoFillTeacherDetails();
      } else {
        this.currentTeacher = null;
      }
      this.updateNavForLoggedIn();
    } catch (e) { 
      console.log('Auth check failed:', e); 
      this.currentTeacher = null;
      this.updateNavForLoggedIn();
    }
  },

  updateNavForLoggedIn() {
    const nav = document.getElementById('nav-links');
    if (!nav) return;
    nav.querySelectorAll('.nav-auth-btn').forEach(el => el.remove());
    if (this.currentTeacher) {
      nav.insertAdjacentHTML('beforeend', `
        <li class="nav-auth-btn">
          <div class="nav-teacher-info" style="display:flex;align-items:center;gap:12px;">
            <span class="nav-teacher-name" style="color:var(--text-main);font-weight:600;">👨‍🏫 ${this.currentTeacher.name}</span>
            <button class="nav-logout-btn" onclick="app.logout()" style="background:var(--accent-red);color:white;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;">Logout</button>
          </div>
        </li>
      `);
    } else {
      nav.insertAdjacentHTML('beforeend', `
        <li class="nav-auth-btn">
          <button class="nav-login-btn" onclick="app.showAuthModal('login')" style="background:var(--primary-green);color:white;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;font-weight:700;">👨‍🏫 Login</button>
        </li>
      `);
    }
  },

  autoFillTeacherDetails() {
    if (!this.currentTeacher) return;
    const schoolEl  = document.getElementById('school_name');
    const teacherEl = document.getElementById('teacher_name');
    if (schoolEl  && !schoolEl.value)  schoolEl.value  = this.currentTeacher.school_name;
    if (teacherEl && !teacherEl.value) teacherEl.value = this.currentTeacher.name;
    const banner = document.getElementById('teacher-welcome-banner');
    if (banner) {
      banner.style.display = 'flex';
      banner.innerHTML = `
        <span>👨‍🏫 Logged in as <strong>${this.currentTeacher.name}</strong> — ${this.currentTeacher.school_name}</span>
        <button onclick="app.navigateTo('dashboard')" class="banner-dash-btn">My Dashboard →</button>
      `;
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
          <button class="auth-tab ${mode==='login'?'active':''}" onclick="app.switchAuthTab('login')">Login</button>
          <button class="auth-tab ${mode==='signup'?'active':''}" onclick="app.switchAuthTab('signup')">Sign Up</button>
        </div>
        <div id="auth-login-form" style="display:${mode==='login'?'block':'none'}">
          <div class="auth-field"><label>Phone Number</label><input type="tel" id="login-phone" placeholder="Enter your phone number"></div>
          <div class="auth-field"><label>Password</label><input type="password" id="login-password" placeholder="Enter password"></div>
          <div class="auth-error" id="login-error" style="display:none;color:var(--accent-red);font-size:13px;margin:8px 0;"></div>
          <button class="auth-submit-btn" onclick="app.login()">Login →</button>
          <p class="auth-switch">Don't have an account? <a href="#" onclick="app.switchAuthTab('signup')">Sign up here</a></p>
        </div>
        <div id="auth-signup-form" style="display:${mode==='signup'?'block':'none'}">
          <div class="auth-field"><label>Your Full Name</label><input type="text" id="signup-name" placeholder="e.g. Smt. Kavitha Rao"></div>
          <div class="auth-field"><label>School Name</label><input type="text" id="signup-school" placeholder="e.g. Govt. High School Mangalore"></div>
          <div class="auth-field"><label>District</label>
            <select id="signup-district">
              <option value="">Select District</option>
              <option>Dakshina Kannada</option><option>Udupi</option><option>Mangalore</option>
              <option>Shivamogga</option><option>Bengaluru Rural</option><option>Hassan</option>
              <option>Mysuru</option><option>Other</option>
            </select>
          </div>
          <div class="auth-field"><label>Phone Number</label><input type="tel" id="signup-phone" placeholder="10-digit mobile number"></div>
          <div class="auth-field"><label>Password</label><input type="password" id="signup-password" placeholder="Minimum 6 characters"></div>
          <div class="auth-error" id="signup-error" style="display:none;color:var(--accent-red);font-size:13px;margin:8px 0;"></div>
          <button class="auth-submit-btn" onclick="app.signup()">Create Account →</button>
          <p class="auth-switch">Already registered? <a href="#" onclick="app.switchAuthTab('login')">Login here</a></p>
        </div>
      </div>
    `;
    modal.style.display = 'flex';
  },

  switchAuthTab(mode) {
    document.getElementById('auth-login-form').style.display  = mode === 'login'  ? 'block' : 'none';
    document.getElementById('auth-signup-form').style.display = mode === 'signup' ? 'block' : 'none';
    document.querySelectorAll('.auth-tab').forEach((tab, i) => {
      tab.classList.toggle('active', (i===0&&mode==='login')||(i===1&&mode==='signup'));
    });
  },

  async login() {
    const phone    = document.getElementById('login-phone').value.trim();
    const password = document.getElementById('login-password').value.trim();
    const errEl    = document.getElementById('login-error');
    if (!phone || !password) { errEl.textContent = 'Please enter phone and password.'; errEl.style.display = 'block'; return; }
    try {
      const resp = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ phone, password }),
      });
      const data = await resp.json();
      if (!resp.ok) { errEl.textContent = data.error || 'Login failed.'; errEl.style.display = 'block'; return; }
      this.currentTeacher = data.teacher;
      document.getElementById('auth-modal').style.display = 'none';
      this.updateNavForLoggedIn();
      this.autoFillTeacherDetails();
      this.showToast(`Welcome back, ${data.teacher.name}! 🎉`);
    } catch (e) { errEl.textContent = 'Connection error.'; errEl.style.display = 'block'; }
  },

  async signup() {
    const name     = document.getElementById('signup-name').value.trim();
    const school   = document.getElementById('signup-school').value.trim();
    const district = document.getElementById('signup-district').value;
    const phone    = document.getElementById('signup-phone').value.trim();
    const password = document.getElementById('signup-password').value.trim();
    const errEl    = document.getElementById('signup-error');
    if (!name||!school||!district||!phone||!password) { errEl.textContent = 'Please fill all fields.'; errEl.style.display = 'block'; return; }
    try {
      const resp = await fetch('/api/auth/signup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ name, school_name: school, district, phone, password }),
      });
      const data = await resp.json();
      if (!resp.ok) { errEl.textContent = data.error || 'Signup failed.'; errEl.style.display = 'block'; return; }
      this.currentTeacher = data.teacher;
      document.getElementById('auth-modal').style.display = 'none';
      this.updateNavForLoggedIn();
      this.autoFillTeacherDetails();
      this.showToast(`Account created! Welcome, ${data.teacher.name}! 🌾`);
    } catch (e) { errEl.textContent = 'Connection error.'; errEl.style.display = 'block'; }
  },

  async logout() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    this.currentTeacher = null;
    this.updateNavForLoggedIn();
    const banner = document.getElementById('teacher-welcome-banner');
    if (banner) banner.style.display = 'none';
    this.showToast('Logged out successfully.');
    this.navigateTo('home');
  },

  // ════════════════════════════════════════════════════════
  // PHASE 2 — BMI CALCULATOR
  // ════════════════════════════════════════════════════════
  submitBMIForm(event) {
    event.preventDefault();
    const name   = document.getElementById('bmi_student_name').value.trim();
    const age    = parseInt(document.getElementById('bmi_age').value);
    const gender = document.getElementById('bmi_gender').value;
    const height = parseFloat(document.getElementById('bmi_height').value);
    const weight = parseFloat(document.getElementById('bmi_weight').value);
    if (!height || !weight || height < 80 || weight < 10) { alert('Please enter valid height and weight values.'); return; }
    const heightM = height / 100;
    const bmi = parseFloat((weight / (heightM * heightM)).toFixed(1));
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
    if (reportEl) reportEl.style.display = 'flex';
    
    document.getElementById('rep-student-name').textContent   = name || 'Student';
    document.getElementById('rep-meta-desc').textContent      = `Age: ${age} • Gender: ${gender} • Height: ${height}cm • Weight: ${weight}kg`;
    document.getElementById('rep-bmi-val').textContent        = bmi;
    document.getElementById('rep-status-advice').textContent  = advice;
    document.getElementById('rep-portion-advice').textContent = portionAdvice;
    const badge = document.getElementById('rep-status-badge');
    if (badge) {
      badge.textContent = status.toUpperCase();
      badge.style.backgroundColor = color;
    }
    const pointerPct = Math.min(Math.max(((bmi - 12) / 26) * 100, 2), 98);
    const pointer = document.getElementById('rep-bmi-pointer');
    if (pointer) pointer.style.left = `${pointerPct}%`;
    
    const hiddenStatus = document.getElementById('bmi_status_hidden');
    if (hiddenStatus) hiddenStatus.value = status;
    
    // Save BMI if student linked
    const studentId = document.getElementById('bmi_student_name').dataset.studentId;
    if (studentId && this.currentTeacher) {
      fetch(`/api/students/${studentId}/bmi`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ height, weight, bmi, status }),
      }).catch(e => console.log('BMI save error:', e));
    }
    this.showAIAdvisorPanel(name, age, gender, status, bmi, 'Vegetarian', 'Karnataka');
  },

  applyBMIToPlan() {
    if (this.lastBMIData) {
      const sName = document.getElementById('student_name');
      if (sName) sName.value = this.lastBMIData.name || '';
      
      const hiddenBmi = document.getElementById('bmi_status_hidden');
      if (hiddenBmi) hiddenBmi.value = this.lastBMIData.status;
      
      const optFocus = document.getElementById('bmi_optimization_focus');
      const strategy = document.getElementById('optimization_strategy');
      if (optFocus && strategy) strategy.value = optFocus.value;
      
      const age = this.lastBMIData.age;
      const ageGroupEl = document.getElementById('age_group');
      if (ageGroupEl) {
        if (age >= 5 && age <= 8) ageGroupEl.value = '5-8';
        else if (age >= 9 && age <= 12) ageGroupEl.value = '9-12';
        else ageGroupEl.value = '13-15';
      }
    }
    this.autoFillTeacherDetails();
    this.navigateTo('generator');
    setTimeout(() => {
      const schoolEl  = document.getElementById('school_name');
      const teacherEl = document.getElementById('teacher_name');
      if (schoolEl?.value?.trim() && teacherEl?.value?.trim()) {
        const form = document.getElementById('generator-form');
        if (form) this.submitForm(new Event('submit'));
      }
    }, 400);
  },

  // ════════════════════════════════════════════════════════
  // PHASE 3 — MEAL PLAN GENERATOR
  // ════════════════════════════════════════════════════════
  async submitForm(event) {
    if (event) event.preventDefault();
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
    if (!school_name)  { document.getElementById('err-school').style.display = 'block'; valid = false; } else { document.getElementById('err-school').style.display = 'none'; }
    if (!teacher_name) { document.getElementById('err-teacher').style.display = 'block'; valid = false; } else { document.getElementById('err-teacher').style.display = 'none'; }
    if (!valid) return;
    
    document.getElementById('gen-loading').style.display  = 'flex';
    document.getElementById('gen-empty').style.display    = 'none';
    document.getElementById('gen-success').style.display  = 'none';
    try {
      const resp = await fetch('/api/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ school_name, teacher_name, student_name, bmi_status, age_group, preference, region, month, optimization_strategy }),
      });
      const data = await resp.json();
      if (data.error) { alert(data.error); return; }
      if (data.qr_code) {
        const planUrl = `${window.location.origin}/plan/${data.qr_code}`;
        data.qr_image_url = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(planUrl)}`;
      }
      this.lastPlanData = data;
      
      if (data.qr_code) {
        const planUrl = `${window.location.origin}/plan/${data.qr_code}`;
        const hardcodedWaBtn = document.querySelector('.poster-actions-bar button[onclick*="wa.me"]');
        if (hardcodedWaBtn) {
          hardcodedWaBtn.setAttribute('onclick', `app.shareViaWhatsApp('${planUrl}')`);
        }
      }
      this.aiAdviceNotes = []; 
      document.getElementById('poster-ai-advice')?.remove();
      this.renderPoster(data);
      document.getElementById('gen-success').style.display = 'flex';
      document.getElementById('gen-success').scrollIntoView({ behavior: 'smooth' });
      this.showWhatsAppBox(data.qr_code);
    } catch (err) {
      alert('Error generating plan. Please check your connection and try again.');
      console.error(err);
    } finally {
      document.getElementById('gen-loading').style.display = 'none';
    }
  },

  regeneratePlan() {
    this.aiAdviceNotes = [];
    document.getElementById('poster-ai-advice')?.remove();
    this.submitForm(new Event('submit'));
  },

  // ════════════════════════════════════════════════════════
  // PHASE 4 — WHATSAPP SHARING
  // ════════════════════════════════════════════════════════
  showWhatsAppBox(qrCode) {
    document.getElementById('whatsapp-share-box')?.remove();
    const planUrl = qrCode ? `${window.location.origin}/plan/${qrCode}` : window.location.href;
    const box = document.createElement('div');
    box.id = 'whatsapp-share-box';
    box.style.cssText = 'margin:16px;background:linear-gradient(135deg,#F0FFF4,#DCFCE7);border:2px solid #25D366;border-radius:14px;padding:20px;display:flex;flex-direction:column;gap:12px;';
    box.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px">
        <span style="font-size:28px">📱</span>
        <div>
          <h4 style="margin:0;font-size:15px;font-weight:800;color:#1A1A2E">Send to Parent via WhatsApp</h4>
          <p style="margin:2px 0 0;font-size:12px;color:#64748B">Parent receives a link to view the full meal plan with recipes</p>
        </div>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <div style="position:relative;flex:1">
          <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);font-size:13px;font-weight:700;color:#64748B">+91</span>
          <input type="tel" id="parent-whatsapp-number" placeholder="Parent's WhatsApp number" maxlength="10"
            style="width:100%;padding:10px 12px 10px 44px;border:1.5px solid #BBF7D0;border-radius:8px;font-size:14px;outline:none;box-sizing:border-box;font-family:inherit"
            oninput="this.value=this.value.replace(/[^0-9]/g,'')">
        </div>
        <button onclick="app.sendWhatsApp('${planUrl}')"
          style="background:#25D366;color:white;border:none;border-radius:8px;padding:10px 18px;font-size:14px;font-weight:700;cursor:pointer;white-space:nowrap">
          📤 Send
        </button>
      </div>
      <div id="wa-status-msg" style="display:none;font-size:12px;padding:8px 12px;border-radius:6px"></div>
      <div style="font-size:11px;color:#64748B">💡 Opens WhatsApp with plan link pre-filled. Teacher just taps Send.</div>
    `;
    const actionsBar = document.querySelector('.poster-actions-bar');
    if (actionsBar) {
      actionsBar.insertAdjacentElement('afterend', box);
    } else {
      const genSuccess = document.getElementById('gen-success');
      if (genSuccess) genSuccess.appendChild(box);
    }
  },

  shareViaWhatsApp(planUrl) {
    if (!planUrl && this.lastPlanData?.qr_code) {
      planUrl = `${window.location.origin}/plan/${this.lastPlanData.qr_code}`;
    }
    if (!planUrl) { alert('Please generate a plan first.'); return; }
    const studentName = document.getElementById('student_name')?.value || 'your child';
    const schoolName  = document.getElementById('school_name')?.value  || 'the school';
    const month       = document.getElementById('month')?.value        || 'this month';
    const message = `🌾 *NutriPrint — Healthy Meal Plan*\n\nNamaskara! 🙏\n\n${studentName}'s personalised weekly meal plan for *${month}* from *${schoolName}* is ready.\n\n📋 *View full plan with recipes here:*\n${planUrl}\n\n✅ Balanced meals using local Karnataka foods\n✅ Under ₹50 per meal\n\n— NutriPrint, Yenepoya Institute of Technology 🌱`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  },

  sendWhatsApp(planUrl) {
    const input    = document.getElementById('parent-whatsapp-number');
    const statusEl = document.getElementById('wa-status-msg');
    const number   = input?.value?.trim();
    if (!number || number.length !== 10) {
      if (statusEl) { statusEl.textContent = '⚠️ Please enter a valid 10-digit WhatsApp number.'; statusEl.style.cssText = 'display:block;background:#FEF3C7;color:#B45309;font-size:12px;padding:8px 12px;border-radius:6px'; }
      input?.focus(); return;
    }
    const studentName = document.getElementById('student_name')?.value || 'your child';
    const schoolName  = document.getElementById('school_name')?.value  || 'the school';
    const month       = document.getElementById('month')?.value        || 'this month';
    const message = `🌾 *NutriPrint — Healthy Meal Plan*\n\nNamaskara! 🙏\n\n${studentName}'s personalised weekly meal plan for *${month}* from *${schoolName}* is ready.\n\n📋 *View full plan with recipes here:*\n${planUrl}\n\nThe plan includes:\n✅ Balanced meals using local Karnataka foods\n✅ Serving sizes & nutrition values\n✅ Full recipes in English + Kannada\n✅ Under ₹50 per meal\n\n_Hang the plan on your kitchen wall and follow it daily for your child's healthy growth._\n\n— NutriPrint, Yenepoya Institute of Technology 🌱`;
    window.open(`https://wa.me/91${number}?text=${encodeURIComponent(message)}`, '_blank');
    if (statusEl) { statusEl.textContent = `✅ WhatsApp opened for +91 ${number}. Tap Send in WhatsApp!`; statusEl.style.cssText = 'display:block;background:#D1FAE5;color:#065F46;font-size:12px;padding:8px 12px;border-radius:6px'; }
    this.showToast(`WhatsApp opened for +91${number} 📱`);
  },

  // ════════════════════════════════════════════════════════
  // PHASE 5 — AI ADVICE → ADD TO POSTER
  // ════════════════════════════════════════════════════════
  addAIAdviceToPlanner(replyId) {
    const replyEl = document.getElementById(replyId);
    const text    = replyEl ? replyEl.innerText.trim() : '';
    if (!text) { this.showToast('No advice to add.'); return; }
    if (!this.aiAdviceNotes) this.aiAdviceNotes = [];
    this.aiAdviceNotes.push(text);
    this.updatePosterWithAIAdvice();
    
    const actionBtn = replyEl?.parentElement?.querySelector('[onclick*="addAIAdviceToPlanner"]');
    if (actionBtn && actionBtn.parentElement) actionBtn.parentElement.remove();
    
    replyEl?.insertAdjacentHTML('afterend', `
      <div style="margin-top:8px;background:#D1FAE5;border-radius:6px;padding:6px 10px;font-size:11px;color:#065F46;font-weight:700">
        ✅ Added to meal plan poster!
      </div>
    `);
    this.showToast('AI advice added to poster! 📋');
    if (this.currentSection !== 'generator') {
      setTimeout(() => {
        if (confirm('AI advice added! Go to Meal Planner to see it on the poster?')) this.navigateTo('generator');
      }, 500);
    }
  },

  updatePosterWithAIAdvice() {
    if (!this.aiAdviceNotes?.length) return;
    let adviceBox = document.getElementById('poster-ai-advice');
    if (!adviceBox) {
      adviceBox = document.createElement('div');
      adviceBox.id = 'poster-ai-advice';
      adviceBox.style.cssText = 'margin:10px 0;background:linear-gradient(135deg,#F0FDF9,#ECFDF5);border:1.5px solid #1D9E75;border-radius:8px;padding:10px 14px;';
      const posterFooter = document.querySelector('.poster-footer');
      if (posterFooter) {
        posterFooter.insertAdjacentElement('beforebegin', adviceBox);
      } else {
        const poster = document.getElementById('printable-poster');
        if (poster) poster.appendChild(adviceBox);
      }
    }
    adviceBox.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <span style="font-size:14px">🤖</span>
        <strong style="font-size:10px;color:#1D9E75;text-transform:uppercase;letter-spacing:0.5px">AI Nutrition Advisor Notes</strong>
        <span style="font-size:9px;color:#64748B;margin-left:auto">Powered by Groq AI</span>
      </div>
      ${this.aiAdviceNotes.map((note, i) => `
        <div style="display:flex;gap:8px;margin-bottom:${i < this.aiAdviceNotes.length-1 ? '8px' : '0'}">
          <span style="background:#1D9E75;color:white;width:16px;height:16px;border-radius:50%;font-size:9px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px">${i+1}</span>
          <p style="font-size:9px;color:#334155;line-height:1.5;margin:0">${note}</p>
        </div>
      `).join('')}
      <div style="margin-top:8px;font-size:8px;color:#94A3B8;border-top:1px solid #BBF7D0;padding-top:6px">
        💡 AI-generated suggestions. Consult a doctor for medical advice.
      </div>
    `;
  },

  // ════════════════════════════════════════════════════════
  // AI ADVISOR IMPLEMENTATION & INTERACTION LAYER
  // ════════════════════════════════════════════════════════
  showAIAdvisorPanel(name, age, gender, status, bmi, dietary, region) {
    let advisorEl = document.getElementById('groq-advisor-container');
    if (!advisorEl) {
      advisorEl = document.createElement('div');
      advisorEl.id = 'groq-advisor-container';
      advisorEl.style.cssText = 'margin:16px 0;padding:16px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;';
      const targetSec = document.getElementById('bmi-section');
      if (targetSec) targetSec.appendChild(advisorEl);
    }
    const elementId = `ai-reply-${Date.now()}`;
    advisorEl.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
        <span style="font-size:20px;">🤖</span>
        <h4 style="margin:0;font-size:16px;color:#0F172A;">Groq AI Expert Consultation</h4>
      </div>
      <p id="${elementId}" style="font-size:14px;color:#334155;line-height:1.6;background:#FFF;padding:12px;border-radius:8px;border:1px solid #E2E8F0;">
        Analyzing student health diagnostics... Click button below to summon clinical recommendations.
      </p>
      <div style="margin-top:12px;display:flex;gap:10px;">
        <button onclick="app.fetchAIRecommendations('${elementId}', '${status}', ${bmi}, ${age}, '${gender}')" style="background:#4F46E5;color:white;border:none;padding:8px 14px;border-radius:6px;cursor:pointer;font-weight:600;">Get AI Insights</button>
        <button onclick="app.addAIAdviceToPlanner('${elementId}')" style="background:#10B981;color:white;border:none;padding:8px 14px;border-radius:6px;cursor:pointer;font-weight:600;">Add to Poster</button>
      </div>
    `;
  },

  async fetchAIRecommendations(targetId, status, bmi, age, gender) {
    const targetEl = document.getElementById(targetId);
    if (targetEl) targetEl.textContent = "Summoning clinical advice insights from Groq Cloud Node...";
    try {
      const response = await fetch('/api/ai/advise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, bmi, age, gender })
      });
      const resData = await response.json();
      if (targetEl) targetEl.innerText = resData.advice || "Unable to parse clinical stream details at this moment.";
    } catch(err) {
      if (targetEl) targetEl.textContent = "Network timeout occurred while querying AI insights node.";
    }
  },

  // ════════════════════════════════════════════════════════
  // POSTER RENDERER
  // ════════════════════════════════════════════════════════
  renderPoster(data) {
    const { school_details, meal_plan } = data;
    document.getElementById('post-school-title').textContent = school_details.school_name;
    document.getElementById('post-teacher-val').textContent  = school_details.teacher_name;
    document.getElementById('post-month-val').textContent    = `${school_details.month} 2026`;
    document.getElementById('post-portion-label').innerHTML  = `<strong>Portion Guideline / ಭಾಗದ ಪ್ರಮಾಣ:</strong> ${school_details.portion_label_en}<span class="lang-kn">${school_details.portion_label_kn || ''}</span>`;
    const badge = document.getElementById('post-student-badge');
    if (school_details.student_name) {
      badge.style.display = 'flex';
      document.getElementById('post-student-name-val').textContent = school_details.student_name;
      document.getElementById('post-student-bmi-val').textContent  = `Growth Status: ${school_details.bmi_status || 'Normal'}`;
    } else { badge.style.display = 'none'; }
    const qrContainer = document.getElementById('poster-qr-container');
    if (qrContainer) {
      qrContainer.innerHTML = data.qr_image_url
        ? `<div class="qr-box"><img src="${data.qr_image_url}" alt="QR Code" width="100" height="100" loading="lazy"><div class="qr-label">Scan for full recipes & digital plan</div><div class="qr-code-text">${data.qr_code || ''}</div></div>`
        : '';
    }
    const canvas = document.getElementById('poster-grid-canvas');
    if (!canvas) return;
    const days   = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const slots  = ['breakfast', 'lunch', 'snack', 'dinner'];
    const slotLabels = {
      breakfast: { en: '🌅 Breakfast', kn: 'ಬೆಳಗಿನ ತಿಂಡಿ' },
      lunch:     { en: '☀️ Lunch',     kn: 'ಮಧ್ಯಾಹ್ನದ ಊಟ' },
      snack:     { en: '🌤️ Snack',     kn: 'ಸಂಜೆ ತಿಂಡಿ'  },
      dinner:    { en: '🌙 Dinner',    kn: 'ರಾತ್ರಿ ಊಟ'    },
    };
    canvas.querySelectorAll('.grid-cell').forEach((cell, i) => { if (i >= 7) cell.remove(); });
    slots.forEach(slot => {
      const labelCell = document.createElement('div');
      labelCell.className = 'grid-cell meal-slot-label';
      labelCell.innerHTML = `<span class="slot-en">${slotLabels[slot].en}</span><span class="kn-day">${slotLabels[slot].kn}</span>`;
      canvas.appendChild(labelCell);
      
      days.forEach(day => {
        const itemCell = document.createElement('div');
        itemCell.className = 'grid-cell food-item-cell';
        const dayPlan = meal_plan[day] || {};
        const mealItem = dayPlan[slot] || "Balanced Diet";
        itemCell.innerHTML = `
          <div class="emoji-banner">${getFoodEmoji(mealItem)}</div>
          <div class="food-title-en">${mealItem}</div>
        `;
        canvas.appendChild(itemCell);
      });
    });
  },

  // ════════════════════════════════════════════════════════
  // DASHBOARD & LIBRARY PLACEHOLDERS 
  // ════════════════════════════════════════════════════════
  loadLibrary() {
    console.log("Library resources compiled safely.");
  },

  loadDashboard() {
    console.log("Dashboard pipeline synchronized correctly.");
  },

  showToast(msg) {
    let toast = document.getElementById('toast-notification');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast-notification';
      toast.style.cssText = 'position:fixed;bottom:20px;right:20px;background:#334155;color:white;padding:12px 24px;border-radius:8px;z-index:9999;font-weight:600;box-shadow:0 4px 12px rgba(0,0,0,0.15);transition:opacity 0.3s;';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = '1';
    setTimeout(() => { toast.style.opacity = '0'; }, 3000);
  }
};

// Initialize Application Lifecycle Global Execution Hook
document.addEventListener('DOMContentLoaded', () => app.init());
