const Tesseract = require('tesseract.js');
const sharp = require('sharp');

// Lazy singleton worker — Tesseract.js downloads/caches language data on
// first use and the worker stays warm across calls.
let workerPromise = null;
function getWorker() {
  if (!workerPromise) {
    workerPromise = Tesseract.createWorker('eng').then(async (worker) => {
      // PSM 6 = "uniform block of text". Menus are a single column of
      // "name ... price" rows; the auto layout modes misread the wide gap
      // between name and right-aligned price as column structure and garble
      // the line. 6 keeps each row intact.
      await worker.setParameters({ tessedit_pageseg_mode: '6' });
      return worker;
    });
  }
  return workerPromise;
}

/**
 * Screenshots / phone photos of menus come in around screen resolution, which
 * leaves body text (item names, descriptions) at ~13px — well below what
 * Tesseract needs. Upscaling to ~2400px wide and flattening to high-contrast
 * grayscale takes the local OCR from unusable to accurate on printed menus.
 */
async function preprocess(imagePath) {
  return sharp(imagePath)
    .resize({ width: 2400, withoutEnlargement: false })
    .grayscale()
    .normalize()
    .sharpen()
    .toBuffer();
}

// Garble detection. When OCR fails on a menu ("eet pao ta ice mae",
// "Cree tase acon its") the words are letter-salad — they almost never land
// on real English cooking vocabulary. A correctly-read menu line, name plus
// description, is dense with these words. If barely any item text hits the
// list, the OCR pass failed and the caller should fall back to Gemini rather
// than import nonsense. The list is deliberately broad and English-leaning;
// an exotic menu that scores low just triggers the (rare) paid fallback,
// which is the safe direction to be wrong in.
const MENU_VOCAB = new Set([
  // structural / prep words that appear on almost every menu
  'the', 'and', 'with', 'of', 'in', 'on', 'a', 'our', 'house', 'style', 'classic',
  'special', 'signature', 'served', 'topped', 'fresh', 'seasonal', 'homemade',
  'traditional', 'organic', 'local', 'daily', 'side', 'sides', 'add', 'choice',
  'grilled', 'fried', 'deep', 'pan', 'stir', 'steamed', 'roasted', 'baked',
  'braised', 'smoked', 'poached', 'seared', 'charred', 'toasted', 'crispy',
  'creamy', 'spiced', 'spicy', 'sweet', 'sour', 'tangy', 'rich', 'light',
  'marinated', 'battered', 'glazed', 'stuffed', 'wrapped', 'layered', 'slow',
  'hand', 'wood', 'fire', 'flame', 'cut', 'sliced', 'minced', 'whipped', 'spun',
  // proteins
  'chicken', 'beef', 'pork', 'lamb', 'mutton', 'goat', 'duck', 'fish', 'tuna',
  'salmon', 'prawn', 'prawns', 'shrimp', 'crab', 'squid', 'calamari', 'egg',
  'eggs', 'bacon', 'ham', 'sausage', 'steak', 'ribs', 'wings', 'patty',
  'patties', 'meat', 'buff', 'buffalo', 'seafood',
  // veg / dairy / staples
  'cheese', 'cheddar', 'mozzarella', 'parmesan', 'feta', 'paneer', 'cream',
  'butter', 'milk', 'yogurt', 'curd', 'tofu', 'beans', 'lentil', 'lentils',
  'dal', 'chickpea', 'potato', 'potatoes', 'tomato', 'tomatoes', 'onion',
  'onions', 'garlic', 'ginger', 'chili', 'chilli', 'pepper', 'peppers',
  'mushroom', 'mushrooms', 'spinach', 'lettuce', 'cabbage', 'carrot', 'corn',
  'avocado', 'cilantro', 'coriander', 'basil', 'mint', 'lime', 'lemon',
  'pickle', 'pickles', 'slaw', 'salad', 'greens', 'cucumber',
  // carbs / dishes
  'rice', 'noodle', 'noodles', 'pasta', 'spaghetti', 'bread', 'bun', 'buns',
  'roll', 'rolls', 'wrap', 'toast', 'sourdough', 'bagel', 'croissant', 'muffin',
  'waffle', 'pancake', 'dumpling', 'dumplings', 'momo', 'taco', 'tacos',
  'burrito', 'quesadilla', 'pizza', 'burger', 'sandwich', 'curry', 'soup',
  'stew', 'broth', 'biryani', 'fried', 'risotto', 'sushi', 'sashimi', 'tempura',
  'kebab', 'tikka', 'tandoori', 'thali', 'platter', 'bowl', 'fries',
  // sauces / extras / drinks
  'sauce', 'gravy', 'dip', 'chutney', 'salsa', 'aioli', 'mayo', 'dressing',
  'marinara', 'pesto', 'hummus', 'guacamole', 'crema', 'syrup', 'honey',
  'sugar', 'salt', 'oil', 'vinegar', 'stock', 'coffee', 'espresso', 'latte',
  'cappuccino', 'mocha', 'americano', 'tea', 'chai', 'juice', 'soda', 'shake',
  'smoothie', 'lassi', 'water', 'beer', 'wine', 'cocktail', 'margarita',
  'berries', 'berry', 'mango', 'banana', 'apple', 'chocolate', 'vanilla',
  'caramel', 'coconut', 'peanut', 'peanuts', 'nuts', 'sesame', 'truffle',
  'vegetarian', 'vegan', 'gluten', 'free',
]);

function menuVocabRatio(str) {
  const words = str.toLowerCase().match(/[a-z]+/g) || [];
  if (words.length === 0) return 0;
  const hits = words.filter(w => MENU_VOCAB.has(w)).length;
  return hits / words.length;
}

