// ============================================================
// NutriPrint — app.js  (FINAL VERSION)
// All 4 reviewer improvements applied:
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
    const nav = document.getElementById('nav-links');
    if (nav) nav.classList.remove('open');
  },

  showSection(sectionKey, pushState = true) {
    if (!SECTION_MAP[sectionKey]) sectionKey = 'home';
    this.currentSection = sectionKey;

    document.querySelectorAll('.app-section').forEach(s => {
      s.classList.remove('active');
    });

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
        el.textContent = id === 'stat-students'
          ? current.toFixed(1)
          : Math.round(current);
        if (current >= target) clearInterval(interval);
      }, 25);
    });
  },

  // ── BMI Calculator ────────────────────────────────────────
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
      advice = 'The child is obese. Consult a doctor or nutritionist. Focus on fruits, vegetables, and millet-based foods. Avoid junk food completely.';
      portionAdvice = 'Strictly controlled portions (70%) with high-fiber foods for weight management.';
    }

    this.lastBMIData = { name, age, gender, height, weight, bmi, status };

    // Show report panel
    document.getElementById('bmi-empty').style.display = 'none';
    const reportEl = document.getElementById('bmi-report-view');
    reportEl.style.display = 'flex';

    document.getElementById('rep-student-name').textContent = name || 'Student';
    document.getElementById('rep-meta-desc').textContent =
      `Age: ${age} • Gender: ${gender} • Height: ${height}cm • Weight: ${weight}kg`;
    document.getElementById('rep-bmi-val').textContent = bmi;
    document.getElementById('rep-status-advice').textContent = advice;
    document.getElementById('rep-portion-advice').textContent = portionAdvice;

    const badge = document.getElementById('rep-status-badge');
    badge.textContent = status.toUpperCase();
    badge.style.backgroundColor = color;

    const pointerPct = Math.min(Math.max(((bmi - 12) / 26) * 100, 2), 98);
    const pointer = document.getElementById('rep-bmi-pointer');
    if (pointer) pointer.style.left = `${pointerPct}%`;

    document.getElementById('bmi_status_hidden').value = status;

    // FIX 4 — Show AI Advisor after BMI calculation
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
      document.getElementById('err-school').style.display = 'block';
      valid = false;
    } else {
      document.getElementById('err-school').style.display = 'none';
    }
    if (!teacher_name) {
      document.getElementById('err-teacher').style.display = 'block';
      valid = false;
    } else {
      document.getElementById('err-teacher').style.display = 'none';
    }
    if (!valid) return;

    document.getElementById('gen-loading').style.display = 'flex';
    document.getElementById('gen-empty').style.display = 'none';
    document.getElementById('gen-success').style.display = 'none';

    try {
      const resp = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_name, teacher_name, student_name,
          bmi_status, age_group, preference,
          region, month, optimization_strategy,
        }),
      });

      const data = await resp.json();
      if (data.error) { alert(data.error); return; }

      // Save plan & get QR code
      try {
        const saveResp = await fetch('/api/save-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            teacher_id: 1,
            plan_data: data,
            school_name, teacher_name, student_name,
            bmi_status, age_group, preference, region, month,
          }),
        });
        const qrData = await saveResp.json();
        if (saveResp.ok) {
          data.qr_image_base64 = qrData.qr_image_base64 || '';
          data.plan_url        = qrData.plan_url || '';
        }
      } catch (e) {
        console.error('QR generation failed:', e);
      }

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

  // ── Poster Renderer (FIX 2 + FIX 3) ──────────────────────
  renderPoster(data) {
    const { school_details, meal_plan } = data;

    // Header meta
    document.getElementById('post-school-title').textContent = school_details.school_name;
    document.getElementById('post-teacher-val').textContent  = school_details.teacher_name;
    document.getElementById('post-month-val').textContent    = `${school_details.month} 2026`;
    document.getElementById('post-portion-label').innerHTML  = `
      <strong>Portion Guideline /ಭಾಗದ ಪ್ರಮಾಣ:</strong> ${school_details.portion_label_en}
      <span class="lang-kn">${school_details.portion_label_kn || ''}</span>
    `;

    // Student badge
    const badge = document.getElementById('post-student-badge');
    if (school_details.student_name) {
      badge.style.display = 'flex';
      document.getElementById('post-student-name-val').textContent = school_details.student_name;
      document.getElementById('post-student-bmi-val').textContent  =
        `Growth Status: ${school_details.bmi_status || 'Normal'}`;
    } else {
      badge.style.display = 'none';
    }

    // QR Code
    const qrContainer = document.getElementById('poster-qr-container');
    if (qrContainer) {
      qrContainer.innerHTML = data.qr_image_base64
        ? `<div style="text-align:center;margin-top:15px;">
             <img src="data:image/png;base64,${data.qr_image_base64}"
                  alt="QR Code" width="120" height="120">
             <div style="font-size:12px;margin-top:6px;">Scan for Digital Meal Plan</div>
           </div>`
        : '';
    }

    // Build poster grid
    const canvas   = document.getElementById('poster-grid-canvas');
    const days      = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const mealSlots = ['breakfast', 'lunch', 'snack', 'dinner'];
    const slotLabels = {
      breakfast: { en: '🌅 Breakfast', kn: 'ಬೆಳಗಿನ ತಿಂಡಿ' },
      lunch:     { en: '☀️ Lunch',     kn: 'ಮಧ್ಯಾಹ್ನದ ಊಟ' },
      snack:     { en: '🌤️ Snack',     kn: 'ಸಂಜೆ ತಿಂಡಿ'   },
      dinner:    { en: '🌙 Dinner',    kn: 'ರಾತ್ರಿ ಊಟ'     },
    };

    // Clear old dynamic rows (keep first 7 header cells)
    const allCells = canvas.querySelectorAll('.grid-cell');
    allCells.forEach((cell, i) => { if (i >= 7) cell.remove(); });

    mealSlots.forEach(slot => {
      // Slot label cell
      const labelCell = document.createElement('div');
      labelCell.className = 'grid-cell meal-slot-label';
      labelCell.innerHTML = `
        <span class="slot-en">${slotLabels[slot].en}</span>
        <span class="kn-day">${slotLabels[slot].kn}</span>
      `;
      canvas.appendChild(labelCell);

      // Day cells — FIX 2 (nutrition) + FIX 3 (emoji)
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
              <span title="Serving Size">📏 ${food.serving_size || '1 portion'}</span>
              <span title="Protein">P: ${food.scaled_protein  ?? food.protein  ?? 0}g</span>
              <span title="Calcium">Ca: ${food.scaled_calcium ?? food.calcium ?? 0}mg</span>
              <span title="Iron">Fe: ${food.scaled_iron    ?? food.iron    ?? 0}mg</span>
            </div>
            <div class="food-cost-tag">₹${food.scaled_cost ?? food.cost ?? 0}</div>
          `;
        } else {
          cell.innerHTML = '<span class="no-meal">—</span>';
        }
        canvas.appendChild(cell);
      });
    });

    // Daily nutrition summary row
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
        canvas.innerHTML = `
          <p style="color:#64748B;text-align:center;padding:40px;">
            No foods found matching your search.
          </p>`;
        return;
      }

      foods.forEach(food => {
        const emoji = getFoodEmoji(food.name_en);
        const card  = document.createElement('div');
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
              ${food.is_egg ? '<span class="tag egg-tag">🥚 Egg</span>'  : ''}
            </div>
            <div class="food-recipe-box" style="margin-top:8px;font-size:11px;color:#475569;">
              <strong>Recipe Tip / ಅಡುಗೆ ಸಲಹೆ:</strong> ${food.recipe_tip_en || ''}
              ${food.recipe_tip_kn
                ? `<div style="margin-top:4px;font-size:10px;color:#64748B;">${food.recipe_tip_kn}</div>`
                : ''}
            </div>
          </div>
        `;
        canvas.appendChild(card);
      });

    } catch (err) {
      canvas.innerHTML = `
        <p style="color:#EF4444;text-align:center;padding:40px;">
          Error loading foods. Please refresh the page.
        </p>`;
      console.error(err);
    }
  },

  filterLibrary() {
    this.loadLibrary();
  },

  // ── FIX 4: Gemini AI Advisor Panel ───────────────────────
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
              <p>Powered by Groq AI • ಕರ್ನಾಟಕ ಪೌಷ್ಟಿಕಾಂಶ ಸಲಹೆಗಾರ</p>
            </div>
          </div>
          <button class="ai-advisor-close"
            onclick="document.getElementById('ai-advisor-panel').style.display='none'">✕</button>
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

      const bmiSection = document.getElementById('bmi-section');
      if (bmiSection) bmiSection.appendChild(panel);
    }

    panel.style.display = 'block';

    // Store student context as data attributes
    panel.dataset.name      = name;
    panel.dataset.age       = age;
    panel.dataset.gender    = gender;
    panel.dataset.bmiStatus = bmiStatus;
    panel.dataset.bmiValue  = bmiValue;
    panel.dataset.preference = preference;
    panel.dataset.region    = region;

    const statusColor = bmiStatus === 'Normal'
      ? '#10B981'
      : bmiStatus === 'Underweight'
      ? '#F59E0B'
      : '#EF4444';

    document.getElementById('ai-context-box').innerHTML = `
      <strong>${name || 'Student'}</strong> • Age: ${age} • ${gender} •
      BMI: <span style="color:${statusColor}">${bmiStatus} (${bmiValue})</span>
    `;

    // Contextual quick questions based on BMI status
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

    // Auto-trigger initial advisory message
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
            <div class="ai-reply-text">
              AI Advisor is temporarily unavailable. Please try again.
            </div>
          </div>
        `;
      }
      console.error('AI Advisor error:', err);
    }
  },

};

// ============================================================
// CSS — Injected for poster cells, library cards, AI panel
// ============================================================
(function injectStyles() {
  const css = `
    /* ── FIX 2 & 3 — Poster meal cells ───────────────────── */
    .food-emoji { font-size: 20px; margin-bottom: 2px; }
    .food-name-en {
      font-size: 9px; font-weight: 700;
      color: var(--dark, #1A1A2E); line-height: 1.2;
    }
    .food-name-kn {
      font-size: 7.5px; color: #64748B;
      line-height: 1.2; margin-bottom: 2px;
    }
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
    .meal-slot-label .kn-day  { font-size: 8px; color: rgba(255,255,255,0.85); }
    .summary-label-cell { background: #1A1A2E !important; color: white !important; }
    .summary-label-cell .slot-en { color: white; font-size: 9px; font-weight: 700; }
    .summary-label-cell .kn-day  { color: rgba(255,255,255,0.8); font-size: 8px; }
    .summary-data-cell { background: #F8FAFC !important; }
    .summary-row { font-size: 8px; color: #475569; }
    .summary-row strong { color: #1D9E75; }
    .summary-cost { font-size: 9px; font-weight: 700; color: #B45309; margin-top: 2px; }
    .no-meal { color: #CBD5E1; font-size: 16px; }

    /* ── Nutrition Library Cards ──────────────────────────── */
    .food-card {
      display: flex; gap: 16px; background: white;
      border: 1px solid #E2E8F0; border-radius: 12px;
      padding: 16px; transition: box-shadow 0.2s;
    }
    .food-card:hover { box-shadow: 0 4px 16px rgba(29,158,117,0.12); }
    .food-card-emoji { font-size: 40px; flex-shrink: 0; width: 56px; text-align: center; }
    .food-card-body { flex: 1; }
    .food-card-body h4 { font-size: 14px; font-weight: 700; color: #1A1A2E; margin-bottom: 4px; }
    .kn-name { font-size: 12px; font-weight: 400; color: #64748B; }
    .food-card-desc { font-size: 12px; color: #64748B; margin-bottom: 10px; line-height: 1.5; }
    .food-card-macros { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
    .macro-pill {
      background: #F0FDF4; border: 1px solid #BBF7D0;
      border-radius: 6px; padding: 3px 8px;
    }
    .macro-pill .macro-label { font-size: 9px; font-weight: 700; color: #64748B; display: block; }
    .macro-pill .macro-val   { font-size: 12px; font-weight: 700; color: #1D9E75; }
    .cost-pill { background: #FEF3C7; border-color: #FDE68A; }
    .cost-pill .macro-val { color: #B45309; }
    .food-card-tags { display: flex; gap: 6px; flex-wrap: wrap; }
    .tag { font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 20px; }
    .cat-tag { background: #EFF6FF; color: #3B82F6; }
    .veg-tag { background: #F0FDF4; color: #16A34A; }
    .egg-tag { background: #FFFBEB; color: #D97706; }

    /* ── FIX 4 — AI Advisor Panel ─────────────────────────── */
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
    .ai-advisor-title p  { font-size: 11px; color: rgba(255,255,255,0.8); margin: 0; }
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

    /* ── Mobile ───────────────────────────────────────────── */
    @media (max-width: 600px) {
      .food-card     { flex-direction: column; }
      .ai-input-row  { flex-direction: column; }
      .quick-q-chips { gap: 4px; }
    }
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
})();

// ═══════════════════════════════════════════════════════════
// BULK GENERATE — Add these methods to the app object
// Add them after the existing loadDashboard() method
// ═══════════════════════════════════════════════════════════

  async generateAllPosters() {
    if (!this.students || !this.students.length) {
      this.showToast('No students found. Add students first!');
      return;
    }

    const studentsWithBMI = this.students.filter(s => s.latest_bmi);
    if (!studentsWithBMI.length) {
      this.showToast('No students have BMI recorded yet. Measure BMI first!');
      return;
    }

    // Show bulk progress modal
    const modal = document.createElement('div');
    modal.id = 'bulk-modal';
    modal.className = 'auth-modal-overlay';
    modal.innerHTML = `
      <div class="auth-modal-box" style="max-width:480px">
        <h3 style="margin-bottom:8px">🍽️ Generating All Posters</h3>
        <p style="font-size:13px;color:#64748B;margin-bottom:20px">
          Creating meal plans for ${studentsWithBMI.length} students...
        </p>

        <div class="bulk-progress-bar-wrap">
          <div class="bulk-progress-bar" id="bulk-progress-bar" style="width:0%"></div>
        </div>
        <p id="bulk-progress-text" style="font-size:12px;color:#64748B;margin-top:8px;text-align:center">
          Starting...
        </p>

        <div id="bulk-student-list" style="margin-top:16px;max-height:280px;overflow-y:auto;display:flex;flex-direction:column;gap:8px"></div>

        <div id="bulk-done-actions" style="display:none;margin-top:20px;display:none;gap:10px;flex-direction:column">
          <button class="auth-submit-btn" onclick="app.printAllPlans()">
            🖨️ Print All Plans
          </button>
          <button style="background:#F0FDF4;color:#1D9E75;border:1.5px solid #1D9E75;border-radius:8px;padding:10px;font-weight:700;cursor:pointer"
            onclick="document.getElementById('bulk-modal').remove()">
            ✓ Done
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.style.display = 'flex';

    this.bulkPlanResults = [];
    const listEl = document.getElementById('bulk-student-list');
    const barEl  = document.getElementById('bulk-progress-bar');
    const textEl = document.getElementById('bulk-progress-text');

    for (let i = 0; i < studentsWithBMI.length; i++) {
      const student = studentsWithBMI[i];
      const bmi     = student.latest_bmi;

      // Update progress
      const pct = Math.round(((i) / studentsWithBMI.length) * 100);
      barEl.style.width = `${pct}%`;
      textEl.textContent = `Generating ${i + 1} of ${studentsWithBMI.length}: ${student.name}...`;

      // Add student row as "loading"
      const rowId = `bulk-row-${student.id}`;
      const row = document.createElement('div');
      row.id = rowId;
      row.className = 'bulk-student-row bulk-student-loading';
      row.innerHTML = `
        <div class="bulk-student-info">
          <span class="bulk-student-avatar">${student.gender === 'Girl' ? '👧' : '👦'}</span>
          <div>
            <strong>${student.name}</strong>
            <span style="font-size:11px;color:#64748B"> · ${bmi.status}</span>
          </div>
        </div>
        <span class="bulk-status-tag loading">⏳ Generating...</span>
      `;
      listEl.appendChild(row);
      listEl.scrollTop = listEl.scrollHeight;

      try {
        const ageGroup = student.age <= 8 ? '5-8' : student.age <= 12 ? '9-12' : '13-15';
        const resp = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            student_name:          student.name,
            bmi_status:            bmi.status,
            bmi_value:             bmi.bmi,
            age_group:             ageGroup,
            preference:            'Vegetarian',
            region:                'All',
            month:                 new Date().toLocaleString('default', { month: 'long' }),
            optimization_strategy: bmi.status === 'Underweight' ? 'high_protein'
                                 : bmi.status === 'Overweight' || bmi.status === 'Obese'
                                 ? 'high_fiber' : 'standard',
          }),
        });

        const plan = await resp.json();

        if (plan.error) throw new Error(plan.error);

        this.bulkPlanResults.push({ student, bmi, plan });

        // Update row to success
        row.className = 'bulk-student-row bulk-student-done';
        row.innerHTML = `
          <div class="bulk-student-info">
            <span class="bulk-student-avatar">${student.gender === 'Girl' ? '👧' : '👦'}</span>
            <div>
              <strong>${student.name}</strong>
              <span style="font-size:11px;color:#64748B"> · ${bmi.status} (BMI: ${bmi.bmi})</span>
            </div>
          </div>
          <div style="display:flex;gap:6px;align-items:center">
            <span class="bulk-status-tag success">✅ Done</span>
            <button class="bulk-view-btn"
              onclick="app.viewBulkPlan(${this.bulkPlanResults.length - 1})">
              View
            </button>
          </div>
        `;

      } catch (e) {
        row.className = 'bulk-student-row bulk-student-error';
        row.innerHTML = `
          <div class="bulk-student-info">
            <span class="bulk-student-avatar">${student.gender === 'Girl' ? '👧' : '👦'}</span>
            <div><strong>${student.name}</strong></div>
          </div>
          <span class="bulk-status-tag error">❌ Failed</span>
        `;
      }

      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 400));
    }

    // Done!
    barEl.style.width = '100%';
    barEl.style.background = '#10B981';
    textEl.textContent = `✅ All ${studentsWithBMI.length} plans generated!`;
    document.getElementById('bulk-done-actions').style.display = 'flex';
  },

  viewBulkPlan(index) {
    const { student, bmi, plan } = this.bulkPlanResults[index];
    this.lastPlanData = plan;
    document.getElementById('bulk-modal')?.remove();

    // Pre-fill generator form with student data
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
    setTimeout(() => {
      document.getElementById('gen-success').scrollIntoView({ behavior: 'smooth' });
    }, 300);
  },

  printAllPlans() {
    if (!this.bulkPlanResults?.length) return;

    // Open a new window with all posters for printing
    const printWin = window.open('', '_blank');
    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>NutriPrint — All Class Meal Plans</title>
        <style>
          body { font-family: sans-serif; margin: 0; padding: 0; }
          .poster-page {
            page-break-after: always;
            padding: 24px;
            border-bottom: 2px dashed #E2E8F0;
          }
          .poster-header {
            background: #1D9E75; color: white;
            padding: 16px 20px; border-radius: 8px 8px 0 0;
            display: flex; justify-content: space-between; align-items: center;
          }
          .poster-header h2 { margin: 0; font-size: 18px; }
          .poster-header p  { margin: 0; font-size: 12px; opacity: 0.85; }
          .student-badge {
            background: #F0FDF4; border: 1.5px solid #1D9E75;
            border-radius: 8px; padding: 10px 16px;
            display: flex; gap: 16px; align-items: center;
            margin: 12px 0; font-size: 13px;
          }
          .bmi-tag {
            padding: 3px 10px; border-radius: 20px;
            font-weight: 700; font-size: 12px;
          }
          table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 12px; }
          th { background: #1D9E75; color: white; padding: 6px 8px; text-align: left; }
          td { border: 1px solid #E2E8F0; padding: 6px 8px; vertical-align: top; }
          tr:nth-child(even) td { background: #F8FAFC; }
          @media print { .poster-page { page-break-after: always; } }
        </style>
      </head>
      <body>
    `);

    this.bulkPlanResults.forEach(({ student, bmi, plan }) => {
      const bmiColor = bmi.status === 'Normal'   ? '#10B981'
                     : bmi.status === 'Underweight' ? '#F59E0B' : '#EF4444';

      const days     = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const slots    = ['breakfast', 'lunch', 'snack', 'dinner'];
      const slotLabels = { breakfast: 'Breakfast', lunch: 'Lunch', snack: 'Snack', dinner: 'Dinner' };

      let tableRows = '';
      slots.forEach(slot => {
        tableRows += `<tr><td><strong>${slotLabels[slot]}</strong></td>`;
        days.forEach(day => {
          const food = plan.meal_plan?.[day]?.[slot];
          tableRows += `<td>${food ? food.name_en : '—'}</td>`;
        });
        tableRows += '</tr>';
      });

      printWin.document.write(`
        <div class="poster-page">
          <div class="poster-header">
            <div>
              <h2>NutriPrint Weekly Meal Plan</h2>
              <p>${plan.school_details?.school_name || ''} · ${plan.school_details?.month || ''} 2026</p>
            </div>
            <div style="text-align:right;font-size:12px">
              <div>Teacher: ${plan.school_details?.teacher_name || ''}</div>
            </div>
          </div>

          <div class="student-badge">
            <span style="font-size:24px">${student.gender === 'Girl' ? '👧' : '👦'}</span>
            <div>
              <strong style="font-size:15px">${student.name}</strong>
              <div style="font-size:12px;color:#64748B">Age: ${student.age} · ${student.gender}</div>
            </div>
            <span class="bmi-tag" style="background:${bmiColor}20;color:${bmiColor}">
              ${bmi.status} · BMI: ${bmi.bmi}
            </span>
            <div style="font-size:11px;color:#64748B;margin-left:auto">
              ${plan.school_details?.portion_label_en || ''}
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Meal</th>
                ${days.map(d => `<th>${d}</th>`).join('')}
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
        </div>
      `);
    });

    printWin.document.write('</body></html>');
    printWin.document.close();
    setTimeout(() => printWin.print(), 500);
  },

  // ── Toast notification ────────────────────────────────────
  showToast(message) {
    let toast = document.getElementById('nutriprint-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'nutriprint-toast';
      toast.style.cssText = `
        position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
        background:#1A1A2E;color:white;padding:12px 24px;border-radius:8px;
        font-size:13px;font-weight:600;z-index:9999;
        box-shadow:0 4px 16px rgba(0,0,0,0.2);transition:opacity 0.3s;
      `;
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.opacity = '1';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => { toast.style.opacity = '0'; }, 3000);
  },

// ── Add this CSS by appending to the injectStyles function ───
// Add inside the css template literal in injectStyles():

/*
    .bulk-progress-bar-wrap {
      background: #E2E8F0; border-radius: 8px; height: 10px; overflow: hidden;
    }
    .bulk-progress-bar {
      height: 100%; background: #1D9E75;
      border-radius: 8px; transition: width 0.4s ease;
    }
    .bulk-student-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 10px 14px; border-radius: 8px; border: 1px solid #E2E8F0;
      background: white;
    }
    .bulk-student-loading { border-color: #FDE68A; background: #FFFBEB; }
    .bulk-student-done    { border-color: #BBF7D0; background: #F0FDF4; }
    .bulk-student-error   { border-color: #FECACA; background: #FEF2F2; }
    .bulk-student-info    { display: flex; align-items: center; gap: 10px; }
    .bulk-student-avatar  { font-size: 20px; }
    .bulk-status-tag {
      font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px;
    }
    .bulk-status-tag.loading { background: #FEF3C7; color: #B45309; }
    .bulk-status-tag.success { background: #D1FAE5; color: #065F46; }
    .bulk-status-tag.error   { background: #FEE2E2; color: #991B1B; }
    .bulk-view-btn {
      font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 6px;
      background: #1D9E75; color: white; border: none; cursor: pointer;
    }
*/

// ── Boot ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => app.init());
