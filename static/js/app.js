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
        this.updateNavForLoggedIn();
        this.autoFillTeacherDetails();
      } else {
        this.updateNavForLoggedIn();
      }
    } catch (e) { console.log('Auth check failed:', e); }
  },

  updateNavForLoggedIn() {
    const nav = document.getElementById('nav-links');
    if (!nav) return;
    nav.querySelectorAll('.nav-auth-btn').forEach(el => el.remove());
    if (this.currentTeacher) {
      nav.insertAdjacentHTML('beforeend', `
        <li class="nav-auth-btn">
          <div class="nav-teacher-info">
            <span class="nav-teacher-name">👨‍🏫 ${this.currentTeacher.name}</span>
            <button class="nav-logout-btn" onclick="app.logout()">Logout</button>
          </div>
        </li>
      `);
    } else {
      nav.insertAdjacentHTML('beforeend', `
        <li class="nav-auth-btn">
          <button class="nav-login-btn" onclick="app.showAuthModal('login')">👨‍🏫 Login</button>
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
          <div class="auth-error" id="login-error" style="display:none"></div>
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
          <div class="auth-error" id="signup-error" style="display:none"></div>
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
    reportEl.style.display = 'flex';
    document.getElementById('rep-student-name').textContent   = name || 'Student';
    document.getElementById('rep-meta-desc').textContent      = `Age: ${age} • Gender: ${gender} • Height: ${height}cm • Weight: ${weight}kg`;
    document.getElementById('rep-bmi-val').textContent        = bmi;
    document.getElementById('rep-status-advice').textContent  = advice;
    document.getElementById('rep-portion-advice').textContent = portionAdvice;
    const badge = document.getElementById('rep-status-badge');
    badge.textContent = status.toUpperCase();
    badge.style.backgroundColor = color;
    const pointerPct = Math.min(Math.max(((bmi - 12) / 26) * 100, 2), 98);
    const pointer = document.getElementById('rep-bmi-pointer');
    if (pointer) pointer.style.left = `${pointerPct}%`;
    document.getElementById('bmi_status_hidden').value = status;
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
      document.getElementById('student_name').value = this.lastBMIData.name || '';
      document.getElementById('bmi_status_hidden').value = this.lastBMIData.status;
      const opt = document.getElementById('bmi_optimization_focus');
      const strategy = document.getElementById('optimization_strategy');
      if (opt && strategy) strategy.value = opt.value;
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
        if (form) form.dispatchEvent(new Event('submit', { cancelable: true }));
      }
    }, 400);
  },

  // ════════════════════════════════════════════════════════
  // PHASE 3 — MEAL PLAN GENERATOR
  // ════════════════════════════════════════════════════════
  async submitForm(event) {
    event.preventDefault();
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
      // FIX: Update the hardcoded WhatsApp button to use the real plan URL
      if (data.qr_code) {
      const planUrl = `${window.location.origin}/plan/${data.qr_code}`;
      const hardcodedWaBtn = document.querySelector('.poster-actions-bar button[onclick*="wa.me"]');
      if (hardcodedWaBtn) {
        hardcodedWaBtn.setAttribute('onclick', `app.shareViaWhatsApp('${planUrl}')`);
      }
    }
      this.aiAdviceNotes = []; // Reset AI notes on new plan
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
    const form = document.getElementById('generator-form');
    if (form) form.dispatchEvent(new Event('submit', { cancelable: true }));
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
            oninput="this.value=this.value.replace(/[^0-9]/g,'')"
            onkeydown="if(event.key==='Enter') app.sendWhatsApp('${planUrl}')">
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
    replyEl?.parentElement?.querySelector('[onclick*="addAIAdviceToPlanner"]')?.parentElement?.remove();
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
        const food = meal_plan[day]?.[slot];
        const cell = document.createElement('div');
        cell.className = 'grid-cell meal-data-cell';
        if (food) {
          cell.innerHTML = `
            <div class="food-emoji">${getFoodEmoji(food.name_en)}</div>
            <div class="food-name-en">${food.name_en || '-'}</div>
            <div class="food-name-kn">${food.name_kn || ''}</div>
            <div class="food-nutrition-row">
              <span>📏 ${food.serving_size || '1 portion'}</span>
              <span>P: ${food.scaled_protein ?? food.protein ?? 0}g</span>
              <span>Ca: ${food.scaled_calcium ?? food.calcium ?? 0}mg</span>
              <span>Fe: ${food.scaled_iron ?? food.iron ?? 0}mg</span>
            </div>
            <div class="food-cost-tag">₹${food.scaled_cost ?? food.cost ?? 0}</div>
          `;
        } else { cell.innerHTML = '<span class="no-meal">—</span>'; }
        canvas.appendChild(cell);
      });
    });
    const summaryLabel = document.createElement('div');
    summaryLabel.className = 'grid-cell summary-label-cell';
    summaryLabel.innerHTML = `<span class="slot-en">📊 Daily Total</span><span class="kn-day">ದಿನದ ಒಟ್ಟು</span>`;
    canvas.appendChild(summaryLabel);
    days.forEach(day => {
      const cell = document.createElement('div');
      cell.className = 'grid-cell summary-data-cell';
      const n = meal_plan[day]?.nutrients;
      if (n) cell.innerHTML = `<div class="summary-row">P: <strong>${n.protein}g</strong></div><div class="summary-row">Ca: <strong>${n.calcium}mg</strong></div><div class="summary-row">Fe: <strong>${n.iron}mg</strong></div><div class="summary-cost">₹${n.cost}</div>`;
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
    if (cat) url += `&category=${encodeURIComponent(cat)}`;
    if (vegOnly) url += '&veg_only=true';
    try {
      const foods = await (await fetch(url)).json();
      canvas.innerHTML = '';
      if (!foods.length) { canvas.innerHTML = `<p style="color:#64748B;text-align:center;padding:40px;">No foods found.</p>`; return; }
      foods.forEach(food => {
        const card = document.createElement('div');
        card.className = 'food-card';
        card.innerHTML = `
          <div class="food-card-emoji">${getFoodEmoji(food.name_en)}</div>
          <div class="food-card-body">
            <h4>${food.name_en} <span class="kn-name">${food.name_kn || ''}</span></h4>
            <p class="food-card-desc">${food.recipe_tip_en || ''}</p>
            <div class="food-card-macros">
              <div class="macro-pill"><span class="macro-label">Serving</span><span class="macro-val">${food.serving_size || '1 portion'}</span></div>
              <div class="macro-pill"><span class="macro-label">Protein</span><span class="macro-val">${food.protein}g</span></div>
              <div class="macro-pill"><span class="macro-label">Calcium</span><span class="macro-val">${food.calcium}mg</span></div>
              <div class="macro-pill"><span class="macro-label">Iron</span><span class="macro-val">${food.iron}mg</span></div>
              <div class="macro-pill cost-pill"><span class="macro-label">Cost</span><span class="macro-val">₹${food.cost}</span></div>
            </div>
            <div class="food-card-tags">
              <span class="tag cat-tag">${food.category}</span>
              ${food.is_veg ? '<span class="tag veg-tag">🌿 Veg</span>' : ''}
              ${food.is_egg ? '<span class="tag egg-tag">🥚 Egg</span>' : ''}
            </div>
            ${food.recipe_tip_kn ? `<div style="margin-top:8px;font-size:10px;color:#94A3B8">${food.recipe_tip_kn}</div>` : ''}
          </div>
        `;
        canvas.appendChild(card);
      });
    } catch (err) { canvas.innerHTML = `<p style="color:#EF4444;text-align:center;padding:40px;">Error loading foods. Please refresh.</p>`; }
  },

  filterLibrary() { this.loadLibrary(); },

  // ════════════════════════════════════════════════════════
  // PHASE 6 — CLASS DASHBOARD
  // ════════════════════════════════════════════════════════
  async loadDashboard() {
    if (!this.currentTeacher) { this.showAuthModal('login'); return; }
    const container = document.getElementById('dashboard-section');
    if (!container) return;
    container.innerHTML = `
      <div class="dashboard-wrapper">
        <div class="dashboard-header">
          <div>
            <h2>📊 My Class Dashboard</h2>
            <p>${this.currentTeacher.school_name} • ${this.currentTeacher.district || ''}</p>
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <button class="add-student-btn" onclick="app.showAddStudentModal()">+ Add Student</button>
            <button class="add-student-btn" style="background:#1A1A2E" onclick="app.generateAllPosters()">🍽️ Generate All Plans</button>
          </div>
        </div>
        <div id="dashboard-stats" class="dashboard-stats"></div>
        <div id="students-grid" class="students-grid">
          <div style="text-align:center;padding:40px;color:#64748B;">Loading students...</div>
        </div>
      </div>
    `;
    try {
      const students = await (await fetch('/api/students', { credentials: 'include' })).json();
      this.students = students;
      this.renderStudentsGrid(students);
      this.renderDashboardStats(students);
    } catch (e) { document.getElementById('students-grid').innerHTML = '<p style="color:#EF4444;text-align:center">Error loading students.</p>'; }
  },

  renderDashboardStats(students) {
    const el = document.getElementById('dashboard-stats');
    if (!el) return;
    const total       = students.length;
    const underweight = students.filter(s => s.latest_bmi?.status === 'Underweight').length;
    const normal      = students.filter(s => s.latest_bmi?.status === 'Normal').length;
    const overweight  = students.filter(s => ['Overweight','Obese'].includes(s.latest_bmi?.status)).length;
    el.innerHTML = `
      <div class="stat-card total-card"><div class="stat-num">${total}</div><div class="stat-label">Total Students</div></div>
      <div class="stat-card normal-card"><div class="stat-num">${normal}</div><div class="stat-label">✅ Normal BMI</div></div>
      <div class="stat-card under-card"><div class="stat-num">${underweight}</div><div class="stat-label">⚠️ Underweight</div></div>
      <div class="stat-card over-card"><div class="stat-num">${overweight}</div><div class="stat-label">🔴 Overweight</div></div>
    `;
  },

  renderStudentsGrid(students) {
    const grid = document.getElementById('students-grid');
    if (!grid) return;
    if (!students.length) {
      grid.innerHTML = `<div class="empty-students"><div style="font-size:48px">👩‍🎓</div><p>No students added yet.</p><button class="add-student-btn" onclick="app.showAddStudentModal()">+ Add First Student</button></div>`;
      return;
    }
    grid.innerHTML = students.map(s => {
      const bmi    = s.latest_bmi;
      const status = bmi ? bmi.status : 'Not measured';
      const color  = status === 'Normal' ? '#10B981' : status === 'Underweight' ? '#F59E0B' : status === 'Overweight' || status === 'Obese' ? '#EF4444' : '#94A3B8';
      const history = s.bmi_history || [];
      const sparkline = history.length >= 2 ? this.renderSparkline(history.map(h => h.bmi)) : '';
      return `
        <div class="student-card" style="border-top:3px solid ${color}">
          <div class="student-card-top">
            <div class="student-avatar">${s.gender === 'Girl' ? '👧' : '👦'}</div>
            <div class="student-info"><h4>${s.name}</h4><p>Age: ${s.age} • ${s.gender}</p></div>
            <button class="student-delete-btn" onclick="app.deleteStudent(${s.id}, '${s.name}')">🗑️</button>
          </div>
          <div class="student-bmi-row">
            <span class="bmi-status-tag" style="background:${color}20;color:${color}">${status}</span>
            ${bmi ? `<span class="bmi-value-tag">BMI: ${bmi.bmi}</span>` : ''}
          </div>
          ${sparkline ? `<div class="sparkline-label">BMI Progress (${history.length} records)</div><div class="sparkline-container">${sparkline}</div>` : ''}
          <div class="student-card-actions">
            <button class="btn-measure"  onclick="app.openBMIForStudent(${s.id},'${s.name}',${s.age},'${s.gender}')">📏 Measure BMI</button>
            <button class="btn-generate" onclick="app.generateForStudent(${s.id},'${s.name}','${status}',${s.age})">🍽️ Plan</button>
            <button class="btn-chart"    onclick="app.showProgressChart(${s.id},'${s.name}')">📈 Progress</button>
          </div>
        </div>
      `;
    }).join('');
  },

  renderSparkline(bmiValues) {
    if (bmiValues.length < 2) return '';
    const min = Math.min(...bmiValues) - 1, max = Math.max(...bmiValues) + 1;
    const w = 140, h = 36;
    const pts = bmiValues.map((v, i) => {
      const x = (i / (bmiValues.length - 1)) * (w - 4) + 2;
      const y = h - ((v - min) / (max - min)) * (h - 4) - 2;
      return `${x},${y}`;
    }).join(' ');
    const trend = bmiValues[bmiValues.length-1] < bmiValues[0] ? '#10B981' : bmiValues[bmiValues.length-1] > bmiValues[0] ? '#EF4444' : '#64748B';
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block">
      <polyline points="${pts}" fill="none" stroke="${trend}" stroke-width="2" stroke-linejoin="round"/>
      ${bmiValues.map((v, i) => { const x=(i/(bmiValues.length-1))*(w-4)+2, y=h-((v-min)/(max-min))*(h-4)-2; return `<circle cx="${x}" cy="${y}" r="3" fill="${trend}" stroke="white" stroke-width="1.5"/>`; }).join('')}
    </svg>`;
  },

  // ════════════════════════════════════════════════════════
  // PHASE 7 — WEEKLY PROGRESS CHART
  // ════════════════════════════════════════════════════════
  async showProgressChart(studentId, studentName) {
    let history = [];
    try {
      const students = await (await fetch('/api/students', { credentials: 'include' })).json();
      const student  = students.find(s => s.id === studentId);
      history = student?.bmi_history || [];
    } catch (e) { this.showToast('Error loading BMI history.'); return; }

    const modal = document.createElement('div');
    modal.id = 'progress-modal';
    modal.className = 'auth-modal-overlay';

    if (!history.length) {
      modal.innerHTML = `
        <div class="auth-modal-box" style="max-width:480px">
          <button class="auth-modal-close" onclick="document.getElementById('progress-modal').remove()">✕</button>
          <div style="text-align:center;padding:32px 16px">
            <div style="font-size:48px;margin-bottom:16px">📏</div>
            <h3 style="margin-bottom:8px">${studentName}</h3>
            <p style="color:#64748B">No BMI records yet. Measure this student's BMI first.</p>
            <button class="auth-submit-btn" style="margin-top:20px" onclick="document.getElementById('progress-modal').remove();app.openBMIForStudent(${studentId},'${studentName}',10,'Boy')">
              📏 Measure BMI Now
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      modal.style.display = 'flex';
      return;
    }

    const months   = history.map((h, i) => { const d = new Date(h.recorded_at); return isNaN(d) ? `#${i+1}` : d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }); });
    const bmiVals  = history.map(h => parseFloat(h.bmi));
    const statuses = history.map(h => h.status);
    const minBMI   = Math.max(0, Math.min(...bmiVals) - 2);
    const maxBMI   = Math.max(...bmiVals) + 2;
    const W = 560, H = 260, PAD = { top: 20, right: 20, bottom: 50, left: 44 };
    const chartW = W - PAD.left - PAD.right, chartH = H - PAD.top - PAD.bottom;
    const xScale = i => PAD.left + (i / Math.max(bmiVals.length - 1, 1)) * chartW;
    const yScale = v => PAD.top + chartH - ((v - minBMI) / (maxBMI - minBMI)) * chartH;

    const zones = [
      { min: 27.5,     max: maxBMI+2, color: '#FEE2E2' },
      { min: 23,       max: 27.5,     color: '#FEF3C7' },
      { min: 16.5,     max: 23,       color: '#D1FAE5' },
      { min: minBMI-2, max: 16.5,     color: '#FEF9C3' },
    ];

    const zoneRects = zones.map(z => {
      const y1 = yScale(Math.min(z.max, maxBMI)), y2 = yScale(Math.max(z.min, minBMI));
      const h  = Math.max(0, y2 - y1);
      return h <= 0 ? '' : `<rect x="${PAD.left}" y="${y1}" width="${chartW}" height="${h}" fill="${z.color}" opacity="0.6"/>`;
    }).join('');

    const gridLines = [16.5, 23, 27.5].filter(v => v >= minBMI && v <= maxBMI).map(val => {
      const y = yScale(val);
      return `<line x1="${PAD.left}" y1="${y}" x2="${PAD.left+chartW}" y2="${y}" stroke="#CBD5E1" stroke-width="1" stroke-dasharray="4 3"/>
        <text x="${PAD.left-6}" y="${y+4}" font-size="9" fill="#94A3B8" text-anchor="end">${val}</text>`;
    }).join('');

    const linePts  = bmiVals.map((v, i) => `${i===0?'M':'L'}${xScale(i)},${yScale(v)}`).join(' ');
    const areaPath = bmiVals.length > 1
      ? `M${xScale(0)},${yScale(bmiVals[0])} ${bmiVals.slice(1).map((v,i)=>`L${xScale(i+1)},${yScale(v)}`).join(' ')} L${xScale(bmiVals.length-1)},${PAD.top+chartH} L${PAD.left},${PAD.top+chartH} Z`
      : '';

    const points  = bmiVals.map((v, i) => {
      const x=xScale(i), y=yScale(v), s=statuses[i];
      const c = s==='Normal'?'#10B981':s==='Underweight'?'#F59E0B':'#EF4444';
      return `<circle cx="${x}" cy="${y}" r="5" fill="${c}" stroke="white" stroke-width="2"><title>${months[i]}: BMI ${v} (${s})</title></circle>
        <text x="${x}" y="${y-10}" font-size="9" fill="${c}" text-anchor="middle" font-weight="700">${v}</text>`;
    }).join('');

    const xLabels = months.map((m, i) => {
      const x = xScale(i);
      return `<text x="${x}" y="${PAD.top+chartH+16}" font-size="9" fill="#64748B" text-anchor="middle" transform="rotate(-30 ${x} ${PAD.top+chartH+16})">${m}</text>`;
    }).join('');

    const firstVal = bmiVals[0], lastVal = bmiVals[bmiVals.length-1];
    const diff = (lastVal - firstVal).toFixed(1);
    const trendIcon = diff < 0 ? '📉' : diff > 0 ? '📈' : '➡️';
    const lastStatus = statuses[statuses.length-1];
    const statusColor = lastStatus==='Normal'?'#10B981':lastStatus==='Underweight'?'#F59E0B':'#EF4444';
    const trendMsg = lastStatus==='Normal' ? '✅ Child is in healthy BMI range. Keep maintaining current diet!'
      : lastStatus==='Underweight' ? '⚠️ Child is underweight. Increase protein and calorie-rich foods like Ragi Mudde and pulses.'
      : '🔴 Child is overweight. Reduce junk food and increase fiber-rich foods like Jowar Roti and vegetables.';

    modal.innerHTML = `
      <div class="auth-modal-box" style="max-width:640px;padding:24px">
        <button class="auth-modal-close" onclick="document.getElementById('progress-modal').remove()">✕</button>
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
          <div style="font-size:36px">👦</div>
          <div>
            <h3 style="margin:0;font-size:18px;color:#1A1A2E">${studentName}</h3>
            <p style="margin:4px 0 0;font-size:12px;color:#64748B">${history.length} BMI records • Progress Tracker</p>
          </div>
          <div style="margin-left:auto;text-align:right">
            <div style="font-size:22px;font-weight:800;color:${statusColor}">${lastVal}</div>
            <div style="font-size:11px;font-weight:700;color:${statusColor}">${lastStatus}</div>
          </div>
        </div>
        <div style="background:#F8FAFC;border-radius:12px;padding:16px;margin-bottom:16px;overflow-x:auto">
          <svg width="100%" viewBox="0 0 ${W} ${H}" style="min-width:320px">
            ${zoneRects}${gridLines}
            ${areaPath ? `<path d="${areaPath}" fill="#1D9E75" opacity="0.08"/>` : ''}
            ${bmiVals.length > 1 ? `<path d="${linePts}" fill="none" stroke="#1D9E75" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>` : ''}
            ${points}${xLabels}
            <line x1="${PAD.left}" y1="${PAD.top}" x2="${PAD.left}" y2="${PAD.top+chartH}" stroke="#E2E8F0" stroke-width="1.5"/>
            <line x1="${PAD.left}" y1="${PAD.top+chartH}" x2="${PAD.left+chartW}" y2="${PAD.top+chartH}" stroke="#E2E8F0" stroke-width="1.5"/>
          </svg>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
          <span style="font-size:11px;padding:3px 10px;border-radius:20px;background:#D1FAE5;color:#065F46;font-weight:700">Normal (16.5–23)</span>
          <span style="font-size:11px;padding:3px 10px;border-radius:20px;background:#FEF9C3;color:#854D0E;font-weight:700">Underweight (&lt;16.5)</span>
          <span style="font-size:11px;padding:3px 10px;border-radius:20px;background:#FEF3C7;color:#92400E;font-weight:700">Overweight (23–27.5)</span>
          <span style="font-size:11px;padding:3px 10px;border-radius:20px;background:#FEE2E2;color:#991B1B;font-weight:700">Obese (&gt;27.5)</span>
        </div>
        <div style="background:${statusColor}15;border:1.5px solid ${statusColor}40;border-radius:10px;padding:14px;margin-bottom:16px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
            <span style="font-size:20px">${trendIcon}</span>
            <strong style="font-size:13px;color:#1A1A2E">BMI ${diff > 0 ? '+' : ''}${diff} since first record</strong>
          </div>
          <p style="font-size:12px;color:#475569;margin:0">${trendMsg}</p>
        </div>
        <div style="border:1px solid #E2E8F0;border-radius:10px;overflow:hidden;margin-bottom:16px">
          <div style="background:#1A1A2E;padding:10px 14px;font-size:12px;font-weight:700;color:white">📋 Full BMI History</div>
          <div style="max-height:180px;overflow-y:auto">
            <table style="width:100%;border-collapse:collapse;font-size:12px">
              <thead><tr style="background:#F8FAFC">
                <th style="padding:8px 12px;text-align:left;color:#64748B;font-weight:700;border-bottom:1px solid #E2E8F0">#</th>
                <th style="padding:8px 12px;text-align:left;color:#64748B;font-weight:700;border-bottom:1px solid #E2E8F0">Date</th>
                <th style="padding:8px 12px;text-align:left;color:#64748B;font-weight:700;border-bottom:1px solid #E2E8F0">BMI</th>
                <th style="padding:8px 12px;text-align:left;color:#64748B;font-weight:700;border-bottom:1px solid #E2E8F0">Status</th>
              </tr></thead>
              <tbody>
                ${history.map((h, i) => {
                  const d = new Date(h.recorded_at);
                  const dateStr = isNaN(d) ? `Record ${i+1}` : d.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
                  const sc = h.status==='Normal'?'#10B981':h.status==='Underweight'?'#F59E0B':'#EF4444';
                  return `<tr style="border-bottom:1px solid #F1F5F9">
                    <td style="padding:8px 12px;color:#94A3B8">${i+1}</td>
                    <td style="padding:8px 12px;color:#475569">${dateStr}</td>
                    <td style="padding:8px 12px;font-weight:700;color:#1A1A2E">${h.bmi}</td>
                    <td style="padding:8px 12px"><span style="background:${sc}20;color:${sc};padding:2px 8px;border-radius:20px;font-weight:700;font-size:11px">${h.status}</span></td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
        <div style="display:flex;gap:10px">
          <button class="auth-submit-btn" style="flex:1" onclick="document.getElementById('progress-modal').remove();app.openBMIForStudent(${studentId},'${studentName}',10,'Boy')">📏 Add New Measurement</button>
          <button style="flex:1;background:#F0FDF4;color:#1D9E75;border:1.5px solid #1D9E75;border-radius:10px;padding:12px;font-weight:700;cursor:pointer;font-size:14px"
            onclick="document.getElementById('progress-modal').remove();app.generateForStudent(${studentId},'${studentName}','${lastStatus}',10)">🍽️ Generate Meal Plan</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.style.display = 'flex';
  },

  showAddStudentModal() {
    const modal = document.createElement('div');
    modal.className = 'auth-modal-overlay'; modal.id = 'add-student-modal';
    modal.innerHTML = `
      <div class="auth-modal-box">
        <button class="auth-modal-close" onclick="document.getElementById('add-student-modal').remove()">✕</button>
        <h3 style="margin-bottom:16px">Add New Student</h3>
        <div class="auth-field"><label>Student Name</label><input type="text" id="new-student-name" placeholder="Full name"></div>
        <div class="auth-field"><label>Age</label><input type="number" id="new-student-age" placeholder="Age" min="5" max="15" value="10"></div>
        <div class="auth-field"><label>Gender</label><select id="new-student-gender"><option value="Boy">Boy</option><option value="Girl">Girl</option></select></div>
        <button class="auth-submit-btn" onclick="app.addStudent()">Add Student →</button>
      </div>
    `;
    document.body.appendChild(modal); modal.style.display = 'flex';
  },

  async addStudent() {
    const name   = document.getElementById('new-student-name').value.trim();
    const age    = parseInt(document.getElementById('new-student-age').value);
    const gender = document.getElementById('new-student-gender').value;
    if (!name) { alert('Please enter student name.'); return; }
    try {
      const resp = await fetch('/api/students', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ name, age, gender }),
      });
      if (resp.ok) { document.getElementById('add-student-modal')?.remove(); this.showToast(`${name} added! 🎉`); this.loadDashboard(); }
    } catch (e) { alert('Error adding student.'); }
  },

  async deleteStudent(id, name) {
    if (!confirm(`Remove ${name} from your class?`)) return;
    await fetch(`/api/students/${id}`, { method: 'DELETE', credentials: 'include' });
    this.showToast(`${name} removed.`);
    this.loadDashboard();
  },

  openBMIForStudent(id, name, age, gender) {
    const nameEl = document.getElementById('bmi_student_name');
    if (nameEl) { nameEl.value = name; nameEl.dataset.studentId = id; }
    const ageEl = document.getElementById('bmi_age'); if (ageEl) ageEl.value = age;
    const genderEl = document.getElementById('bmi_gender'); if (genderEl) genderEl.value = gender;
    this.navigateTo('bmi');
  },

  generateForStudent(id, name, bmiStatus, age) {
    const studentNameEl = document.getElementById('student_name');
    const bmiStatusEl   = document.getElementById('bmi_status_hidden');
    const ageGroupEl    = document.getElementById('age_group');
    if (studentNameEl) studentNameEl.value = name;
    if (bmiStatusEl)   bmiStatusEl.value   = bmiStatus;
    if (ageGroupEl) { if (age<=8) ageGroupEl.value='5-8'; else if (age<=12) ageGroupEl.value='9-12'; else ageGroupEl.value='13-15'; }
    this.autoFillTeacherDetails();
    this.navigateTo('generator');
    setTimeout(() => {
      const schoolEl = document.getElementById('school_name'), teacherEl = document.getElementById('teacher_name');
      if (schoolEl?.value && teacherEl?.value) {
        const form = document.getElementById('generator-form');
        if (form) form.dispatchEvent(new Event('submit', { cancelable: true }));
      }
    }, 500);
  },

  // ════════════════════════════════════════════════════════
  // PHASE 8 — BULK GENERATE ALL POSTERS
  // ════════════════════════════════════════════════════════
  async generateAllPosters() {
    if (!this.students?.length) { this.showToast('No students found. Add students first!'); return; }
    const studentsWithBMI = this.students.filter(s => s.latest_bmi);
    if (!studentsWithBMI.length) { this.showToast('No students have BMI recorded yet!'); return; }
    const modal = document.createElement('div');
    modal.id = 'bulk-modal'; modal.className = 'auth-modal-overlay';
    modal.innerHTML = `
      <div class="auth-modal-box" style="max-width:480px">
        <h3 style="margin-bottom:8px">🍽️ Generating All Posters</h3>
        <p style="font-size:13px;color:#64748B;margin-bottom:20px">Creating meal plans for ${studentsWithBMI.length} students...</p>
        <div style="background:#E2E8F0;border-radius:8px;height:10px;overflow:hidden">
          <div id="bulk-progress-bar" style="height:100%;background:#1D9E75;border-radius:8px;transition:width 0.4s;width:0%"></div>
        </div>
        <p id="bulk-progress-text" style="font-size:12px;color:#64748B;margin-top:8px;text-align:center">Starting...</p>
        <div id="bulk-student-list" style="margin-top:16px;max-height:280px;overflow-y:auto;display:flex;flex-direction:column;gap:8px"></div>
        <div id="bulk-done-actions" style="display:none;margin-top:20px;gap:10px;flex-direction:column">
          <button class="auth-submit-btn" onclick="app.printAllPlans()">🖨️ Print All Plans</button>
          <button style="background:#F0FDF4;color:#1D9E75;border:1.5px solid #1D9E75;border-radius:8px;padding:10px;font-weight:700;cursor:pointer" onclick="document.getElementById('bulk-modal').remove()">✓ Done</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal); modal.style.display = 'flex';
    this.bulkPlanResults = [];
    const listEl = document.getElementById('bulk-student-list');
    const barEl  = document.getElementById('bulk-progress-bar');
    const textEl = document.getElementById('bulk-progress-text');
    for (let i = 0; i < studentsWithBMI.length; i++) {
      const student = studentsWithBMI[i], bmi = student.latest_bmi;
      barEl.style.width = `${Math.round((i/studentsWithBMI.length)*100)}%`;
      textEl.textContent = `Generating ${i+1} of ${studentsWithBMI.length}: ${student.name}...`;
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border-radius:8px;border:1px solid #FDE68A;background:#FFFBEB';
      row.innerHTML = `<div style="display:flex;align-items:center;gap:10px"><span style="font-size:20px">${student.gender==='Girl'?'👧':'👦'}</span><strong>${student.name}</strong><span style="font-size:11px;color:#64748B">· ${bmi.status}</span></div><span style="font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;background:#FEF3C7;color:#B45309">⏳ Generating...</span>`;
      listEl.appendChild(row); listEl.scrollTop = listEl.scrollHeight;
      try {
        const ageGroup = student.age<=8?'5-8':student.age<=12?'9-12':'13-15';
        const plan = await (await fetch('/api/generate', {
          method: 'POST', headers: {'Content-Type':'application/json'}, credentials: 'include',
          body: JSON.stringify({ student_name: student.name, bmi_status: bmi.status, bmi_value: bmi.bmi, age_group: ageGroup, preference: 'Vegetarian', region: 'All', month: new Date().toLocaleString('default',{month:'long'}), optimization_strategy: bmi.status==='Underweight'?'high_protein':bmi.status==='Overweight'||bmi.status==='Obese'?'low_calorie':'standard' }),
        })).json();
        if (plan.error) throw new Error(plan.error);
        this.bulkPlanResults.push({ student, bmi, plan });
        const idx = this.bulkPlanResults.length - 1;
        row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border-radius:8px;border:1px solid #BBF7D0;background:#F0FDF4';
        row.innerHTML = `<div style="display:flex;align-items:center;gap:10px"><span style="font-size:20px">${student.gender==='Girl'?'👧':'👦'}</span><strong>${student.name}</strong><span style="font-size:11px;color:#64748B">· ${bmi.status} (BMI: ${bmi.bmi})</span></div><div style="display:flex;gap:6px;align-items:center"><span style="font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;background:#D1FAE5;color:#065F46">✅ Done</span><button style="font-size:11px;font-weight:700;padding:3px 10px;border-radius:6px;background:#1D9E75;color:white;border:none;cursor:pointer" onclick="app.viewBulkPlan(${idx})">View</button></div>`;
      } catch (e) {
        row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border-radius:8px;border:1px solid #FECACA;background:#FEF2F2';
        row.innerHTML = `<div style="display:flex;align-items:center;gap:10px"><span style="font-size:20px">${student.gender==='Girl'?'👧':'👦'}</span><strong>${student.name}</strong></div><span style="font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;background:#FEE2E2;color:#991B1B">❌ Failed</span>`;
      }
      await new Promise(r => setTimeout(r, 400));
    }
    barEl.style.width = '100%'; barEl.style.background = '#10B981';
    textEl.textContent = `✅ All ${studentsWithBMI.length} plans generated!`;
    document.getElementById('bulk-done-actions').style.display = 'flex';
  },

  viewBulkPlan(index) {
    const { student, bmi, plan } = this.bulkPlanResults[index];
    this.lastPlanData = plan;
    document.getElementById('bulk-modal')?.remove();
    const schoolEl  = document.getElementById('school_name');
    const teacherEl = document.getElementById('teacher_name');
    const studentEl = document.getElementById('student_name');
    const bmiEl     = document.getElementById('bmi_status_hidden');
    if (schoolEl  && this.currentTeacher) schoolEl.value  = this.currentTeacher.school_name;
    if (teacherEl && this.currentTeacher) teacherEl.value = this.currentTeacher.name;
    if (studentEl) studentEl.value = student.name;
    if (bmiEl)     bmiEl.value     = bmi.status;
    this.renderPoster(plan);
    this.navigateTo('generator');
    document.getElementById('gen-success').style.display = 'flex';
    document.getElementById('gen-empty').style.display   = 'none';
    setTimeout(() => document.getElementById('gen-success').scrollIntoView({ behavior: 'smooth' }), 300);
  },

  printAllPlans() {
    if (!this.bulkPlanResults?.length) return;
    const printWin = window.open('', '_blank');
    printWin.document.write(`<!DOCTYPE html><html><head><title>NutriPrint — All Class Meal Plans</title><style>body{font-family:sans-serif;margin:0;padding:0}.poster-page{page-break-after:always;padding:24px}.poster-header{background:#1D9E75;color:white;padding:16px 20px;border-radius:8px 8px 0 0;display:flex;justify-content:space-between;align-items:center}.poster-header h2{margin:0;font-size:18px}.student-badge{background:#F0FDF4;border:1.5px solid #1D9E75;border-radius:8px;padding:10px 16px;display:flex;gap:16px;align-items:center;margin:12px 0}table{width:100%;border-collapse:collapse;font-size:11px;margin-top:12px}th{background:#1D9E75;color:white;padding:6px 8px;text-align:left}td{border:1px solid #E2E8F0;padding:6px 8px}tr:nth-child(even) td{background:#F8FAFC}@media print{.poster-page{page-break-after:always}}</style></head><body>`);
    this.bulkPlanResults.forEach(({ student, bmi, plan }) => {
      const bmiColor = bmi.status==='Normal'?'#10B981':bmi.status==='Underweight'?'#F59E0B':'#EF4444';
      const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
      const slots = ['breakfast','lunch','snack','dinner'];
      let tableRows = '';
      slots.forEach(slot => {
        tableRows += `<tr><td><strong>${slot}</strong></td>`;
        days.forEach(day => { tableRows += `<td>${plan.meal_plan?.[day]?.[slot]?.name_en || '—'}</td>`; });
        tableRows += '</tr>';
      });
      printWin.document.write(`<div class="poster-page"><div class="poster-header"><div><h2>NutriPrint Weekly Meal Plan</h2><p>${plan.school_details?.school_name||''} · ${plan.school_details?.month||''} 2026</p></div><div style="text-align:right;font-size:12px">Teacher: ${plan.school_details?.teacher_name||''}</div></div><div class="student-badge"><span style="font-size:24px">${student.gender==='Girl'?'👧':'👦'}</span><div><strong style="font-size:15px">${student.name}</strong><div style="font-size:12px;color:#64748B">Age: ${student.age} · ${student.gender}</div></div><span style="padding:3px 10px;border-radius:20px;font-weight:700;font-size:12px;background:${bmiColor}20;color:${bmiColor}">${bmi.status} · BMI: ${bmi.bmi}</span></div><table><thead><tr><th>Meal</th>${days.map(d=>`<th>${d}</th>`).join('')}</tr></thead><tbody>${tableRows}</tbody></table></div>`);
    });
    printWin.document.write('</body></html>');
    printWin.document.close();
    setTimeout(() => printWin.print(), 500);
  },

  // ════════════════════════════════════════════════════════
  // GROQ AI ADVISOR (bug-fixed method names)
  // ════════════════════════════════════════════════════════
  showAIAdvisorPanel(name, age, gender, bmiStatus, bmiValue, preference, region) {
    let panel = document.getElementById('ai-advisor-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'ai-advisor-panel'; panel.className = 'ai-advisor-panel';
      panel.innerHTML = `
        <div class="ai-advisor-header">
          <div class="ai-advisor-title">
            <span class="ai-icon">🤖</span>
            <div>
              <h3>NutriPrint AI Advisor</h3>
              <p>Powered by Groq AI • ಕರ್ನಾಟಕ ಪೌಷ್ಟಿಕಾಂಶ ಸಲಹೆಗಾರ</p>
            </div>
          </div>
          <button class="ai-advisor-close" onclick="document.getElementById('ai-advisor-panel').style.display='none'">✕</button>
        </div>
        <div class="ai-advisor-body">
          <div class="ai-advisor-context" id="ai-context-box"></div>
          <div class="ai-chat-area" id="ai-chat-area">
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
            <input type="text" id="ai-question-input" class="ai-input" placeholder="Ask about nutrition... (ಪ್ರಶ್ನೆ ಕೇಳಿ)">
            <button class="ai-send-btn" onclick="app.askAI()">Ask AI ⚡</button>
          </div>
        </div>
      `;
      const bmiSection = document.getElementById('bmi-section');
      if (bmiSection) bmiSection.appendChild(panel);
    }
    panel.style.display = 'block';
    panel.dataset.name = name; panel.dataset.age = age; panel.dataset.gender = gender;
    panel.dataset.bmiStatus = bmiStatus; panel.dataset.bmiValue = bmiValue;
    panel.dataset.preference = preference; panel.dataset.region = region;
    const statusColor = bmiStatus==='Normal'?'#10B981':bmiStatus==='Underweight'?'#F59E0B':'#EF4444';
    document.getElementById('ai-context-box').innerHTML = `<strong>${name||'Student'}</strong> • Age: ${age} • ${gender} • BMI: <span style="color:${statusColor}">${bmiStatus} (${bmiValue})</span>`;
    const quickQs = bmiStatus==='Underweight'
      ? ['What foods help gain weight?','Best protein foods for kids?','How much should child eat daily?']
      : bmiStatus==='Normal'
      ? ['What maintains healthy weight?','Best Karnataka foods for kids?','How much water daily?']
      : ['What foods to avoid?','Best low-calorie meals?','How to reduce junk food?'];
    const chipsEl = document.getElementById('quick-q-chips');
    chipsEl.innerHTML = '';
    quickQs.forEach(q => {
      const chip = document.createElement('button');
      chip.className = 'quick-q-chip'; chip.textContent = q;
      chip.onclick = () => { document.getElementById('ai-question-input').value = q; app.askAI(); };
      chipsEl.appendChild(chip);
    });
    setTimeout(() => this.askAI(''), 300); // ✅ FIXED: was this.('') — missing method name
  },

  async askAI(customQuestion) { // ✅ FIXED: was async (customQuestion) — missing method name
    const panel = document.getElementById('ai-advisor-panel');
    if (!panel) return;
    const question   = customQuestion !== undefined ? customQuestion : (document.getElementById('ai-question-input')?.value?.trim() || '');
    const thinkingEl = document.getElementById('ai-thinking');
    const replyBox   = document.getElementById('ai-reply-box');
    if (thinkingEl) thinkingEl.style.display = 'flex';
    if (replyBox)   replyBox.innerHTML = '';
    try {
      const resp = await fetch('/api/ai-advisor', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_name: panel.dataset.name, age: panel.dataset.age, gender: panel.dataset.gender, bmi_status: panel.dataset.bmiStatus, bmi_value: panel.dataset.bmiValue, preference: panel.dataset.preference, region: panel.dataset.region, question }),
      });
      const data = await resp.json();
      if (thinkingEl) thinkingEl.style.display = 'none';
      if (replyBox) {
        const replyId = `ai-reply-${Date.now()}`;
        replyBox.innerHTML = `
          <div class="ai-reply-card">
            <div class="ai-reply-icon">🤖</div>
            <div style="flex:1">
              <div class="ai-reply-text" id="${replyId}">${(data.reply || '').replace(/\n/g, '<br>')}</div>
              <div style="margin-top:12px;padding-top:10px;border-top:1px solid #E2E8F0;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                <span style="font-size:11px;color:#64748B">Add this advice to meal plan poster?</span>
                <button onclick="app.addAIAdviceToPlanner('${replyId}')" style="background:#1D9E75;color:white;border:none;border-radius:6px;padding:5px 12px;font-size:11px;font-weight:700;cursor:pointer">✅ Yes, Add to Poster</button>
                <button onclick="this.parentElement.remove()" style="background:#F1F5F9;color:#64748B;border:none;border-radius:6px;padding:5px 12px;font-size:11px;font-weight:700;cursor:pointer">✕ No</button>
              </div>
            </div>
          </div>
        `;
      }
      const input = document.getElementById('ai-question-input'); if (input) input.value = '';
    } catch (err) {
      if (thinkingEl) thinkingEl.style.display = 'none';
      if (replyBox) replyBox.innerHTML = `<div class="ai-reply-card"><div class="ai-reply-text">AI Advisor is temporarily unavailable. Please try again.</div></div>`;
    }
  },

  // ── Toast ─────────────────────────────────────────────────
  showToast(message) {
    let toast = document.getElementById('nutriprint-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'nutriprint-toast';
      toast.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1A1A2E;color:white;padding:12px 24px;border-radius:8px;font-size:13px;font-weight:600;z-index:9999;box-shadow:0 4px 16px rgba(0,0,0,0.2);transition:opacity 0.3s;opacity:0;';
      document.body.appendChild(toast);
    }
    toast.textContent = message; toast.style.opacity = '1';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => { toast.style.opacity = '0'; }, 3000);
  },
};

