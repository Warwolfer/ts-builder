// DOM utility functions for TerraSphere Build Editor

const DOMUtils = {
  // Element cache for frequently accessed elements
  elementCache: new Map(),
  
  // Element selection helpers with caching
  getElementById(id, useCache = true) {
    if (useCache && this.elementCache.has(id)) {
      return this.elementCache.get(id);
    }
    
    const element = document.getElementById(id);
    if (useCache && element) {
      this.elementCache.set(id, element);
    }
    
    return element;
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
  
  // Optimized DOM manipulation using DocumentFragment
  createFragment() {
    return document.createDocumentFragment();
  },
  
  // Create element with attributes and content efficiently
  createElement(tag, attributes = {}, content = '') {
    const element = document.createElement(tag);
    
    // Set attributes
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'className') {
        element.className = value;
      } else if (key === 'dataset') {
        Object.entries(value).forEach(([dataKey, dataValue]) => {
          element.dataset[dataKey] = dataValue;
        });
      } else {
        element.setAttribute(key, value);
      }
    });
    
    // Set content
    if (content) {
      if (typeof content === 'string') {
        element.textContent = content;
      } else if (content instanceof Node) {
        element.appendChild(content);
      } else if (Array.isArray(content)) {
        content.forEach(child => {
          if (typeof child === 'string') {
            element.appendChild(document.createTextNode(child));
          } else if (child instanceof Node) {
            element.appendChild(child);
          }
        });
      }
    }
    
    return element;
  },
  
  // Batch DOM operations using DocumentFragment
  batchAppend(container, elements) {
    if (!container || !elements || elements.length === 0) return;
    
    const fragment = this.createFragment();
    
    elements.forEach(element => {
      if (typeof element === 'string') {
        const div = document.createElement('div');
        div.innerHTML = element;
        // Move all child nodes to fragment
        while (div.firstChild) {
          fragment.appendChild(div.firstChild);
        }
      } else if (element instanceof Node) {
        fragment.appendChild(element);
      }
    });
    
    container.appendChild(fragment);
  },
  
  // Replace container content with batched elements
  batchReplace(container, elements) {
    if (!container) return;
    
    const fragment = this.createFragment();
    
    if (elements && elements.length > 0) {
      elements.forEach(element => {
        if (typeof element === 'string') {
          const div = document.createElement('div');
          div.innerHTML = element;
          // Move all child nodes to fragment
          while (div.firstChild) {
            fragment.appendChild(div.firstChild);
          }
        } else if (element instanceof Node) {
          fragment.appendChild(element);
        }
      });
    }
    
    // Clear container and append fragment in one operation
    container.innerHTML = '';
    container.appendChild(fragment);
  },
  
  // Optimized innerHTML replacement that preserves event listeners when possible
  setHTMLSafe(element, html) {
    if (!element) return;
    
    // If no existing content, use regular innerHTML
    if (!element.hasChildNodes()) {
      element.innerHTML = html;
      return;
    }
    
    // For existing content, use DocumentFragment approach to minimize reflows
    const fragment = this.createFragment();
    const temp = document.createElement('div');
    temp.innerHTML = html;
    
    while (temp.firstChild) {
      fragment.appendChild(temp.firstChild);
    }
    
    element.innerHTML = '';
    element.appendChild(fragment);
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
  },
  
  // Performance utilities
  clearElementCache() {
    this.elementCache.clear();
  },
  
  // Optimized event delegation
  delegateEvent(container, selector, event, handler) {
    if (!container) return;
    
    container.addEventListener(event, (e) => {
      const target = e.target.closest(selector);
      if (target && container.contains(target)) {
        handler.call(target, e);
      }
    });
  },
  
  // Throttled scroll handler
  onScroll(handler, delay = 16) {
    let ticking = false;
    
    const throttledHandler = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handler();
          ticking = false;
        });
        ticking = true;
      }
    };
    
    window.addEventListener('scroll', throttledHandler);
    return () => window.removeEventListener('scroll', throttledHandler);
  },
  
  // Debounced resize handler
  onResize(handler, delay = 250) {
    let timeout;
    
    const debouncedHandler = () => {
      clearTimeout(timeout);
      timeout = setTimeout(handler, delay);
    };
    
    window.addEventListener('resize', debouncedHandler);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', debouncedHandler);
    };
  },
  
  // Efficient style batch updates
  batchStyles(element, styles) {
    if (!element || !styles) return;
    
    // Batch style changes to minimize reflows
    Object.entries(styles).forEach(([property, value]) => {
      element.style[property] = value;
    });
  },
  
  // Intersection Observer wrapper for lazy loading
  observeIntersection(elements, callback, options = {}) {
    if (!('IntersectionObserver' in window)) {
      // Fallback for browsers without IntersectionObserver
      elements.forEach(element => callback(element, true));
      return { disconnect: () => {} };
    }
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        callback(entry.target, entry.isIntersecting, entry);
      });
    }, {
      threshold: 0.1,
      rootMargin: '50px',
      ...options
    });
    
    elements.forEach(element => observer.observe(element));
    
    return observer;
  },
  
  // Cache commonly used DOM queries
  getCachedElements(selectors) {
    const cache = {};
    
    Object.entries(selectors).forEach(([key, selector]) => {
      const element = this.querySelector(selector);
      if (element) {
        cache[key] = element;
      }
    });
    
    return cache;
  }
};

// Make available globally
window.DOMUtils = DOMUtils;