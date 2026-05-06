const { Cuisine, Tag, Category } = require('../models/Metadata');
const { rebuildAllVectors } = require('../services/cbf-pipeline');

// ─── Cuisines ───────────────────────────────────────────────────────────────

const getCuisines = async (req, res, next) => {
  try {
    const cuisines = await Cuisine.find({ isActive: true }).sort('name');
    res.json({ success: true, count: cuisines.length, cuisines });
  } catch (error) { next(error); }
};

const createCuisine = async (req, res, next) => {
  try {
    const cuisine = await Cuisine.create(req.body);
    rebuildAllVectors().catch(console.error); // Metadata change affects vectors
    res.status(201).json({ success: true, cuisine });
  } catch (error) { next(error); }
};

// ─── Tags ───────────────────────────────────────────────────────────────────

const getTags = async (req, res, next) => {
  try {
    const tags = await Tag.find({ isActive: true }).sort('category name');
    res.json({ success: true, count: tags.length, tags });
  } catch (error) { next(error); }
};

const createTag = async (req, res, next) => {
  try {
    const tag = await Tag.create(req.body);
    rebuildAllVectors().catch(console.error); // Metadata change affects vectors
    res.status(201).json({ success: true, tag });
  } catch (error) { next(error); }
};

// ─── Categories ─────────────────────────────────────────────────────────────

const getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({ isActive: true }).sort('name');
    res.json({ success: true, count: categories.length, categories });
  } catch (error) { next(error); }
};

const createCategory = async (req, res, next) => {
  try {
    const category = await Category.create(req.body);
    res.status(201).json({ success: true, category });
  } catch (error) { next(error); }
};

module.exports = {
  getCuisines, createCuisine,
  getTags, createTag,
  getCategories, createCategory,
};
