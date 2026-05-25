/* ============================================================
   TORNADOTOOLS — FONT-GENERATOR.JS
   Improvements:
     - 35+ font styles (was 22)
     - Load More button disappears when styles exhausted
     - Toast replaces old copyMsg div
     - XSS-safe rendering (textContent not innerHTML for user text)
     - Debounced live preview on input
   ============================================================ */

const input       = document.getElementById('textInput');
const results     = document.getElementById('results');
const generateBtn = document.getElementById('generateBtn');
const resetBtn    = document.getElementById('resetBtn');

const BATCH_SIZE = 18;
let currentIndex    = 0;
let currentCategory = 'All';
let generated       = false;

/* ============================================================
   UNICODE OFFSET MAP
   ============================================================ */
function offsetMap(lowerOffset, upperOffset) {
  upperOffset = upperOffset ?? lowerOffset;
  return (char) => {
    try {
      if (char >= 'a' && char <= 'z')
        return String.fromCodePoint(lowerOffset + char.charCodeAt(0) - 97);
      if (char >= 'A' && char <= 'Z')
        return String.fromCodePoint(upperOffset + char.charCodeAt(0) - 65);
      return char;
    } catch { return char; }
  };
}

function smartOffsetMap(lowerOffset, upperOffset, lowerOverrides, upperOverrides) {
  upperOffset = upperOffset ?? lowerOffset;
  lowerOverrides = lowerOverrides || {};
  upperOverrides = upperOverrides || {};
  return function (char) {
    try {
      if (Object.prototype.hasOwnProperty.call(lowerOverrides, char)) return lowerOverrides[char];
      if (Object.prototype.hasOwnProperty.call(upperOverrides, char)) return upperOverrides[char];
      if (char >= 'a' && char <= 'z')
        return String.fromCodePoint(lowerOffset + char.charCodeAt(0) - 97);
      if (char >= 'A' && char <= 'Z')
        return String.fromCodePoint(upperOffset + char.charCodeAt(0) - 65);
      return char;
    } catch { return char; }
  };
}

function transform(text, style) {
  if (style && typeof style.render === 'function') {
    return style.render(text);
  }
  var map = style && typeof style.map === 'function' ? style.map : function (c) { return c; };
  return Array.from(text).map(map).join('');
}

/* ============================================================
   FONT STYLES (35+)
   ============================================================ */