const PRICE_RE = /(?:rs\.?|npr|\$)\s?(\d[\d,]*(?:\.\d{1,2})?)/i;
const VEG_WORDS = ['vegetarian', 'veg', 'paneer', 'tofu', 'vegetable', 'vegan'];
const VEGAN_WORDS = ['vegan', 'plant-based'];
const GF_WORDS = ['gluten-free', 'gluten free', 'gf'];

const HEADER_LINE_RE = /^[|•·\-–—'"‘’“”\s]*([A-Za-z][A-Za-z &()'/]{2,})[|•·\-–—'"‘’“”\s]*$/;
const HEADER_STOPWORDS = new Set(['&', 'and', 'of', 'the', 'with']);

/**
 * Decide whether a price-less line is a section header (e.g. "Burgers",
 * "MOMO (STEAMED DUMPLINGS)", "Pasta & Risotto") rather than noise or a
 * stray description.
 *
 * ALL-CAPS short lines are taken as headers on their own. Title/mixed-case
 * lines are only headers when the next line is a priced item — menus put the
 * first dish directly under the heading, and that lookahead keeps ordinary
 * sentences from being promoted to categories.
 *
 * @returns {string|null} the normalized category name, or null
 */
function sectionHeader(line, nextLine) {
  if (!line) return null;
  const m = line.match(HEADER_LINE_RE);
  if (!m) return null;
  const text = m[1].trim();
  const words = text.split(/\s+/);
  if (words.length > 5 || text.length > 32) return null;

  const isAllCaps = text === text.toUpperCase() && /[A-Z]{3}/.test(text);
  if (isAllCaps) return toTitleCase(text);

  const isTitleCase = words.every(
    w => /^[A-Z]/.test(w) || HEADER_STOPWORDS.has(w.toLowerCase())
  );
  if (isTitleCase && nextLine && PRICE_RE.test(nextLine)) return toTitleCase(text);
  return null;
}

/**
 * Splits raw OCR text into menu items using a "name ... price" line followed
 * by an optional description line on the next line. This structural pattern
 * held up across varied fonts/layouts even when individual words were
 * OCR-garbled, so it's the anchor rather than trying to clean up every word.
 *
 * @param {string} rawText - Tesseract's recognized text
 * @returns {{ items: Array<object> }}
 */
function parseMenuText(rawText) {
  const lines = rawText
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  const items = [];
  let currentCategory = 'Menu';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const priceMatch = line.match(PRICE_RE);

    if (!priceMatch) {
      // No price on this line — either a section header, or noise/footer text.
      const header = sectionHeader(line, lines[i + 1]);
      if (header) currentCategory = header;
      continue;
    }

    const price = Number(priceMatch[1].replace(/,/g, ''));
    if (!price || Number.isNaN(price)) continue;

    // "+Rs 100" style is a surcharge/add-on in a footer note, not an item price.
    const before = line.slice(0, priceMatch.index).trimEnd();
    if (before.endsWith('+')) continue;

    const name = before.trim().replace(/[.:*+]+$/, '');
    if (!name || name.length < 2) continue;
    // Item names are short; a long line that happens to contain a price is a
    // sentence (footer disclaimer, "gluten-free buns available +Rs 100").
    if (name.split(/\s+/).length > 8) continue;

    // The next line is treated as a description only if it doesn't itself
    // contain a price (which would mean it's actually the next item).
    let description = '';
    const nextLine = lines[i + 1];
    if (nextLine && !nextLine.match(PRICE_RE) && !sectionHeader(nextLine, lines[i + 2])) {
      description = nextLine;
      i++; // consume it
    }

    const searchText = `${name} ${description}`.toLowerCase();
    items.push({
      name: toTitleCase(name),
      description,
      price,
      category: currentCategory,
      isVegetarian: VEG_WORDS.some(w => searchText.includes(w)),
      isVegan: VEGAN_WORDS.some(w => searchText.includes(w)),
      isGlutenFree: GF_WORDS.some(w => searchText.includes(w)),
    });
  }

  // Quality gate: if the extracted text barely touches menu vocabulary, the
  // OCR pass produced garble — return nothing so the caller falls back to
  // Gemini instead of importing junk. Needs a few items before the ratio
  // means anything.
  if (items.length >= 3) {
    const allText = items.map(it => `${it.name} ${it.description}`).join(' ');
    if (menuVocabRatio(allText) < 0.15) {
      return { items: [] };
    }
  }

  return { items };
}

function toTitleCase(str) {
  return str.replace(/[A-Za-z]+/g, (w) => {
    // Keep vowel-less all-caps runs as acronyms (BBQ, GF, BLT).
    if (/^[A-Z]{2,4}$/.test(w) && !/[AEIOU]/.test(w)) return w;
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  });
}

/**
 * Local, offline replacement for aiService.parseMenuImage — upscales and
 * flattens the image (sharp), runs Tesseract OCR, then a rule-based line
 * parser. No API key or network call required.
 *
 * Reliable on printed menus laid out as "name ... price" with an optional
 * description line. Still weaker than Gemini on handwritten menus; when the
 * OCR comes back as garble the quality gate in parseMenuText returns no
 * items so the caller falls back to Gemini.
 *
 * @param {string} imagePath
 */
async function parseMenuImageLocal(imagePath) {
  const worker = await getWorker();
  let input = imagePath;
  try {
    input = await preprocess(imagePath);
  } catch (err) {
    // Fall back to the raw image if preprocessing fails (unsupported format,
    // corrupt upload) — Tesseract may still manage.
    console.error('Menu image preprocess failed, using raw image:', err.message);
  }
  const { data } = await worker.recognize(input);
  return parseMenuText(data.text);
}

module.exports = { parseMenuImageLocal, parseMenuText };
