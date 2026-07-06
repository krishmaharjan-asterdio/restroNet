process.env.NODE_ENV = 'test';

require('dotenv').config();

const baseUri = process.env.MONGO_URI || 'mongodb://localhost:27017/restronet';
// Swap the database name for an isolated test database on the same cluster,
// so e2e CRUD tests never touch real seed data.
process.env.MONGO_URI = baseUri.replace(/\/([^/?]+)(\?|$)/, '/restronet_test$2');

jest.setTimeout(30000);