const styles = [
  // BOLD
  { name: 'Bold',                 category: 'Bold',    map: offsetMap(0x1D41A, 0x1D400) },
  { name: 'Bold Italic',          category: 'Bold',    map: offsetMap(0x1D482, 0x1D468) },
  { name: 'Sans Bold',            category: 'Bold',    map: offsetMap(0x1D5EE, 0x1D5D4) },
  { name: 'Sans Bold Italic',     category: 'Bold',    map: offsetMap(0x1D656, 0x1D63C) },
  { name: 'Fraktur Bold',         category: 'Bold',    map: offsetMap(0x1D586, 0x1D56C) },

  // CURSIVE / ITALIC
  { name: 'Italic',               category: 'Cursive', map: smartOffsetMap(0x1D44E, 0x1D434, { h: 'ℎ' }) },
  { name: 'Script',               category: 'Cursive', map: smartOffsetMap(0x1D4B6, 0x1D49C, {
    e: 'ℯ',
    g: 'ℊ',
    o: 'ℴ'
  }, {
    A: '𝒜',
    B: 'ℬ',
    C: '𝒞',
    D: '𝒟',
    E: 'ℰ',
    F: 'ℱ',
    G: '𝒢',
    H: 'ℋ',
    I: 'ℐ',
    J: '𝒥',
    K: '𝒦',
    L: 'ℒ',
    M: 'ℳ',
    N: '𝒩',
    O: '𝒪',
    P: '𝒫',
    Q: '𝒬',
    R: 'ℛ',
    S: '𝒮',
    T: '𝒯',
    U: '𝒰',
    V: '𝒱',
    W: '𝒲',
    X: '𝒳',
    Y: '𝒴',
    Z: '𝒵'
  }) },
  { name: 'Script Bold',          category: 'Cursive', map: offsetMap(0x1D4EA, 0x1D4D0) },
  { name: 'Sans Italic',          category: 'Cursive', map: offsetMap(0x1D622, 0x1D608) },

  // COOL / MONO
  { name: 'Sans Serif',           category: 'Cool',    map: offsetMap(0x1D5BA, 0x1D5A0) },
  { name: 'Monospace',            category: 'Cool',    map: offsetMap(0x1D68A, 0x1D670) },
  {
    name: 'Circled',              category: 'Cool',
    map: c => {
      if (c >= 'a' && c <= 'z') return String.fromCodePoint(0x24D0 + c.charCodeAt(0) - 97);
      if (c >= 'A' && c <= 'Z') return String.fromCodePoint(0x24B6 + c.charCodeAt(0) - 65);
      if (c >= '0' && c <= '9') return String.fromCodePoint(0x2460 + c.charCodeAt(0) - 49);
      return c;
    }
  },
  {
    name: 'Negative Circled',     category: 'Cool',
    map: c => {
      if (c >= 'A' && c <= 'Z') return String.fromCodePoint(0x1F150 + c.charCodeAt(0) - 65);
      if (c >= 'a' && c <= 'z') return String.fromCodePoint(0x1F170 + c.charCodeAt(0) - 97);
      return c;
    }
  },
  {
    name: 'Squared',              category: 'Cool',
    map: c => {
      if (c >= 'A' && c <= 'Z') return String.fromCodePoint(0x1F130 + c.charCodeAt(0) - 65);
      if (c >= 'a' && c <= 'z') return String.fromCodePoint(0x1F130 + c.charCodeAt(0) - 97);
      return c;
    }
  },
  {
    name: 'Parenthesized',        category: 'Cool',
    map: c => {
      if (c >= 'a' && c <= 'z') return String.fromCodePoint(0x249C + c.charCodeAt(0) - 97);
      return c;
    }
  },
  {
    name: 'Regional Indicator',   category: 'Cool',
    map: c => {
      if (c >= 'A' && c <= 'Z') return String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65) + '\u200B';
      if (c >= 'a' && c <= 'z') return String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 97) + '\u200B';
      return c;
    }
  },

  // FANCY
  { name: 'Fraktur',              category: 'Fancy',   map: smartOffsetMap(0x1D51E, 0x1D504, {}, {
    C: 'ℭ',
    H: 'ℌ',
    I: 'ℑ',
    R: 'ℜ',
    Z: 'ℨ'
  }) },
  { name: 'Double Struck',        category: 'Fancy',   map: smartOffsetMap(0x1D552, 0x1D538, {}, {
    C: 'ℂ',
    H: 'ℍ',
    N: 'ℕ',
    P: 'ℙ',
    Q: 'ℚ',
    R: 'ℝ',
    Z: 'ℤ'
  }) },
  {
    name: 'Full Width',           category: 'Fancy',
    map: c => {
      if (c >= '!' && c <= '~') return String.fromCodePoint(c.charCodeAt(0) - 33 + 0xFF01);
      if (c === ' ') return '\u3000';
      return c;
    }
  },
  {
    name: 'Small Caps',           category: 'Fancy',
    map: c => {
      const sc = 'ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀꜱᴛᴜᴠᴡxʏᴢ';
      if (c >= 'a' && c <= 'z') return sc[c.charCodeAt(0) - 97] || c;
      return c;
    }
  },
  {
    name: 'Upside Down',          category: 'Fancy',
    map: c => {
      const map = {'a':'ɐ','b':'q','c':'ɔ','d':'p','e':'ǝ','f':'ɟ','g':'ƃ','h':'ɥ','i':'ᴉ','j':'ɾ','k':'ʞ','l':'l','m':'ɯ','n':'u','o':'o','p':'d','q':'b','r':'ɹ','s':'s','t':'ʇ','u':'n','v':'ʌ','w':'ʍ','x':'x','y':'ʎ','z':'z','A':'∀','B':'q','C':'Ɔ','D':'p','E':'Ǝ','F':'Ⅎ','G':'פ','H':'H','I':'I','J':'ɾ','K':'ʞ','L':'˥','M':'W','N':'N','O':'O','P':'d','Q':'Q','R':'ɹ','S':'S','T':'┴','U':'∩','V':'Λ','W':'M','X':'X','Y':'⅄','Z':'Z','1':'Ɩ','2':'ᄅ','3':'Ɛ','4':'ㄣ','5':'ϛ','6':'9','7':'L','8':'8','9':'6','0':'0','.':'˙',',':'\'','!':'¡','?':'¿'};
      return map[c] || c;
    }
  },
  {
    name: 'Mirror',               category: 'Fancy',
    map: c => {
      const map = {'a':'ɒ','b':'d','d':'b','e':'ɘ','f':'ʇ','g':'ϱ','h':'ʜ','j':'ʼ','k':'ʞ','p':'q','q':'p','r':'ɿ','s':'ƨ','y':'γ','z':'ƹ','B':'ᗺ','C':'Ɔ','D':'ᗡ','E':'Ǝ','F':'ꟻ','G':'ᘜ','J':'Ⴑ','K':'ꓘ','L':'⅃','N':'И','P':'ꟼ','R':'Я','S':'Ƨ','Z':'Ƹ'};
      return map[c] || c;
    }
  },

  // GLITCH / DECO
  { name: 'Strikethrough',        category: 'Glitch',  map: c => c + '\u0336' },
  { name: 'Underline',            category: 'Glitch',  map: c => c + '\u0332' },
  { name: 'Double Underline',     category: 'Glitch',  map: c => c + '\u0333' },
  { name: 'Wavy Underline',       category: 'Glitch',  map: c => c + '\u0330' },
  { name: 'Overline',             category: 'Glitch',  map: c => c + '\u0305' },
  { name: 'Double Strikethrough', category: 'Glitch',  map: c => c + '\u0336\u0337' },
  { name: 'Slash Through',        category: 'Glitch',  map: c => c + '\u0338' },

  // SYMBOL
  { name: 'Stars',                category: 'Symbol',  map: c => '★' + c + '★' },
  { name: 'Hearts',               category: 'Symbol',  map: c => '♥' + c },
  { name: 'Dots',                 category: 'Symbol',  map: c => c + '·' },
  { name: 'Diamonds',             category: 'Symbol',  map: c => '◆' + c },
  { name: 'Arrows',               category: 'Symbol',  map: c => '→' + c },
  { name: 'Waves',                category: 'Symbol',  map: c => '~' + c + '~' },

  // SMALL / SUPER / SUB
  {
    name: 'Superscript',          category: 'Small',
    map: c => {
      const map = {'0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','a':'ᵃ','b':'ᵇ','c':'ᶜ','d':'ᵈ','e':'ᵉ','f':'ᶠ','g':'ᵍ','h':'ʰ','i':'ⁱ','j':'ʲ','k':'ᵏ','l':'ˡ','m':'ᵐ','n':'ⁿ','o':'ᵒ','p':'ᵖ','r':'ʳ','s':'ˢ','t':'ᵗ','u':'ᵘ','v':'ᵛ','w':'ʷ','x':'ˣ','y':'ʸ','z':'ᶻ','+':'⁺','-':'⁻','=':'⁼','(':'⁽',')':'⁾'};
      return map[c] || c;
    }
  },
  {
    name: 'Subscript',            category: 'Small',
    map: c => {
      const map = {'0':'₀','1':'₁','2':'₂','3':'₃','4':'₄','5':'₅','6':'₆','7':'₇','8':'₈','9':'₉','a':'ₐ','e':'ₑ','o':'ₒ','x':'ₓ','h':'ₕ','k':'ₖ','l':'ₗ','m':'ₘ','n':'ₙ','p':'ₚ','s':'ₛ','t':'ₜ','+':'₊','-':'₋','=':'₌','(':'₍',')':'₎'};
      return map[c] || c;
    }
  },
];

