// Фитнес-тестирование
class FitnessTest {
    constructor() {
        this.modal = document.getElementById('fitnessTestModal');
        this.closeBtn = document.getElementById('closeTestModal');
        this.form = document.getElementById('fitnessTestForm');
        this.steps = document.querySelectorAll('.test-step');
        this.currentStep = 1;
        this.totalSteps = this.steps.length;
        this.progressBar = document.getElementById('testProgress');
        this.currentStepEl = document.getElementById('currentStep');
        this.totalStepsEl = document.getElementById('totalSteps');
        this.resultsContainer = document.getElementById('testResults');
        
        this.init();
    }
    
    init() {
        // Установка общего количества шагов
        this.totalStepsEl.textContent = this.totalSteps;
        
        // Закрытие модального окна
        this.closeBtn.addEventListener('click', () => this.closeModal());
        
        // Клик вне модального окна
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closeModal();
            }
        });
        
        // Кнопки навигации по шагам
        this.form.addEventListener('click', (e) => {
            if (e.target.classList.contains('next-step')) {
                const nextStep = parseInt(e.target.getAttribute('data-next'));
                this.goToStep(nextStep);
            }
            
            if (e.target.classList.contains('prev-step')) {
                const prevStep = parseInt(e.target.getAttribute('data-prev'));
                this.goToStep(prevStep);
            }
        });
        
        // Отправка формы
        this.form.addEventListener('submit', (e) => this.submitForm(e));
        
        // ESC для закрытия
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.style.display === 'flex') {
                this.closeModal();
            }
        });
    }
    
    openModal() {
        this.modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        this.resetTest();
    }
    
    closeModal() {
        this.modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
    
    resetTest() {
        this.currentStep = 1;
        this.updateProgress();
        this.showStep(1);
        this.form.reset();
    }
    
    goToStep(step) {
        // Валидация текущего шага
        if (!this.validateStep(this.currentStep)) {
            return;
        }
        
        // Генерация результатов на последнем шаге
        if (step === this.totalSteps) {
            this.generateResults();
        }
        
        this.showStep(step);
        this.currentStep = step;
        this.updateProgress();
        
        // Прокрутка к началу шага
        this.modal.querySelector('.modal-body').scrollTop = 0;
    }
    
    showStep(step) {
        // Скрыть все шаги
        this.steps.forEach(s => {
            s.classList.remove('active');
            s.style.display = 'none';
        });
        
        // Показать нужный шаг
        const stepEl = document.querySelector(`[data-step="${step}"]`);
        if (stepEl) {
            stepEl.classList.add('active');
            stepEl.style.display = 'block';
        }
    }
    
    updateProgress() {
        const progress = ((this.currentStep - 1) / (this.totalSteps - 1)) * 100;
        this.progressBar.style.width = `${progress}%`;
        this.currentStepEl.textContent = this.currentStep;
    }
    
    validateStep(step) {
        const stepEl = document.querySelector(`[data-step="${step}"]`);
        const requiredInputs = stepEl.querySelectorAll('[required]');
        let isValid = true;
        
        for (const input of requiredInputs) {
            if (!input.value.trim()) {
                input.classList.add('error');
                isValid = false;
                
                // Добавляем сообщение об ошибке
                let errorMsg = input.parentElement.querySelector('.error-message');
                if (!errorMsg) {
                    errorMsg = document.createElement('div');
                    errorMsg.className = 'error-message';
                    errorMsg.style.color = 'var(--danger)';
                    errorMsg.style.fontSize = '12px';
                    errorMsg.style.marginTop = '5px';
                    input.parentElement.appendChild(errorMsg);
                }
                errorMsg.textContent = 'Это поле обязательно для заполнения';
                
                // Удаляем класс ошибки при исправлении
                input.addEventListener('input', function() {
                    this.classList.remove('error');
                    if (errorMsg) errorMsg.remove();
                });
            } else {
                input.classList.remove('error');
                const errorMsg = input.parentElement.querySelector('.error-message');
                if (errorMsg) errorMsg.remove();
            }
        }
        
        // Специальная валидация для чекбоксов на шаге 2
        if (step === 2) {
            const checkboxes = stepEl.querySelectorAll('input[name="goals"]:checked');
            if (checkboxes.length === 0) {
                this.showNotification('Пожалуйста, выберите хотя бы одну цель', 'error');
                isValid = false;
            }
        }
        
        if (!isValid) {
            this.showNotification('Пожалуйста, заполните все обязательные поля', 'error');
        }
        
        return isValid;
    }
    
    calculateBMI(weight, height) {
        // BMI = вес (кг) / (рост (м))^2
        const heightInMeters = height / 100;
        return (weight / (heightInMeters * heightInMeters)).toFixed(1);
    }
    
    getBMICategory(bmi) {
        if (bmi < 18.5) return 'Недостаточный вес';
        if (bmi < 25) return 'Нормальный вес';
        if (bmi < 30) return 'Избыточный вес';
        return 'Ожирение';
    }
    
    calculateDailyCalories(weight, height, age, gender, activityLevel) {
        // Формула Миффлина-Сан Жеора
        let bmr;
        if (gender === 'male') {
            bmr = 10 * weight + 6.25 * height - 5 * age + 5;
        } else {
            bmr = 10 * weight + 6.25 * height - 5 * age - 161;
        }
        
        // Коэффициент активности
        const activityMultipliers = {
            'sedentary': 1.2,
            'light': 1.375,
            'moderate': 1.55,
            'active': 1.725,
            'athlete': 1.9
        };
        
        const calories = bmr * (activityMultipliers[activityLevel] || 1.375);
        
        return Math.round(calories);
    }
    
    generateResults() {
        const formData = new FormData(this.form);
        const data = Object.fromEntries(formData.entries());
        
        // Парсим массивы для чекбоксов
        data.goals = formData.getAll('goals');
        data.restrictions = formData.getAll('restrictions');
        data.time_preference = formData.getAll('time_preference');
        data.training_type = formData.getAll('training_type');
        
        // Рассчитываем показатели
        const weight = parseFloat(data.weight);
        const height = parseFloat(data.height);
        const age = parseInt(data.age);
        
        const bmi = this.calculateBMI(weight, height);
        const bmiCategory = this.getBMICategory(bmi);
        const dailyCalories = this.calculateDailyCalories(
            weight, height, age, data.gender, data.activity_level
        );
        
        // Генерация HTML результатов
        this.resultsContainer.innerHTML = `
            <div class="result-item">
                <h4 class="result-title"><i class="fas fa-heartbeat"></i> Индекс массы тела (ИМТ)</h4>
                <div class="result-content">
                    <p>Ваш ИМТ: <span class="bmi-value">${bmi}</span></p>
                    <p>Категория: <strong>${bmiCategory}</strong></p>
                    <p>ИМТ помогает оценить соответствие веса и роста.</p>
                </div>
            </div>
            
            <div class="result-item">
                <h4 class="result-title"><i class="fas fa-fire"></i> Суточная норма калорий</h4>
                <div class="result-content">
                    <p>Для поддержания текущего веса вам необходимо потреблять примерно:</p>
                    <p><span class="bmi-value">${dailyCalories}</span> ккал/день</p>
                    ${data.goals.includes('weight_loss') ? 
                        `<p><strong>Для похудения:</strong> ${Math.round(dailyCalories * 0.85)} ккал/день</p>` : ''}
                    ${data.goals.includes('muscle_gain') ? 
                        `<p><strong>Для набора массы:</strong> ${Math.round(dailyCalories * 1.15)} ккал/день</p>` : ''}
                </div>
            </div>
            
            <div class="result-item">
                <h4 class="result-title"><i class="fas fa-chart-line"></i> Рекомендации</h4>
                <div class="result-content">
                    <ul class="recommendation-list">
                        ${this.generateRecommendations(data, bmi)}
                    </ul>
                </div>
            </div>
            
            <div class="result-item">
                <h4 class="result-title"><i class="fas fa-dumbbell"></i> Предлагаемые тренировки</h4>
                <div class="result-content">
                    <p>На основе ваших предпочтений рекомендуем:</p>
                    <ul class="recommendation-list">
                        ${this.generateTrainingRecommendations(data)}
                    </ul>
                </div>
            </div>
        `;
    }
    
    generateRecommendations(data, bmi) {
        let recommendations = [];
        
        // Рекомендации по ИМТ
        if (bmi < 18.5) {
            recommendations.push('Рекомендуем программу для набора мышечной массы');
            recommendations.push('Увеличьте потребление белковой пищи');
            recommendations.push('Силовые тренировки 3-4 раза в неделю');
        } else if (bmi < 25) {
            recommendations.push('Поддерживайте текущий режим тренировок');
            recommendations.push('Сбалансированное питание с достаточным количеством белка');
            recommendations.push('Комбинируйте силовые и кардио-тренировки');
        } else {
            recommendations.push('Рекомендуем программу для снижения веса');
            recommendations.push('Увеличьте количество кардио-тренировок');
            recommendations.push('Сократите потребление быстрых углеводов');
        }
        
        // Рекомендации по целям
        if (data.goals.includes('weight_loss')) {
            recommendations.push('Интервальные тренировки HIIT 2-3 раза в неделю');
            recommendations.push('Ежедневная активность (ходьба 10,000 шагов)');
            recommendations.push('Контроль порций и подсчет калорий');
        }
        
        if (data.goals.includes('muscle_gain')) {
            recommendations.push('Силовые тренировки 4-5 раз в неделю');
            recommendations.push('Потребление 1.6-2.2г белка на кг веса');
            recommendations.push('Достаточное время для восстановления');
        }
        
        if (data.goals.includes('endurance')) {
            recommendations.push('Кардио-тренировки 3-5 раз в неделю');
            recommendations.push('Интервальные тренировки для улучшения выносливости');
            recommendations.push('Постепенное увеличение нагрузки');
        }
        
        if (data.goals.includes('tonus')) {
            recommendations.push('Круговые тренировки 3-4 раза в неделю');
            recommendations.push('Упражнения с собственным весом');
            recommendations.push('Растяжка после каждой тренировки');
        }
        
        if (data.goals.includes('health')) {
            recommendations.push('Регулярные умеренные физические нагрузки');
            recommendations.push('Сбалансированное питание с овощами и фруктами');
            recommendations.push('Достаточный сон и управление стрессом');
        }
        
        // Рекомендации по воде
        if (data.water_intake === 'low') {
            recommendations.push('Увеличьте потребление воды до 1.5-2 литров в день');
        }
        
        return recommendations.map(rec => `<li>${rec}</li>`).join('');
    }
    
    generateTrainingRecommendations(data) {
        let trainings = [];
        
        if (data.training_type.includes('gym')) {
            trainings.push('Индивидуальная программа в тренажерном зале');
        }
        
        if (data.training_type.includes('group')) {
            trainings.push('Групповые занятия: функциональный тренинг, TRX');
        }
        
        if (data.training_type.includes('cardio')) {
            trainings.push('Кардио-зона: беговые дорожки, велотренажеры, эллипсы');
        }
        
        if (data.training_type.includes('pool')) {
            trainings.push('Аквааэробика и свободное плавание в бассейне');
        }
        
        if (data.training_type.includes('yoga')) {
            trainings.push('Йога и пилатес для гибкости и укрепления мышц кора');
        }
        
        // Добавляем рекомендации по расписанию
        trainings.push(`Тренировки ${data.days_per_week} дней в неделю`);
        
        // Добавляем рекомендации по времени
        if (data.time_preference.length > 0) {
            const times = data.time_preference.map(t => {
                if (t === 'morning') return 'утро';
                if (t === 'day') return 'день';
                return 'вечер';
            }).join(', ');
            trainings.push(`В удобное для вас время: ${times}`);
        }
        
        return trainings.map(train => `<li>${train}</li>`).join('');
    }
    
    submitForm(e) {
        e.preventDefault();
        
        if (!this.validateStep(this.currentStep)) {
            return;
        }
        
        const submitBtn = this.form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Отправка...';
        submitBtn.disabled = true;
        
        // Симуляция отправки на сервер
        setTimeout(() => {
            this.showNotification('Спасибо! Ваши данные получены. Специалист свяжется с вами в течение 24 часов для составления персонального плана.', 'success');
            this.closeModal();
            
            // Сброс кнопки
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }, 2000);
    }
    
    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close"><i class="fas fa-times"></i></button>
        `;
        
        document.body.appendChild(notification);
        
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        });
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }
}

// Инициализация теста при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    const fitnessTest = new FitnessTest();
    
    // Делаем тест доступным глобально
    window.fitnessTest = fitnessTest;
    
    // Debug logging
    console.log('Fitness test initialized');
});