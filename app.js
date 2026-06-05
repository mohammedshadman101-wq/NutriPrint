// ============================================================
// NutriPrint — app.js
// UPDATED VERSION — All 4 reviewer improvements applied:
// 1. Tab navigation with URL hash (refresh stays on page)
// 2. Serving size + nutrition per food in poster
// 3. Food emoji images in poster
// 4. Gemini AI Advisor panel
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

// ============================================================
// FIX 1 — Hash-based tab navigation
// ============================================================
const SECTION_MAP = {
  'home':      'home-section',
  'bmi':       'bmi-section',
  'generator': 'generator-section',
  'library':   'library-section',
  'about':     'about-section',
};

const HASH_TO_KEY = {
  '#home':      'home',
  '#bmi':       'bmi',
  '#generator': 'generator',
  '#library':   'library',
  '#about':     'about',
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
  lastPlanData: null,
  lastBMIData: null,

  // ── Init ──────────────────────────────────────────────────
  init() {
    this.setupNavigation();
    this.setupHashRouting();
    this.animateStats();
    this.loadLibrary();
    this.setupMobileMenu();

    // Read hash on load → open correct tab
    const initialKey = getSectionKeyFromHash();
    this.showSection(initialKey, false);
  },

  // ── Hash Routing (FIX 1) ──────────────────────────────────
  setupHashRouting() {
    // On back/forward browser navigation
    window.addEventListener('popstate', () => {
      const key = getSectionKeyFromHash();
      this.showSection(key, false);
    });
  },

  // ── Navigation ────────────────────────────────────────────
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
    // Close mobile menu if open
    const nav = document.getElementById('nav-links');
    if (nav) nav.classList.remove('open');
  },

  showSection(sectionKey, pushState = true) {
    if (!SECTION_MAP[sectionKey]) sectionKey = 'home';
    this.currentSection = sectionKey;

    // Hide all sections
    document.querySelectorAll('.app-section').forEach(s => {
      s.classList.remove('active');
    });

    // Show target section
    const targetEl = document.getElementById(SECTION_MAP[sectionKey]);
    if (targetEl) {
      targetEl.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Update nav active state
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.toggle('active', link.getAttribute('data-target') === sectionKey);
    });

    // Update URL hash without full reload (FIX 1 — refresh stays on page)
    if (pushState) {
      history.pushState({ section: sectionKey }, '', `#${sectionKey}`);
    } else {
      history.replaceState({ section: sectionKey }, '', `#${sectionKey}`);
    }

    // Lazy load library when navigating there
    if (sectionKey === 'library') this.loadLibrary();
  },

  // ── Mobile Menu ───────────────────────────────────────────
  setupMobileMenu() {
    const btn = document.getElementById('menu-toggle');
    const nav = document.getElementById('nav-links');
    if (btn && nav) {
      btn.addEventListener('click', () => nav.classList.toggle('open'));
    }
  },

  // ── Stat Counters ─────────────────────────────────────────
  animateStats() {
    const targets = {
      'stat-junk-india': 93,
      'stat-junk-kar': 60,
      'stat-obesity': 9,
      'stat-students': 1,
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

  // ── BMI Calculator ────────────────────────────────────────
  submitBMIForm(event) {
    event.preventDefault();
    const name    = document.getElementById('bmi_student_name').value.trim();
    const age     = parseInt(document.getElementById('bmi_age').value);
    const gender  = document.getElementById('bmi_gender').value;
    const height  = parseFloat(document.getElementById('bmi_height').value);
    const weight  = parseFloat(document.getElementById('bmi_weight').value);

    if (!height || !weight || height < 80 || weight < 10) {
      alert('Please enter valid height and weight values.');
      return;
    }

    const heightM = height / 100;
    const bmi = parseFloat((weight / (heightM * heightM)).toFixed(1));

    // Classify
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
      advice = 'The child is obese. Consult a doctor or nutritionist. Focus on fruits, vegetables, and millet-based foods. Avoid junk food completely.';
      portionAdvice = 'Strictly controlled portions (70%) with high-fiber foods for weight management.';
    }

    this.lastBMIData = { name, age, gender, height, weight, bmi, status };

    // Show report
    document.getElementById('bmi-empty').style.display = 'none';
    const reportEl = document.getElementById('bmi-report-view');
    reportEl.style.display = 'flex';

    document.getElementById('rep-student-name').textContent = name || 'Student';
    document.getElementById('rep-meta-desc').textContent = `Age: ${age} • Gender: ${gender} • Height: ${height}cm • Weight: ${weight}kg`;
    document.getElementById('rep-bmi-val').textContent = bmi;
    document.getElementById('rep-status-advice').textContent = advice;
    document.getElementById('rep-portion-advice').textContent = portionAdvice;

    const badge = document.getElementById('rep-status-badge');
    badge.textContent = status.toUpperCase();
    badge.style.backgroundColor = color;

    // Pointer position on gauge
    const pointerPct = Math.min(Math.max(((bmi - 12) / 26) * 100, 2), 98);
    const pointer = document.getElementById('rep-bmi-pointer');
    if (pointer) pointer.style.left = `${pointerPct}%`;

    document.getElementById('bmi_status_hidden').value = status;

    // Show AI advisor panel after BMI
    this.showAIAdvisorPanel(name, age, gender, status, bmi, 'Vegetarian', 'Karnataka');
  },

  applyBMIToPlan() {
    if (this.lastBMIData) {
      document.getElementById('student_name').value = this.lastBMIData.name || '';
      document.getElementById('bmi_status_hidden').value = this.lastBMIData.status;
      const opt = document.getElementById('bmi_optimization_focus');
      const strategy = document.getElementById('optimization_strategy');
      if (opt && strategy) strategy.value = opt.value;
    }
    this.navigateTo('generator');
  },

  // ── Meal Plan Generator ───────────────────────────────────
  async submitForm(event) {
    event.preventDefault();

    const school_name = document.getElementById('school_name').value.trim();
    const teacher_name = document.getElementById('teacher_name').value.trim();
    const student_name = document.getElementById('student_name').value.trim();
    const bmi_status = document.getElementById('bmi_status_hidden').value;
    const age_group = document.getElementById('age_group').value;
    const preference = document.getElementById('preference').value;
    const region = document.getElementById('region').value;
    const month = document.getElementById('month').value;
    const optimization_strategy = document.getElementById('optimization_strategy').value;

    let valid = true;
    if (!school_name) { document.getElementById('err-school').style.display = 'block'; valid = false; }
    else document.getElementById('err-school').style.display = 'none';
    if (!teacher_name) { document.getElementById('err-teacher').style.display = 'block'; valid = false; }
    else document.getElementById('err-teacher').style.display = 'none';
    if (!valid) return;

    document.getElementById('gen-loading').style.display = 'flex';
    document.getElementById('gen-empty').style.display = 'none';
    document.getElementById('gen-success').style.display = 'none';

    try {
      const resp = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ school_name, teacher_name, student_name, bmi_status, age_group, preference, region, month, optimization_strategy })
      });
      const data = await resp.json();
      if (data.error) { alert(data.error); return; }

      this.lastPlanData = data;
      this.renderPoster(data);
      document.getElementById('gen-loading').style.display = 'none';
      document.getElementById('gen-success').style.display = 'flex';

      // Scroll to poster
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

  // ── Poster Renderer (FIX 2 + FIX 3) ─────────────────────
  renderPoster(data) {
    const { school_details, meal_plan } = data;

    // Header meta
    document.getElementById('post-school-title').textContent = school_details.school_name;
    document.getElementById('post-teacher-val').textContent = school_details.teacher_name;
    document.getElementById('post-month-val').textContent = `${school_details.month} 2026`;
    document.getElementById('post-portion-label').textContent = school_details.portion_label_en;

    // Student badge
    const badge = document.getElementById('post-student-badge');
    if (school_details.student_name) {
      badge.style.display = 'flex';
      document.getElementById('post-student-name-val').textContent = school_details.student_name;
      document.getElementById('post-student-bmi-val').textContent = `Growth Status: ${school_details.bmi_status || 'Normal'}`;
    } else {
      badge.style.display = 'none';
    }

    // Build poster grid
    const canvas = document.getElementById('poster-grid-canvas');
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const mealSlots = ['breakfast', 'lunch', 'snack', 'dinner'];
    const slotLabels = {
      breakfast: { en: '🌅 Breakfast', kn: 'ಬೆಳಗಿನ ತಿಂಡಿ' },
      lunch:     { en: '☀️ Lunch',     kn: 'ಮಧ್ಯಾಹ್ನದ ಊಟ' },
      snack:     { en: '🌤️ Snack',     kn: 'ಸಂಜೆ ತಿಂಡಿ' },
      dinner:    { en: '🌙 Dinner',    kn: 'ರಾತ್ರಿ ಊಟ' },
    };

    // Clear old rows (keep header row — first 7 cells)
    const allCells = canvas.querySelectorAll('.grid-cell');
    allCells.forEach((cell, i) => { if (i >= 7) cell.remove(); });

    mealSlots.forEach(slot => {
      // Slot label cell
      const labelCell = document.createElement('div');
      labelCell.className = 'grid-cell meal-slot-label';
      labelCell.innerHTML = `<span class="slot-en">${slotLabels[slot].en}</span><span class="kn-day">${slotLabels[slot].kn}</span>`;
      canvas.appendChild(labelCell);

      // Day cells
      days.forEach(day => {
        const dayData = meal_plan[day];
        const food = dayData ? dayData[slot] : null;
        const cell = document.createElement('div');
        cell.className = 'grid-cell meal-data-cell';

        if (food) {
          const emoji = getFoodEmoji(food.name_en);
          // FIX 2: Show serving size + nutrition values
          // FIX 3: Show food emoji
          cell.innerHTML = `
            <div class="food-emoji">${emoji}</div>
            <div class="food-name-en">${food.name_en || '-'}</div>
            <div class="food-name-kn">${food.name_kn || ''}</div>
            <div class="food-nutrition-row">
              <span title="Serving Size">📏 ${food.serving_size || '1 portion'}</span>
              <span title="Protein">P: ${food.scaled_protein || food.protein || 0}g</span>
              <span title="Calcium">Ca: ${food.scaled_calcium || food.calcium || 0}mg</span>
              <span title="Iron">Fe: ${food.scaled_iron || food.iron || 0}mg</span>
            </div>
            <div class="food-cost-tag">₹${food.scaled_cost || food.cost || 0}</div>
          `;
        } else {
          cell.innerHTML = '<span class="no-meal">—</span>';
        }
        canvas.appendChild(cell);
      });
    });

    // Daily nutrition summary row
    const summaryLabelCell = document.createElement('div');
    summaryLabelCell.className = 'grid-cell summary-label-cell';
    summaryLabelCell.innerHTML = '<span class="slot-en">📊 Daily Total</span><span class="kn-day">ದಿನದ ಒಟ್ಟು</span>';
    canvas.appendChild(summaryLabelCell);

    days.forEach(day => {
      const dayData = meal_plan[day];
      const cell = document.createElement('div');
      cell.className = 'grid-cell summary-data-cell';
      if (dayData && dayData.nutrients) {
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

  // ── Nutrition Library ─────────────────────────────────────
  async loadLibrary() {
    const canvas = document.getElementById('library-cards-canvas');
    if (!canvas) return;

    const search = document.getElementById('lib-search')?.value || '';
    const cat = document.getElementById('lib-filter-cat')?.value || '';
    const vegOnly = document.getElementById('lib-filter-veg')?.value === 'veg';

    let url = `/api/nutrition?search=${encodeURIComponent(search)}`;
    if (cat) url += `&category=${encodeURIComponent(cat)}`;
    if (vegOnly) url += '&veg_only=true';

    try {
      const resp = await fetch(url);
      const foods = await resp.json();
      canvas.innerHTML = '';

      if (!foods.length) {
        canvas.innerHTML = '<p style="color:#64748B;text-align:center;padding:40px;">No foods found matching your search.</p>';
        return;
      }

      foods.forEach(food => {
        const emoji = getFoodEmoji(food.name_en);
        const card = document.createElement('div');
        card.className = 'food-card';
        card.innerHTML = `
          <div class="food-card-emoji">${emoji}</div>
          <div class="food-card-body">
            <h4>${food.name_en} <span class="kn-name">${food.name_kn || ''}</span></h4>
            <p class="food-card-desc">${food.recipe_tip_en || ''}</p>
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
              <div class="macro-pill">
                <span class="macro-label">Carbs</span>
                <span class="macro-val">${food.carbs}g</span>
              </div>
              <div class="macro-pill cost-pill">
                <span class="macro-label">Cost</span>
                <span class="macro-val">₹${food.cost}</span>
              </div>
            </div>
            <div class="food-card-tags">
              <span class="tag cat-tag">${food.category}</span>
              ${food.is_veg ? '<span class="tag veg-tag">🌿 Veg</span>' : ''}
              ${food.is_egg ? '<span class="tag egg-tag">🥚 Egg</span>' : ''}
            </div>
          </div>
        `;
        canvas.appendChild(card);
      });

    } catch (err) {
      canvas.innerHTML = '<p style="color:#EF4444;text-align:center;padding:40px;">Error loading foods. Please refresh the page.</p>';
      console.error(err);
    }
  },

  filterLibrary() {
    this.loadLibrary();
  },

  // ── FIX 4: Gemini AI Advisor ──────────────────────────────
  showAIAdvisorPanel(name, age, gender, bmiStatus, bmiValue, preference, region) {
    // Check if panel already exists
    let panel = document.getElementById('ai-advisor-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'ai-advisor-panel';
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
            <input type="text" id="ai-question-input" class="ai-input" 
              placeholder="Ask about nutrition, foods, serving sizes... (ಪ್ರಶ್ನೆ ಕೇಳಿ)">
            <button class="ai-send-btn" onclick="app.askAI()">Ask AI ⚡</button>
          </div>
        </div>
      `;

      // Insert after bmi-report-view
      const bmiSection = document.getElementById('bmi-section');
      if (bmiSection) bmiSection.appendChild(panel);
    }

    panel.style.display = 'block';

    // Store student context
    panel.dataset.name = name;
    panel.dataset.age = age;
    panel.dataset.gender = gender;
    panel.dataset.bmiStatus = bmiStatus;
    panel.dataset.bmiValue = bmiValue;
    panel.dataset.preference = preference;
    panel.dataset.region = region;

    // Context box
    document.getElementById('ai-context-box').innerHTML = `
      <strong>${name || 'Student'}</strong> • Age: ${age} • ${gender} • 
      BMI: <span style="color:${bmiStatus === 'Normal' ? '#10B981' : bmiStatus === 'Underweight' ? '#F59E0B' : '#EF4444'}">${bmiStatus} (${bmiValue})</span>
    `;

    // Quick questions
    const quickQs = bmiStatus === 'Underweight'
      ? ['What foods help gain weight?', 'Best protein foods for kids?', 'How much should child eat daily?']
      : bmiStatus === 'Normal'
      ? ['What maintains healthy weight?', 'Best Karnataka foods for kids?', 'How much water daily?']
      : ['What foods to avoid?', 'Best low-calorie meals?', 'How to reduce junk food?'];

    const chipsEl = document.getElementById('quick-q-chips');
    chipsEl.innerHTML = '';
    quickQs.forEach(q => {
      const chip = document.createElement('button');
      chip.className = 'quick-q-chip';
      chip.textContent = q;
      chip.onclick = () => {
        document.getElementById('ai-question-input').value = q;
        app.askAI();
      };
      chipsEl.appendChild(chip);
    });

    // Auto-ask initial suggestion
    setTimeout(() => this.askAI(''), 300);
  },

  async askAI(customQuestion) {
    const panel = document.getElementById('ai-advisor-panel');
    if (!panel) return;

    const question = customQuestion !== undefined
      ? customQuestion
      : (document.getElementById('ai-question-input')?.value?.trim() || '');

    const thinkingEl = document.getElementById('ai-thinking');
    const replyBox = document.getElementById('ai-reply-box');

    if (thinkingEl) thinkingEl.style.display = 'flex';
    if (replyBox) replyBox.innerHTML = '';

    try {
      const resp = await fetch('/api/ai-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_name: panel.dataset.name,
          age: panel.dataset.age,
          gender: panel.dataset.gender,
          bmi_status: panel.dataset.bmiStatus,
          bmi_value: panel.dataset.bmiValue,
          preference: panel.dataset.preference,
          region: panel.dataset.region,
          question: question,
        })
      });
      const data = await resp.json();

      if (thinkingEl) thinkingEl.style.display = 'none';

      if (replyBox) {
        replyBox.innerHTML = `
          <div class="ai-reply-card">
            <div class="ai-reply-icon">🤖</div>
            <div class="ai-reply-text">${(data.reply || '').replace(/\n/g, '<br>')}</div>
          </div>
        `;
      }

      // Clear input
      const input = document.getElementById('ai-question-input');
      if (input) input.value = '';

    } catch (err) {
      if (thinkingEl) thinkingEl.style.display = 'none';
      if (replyBox) {
        replyBox.innerHTML = '<div class="ai-reply-card"><div class="ai-reply-text">AI Advisor is temporarily unavailable. Please try again.</div></div>';
      }
      console.error('AI Advisor error:', err);
    }
  },

};

// ── CSS Injector — new styles for FIX 2, 3, 4 ────────────
(function injectStyles() {
  const css = `
    /* FIX 2 & 3 — Food emoji + nutrition in poster cells */
    .food-emoji { font-size: 20px; margin-bottom: 2px; }
    .food-name-en { font-size: 9px; font-weight: 700; color: var(--dark, #1A1A2E); line-height: 1.2; }
    .food-name-kn { font-size: 7.5px; color: #64748B; line-height: 1.2; margin-bottom: 2px; }
    .food-nutrition-row { 
      display: flex; flex-wrap: wrap; gap: 2px; margin-top: 3px; 
      font-size: 7px; font-weight: 600; color: #475569; 
    }
    .food-nutrition-row span { 
      background: #F0FDF4; border: 1px solid #BBF7D0; 
      border-radius: 3px; padding: 1px 3px; color: #166534; 
    }
    .food-cost-tag { 
      margin-top: 3px; font-size: 8px; font-weight: 700; 
      color: #B45309; background: #FEF3C7; 
      border-radius: 3px; padding: 1px 4px; display: inline-block; 
    }
    .meal-slot-label { 
      background: linear-gradient(135deg, #1D9E75 0%, #15796A 100%) !important; 
      color: white !important; text-align: center; 
    }
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

    /* Food Library Cards */
    .food-card { 
      display: flex; gap: 16px; background: white; 
      border: 1px solid #E2E8F0; border-radius: 12px; 
      padding: 16px; transition: box-shadow 0.2s; 
    }
    .food-card:hover { box-shadow: 0 4px 16px rgba(29,158,117,0.12); }
    .food-card-emoji { font-size: 40px; flex-shrink: 0; width: 56px; text-align: center; }
    .food-card-body { flex: 1; }
    .food-card-body h4 { font-size: 14px; font-weight: 700; color: #1A1A2E; margin-bottom: 4px; }
    .food-card-desc { font-size: 12px; color: #64748B; margin-bottom: 10px; line-height: 1.5; }
    .food-card-macros { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
    .macro-pill { background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 6px; padding: 3px 8px; }
    .macro-pill .macro-label { font-size: 9px; font-weight: 700; color: #64748B; display: block; }
    .macro-pill .macro-val { font-size: 12px; font-weight: 700; color: #1D9E75; }
    .cost-pill { background: #FEF3C7; border-color: #FDE68A; }
    .cost-pill .macro-val { color: #B45309; }
    .food-card-tags { display: flex; gap: 6px; }
    .tag { font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 20px; }
    .cat-tag { background: #EFF6FF; color: #3B82F6; }
    .veg-tag { background: #F0FDF4; color: #16A34A; }
    .egg-tag { background: #FFFBEB; color: #D97706; }

    /* FIX 4 — AI Advisor Panel */
    .ai-advisor-panel {
      margin: 24px; border-radius: 16px;
      border: 2px solid #1D9E75;
      background: linear-gradient(135deg, #F0FDF9 0%, #ECFDF5 100%);
      box-shadow: 0 8px 32px rgba(29,158,117,0.15);
      overflow: hidden;
    }
    .ai-advisor-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 16px 20px;
      background: linear-gradient(135deg, #1D9E75 0%, #15796A 100%);
      color: white;
    }
    .ai-advisor-title { display: flex; align-items: center; gap: 12px; }
    .ai-icon { font-size: 28px; }
    .ai-advisor-title h3 { font-size: 16px; font-weight: 700; color: white; margin: 0; }
    .ai-advisor-title p { font-size: 11px; color: rgba(255,255,255,0.8); margin: 0; }
    .ai-advisor-close { 
      background: rgba(255,255,255,0.2); border: none; color: white; 
      width: 28px; height: 28px; border-radius: 50%; cursor: pointer; 
      font-size: 14px; display: flex; align-items: center; justify-content: center;
    }
    .ai-advisor-body { padding: 16px 20px; display: flex; flex-direction: column; gap: 12px; }
    .ai-advisor-context { 
      background: white; border-radius: 8px; padding: 10px 14px; 
      font-size: 12px; color: #475569; border: 1px solid #E2E8F0; 
    }
    .ai-chat-area { min-height: 80px; }
    .ai-thinking { display: flex; align-items: center; gap: 10px; padding: 12px 0; }
    .thinking-dots { display: flex; gap: 4px; }
    .thinking-dots span { 
      width: 8px; height: 8px; border-radius: 50%; background: #1D9E75; 
      animation: bounce 1.2s infinite; 
    }
    .thinking-dots span:nth-child(2) { animation-delay: 0.2s; }
    .thinking-dots span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes bounce { 0%,80%,100%{transform:scale(0)} 40%{transform:scale(1)} }
    .ai-reply-card { 
      display: flex; gap: 12px; background: white; 
      border-radius: 10px; padding: 14px; border: 1px solid #BBF7D0; 
    }
    .ai-reply-icon { font-size: 24px; flex-shrink: 0; }
    .ai-reply-text { font-size: 13px; color: #334155; line-height: 1.6; }
    .ai-quick-questions { }
    .quick-q-label { font-size: 11px; font-weight: 700; color: #64748B; margin-bottom: 6px; }
    .quick-q-chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .quick-q-chip { 
      background: white; border: 1.5px solid #1D9E75; color: #1D9E75; 
      border-radius: 20px; padding: 4px 12px; font-size: 11px; font-weight: 600; 
      cursor: pointer; transition: all 0.2s; 
    }
    .quick-q-chip:hover { background: #1D9E75; color: white; }
    .ai-input-row { display: flex; gap: 8px; }
    .ai-input { 
      flex: 1; padding: 10px 14px; border: 1.5px solid #E2E8F0; 
      border-radius: 8px; font-size: 13px; outline: none; 
      transition: border-color 0.2s; 
    }
    .ai-input:focus { border-color: #1D9E75; }
    .ai-send-btn { 
      background: #1D9E75; color: white; border: none; 
      border-radius: 8px; padding: 10px 16px; font-size: 13px; 
      font-weight: 700; cursor: pointer; white-space: nowrap; 
      transition: background 0.2s; 
    }
    .ai-send-btn:hover { background: #15796A; }

    /* Mobile responsive */
    @media (max-width: 600px) {
      .food-card { flex-direction: column; }
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