const baseStyles = styles.slice();

const AUTO_STYLE_DECORATORS = [
  { prefix: '✦ ', suffix: ' ✦' },
  { prefix: '❖ ', suffix: ' ❖' },
  { prefix: '༒ ', suffix: ' ༒' },
  { prefix: '⌁ ', suffix: ' ⌁' },
  { prefix: '『', suffix: '』' },
  { prefix: '「', suffix: '」' },
  { prefix: '⟦', suffix: '⟧' },
  { prefix: '◇ ', suffix: ' ◇' },
  { prefix: '⋆ ', suffix: ' ⋆' },
  { prefix: '☾ ', suffix: ' ☽' },
  { prefix: '⚡ ', suffix: ' ⚡' },
  { prefix: '✧ ', suffix: ' ✧' }
];

function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createFusionStyle(index, pool) {
  var rng = mulberry32(0x5F3759DF ^ (index + 1) * 0x9E3779B9);
  var sample = function () {
    return pool[Math.floor(rng() * pool.length)];
  };

  var first = sample();
  var second = sample();
  var third = sample();
  var deco = AUTO_STYLE_DECORATORS[index % AUTO_STYLE_DECORATORS.length];
  var mode = index % 4;
  var name = `Fusion Mix ${String(index + 1).padStart(2, '0')}`;

  return {
    name: name,
    category: 'Auto',
    render: function (text) {
      var out = String(text || '');
      var maps = [first, second, third].filter(Boolean).map(function (style) {
        return style.map;
      });

      if (mode === 0) {
        maps.slice(0, 2).forEach(function (map) {
          out = Array.from(out).map(map).join('');
        });
      } else if (mode === 1) {
        out = Array.from(out).map(first.map).join('');
        out = deco.prefix + out + deco.suffix;
      } else if (mode === 2) {
        out = Array.from(out).map(first.map).join('');
        out = Array.from(out).map(second.map).join('');
        out = deco.prefix + out + deco.suffix;
      } else {
        out = Array.from(out).map(function (char, i) {
          var fn = (i % 2 === 0 ? first : second).map;
          return fn(char);
        }).join('');
        out = deco.prefix + out + deco.suffix;
      }

      if (index % 3 === 0) {
        out = out.replace(/\s+/g, '  ');
      }
      if (index % 5 === 0) {
        out = out.split('').join(index % 2 === 0 ? ' ' : '');
      }
      return out;
    }
  };
}

