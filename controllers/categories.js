const db = require('../config/db');

const getAllCategories = async (req, res) => {
  try {
    const categories = await fetchAllCategories();

    return res.status(200).json(categories);
  } catch (err) {
    console.error('Error in getAllCategories:', err);
    return res
      .status(500)
      .json({ message: 'An error occurred while fetching categories' });
  }
};

const createCategory = async (req, res) => {
  try {
    const { name, product_type } = req.body;

    const result = await insertCategory(name, product_type);

    return res.status(201).json({
      message: 'Category created successfully',
      category_id: result.insertId,
    });
  } catch (err) {
    console.error('Error in createCategory:', err);
    return res
      .status(500)
      .json({ message: 'An error occurred while creating the category' });
  }
};

const createProductInCategory = async (req, res) => {
  const {
    category,
    buying_price,
    quantity,
    unit,
    expiry_date,
    threshold_value,
    name,
  } = req.body;

  try {
    const query = `
      INSERT INTO products (category, buying_price, quantity, unit, expiry_date, threshold_value, name, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      category,
      buying_price,
      quantity,
      unit,
      new Date(expiry_date),
      threshold_value,
      name,
      req.user.id,
    ];

    // Execute the query using the executeQuery function
    await executeQuery(query, params);

    socket.emit('newproduct', { message: 'A new product has been added' });

    return res.status(201).json({ message: 'Product created successfully' });
  } catch (err) {
    console.log(err);
    return res
      .status(500)
      .json({ message: 'An error occurred while processing the request' });
  }
};

const getProductsWithCategory = async (req, res) => {
  const { category } = req.body;

  try {
    const products = await fetchProductsWithCategory(category);

    return res.status(200).json(products);
  } catch (err) {
    console.error('Error in getProductsWithCategory:', err);
    return res
      .status(500)
      .json({ message: 'An error occurred while fetching products' });
  }
};

// Helper function to fetch products with a specific category from the database
const fetchProductsWithCategory = (category) => {
  const query = 'SELECT * FROM products WHERE category = ?';
  return executeQuery(query, [category]);
};

const insertCategory = (name, productType) => {
  const query = 'INSERT INTO categories (name, product_type) VALUES (?, ?)';
  return executeQuery(query, [name, productType]);
};

const fetchAllCategories = () => {
  const query = 'SELECT * FROM categories';
  return executeQuery(query);
};

const executeQuery = (query, params) => {
  return new Promise((resolve, reject) => {
    db.query(query, params, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
};

module.exports = {
  getAllCategories,
  createCategory,
  createProductInCategory,
  getProductsWithCategory,
};
