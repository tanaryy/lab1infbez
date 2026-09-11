class Slider {
    constructor(sliderId) {
        this.slider = document.getElementById(sliderId);
        this.slides = this.slider.querySelectorAll('.slide');
        this.dots = this.slider.parentElement.querySelectorAll('.slider-dot');
        this.prevBtn = this.slider.parentElement.querySelector('.prev');
        this.nextBtn = this.slider.parentElement.querySelector('.next');
        this.counterCurrent = this.slider.parentElement.querySelector('.current-slide');
        this.counterTotal = this.slider.parentElement.querySelector('.total-slides');
        
        this.currentSlide = 0;
        this.totalSlides = this.slides.length;
        this.autoSlideInterval = null;
        this.autoSlideDelay = 5000; // 5 seconds
        this.isAnimating = false;
        
        this.init();
    }
    
    init() {
        // Set total slides counter
        this.counterTotal.textContent = this.totalSlides;
        
        // Initialize first slide
        this.showSlide(this.currentSlide);
        
        // Start auto sliding
        this.startAutoSlide();
        
        // Event listeners
        if (this.prevBtn) {
            this.prevBtn.addEventListener('click', () => this.prevSlide());
        }
        
        if (this.nextBtn) {
            this.nextBtn.addEventListener('click', () => this.nextSlide());
        }
        
        // Dot navigation
        this.dots.forEach(dot => {
            dot.addEventListener('click', () => {
                const slideIndex = parseInt(dot.getAttribute('data-slide'));
                this.goToSlide(slideIndex);
            });
        });
        
        // Pause auto slide on hover
        this.slider.addEventListener('mouseenter', () => this.pauseAutoSlide());
        this.slider.addEventListener('mouseleave', () => this.startAutoSlide());
        
        // Touch support for mobile
        this.setupTouchEvents();
    }
    
    showSlide(index) {
        if (this.isAnimating) return;
        
        this.isAnimating = true;
        
        // Hide all slides
        this.slides.forEach(slide => {
            slide.classList.remove('active');
            slide.style.opacity = '0';
            slide.style.visibility = 'hidden';
        });
        
        // Remove active class from all dots
        this.dots.forEach(dot => dot.classList.remove('active'));
        
        // Show current slide
        const currentSlide = this.slides[index];
        currentSlide.classList.add('active');
        
        // Use requestAnimationFrame for smooth transition
        requestAnimationFrame(() => {
            currentSlide.style.opacity = '1';
            currentSlide.style.visibility = 'visible';
            
            // Update counter
            this.counterCurrent.textContent = index + 1;
            
            // Update current slide index
            this.currentSlide = index;
            
            // Activate current dot
            this.dots[index].classList.add('active');
            
            // Reset animation flag
            setTimeout(() => {
                this.isAnimating = false;
            }, 1000); // Match CSS transition duration
        });
    }
    
    nextSlide() {
        if (this.isAnimating) return;
        
        let nextIndex = (this.currentSlide + 1) % this.totalSlides;
        this.showSlide(nextIndex);
        this.resetAutoSlide();
    }
    
    prevSlide() {
        if (this.isAnimating) return;
        
        let prevIndex = (this.currentSlide - 1 + this.totalSlides) % this.totalSlides;
        this.showSlide(prevIndex);
        this.resetAutoSlide();
    }
    
    goToSlide(index) {
        if (this.isAnimating || index === this.currentSlide) return;
        
        if (index >= 0 && index < this.totalSlides) {
            this.showSlide(index);
            this.resetAutoSlide();
        }
    }
    
    startAutoSlide() {
        if (this.autoSlideInterval) {
            clearInterval(this.autoSlideInterval);
        }
        
        this.autoSlideInterval = setInterval(() => {
            this.nextSlide();
        }, this.autoSlideDelay);
    }
    
    pauseAutoSlide() {
        if (this.autoSlideInterval) {
            clearInterval(this.autoSlideInterval);
            this.autoSlideInterval = null;
        }
    }
    
    resetAutoSlide() {
        this.pauseAutoSlide();
        this.startAutoSlide();
    }
    
    setupTouchEvents() {
        let touchStartX = 0;
        let touchEndX = 0;
        let touchStartY = 0;
        let touchEndY = 0;
        
        this.slider.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
            this.pauseAutoSlide();
        });
        
        this.slider.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            touchEndY = e.changedTouches[0].screenY;
            
            // Check if it's mostly horizontal swipe
            const deltaX = Math.abs(touchEndX - touchStartX);
            const deltaY = Math.abs(touchEndY - touchStartY);
            
            if (deltaX > deltaY && deltaX > 30) { // Minimum 30px horizontal movement
                this.handleSwipe(touchStartX, touchEndX);
            }
            
            this.startAutoSlide();
        });
    }
    
    handleSwipe(startX, endX) {
        const swipeThreshold = 50; // Minimum swipe distance in pixels
        
        if (startX - endX > swipeThreshold) {
            // Swipe left - next slide
            this.nextSlide();
        } else if (endX - startX > swipeThreshold) {
            // Swipe right - previous slide
            this.prevSlide();
        }
    }
    
    // Public method to manually change slide
    changeSlide(index) {
        this.goToSlide(index);
    }
    
    // Public method to get current slide
    getCurrentSlide() {
        return this.currentSlide;
    }
    
    // Public method to stop/start auto slide
    stopAutoSlide() {
        this.pauseAutoSlide();
    }
    
    startAutoSlideManually() {
        this.startAutoSlide();
    }
}

// Initialize slider when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const slider = new Slider('mainSlider');
    
    // Make slider available globally for debugging
    window.slider = slider;
    
    // Debug logging
    console.log('Slider initialized with', slider.totalSlides, 'slides');
});