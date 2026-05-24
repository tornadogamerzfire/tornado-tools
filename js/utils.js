/* ============================================================
   TORNADOTOOLS — UTILS.JS
   Shared utility functions
   ============================================================ */

/**
 * Format a number as Indian currency string
 * @param {number} n
 * @returns {string}
 */
window.formatINR = function (n) {
  if (isNaN(n)) return '₹0';
  return '₹' + Number(n.toFixed(2)).toLocaleString('en-IN');
};

/**
 * Format a number with commas
 * @param {number} n
 * @param {number} decimals
 * @returns {string}
 */
window.formatNum = function (n, decimals = 2) {
  if (isNaN(n)) return '0';
  return Number(n.toFixed(decimals)).toLocaleString('en-IN');
};

/**
 * Debounce a function
 * @param {Function} fn
 * @param {number} delay
 * @returns {Function}
 */
window.debounce = function (fn, delay) {
  let t;
  return function (...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), delay);
  };
};

/**
 * Safe copy to clipboard with fallback
 * @param {string} text
 * @returns {Promise<boolean>}
 */
window.copyToClipboard = async function (text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    return true;
  } catch {
    return false;
  }
};

/**
 * Show/hide element
 */
window.showEl = function (el) {
  if (!el) return;
  el.style.display = 'block';
};

window.hideEl = function (el) {
  if (!el) return;
  el.style.display = 'none';
};

/**
 * Animate a number counting up
 * @param {HTMLElement} el
 * @param {number} target
 * @param {number} duration ms
 * @param {string} prefix
 * @param {string} suffix
 */
window.animateCount = function (el, target, duration = 800, prefix = '', suffix = '') {
  const start = performance.now();
  const from  = 0;

  function step(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    const current = from + (target - from) * ease;

    if (Number.isInteger(target)) {
      el.textContent = prefix + Math.round(current).toLocaleString('en-IN') + suffix;
    } else {
      el.textContent = prefix + current.toFixed(2) + suffix;
    }

    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = prefix + target + suffix;
  }

  requestAnimationFrame(step);
};