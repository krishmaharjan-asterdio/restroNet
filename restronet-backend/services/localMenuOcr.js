const Tesseract = require('tesseract.js');

// Lazy singleton worker — Tesseract.js downloads/caches language data on
// first use and the worker stays warm across calls.
let workerPromise = null;
function getWorker() {
  if (!workerPromise) {
    workerPromise = Tesseract.createWorker('eng');
  }
  return workerPromise;
}

const PRICE_RE = /(?:rs\.?|npr|\$)\s?(\d[\d,]*(?:\.\d{1,2})?)/i;
const VEG_WORDS = ['vegetarian', 'veg', 'paneer', 'tofu', 'vegetable', 'vegan'];
const VEGAN_WORDS = ['vegan', 'plant-based'];
const GF_WORDS = ['gluten-free', 'gluten free', 'gf'];

const SECTION_HEADER_RE = /^[|•·\-–—'"‘’“”\s]*([A-Z][A-Z &()'/]{3,})[|•·\-–—'"‘’“”\s]*$/;

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
      const headerMatch = line.match(SECTION_HEADER_RE);
      if (headerMatch && headerMatch[1].split(/\s+/).length <= 5) {
        currentCategory = toTitleCase(headerMatch[1]);
      }
      continue;
    }

    const price = Number(priceMatch[1].replace(/,/g, ''));
    if (!price || Number.isNaN(price)) continue;

    const name = line.slice(0, priceMatch.index).trim().replace(/[.:*]+$/, '');
    if (!name || name.length < 2) continue;

    // The next line is treated as a description only if it doesn't itself
    // contain a price (which would mean it's actually the next item).
    let description = '';
    const nextLine = lines[i + 1];
    if (nextLine && !nextLine.match(PRICE_RE) && !nextLine.match(SECTION_HEADER_RE)) {
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

  return { items };
}

function toTitleCase(str) {
  return str
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Local, offline replacement for aiService.parseMenuImage — extracts menu
 * items from an image using Tesseract OCR + a rule-based line parser
 * instead of Gemini Vision. No API key or network call required.
 *
 * Weaker than Gemini on messy/handwritten/heavy-bold-font menus (OCR noise
 * on individual words); reliable on clean printed menus where each item is
 * "name ... price" followed by a description line.
 *
 * @param {string} imagePath
 */
async function parseMenuImageLocal(imagePath) {
  const worker = await getWorker();
  const { data } = await worker.recognize(imagePath);
  return parseMenuText(data.text);
}

module.exports = { parseMenuImageLocal, parseMenuText };
