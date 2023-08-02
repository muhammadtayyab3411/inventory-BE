const express = require('express');
const router = express.Router();
const product = require('../controllers/products');
const auth = require('../middlewares/auth');

router.post('/newProduct', auth, (req, res) => product.createProduct(req, res));

router.post('/getProduct', auth, (req, res) =>
  product.getProductById(req, res)
);

router.get('/getAllProducts', auth, (req, res) =>
  product.getAllProducts(req, res)
);

router.post('/getProductsWithPagination', auth, (req, res) =>
  product.getProductsWithPagination(req, res)
);

router.post('/productSold', auth, (req, res) => product.itemSold(req, res));

router.post('/getProductReport', auth, (req, res) =>
  product.getProductReport(req, res)
);

router.get('/getAllProductsReport', auth, (req, res) =>
  product.getAllProductsReport(req, res)
);

router.get('/bestSellingProducts', auth, (req, res) =>
  product.getBestSellingProducts(req, res)
);

router.get('/lowStockProducts', auth, (req, res) =>
  product.getLowStockProducts(req, res)
);

module.exports = router;
