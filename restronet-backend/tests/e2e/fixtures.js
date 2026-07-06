const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const Admin = require('../../models/Admin');
const Venue = require('../../models/Venue');
const { Cuisine, Category, Tag } = require('../../models/Metadata');

const signUserToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '1h' });

const signAdminToken = (adminId) =>
  jwt.sign({ id: adminId }, process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET, { expiresIn: '1h' });

const createUser = async (overrides = {}) => {
  const user = await User.create({
    name: 'E2E Diner',
    email: `diner-${Date.now()}-${Math.random().toString(36).slice(2)}@e2e.test`,
    password: 'TestPass123!',
    ...overrides,
  });
  return { user, token: signUserToken(user._id) };
};

const createSuperadmin = async (overrides = {}) => {
  const admin = await Admin.create({
    name: 'E2E Superadmin',
    email: `superadmin-${Date.now()}-${Math.random().toString(36).slice(2)}@e2e.test`,
    password: 'TestPass123!',
    role: 'superadmin',
    ...overrides,
  });
  return { admin, token: signAdminToken(admin._id) };
};

const createOwner = async (overrides = {}) => {
  const admin = await Admin.create({
    name: 'E2E Owner',
    email: `owner-${Date.now()}-${Math.random().toString(36).slice(2)}@e2e.test`,
    password: 'TestPass123!',
    role: 'owner',
    ...overrides,
  });
  return { admin, token: signAdminToken(admin._id) };
};

const createMetadata = async () => {
  const cuisine = await Cuisine.create({ name: `E2E Cuisine ${Date.now()}` });
  const category = await Category.create({ name: `E2E Category ${Date.now()}` });
  const tag = await Tag.create({ name: `E2E Tag ${Date.now()}`, category: 'ambience' });
  return { cuisine, category, tag };
};

const createVenue = async ({ owner, cuisine, category, tag, overrides = {} } = {}) => {
  const venue = await Venue.create({
    name: `E2E Venue ${Date.now()}-${Math.random().toString(36).slice(2)}`,
    description: 'A venue created for e2e testing.',
    address: { street: 'Test Street', city: 'Kathmandu', country: 'Nepal' },
    location: { type: 'Point', coordinates: [85.324, 27.7172] },
    category: category?._id,
    cuisines: cuisine ? [cuisine._id] : [],
    tags: tag ? [tag._id] : [],
    priceRange: 2,
    owner: owner?._id || null,
    isActive: true,
    ...overrides,
  });
  return venue;
};

module.exports = {
  signUserToken,
  signAdminToken,
  createUser,
  createSuperadmin,
  createOwner,
  createMetadata,
  createVenue,
};