// ════════════════════════════════════════════════════════
// STYLES
// ════════════════════════════════════════════════════════
(function injectStyles() {
  const css = `
    .food-emoji{font-size:20px;margin-bottom:2px}
    .food-name-en{font-size:9px;font-weight:700;color:#1A1A2E;line-height:1.2}
    .food-name-kn{font-size:7.5px;color:#64748B;line-height:1.2;margin-bottom:2px}
    .food-nutrition-row{display:flex;flex-wrap:wrap;gap:2px;margin-top:3px;font-size:7px;font-weight:600}
    .food-nutrition-row span{background:#F0FDF4;border:1px solid #BBF7D0;border-radius:3px;padding:1px 3px;color:#166534}
    .food-cost-tag{margin-top:3px;font-size:8px;font-weight:700;color:#B45309;background:#FEF3C7;border-radius:3px;padding:1px 4px;display:inline-block}
    .meal-slot-label{background:linear-gradient(135deg,#1D9E75,#15796A)!important;color:white!important;text-align:center}
    .meal-slot-label .slot-en{font-size:9px;font-weight:700;color:white}
    .meal-slot-label .kn-day{font-size:8px;color:rgba(255,255,255,0.85)}
    .summary-label-cell{background:#1A1A2E!important;color:white!important}
    .summary-label-cell .slot-en{color:white;font-size:9px;font-weight:700}
    .summary-label-cell .kn-day{color:rgba(255,255,255,0.8);font-size:8px}
    .summary-data-cell{background:#F8FAFC!important}
    .summary-row{font-size:8px;color:#475569}
    .summary-row strong{color:#1D9E75}
    .summary-cost{font-size:9px;font-weight:700;color:#B45309;margin-top:2px}
    .no-meal{color:#CBD5E1;font-size:16px}
    .qr-box{text-align:center;padding:12px;background:white;border-radius:8px;border:1px solid #E2E8F0;display:inline-block}
    .qr-label{font-size:10px;color:#64748B;margin-top:6px}
    .qr-code-text{font-size:11px;font-weight:700;color:#1D9E75;margin-top:4px;letter-spacing:2px}
    .food-card{display:flex;gap:16px;background:white;border:1px solid #E2E8F0;border-radius:12px;padding:16px;transition:box-shadow .2s;margin-bottom:12px}
    .food-card:hover{box-shadow:0 4px 16px rgba(29,158,117,0.12)}
    .food-card-emoji{font-size:40px;flex-shrink:0;width:56px;text-align:center}
    .food-card-body{flex:1}
    .food-card-body h4{font-size:14px;font-weight:700;color:#1A1A2E;margin-bottom:4px}
    .kn-name{font-size:12px;font-weight:400;color:#64748B}
    .food-card-desc{font-size:12px;color:#64748B;margin-bottom:10px;line-height:1.5}
    .food-card-macros{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}
    .macro-pill{background:#F0FDF4;border:1px solid #BBF7D0;border-radius:6px;padding:3px 8px}
    .macro-pill .macro-label{font-size:9px;font-weight:700;color:#64748B;display:block}
    .macro-pill .macro-val{font-size:12px;font-weight:700;color:#1D9E75}
    .cost-pill{background:#FEF3C7;border-color:#FDE68A}
    .cost-pill .macro-val{color:#B45309}
    .food-card-tags{display:flex;gap:6px;flex-wrap:wrap}
    .tag{font-size:10px;font-weight:600;padding:2px 8px;border-radius:20px}
    .cat-tag{background:#EFF6FF;color:#3B82F6}
    .veg-tag{background:#F0FDF4;color:#16A34A}
    .egg-tag{background:#FFFBEB;color:#D97706}
    .ai-advisor-panel{margin:24px;border-radius:16px;border:2px solid #1D9E75;background:linear-gradient(135deg,#F0FDF9,#ECFDF5);box-shadow:0 8px 32px rgba(29,158,117,0.15);overflow:hidden}
    .ai-advisor-header{display:flex;justify-content:space-between;align-items:center;padding:16px 20px;background:linear-gradient(135deg,#1D9E75,#15796A)}
    .ai-advisor-title{display:flex;align-items:center;gap:12px}
    .ai-icon{font-size:28px}
    .ai-advisor-title h3{font-size:16px;font-weight:700;color:white;margin:0}
    .ai-advisor-title p{font-size:11px;color:rgba(255,255,255,0.8);margin:0}
    .ai-advisor-close{background:rgba(255,255,255,0.2);border:none;color:white;width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:14px}
    .ai-advisor-body{padding:16px 20px;display:flex;flex-direction:column;gap:12px}
    .ai-advisor-context{background:white;border-radius:8px;padding:10px 14px;font-size:12px;color:#475569;border:1px solid #E2E8F0}
    .ai-thinking{display:flex;align-items:center;gap:10px;padding:12px 0}
    .thinking-dots{display:flex;gap:4px}
    .thinking-dots span{width:8px;height:8px;border-radius:50%;background:#1D9E75;animation:bounce 1.2s infinite}
    .thinking-dots span:nth-child(2){animation-delay:.2s}
    .thinking-dots span:nth-child(3){animation-delay:.4s}
    @keyframes bounce{0%,80%,100%{transform:scale(0)}40%{transform:scale(1)}}
    .ai-reply-card{display:flex;gap:12px;background:white;border-radius:10px;padding:14px;border:1px solid #BBF7D0}
    .ai-reply-icon{font-size:24px;flex-shrink:0}
    .ai-reply-text{font-size:13px;color:#334155;line-height:1.6}
    .quick-q-label{font-size:11px;font-weight:700;color:#64748B;margin-bottom:6px}
    .quick-q-chips{display:flex;flex-wrap:wrap;gap:6px}
    .quick-q-chip{background:white;border:1.5px solid #1D9E75;color:#1D9E75;border-radius:20px;padding:4px 12px;font-size:11px;font-weight:600;cursor:pointer;transition:all .2s}
    .quick-q-chip:hover{background:#1D9E75;color:white}
    .ai-input-row{display:flex;gap:8px}
    .ai-input{flex:1;padding:10px 14px;border:1.5px solid #E2E8F0;border-radius:8px;font-size:13px;outline:none;transition:border-color .2s}
    .ai-input:focus{border-color:#1D9E75}
    .ai-send-btn{background:#1D9E75;color:white;border:none;border-radius:8px;padding:10px 16px;font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap}
    .ai-send-btn:hover{background:#15796A}
    .dashboard-wrapper{padding:24px;max-width:1200px;margin:0 auto}
    .dashboard-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;flex-wrap:wrap;gap:12px}
    .dashboard-header h2{font-size:22px;font-weight:800;color:#1A1A2E;margin:0}
    .dashboard-header p{font-size:13px;color:#64748B;margin:4px 0 0}
    .add-student-btn{background:linear-gradient(135deg,#1D9E75,#15796A);color:white;border:none;border-radius:10px;padding:10px 20px;font-size:13px;font-weight:700;cursor:pointer}
    .dashboard-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px}
    .stat-card{background:white;border-radius:12px;padding:16px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.06);border:1px solid #E2E8F0}
    .stat-num{font-size:32px;font-weight:800}
    .stat-label{font-size:12px;color:#64748B;margin-top:4px}
    .total-card .stat-num{color:#1D9E75}
    .normal-card .stat-num{color:#10B981}
    .under-card .stat-num{color:#F59E0B}
    .over-card .stat-num{color:#EF4444}
    .students-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}
    .student-card{background:white;border-radius:12px;padding:16px;border:1px solid #E2E8F0;transition:box-shadow .2s}
    .student-card:hover{box-shadow:0 4px 16px rgba(0,0,0,0.08)}
    .student-card-top{display:flex;align-items:center;gap:12px;margin-bottom:12px}
    .student-avatar{font-size:32px}
    .student-info{flex:1}
    .student-info h4{font-size:14px;font-weight:700;color:#1A1A2E;margin:0}
    .student-info p{font-size:12px;color:#64748B;margin:2px 0 0}
    .student-delete-btn{background:none;border:none;cursor:pointer;font-size:16px;opacity:.4;transition:opacity .2s}
    .student-delete-btn:hover{opacity:1}
    .student-bmi-row{display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap}
    .bmi-status-tag{font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px}
    .bmi-value-tag{font-size:11px;color:#64748B}
    .sparkline-label{font-size:10px;color:#94A3B8;margin-bottom:4px}
    .sparkline-container{margin-bottom:10px}
    .student-card-actions{display:flex;gap:6px;margin-top:12px;flex-wrap:wrap}
    .btn-measure,.btn-generate,.btn-chart{flex:1;padding:8px 4px;border:none;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;transition:opacity .2s;white-space:nowrap}
    .btn-measure{background:#EFF6FF;color:#3B82F6}
    .btn-generate{background:#F0FDF4;color:#1D9E75}
    .btn-chart{background:#F5F3FF;color:#7C3AED}
    .btn-measure:hover,.btn-generate:hover,.btn-chart:hover{opacity:0.8}
    .empty-students{text-align:center;padding:48px;color:#64748B;grid-column:1/-1}
    .auth-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:9999;backdrop-filter:blur(4px)}
    .auth-modal-box{background:white;border-radius:20px;padding:32px;width:90%;max-width:400px;position:relative;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.2)}
    .auth-modal-close{position:absolute;top:16px;right:16px;background:#F1F5F9;border:none;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:14px}
    .auth-modal-header{text-align:center;margin-bottom:24px}
    .auth-logo{font-size:40px;margin-bottom:8px}
    .auth-modal-header h2{font-size:22px;font-weight:800;color:#1A1A2E;margin:0}
    .auth-modal-header p{font-size:12px;color:#64748B;margin:4px 0 0}
    .auth-tabs{display:flex;gap:4px;background:#F1F5F9;border-radius:10px;padding:4px;margin-bottom:24px}
    .auth-tab{flex:1;padding:8px;border:none;background:transparent;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;color:#64748B;transition:all .2s}
    .auth-tab.active{background:white;color:#1D9E75;box-shadow:0 2px 8px rgba(0,0,0,0.1)}
    .auth-field{margin-bottom:14px}
    .auth-field label{font-size:12px;font-weight:700;color:#475569;display:block;margin-bottom:6px}
    .auth-field input,.auth-field select{width:100%;padding:10px 14px;border:1.5px solid #E2E8F0;border-radius:8px;font-size:13px;outline:none;box-sizing:border-box;transition:border-color .2s;font-family:inherit}
    .auth-field input:focus,.auth-field select:focus{border-color:#1D9E75}
    .auth-error{background:#FEE2E2;color:#DC2626;padding:10px 14px;border-radius:8px;font-size:12px;margin-bottom:12px}
    .auth-submit-btn{width:100%;padding:12px;background:linear-gradient(135deg,#1D9E75,#15796A);color:white;border:none;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer;margin-bottom:12px;transition:opacity .2s;font-family:inherit}
    .auth-submit-btn:hover{opacity:0.9}
    .auth-switch{text-align:center;font-size:12px;color:#64748B}
    .auth-switch a{color:#1D9E75;font-weight:600;cursor:pointer}
    .nav-teacher-info{display:flex;align-items:center;gap:8px}
    .nav-teacher-name{font-size:13px;font-weight:600;color:#1D9E75}
    .nav-logout-btn{background:#FEE2E2;color:#DC2626;border:none;border-radius:6px;padding:4px 10px;font-size:11px;font-weight:700;cursor:pointer}
    .nav-login-btn{background:#1D9E75;color:white;border:none;border-radius:8px;padding:8px 16px;font-size:13px;font-weight:700;cursor:pointer}
    .teacher-welcome-banner{background:linear-gradient(135deg,#F0FDF4,#DCFCE7);border:1px solid #BBF7D0;border-radius:10px;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;font-size:13px;color:#166534;flex-wrap:wrap;gap:8px}
    .banner-dash-btn{background:#1D9E75;color:white;border:none;border-radius:6px;padding:6px 14px;font-size:12px;font-weight:700;cursor:pointer}
    @media(max-width:768px){.dashboard-stats{grid-template-columns:repeat(2,1fr)}}
    @media(max-width:600px){.food-card{flex-direction:column}.ai-input-row{flex-direction:column}.student-card-actions{gap:4px}}
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
})();

// ── Boot ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => app.init());
