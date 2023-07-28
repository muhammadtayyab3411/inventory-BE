const db = require('../config/db');

const createProduct = async (req, res) => {
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

    return res.status(201).json({ message: 'Product created successfully' });
  } catch (err) {
    console.log(err);
    return res
      .status(500)
      .json({ message: 'An error occurred while processing the request' });
  }
};

const getProductById = async (req, res) => {
  const { productId } = req.body;

  try {
    const query = `
      SELECT category, buying_price, quantity, unit, expiry_date, threshold_value, name, user_id
      FROM products
      WHERE id = ?
    `;

    const params = [productId];

    const result = await executeQuery(query, params);

    // Check if a product with the given ID was found
    if (result.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // The result will be an array with a single element, so we can directly access it
    const product = result[0];

    return res.status(200).json(product);
  } catch (err) {
    console.log(err);
    return res
      .status(500)
      .json({ message: 'An error occurred while processing the request' });
  }
};

const getAllProducts = async (req, res) => {
  try {
    // Construct the SELECT query to retrieve all products
    const query = `
      SELECT category, buying_price, quantity, unit, expiry_date, threshold_value, name, user_id
      FROM products
    `;

    const result = await executeQuery(query);

    return res.status(200).json(result);
  } catch (err) {
    console.log(err);
    return res
      .status(500)
      .json({ message: 'An error occurred while processing the request' });
  }
};

const getProductsWithPagination = async (req, res) => {
  const { start, end } = req.body;

  try {
    // Validate start and end values
    const startIndex = parseInt(start);
    const endIndex = parseInt(end);

    if (
      isNaN(startIndex) ||
      isNaN(endIndex) ||
      startIndex < 0 ||
      endIndex < 0 ||
      startIndex >= endIndex
    ) {
      return res
        .status(400)
        .json({ message: 'Invalid start or end values for pagination' });
    }

    const query = `
      SELECT category, buying_price, quantity, unit, expiry_date, threshold_value, name, user_id
      FROM products
      LIMIT ?, ?
    `;

    const params = [startIndex, endIndex - startIndex];

    const result = await executeQuery(query, params);

    // Return the paginated products in the response
    return res.status(200).json(result);
  } catch (err) {
    console.log(err);
    return res
      .status(500)
      .json({ message: 'An error occurred while processing the request' });
  }
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
  createProduct,
  getProductById,
  getAllProducts,
  getProductsWithPagination,
};
