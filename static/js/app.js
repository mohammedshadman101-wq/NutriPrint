/**
 * NutriPrint - Core Frontend SPA Controller
 * Handles tabs routing, state updates, animated stats counters,
 * bilingual form validations, poster rendering, and AJAX API calls.
 * Expanded with interactive BMI Growth Tracker & dynamic portion/strategy mapping.
 */

class NutriPrintApp {
    constructor() {
        this.activeTab = 'home';
        this.cachedFoods = [];
        this.currentFormData = null;
        this.statsAnimated = false;
        
        // BMI Calculation state
        this.calculatedBMI = 0;
        this.bmiStatus = 'Normal';
        this.bmiStudentName = '';
        this.bmiAge = 10;
        this.bmiGender = 'Boy';
        
        // Bind event listeners
        document.addEventListener('DOMContentLoaded', () => this.init());
    }

    init() {
        this.setupNavigation();
        this.setupMobileMenu();
        this.setupScrollObserver();
        this.loadNutritionLibrary(); // Pre-fetch and render nutrition items
    }

    // ==========================================
    // SPA ROUTING & NAVIGATION
    // ==========================================
    setupNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const target = link.getAttribute('data-target');
                this.navigateTo(target);
            });
        });
    }

    navigateTo(targetSectionId) {
        // Hide all sections
        const sections = document.querySelectorAll('.app-section');
        sections.forEach(sec => {
            sec.classList.remove('active');
        });

        // Show targets
        const targetSection = document.getElementById(`${targetSectionId}-section`);
        if (targetSection) {
            targetSection.classList.add('active');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        // Active link highlight
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            if (link.getAttribute('data-target') === targetSectionId) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        // Update internal state
        this.activeTab = targetSectionId;

        // Trigger stats animation if navigating to home
        if (targetSectionId === 'home') {
            this.triggerStatsAnimation();
        }

        // Close mobile menu if open
        const navMenu = document.getElementById('nav-links');
        if (navMenu) navMenu.classList.remove('active');
    }

    setupMobileMenu() {
        const toggleBtn = document.getElementById('menu-toggle');
        const navMenu = document.getElementById('nav-links');
        
        if (toggleBtn && navMenu) {
            toggleBtn.addEventListener('click', () => {
                navMenu.classList.toggle('active');
            });
        }
    }

    // ==========================================
    // ANIMATED STATISTICS COUNTERS
    // ==========================================
    setupScrollObserver() {
        const statsSec = document.getElementById('stats-container');
        if (!statsSec) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !this.statsAnimated) {
                    this.triggerStatsAnimation();
                }
            });
        }, { threshold: 0.2 });

        observer.observe(statsSec);
    }

    triggerStatsAnimation() {
        if (this.statsAnimated) return;
        this.statsAnimated = true;

        this.animateCounter('stat-junk-india', 0, 93, 1500, '%');
        this.animateCounter('stat-junk-kar', 0, 60, 1500, '%');
        this.animateCounter('stat-obesity', 0, 9.1, 1500, '%', true);
        this.animateCounter('stat-students', 0, 1.2, 1500, 'Cr+', true);
    }

    animateCounter(elementId, start, end, duration, suffix = '', isDecimal = false) {
        const obj = document.getElementById(elementId);
        if (!obj) return;

        const startTime = performance.now();
        
        const updateCounter = (currentTime) => {
            const elapsedTime = currentTime - startTime;
            if (elapsedTime >= duration) {
                obj.textContent = end.toFixed(isDecimal ? 1 : 0) + suffix;
                return;
            }
            
            const progress = elapsedTime / duration;
            const currentValue = start + (end - start) * progress;
            obj.textContent = currentValue.toFixed(isDecimal ? 1 : 0) + suffix;
            requestAnimationFrame(updateCounter);
        };
        
        requestAnimationFrame(updateCounter);
    }

    // ==========================================
    // STUDENT GROWTH & BMI TRACKER
    // ==========================================
    submitBMIForm(event) {
        event.preventDefault();

        const nameInput = document.getElementById('bmi_student_name');
        const ageInput = document.getElementById('bmi_age');
        const genderInput = document.getElementById('bmi_gender');
        const heightInput = document.getElementById('bmi_height');
        const weightInput = document.getElementById('bmi_weight');

        const heightCm = parseFloat(heightInput.value);
        const weightKg = parseFloat(weightInput.value);
        this.bmiStudentName = nameInput.value.trim();
        this.bmiAge = parseInt(ageInput.value);
        this.bmiGender = genderInput.value;

        const heightM = heightCm / 100;
        this.calculatedBMI = parseFloat((weightKg / (heightM * heightM)).toFixed(1));

        let status = 'Normal';
        let statusKn = 'ಸಾಮಾನ್ಯ';
        let badgeColor = '#10B981';
        let pointerPos = '45%';
        let adviceEn = '';
        let adviceKn = '';
        let portionPlan = '';
        let defaultFocus = 'standard';

        if (this.calculatedBMI < 18.5) {
            status = 'Underweight';
            statusKn = 'ಭಾರ ಕೊರತೆ';
            badgeColor = '#F59E0B';
            pointerPos = '15%';
            adviceEn = "Nutrient density is low. Prioritize calorie-dense whole foods like Ragi Mudde, Poha with peanuts, Groundnut Chikki, and Ragi Dosa paired with high-protein curds.";
            adviceKn = "ಮಗುವಿನ ತೂಕವು ಕಡಿಮೆಯಾಗಿದೆ. ರಾಗಿ ಮುದ್ದೆ, ಶೇಂಗಾ ಚಿಕ್ಕಿ, ಮೊಳಕೆ ಉಪ್ಮಾ ಮತ್ತು ಬೆಣ್ಣೆ ಒಗ್ಗರಣೆಗಳನ್ನು ಹೆಚ್ಚಾಗಿ ನೀಡಿ.";
            portionPlan = "High-Energy Portions (130% portion scale recommended) to assist active muscle development and healthy weight gain.";
            defaultFocus = 'high_protein';
        } else if (this.calculatedBMI >= 18.5 && this.calculatedBMI <= 24.9) {
            status = 'Normal';
            statusKn = 'ಸಾಮಾನ್ಯ';
            badgeColor = '#10B981';
            pointerPos = '45%';
            adviceEn = "Excellent parameters. The child has highly healthy growth. Keep serving a diverse mix of millet-based breakfast and vegetable saaru to sustain immunity.";
            adviceKn = "ಮಗು ಅತ್ಯಂತ ಆರೋಗ್ಯಕರ ಬೆಳವಣಿಗೆಯನ್ನು ಹೊಂದಿದೆ. ಸೊಪ್ಪಿನ ಸಾರು, ರಾಗಿ ದೋಸೆ, ಜೋಳದ ರೊಟ್ಟಿ ಮತ್ತು ಹಸಿರು ತರಕಾರಿಗಳನ್ನು ಮುಂದುವರಿಸಿ.";
            portionPlan = "Standard Balanced Portions (100% standard portion scale) to support robust physical growth and high classroom concentration.";
            defaultFocus = 'standard';
        } else if (this.calculatedBMI >= 25.0 && this.calculatedBMI <= 29.9) {
            status = 'Overweight';
            statusKn = 'ಹೆಚ್ಚುವರಿ ತೂಕ';
            badgeColor = '#FBBF24';
            pointerPos = '75%';
            adviceEn = "Moderate indicators. Swap simple carbs with high-fiber grains like Jowar Roti, Dal Khichdi, and Sprout Upma. Reduce processed sugars and oil seasoning.";
            adviceKn = "ಮಗುವಿನ ತೂಕ ತುಸು ಹೆಚ್ಚಿದೆ. ಮೈದಾ, ಬೇಕರಿ ಪದಾರ್ಥಗಳನ್ನು ಸಂಪೂರ್ಣವಾಗಿ ನಿಲ್ಲಿಸಿ ಜೋಳದ ರೊಟ್ಟಿ, ತರಕಾರಿ ಖಿಚಡಿ ಮತ್ತು ಮೊಳಕೆಕಾಳು ನೀಡಿ.";
            portionPlan = "Fiber-Rich Controlled Portions (70% calorie capacity) to balance physical activity and metabolism health gently.";
            defaultFocus = 'low_calorie';
        } else {
            status = 'Obese';
            statusKn = 'ಅತಿ ತೂಕ';
            badgeColor = '#EF4444';
            pointerPos = '92%';
            adviceEn = "High indicators. Immediate nutritional modification needed. Focus on fiber-loaded vegetables, green gram sprouts, ragi malt without sugar, and low-sodium curd rice.";
            adviceKn = "ಹೆಚ್ಚಿನ ತೂಕದ ತೊಂದರೆ ಇದೆ. ತರಕಾರಿ ತಿಳಿಸಾರು, ಸಕ್ಕರೆ ರಹಿತ ರಾಗಿ ಗಂಜಿ ಮತ್ತು ಕಡಲೆಕಾಳು ಉಸ್ಲಿಯನ್ನು ದಿನನಿತ್ಯದ ಆಹಾರದಲ್ಲಿ ಅಳವಡಿಸಿ.";
            portionPlan = "Weight-Management Portions (70% portion scale) to assist metabolic correction under teacher and parental guidelines.";
            defaultFocus = 'low_calorie';
        }

        this.bmiStatus = status;

        // Render UI Report Panel
        document.getElementById('rep-student-name').textContent = this.bmiStudentName;
        document.getElementById('rep-meta-desc').textContent = `Age: ${this.bmiAge} • Gender: ${this.bmiGender} • BMI: ${this.calculatedBMI}`;
        
        const badge = document.getElementById('rep-status-badge');
        badge.textContent = `${status.toUpperCase()} (${statusKn})`;
        badge.style.backgroundColor = badgeColor;

        document.getElementById('rep-bmi-val').textContent = this.calculatedBMI;
        document.getElementById('rep-bmi-val').style.color = badgeColor;
        
        document.getElementById('rep-status-advice').innerHTML = `
            ${adviceEn}<br><br><span class="lang-kn" style="font-size:11px; color:#475569;">${adviceKn}</span>
        `;
        document.getElementById('rep-portion-advice').textContent = portionPlan;
        
        document.getElementById('rep-bmi-pointer').style.left = pointerPos;

        // Set default AI Customization option dynamically based on computed category
        document.getElementById('bmi_optimization_focus').value = defaultFocus;

        // Toggle screens
        document.getElementById('bmi-empty').style.display = 'none';
        document.getElementById('bmi-report-view').style.display = 'flex';
    }

    applyBMIToPlan() {
        const targetPortion = (this.bmiStatus === 'Underweight') ? '13-15' : 
                              (this.bmiStatus === 'Normal') ? '9-12' : '5-8';

        const chosenFocus = document.getElementById('bmi_optimization_focus').value;

        document.getElementById('school_name').focus();
        
        // Auto fill form inputs
        document.getElementById('student_name').value = this.bmiStudentName;
        document.getElementById('age_group').value = targetPortion;
        document.getElementById('bmi_status_hidden').value = this.bmiStatus;
        
        // Set the custom optimization strategy in the main generator form
        document.getElementById('optimization_strategy').value = chosenFocus;

        // Navigate dynamically to the generator section
        this.navigateTo('generator');
        
        // Smooth scroll to school name input
        setTimeout(() => {
            document.getElementById('school_name').scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
    }

    // ==========================================
    // FORM VALIDATION & API GENERATION
    // ==========================================
    submitForm(event) {
        event.preventDefault();
        
        const schoolNameInput = document.getElementById('school_name');
        const studentNameInput = document.getElementById('student_name');
        const teacherNameInput = document.getElementById('teacher_name');
        const ageGroupSelect = document.getElementById('age_group');
        const preferenceSelect = document.getElementById('preference');
        const regionSelect = document.getElementById('region');
        const monthSelect = document.getElementById('month');
        const optStrategySelect = document.getElementById('optimization_strategy');
        const bmiStatusHidden = document.getElementById('bmi_status_hidden');

        let isValid = true;

        // Reset errors
        document.getElementById('err-school').classList.remove('active');
        document.getElementById('err-teacher').classList.remove('active');

        // Verify inputs
        if (!schoolNameInput.value.trim()) {
            document.getElementById('err-school').classList.add('active');
            isValid = false;
        }
        if (!teacherNameInput.value.trim()) {
            document.getElementById('err-teacher').classList.add('active');
            isValid = false;
        }

        if (!isValid) return;

        // Store form data for regeneration
        this.currentFormData = {
            school_name: schoolNameInput.value.trim(),
            student_name: studentNameInput.value.trim(),
            teacher_name: teacherNameInput.value.trim(),
            age_group: ageGroupSelect.value,
            preference: preferenceSelect.value,
            region: regionSelect.value,
            month: monthSelect.value,
            optimization_strategy: optStrategySelect.value,
            bmi_status: studentNameInput.value.trim() ? bmiStatusHidden.value : ''
        };

        this.generateMealPlan(this.currentFormData);
    }

    async generateMealPlan(params) {
        const emptyState = document.getElementById('gen-empty');
        const successState = document.getElementById('gen-success');
        const loadingState = document.getElementById('gen-loading');

        emptyState.style.display = 'none';
        successState.style.display = 'none';
        loadingState.style.display = 'flex';

        try {
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params)
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Server error generating plan.');
            }

            const planData = await response.json();

// Save plan and create QR code
try {
    const saveResponse = await fetch('/api/save-plan', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            teacher_id: 1,
            plan_data: planData,
            school_name: params.school_name,
            teacher_name: params.teacher_name,
            student_name: params.student_name || '',
            bmi_status: params.bmi_status || '',
            age_group: params.age_group,
            preference: params.preference,
            region: params.region,
            month: params.month
        })
    });

    const qrData = await saveResponse.json();

    planData.qr_image_base64 = qrData.qr_image_base64;
    planData.plan_url = qrData.plan_url;

} catch (e) {
    console.error('QR generation failed', e);
}

