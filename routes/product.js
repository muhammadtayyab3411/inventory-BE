const express = require('express');
const router = express.Router();
const product = require('../controllers/products');
const auth = require('../middlewares/auth');

router.post('/newProduct', auth, (req, res) => product.createProduct(req, res));

router.get('/getProduct', auth, (req, res) => product.getProductById(req, res));

router.get('/getAllProducts', auth, (req, res) =>
  product.getAllProducts(req, res)
);

router.get('/getProductsWithPagination', auth, (req, res) =>
  product.getProductsWithPagination(req, res)
);

module.exports = router;
