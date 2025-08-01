// DOM utility functions for TerraSphere Build Editor

const DOMUtils = {
  // Element selection helpers
  getElementById(id) {
    return document.getElementById(id);
  },
  
  getElementsByClassName(className) {
    return Array.from(document.getElementsByClassName(className));
  },
  
  querySelector(selector) {
    return document.querySelector(selector);
  },
  
  querySelectorAll(selector) {
    return Array.from(document.querySelectorAll(selector));
  },
  
  // Class management
  addClass(element, className) {
    if (element) element.classList.add(className);
  },
  
  removeClass(element, className) {
    if (element) element.classList.remove(className);
  },
  
  toggleClass(element, className) {
    if (element) element.classList.toggle(className);
  },
  
  hasClass(element, className) {
    return element ? element.classList.contains(className) : false;
  },
  
  // Element manipulation
  show(element) {
    if (element) element.style.display = 'block';
  },
  
  hide(element) {
    if (element) element.style.display = 'none';
  },
  
  setHTML(element, html) {
    if (element) element.innerHTML = html;
  },
  
  appendHTML(element, html) {
    if (element) element.innerHTML += html;
  },
  
  setText(element, text) {
    if (element) element.textContent = text;
  },
  
  getValue(element) {
    return element ? element.value : '';
  },
  
  setValue(element, value) {
    if (element) element.value = value;
  },
  
  // Event handling
  addEventListener(element, event, handler) {
    if (element) element.addEventListener(event, handler);
  },
  
  removeEventListener(element, event, handler) {
    if (element) element.removeEventListener(event, handler);
  },
  
  // Selection management helpers
  clearSelection(containerSelector, selectedClass = 'selected') {
    const elements = this.querySelectorAll(`${containerSelector} .${selectedClass}`);
    elements.forEach(el => this.removeClass(el, selectedClass));
  },
  
  selectSingle(element, containerSelector, selectedClass = 'selected') {
    this.clearSelection(containerSelector, selectedClass);
    this.addClass(element, selectedClass);
  },
  
  toggleSelection(element, selectedClass = 'selected') {
    this.toggleClass(element, selectedClass);
  },
  
  getSelected(containerSelector, selectedClass = 'selected') {
    return this.querySelectorAll(`${containerSelector} .${selectedClass}`);
  },
  
  // Form helpers
  getFormData(formElement) {
    const formData = new FormData(formElement);
    const data = {};
    for (let [key, value] of formData.entries()) {
      data[key] = value;
    }
    return data;
  },
  
  validateForm(formElement, validators = {}) {
    const data = this.getFormData(formElement);
    const errors = {};
    
    for (let field in validators) {
      const validator = validators[field];
      const value = data[field];
      
      if (typeof validator === 'function') {
        const result = validator(value);
        if (result !== true) {
          errors[field] = result;
        }
      }
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors: errors,
      data: data
    };
  },
  
  // Animation helpers
  fadeIn(element, duration = 300) {
    if (!element) return;
    element.style.opacity = '0';
    element.style.display = 'block';
    
    let start = performance.now();
    
    function animate(currentTime) {
      let elapsed = currentTime - start;
      let progress = elapsed / duration;
      
      if (progress < 1) {
        element.style.opacity = progress;
        requestAnimationFrame(animate);
      } else {
        element.style.opacity = '1';
      }
    }
    
    requestAnimationFrame(animate);
  },
  
  fadeOut(element, duration = 300) {
    if (!element) return;
    let start = performance.now();
    let startOpacity = parseFloat(window.getComputedStyle(element).opacity);
    
    function animate(currentTime) {
      let elapsed = currentTime - start;
      let progress = elapsed / duration;
      
      if (progress < 1) {
        element.style.opacity = startOpacity * (1 - progress);
        requestAnimationFrame(animate);
      } else {
        element.style.opacity = '0';
        element.style.display = 'none';
      }
    }
    
    requestAnimationFrame(animate);
  },
  
  // Scroll helpers
  scrollToTop() {
    window.scrollTo(0, 0);
  },
  
  scrollToElement(element) {
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  },
  
  // Loading states
  showLoading(element, message = 'Loading...') {
    if (element) {
      element.innerHTML = `<div class="loading">${message}</div>`;
    }
  },
  
  // Error display
  showError(element, message) {
    if (element) {
      element.innerHTML = `<div class="error">${message}</div>`;
    }
  }
};

// Make available globally
window.DOMUtils = DOMUtils;