this.renderMealPlanPoster(planData);

// Transition to success state
loadingState.style.display = 'none';
successState.style.display = 'flex';
        } catch (error) {
            console.error('Error fetching plan:', error);
            alert(`Error: ${error.message}`);
            loadingState.style.display = 'none';
            emptyState.style.display = 'flex';
        }
    }

    regeneratePlan() {
        if (this.currentFormData) {
            this.generateMealPlan(this.currentFormData);
        }
    }

    // ==========================================
    // A4 POSTER RENDER CANVAS
    // ==========================================
    renderMealPlanPoster(data) {
        const schoolMeta = data.school_details;
        const mealPlan = data.meal_plan;
        // Render QR Code if available
if (data.qr_image_base64) {

    const qrContainer = document.getElementById('poster-qr-container');

    if (qrContainer) {
        qrContainer.innerHTML = `
            <div style="text-align:center;margin-top:20px;">
                <h4>Scan QR Code for Digital Meal Plan</h4>
                <img
                    src="data:image/png;base64,${data.qr_image_base64}"
                    style="width:140px;height:140px;"
                >
            </div>
        `;
    }
}

        // Populate poster headers
        document.getElementById('post-school-title').textContent = schoolMeta.school_name;
        document.getElementById('post-teacher-val').textContent = schoolMeta.teacher_name;
        document.getElementById('post-month-val').textContent = `${schoolMeta.month} 2026`;
        
        // Handle Student Personalization details
        const badge = document.getElementById('post-student-badge');
        if (schoolMeta.student_name) {
            document.getElementById('post-student-name-val').textContent = schoolMeta.student_name;
            
            const bmiTextMap = {
                'Underweight': 'Underweight (ಭಾರ ಕೊರತೆ)',
                'Normal': 'Normal (ಸಾಮಾನ್ಯ)',
                'Overweight': 'Overweight (ಹೆಚ್ಚುವರಿ ತೂಕ)',
                'Obese': 'Obese (ಅತಿ ತೂಕ)'
            };
            const bmiText = bmiTextMap[schoolMeta.bmi_status] || 'Assessed (ಮೌಲ್ಯಮಾಪನ ಮಾಡಲಾಗಿದೆ)';
            
            // Attach optimization strategy title on poster
            const optMap = {
                'standard': 'Standard portions',
                'high_protein': 'High-Protein Boost',
                'calcium_iron': 'Calcium & Iron Rich',
                'low_calorie': 'Calorie-Controlled'
            };
            const strategyName = optMap[schoolMeta.optimization_strategy] || 'Balanced';
            
            document.getElementById('post-student-bmi-val').textContent = `Status: ${bmiText} • Focus: ${strategyName}`;
            
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }

        // Dynamic portion scale warning/notice
        document.getElementById('post-portion-label').innerHTML = `
            <strong>Portion Guideline /ಭಾಗದ ಪ್ರಮಾಣ:</strong> ${schoolMeta.portion_label_en} 
            <span class="lang-kn">${schoolMeta.portion_label_kn}</span>
        `;

        // Clear dynamic cells in grid
        const canvas = document.getElementById('poster-grid-canvas');
        
        const cellCount = canvas.children.length;
        for (let i = cellCount - 1; i >= 7; i--) {
            canvas.removeChild(canvas.children[i]);
        }

        // We will build rows for Breakfast, Lunch, Snack, Dinner
        const slots = [
            { id: 'breakfast', en: 'Breakfast', kn: 'ಬೆಳಗಿನ ತಿಂಡಿ', color: '#60A5FA' },
            { id: 'lunch', en: 'Lunch', kn: 'ಮಧ್ಯಾಹ್ನದ ಊಟ', color: '#34D399' },
            { id: 'snack', en: 'Evening Snack', kn: 'ಸಂಜೆ ತಿಂಡಿ', color: '#FBBF24' },
            { id: 'dinner', en: 'Dinner', kn: 'ರಾತ್ರಿ ಊಟ', color: '#F87171' }
        ];

        const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        slots.forEach(slot => {
            // 1. Create Row Label Cell
            const labelCell = document.createElement('div');
            labelCell.className = 'grid-cell grid-day-label-cell';
            labelCell.innerHTML = `
                <strong style="color:${slot.color}">${slot.en}</strong>
                <span class="kn-lbl" style="color:#475569">${slot.kn}</span>
            `;
            canvas.appendChild(labelCell);

            // 2. Create cells for Monday to Saturday
            daysOfWeek.forEach(day => {
                const dayMeal = mealPlan[day][slot.id];
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                
                const benefit = this.getBenefitTag(dayMeal);
                
                cell.innerHTML = `
                    <div class="meal-block ${slot.id}">
                        <div class="meal-name-en">${dayMeal.name_en}</div>
                        <div class="meal-name-kn lang-kn">${dayMeal.name_kn}</div>
                        <div class="meal-benefit">${benefit}</div>
                    </div>
                `;
                canvas.appendChild(cell);
            });
        });
    }

    getBenefitTag(meal) {
        if (meal.calcium > 200) return 'High Calcium / ಹೇರಳ ಕ್ಯಾಲ್ಸಿಯಂ';
        if (meal.protein > 8) return 'High Protein / ಅಧಿಕ ಪ್ರೋಟೀನ್';
        if (meal.iron > 3.5) return 'Rich Iron / ಸಮೃದ್ಧ ಕಬ್ಬಿಣಾಂಶ';
        if (meal.carbs > 65) return 'Energy Rich / ಅಧಿಕ ಶಕ್ತಿ';
        
        const primaryVit = meal.vitamins.split(',')[0] || 'A';
        return `Vit ${primaryVit} Rich / ಜೀವಸತ್ವ ${primaryVit}`;
    }

    // ==========================================
    // NUTRITION LIBRARY LOGIC
    // ==========================================
    async loadNutritionLibrary() {
        try {
            const response = await fetch('/api/nutrition');
            if (!response.ok) throw new Error('Could not pre-fetch nutrition catalog.');
            
            this.cachedFoods = await response.json();
            this.renderLibraryCards(this.cachedFoods);
        } catch (error) {
            console.error('Failed loading nutrition catalog:', error);
            document.getElementById('library-cards-canvas').innerHTML = `
                <div style="grid-column: 1/-1; text-align:center; padding:50px; color:var(--danger)">
                    Failed to connect to the nutrition database. Please make sure Flask backend is running.
                </div>
            `;
        }
    }

    renderLibraryCards(foods) {
        const container = document.getElementById('library-cards-canvas');
        container.innerHTML = '';

        if (foods.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1/-1; text-align:center; padding:80px; color:#64748B;">
                    <h3>No foods found matching the filters</h3>
                    <p>Try refining your search terms or selecting another category.</p>
                </div>
            `;
            return;
        }

        const emojiMap = {
            "Ragi Dosa": "🥞",
            "Sprout Upma": "🥗",
            "Egg Dosa": "🍳",
            "Idli Sambar": "🍙",
            "Poha with Peanuts": "🍛",
            "Ragi Roti": "🫓",
            "Jowar Dosa": "🥞",
            "Semolina Rava Idli": "🍙",
            "Wheat Upma": "🍲",
            "Ragi Mudde with Sambar": "🌾",
            "Jowar Roti with Veggies": "🫓",
            "Coconut Rice": "🥥",
            "Dal Khichdi": "🍲",
            "Sambar Rice": "🍛",
            "Vegetable Khichdi": "🍲",
            "Lemon Rice with Peanuts": "🍋",
            "Bisi Bele Bath": "🍜",
            "Steamed Rice with Soppu Saaru": "🌿",
            "Groundnut Chikki": "🥜",
            "Banana Sheera": "🍌",
            "Spiced Bengal Gram Usli": "🥗",
            "Steamed Sweet Potato": "🍠",
            "Ragi Malt": "🥛",
            "Moong Dal Payasam": "🥣",
            "Jowar Khichdi": "🍲",
            "Curd Rice": "🥛",
            "Ragi Mudde with Soppu Bassaru": "🌾",
            "Vegetable Pulav": "🍛",
            "Wheat Chapati with Dal Saaru": "🫓",
            "Moong Dal Khichdi": "🍲",
            "Egg Curry with Rice": "🍛",
            "Coastal Fish Curry with Rice": "🐟",
            "Chicken Pulav": "🍛",
            "Mutton Bone Broth": "🥣",
            "Egg Bhurji with Chapati": "🍳",
            "Egg Fried Rice": "🍚",
            "Chicken Saaru with Rice": "🍗"
        };

        foods.forEach(food => {
            const card = document.createElement('div');
            card.className = 'food-card';

            const emoji = emojiMap[food.name_en] || "🍲";
            const vegClass = food.is_veg === 1 ? '' : 'non-veg';

            card.innerHTML = `
                <div class="food-card-header">
                    ${emoji}
                    <span class="category-tag">${food.category}</span>
                    <div class="veg-indicator ${vegClass}" title="${food.is_veg === 1 ? 'Vegetarian' : 'Egg / Non-Veg'}"></div>
                </div>
                <div class="food-card-body">
                    <div class="food-title-block">
                        <h3>${food.name_en}</h3>
                        <p class="lang-kn">${food.name_kn}</p>
                    </div>
                    
                    <div class="nutrition-pill-grid">
                        <div class="nutri-pill"><span>Protein</span><span class="val">${food.protein}g</span></div>
                        <div class="nutri-pill"><span>Calcium</span><span class="val">${food.calcium}mg</span></div>
                        <div class="nutri-pill"><span>Iron</span><span class="val">${food.iron}mg</span></div>
                        <div class="nutri-pill"><span>Carbs</span><span class="val">${food.carbs}g</span></div>
                    </div>

                    <p style="font-size: 11px; font-weight:700; color:var(--accent); margin-bottom: 10px;">
                        Age: ${food.age_recommendation} • Est. Cost: ₹${food.cost}
                    </p>

                    <div class="food-recipe-box">
                        <strong>Recipe Tip / ಅಡುಗೆ ಸಲಹೆ:</strong>
                        ${food.recipe_tip_en}
                        <div class="lang-kn" style="margin-top: 4px; font-size: 10px; line-height: 1.3; color:#475569;">
                            ${food.recipe_tip_kn}
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    }

    filterLibrary() {
        const searchQuery = document.getElementById('lib-search').value.toLowerCase().trim();
        const selectedCat = document.getElementById('lib-filter-cat').value;
        const vegOnly = document.getElementById('lib-filter-veg').value === 'veg';

        let filtered = this.cachedFoods;

        if (searchQuery) {
            filtered = filtered.filter(f => 
                f.name_en.toLowerCase().includes(searchQuery) ||
                f.name_kn.includes(searchQuery) ||
                f.recipe_tip_en.toLowerCase().includes(searchQuery)
            );
        }

        if (selectedCat) {
            filtered = filtered.filter(f => f.category === selectedCat);
        }

        if (vegOnly) {
            filtered = filtered.filter(f => f.is_veg === 1);
        }

        this.renderLibraryCards(filtered);
    }
}

// Instantiate global application context
const app = new NutriPrintApp();
window.app = app;
