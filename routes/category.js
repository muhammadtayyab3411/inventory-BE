const express = require('express');
const auth = require('../middlewares/auth');
const category = require('../controllers/categories');
const router = express.Router();

router.get('/', (req, res) => category.getAllCategories(req, res));

router.post('/', (req, res) => category.createCategory(req, res));

router.post('/createProduct', (req, res) =>
  category.createProductInCategory(req, res)
);

module.exports = router;