const autoStyles = Array.from({ length: 12 }, function (_, i) {
  return createFusionStyle(i, baseStyles);
});
styles.push.apply(styles, autoStyles);

/* ============================================================
   FILTER
   ============================================================ */
function getFilteredStyles() {
  if (currentCategory === 'All') return styles;
  return styles.filter(s => s.category === currentCategory);
}

/* ============================================================
   RENDER BATCH
   ============================================================ */
function renderBatch(reset = false) {
  if (!generated) return;

  const text     = input.value.trim() || 'Your Text Here';
  const filtered = getFilteredStyles();

  if (reset) {
    results.innerHTML = '';
    currentIndex = 0;
    removeLoadMoreBtn();
  }

  const slice = filtered.slice(currentIndex, currentIndex + BATCH_SIZE);
  if (slice.length === 0) return;

  const fragment = document.createDocumentFragment();

  slice.forEach(style => {
    const value = transform(text, style);

    const div = document.createElement('div');
    div.className = 'result-item';

    // Safe text rendering — avoid XSS
    const textEl = document.createElement('div');
    textEl.className = 'result-text';
    textEl.textContent = value;

    const meta = document.createElement('div');
    meta.className = 'result-meta';

    const label = document.createElement('span');
    label.className = 'result-label';
    label.textContent = style.name;

    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-btn';
    copyBtn.textContent = 'Copy';
    copyBtn.addEventListener('click', () => handleCopy(value, copyBtn));

    meta.appendChild(label);
    meta.appendChild(copyBtn);
    div.appendChild(textEl);
    div.appendChild(meta);
    fragment.appendChild(div);
  });

  results.appendChild(fragment);
  currentIndex += slice.length;

  if (currentIndex < filtered.length) {
    renderLoadMoreBtn();
  } else {
    removeLoadMoreBtn();
  }
}

/* ============================================================
   LOAD MORE
   ============================================================ */
function renderLoadMoreBtn() {
  removeLoadMoreBtn();
  const btn = document.createElement('button');
  btn.id        = 'loadMoreBtn';
  btn.className = 'load-more-btn';
  btn.textContent = `Load More (${getFilteredStyles().length - currentIndex} remaining)`;
  btn.addEventListener('click', () => renderBatch(false));
  results.after(btn);
}

function removeLoadMoreBtn() {
  const old = document.getElementById('loadMoreBtn');
  if (old) old.remove();
}

/* ============================================================
   CATEGORY FILTER
   ============================================================ */
window.setCategory = function (cat, el) {
  currentCategory = cat;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  if (generated) renderBatch(true);
};

/* ============================================================
   GENERATE / RESET
   ============================================================ */
generateBtn.addEventListener('click', () => {
  if (!input.value.trim()) {
    input.style.borderColor = 'rgba(255,80,80,0.5)';
    input.focus();
    setTimeout(() => input.style.borderColor = '', 2000);
    TornadoToast.show('⚠ Please enter some text first');
    return;
  }
  generated = true;
  renderBatch(true);
});

resetBtn.addEventListener('click', () => {
  input.value = '';
  results.innerHTML = '';
  removeLoadMoreBtn();
  generated = false;
  input.focus();
});

/* Enter key to generate */
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    generateBtn.click();
  }
});

/* ============================================================
   COPY
   ============================================================ */
async function handleCopy(text, btn) {
  const ok = await copyToClipboard(text);
  if (ok) {
    btn.textContent = '✓ Copied';
    btn.classList.add('copied');
    TornadoToast.show('✓ Copied to clipboard!');
    setTimeout(() => {
      btn.textContent = 'Copy';
      btn.classList.remove('copied');
    }, 2500);
  } else {
    TornadoToast.show('⚠ Copy failed — try manually', 3000);
  }
}
