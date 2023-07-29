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
    if (result.length === 0)
      return res.status(404).json({ message: 'Product not found' });

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
    )
      return res
        .status(400)
        .json({ message: 'Invalid start or end values for pagination' });

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

const itemSold = async (req, res) => {
  try {
    const { productId, amountSold } = req.body;

    if (amountSold <= 0)
      return res.status(400).json({ error: 'Invalid amount' });

    // Step 1: Fetch the product from the database
    const fetchProductQuery = 'SELECT * FROM products WHERE id = ?';
    const product = await executeQuery(fetchProductQuery, [productId]);

    // Step 2: Check if the product exists
    if (!product || product.length === 0)
      return res.status(404).json({ error: 'Product not found' });

    // Step 3: Check if there is enough quantity available to sell
    if (amountSold > product[0].quantity)
      return res
        .status(400)
        .json({ error: 'Insufficient quantity available for sale' });

    // Step 4: Calculate the new 'sold_amount' and 'quantity'
    const newSoldAmount = product[0].sold_amount + amountSold;
    const newQuantity = product[0].quantity - amountSold;

    // Step 5: Update the product in the database with the new values
    const updateProductQuery =
      'UPDATE products SET sold_amount = ?, quantity = ? WHERE id = ?';
    await executeQuery(updateProductQuery, [
      newSoldAmount,
      newQuantity,
      productId,
    ]);

    // Step 6: Insert into the sales table to track the sale
    const insertSaleQuery =
      'INSERT INTO sales (product_id, quantity_sold, sale_date) VALUES (?, ?, ?)';
    await executeQuery(insertSaleQuery, [productId, amountSold, new Date()]); // assuming currentDate as saleDate

    // Step 7: Return a success response
    return res
      .status(200)
      .json({ message: 'Product sold successfully', amountSold });
  } catch (err) {
    // If an error occurs during the process, handle it and return an error response.
    console.error('Error while selling the product:', err);
    return res
      .status(500)
      .json({ error: 'An error occurred while selling the product' });
  }
};

const getProductReport = async (req, res) => {
  try {
    const { productId } = req.body;

    // Step 1: Fetch the product from the database
    const fetchProductQuery = 'SELECT * FROM products WHERE id = ?';
    const product = await executeQuery(fetchProductQuery, [productId]);

    // Step 2: Check if the product exists
    if (!product || product.length === 0)
      return res.status(404).json({ error: 'Product not found' });

    // Step 3: Calculate the metrics for the product
    const quantity = product[0].quantity;
    const buyingPrice = product[0].buying_price;
    const soldAmount = product[0].sold_amount;
    const totalQuantity = quantity + soldAmount;

    // Total Profit = (Net Sales Value) - (Net Purchase Value)
    const revenue = soldAmount * buyingPrice; // Revenue = (Unit Selling Price) * (Sold Amount)
    const sales = soldAmount; // Sales = Sold Amount
    const netPurchaseValue = totalQuantity * buyingPrice; // Net Purchase Value = (Total Quantity) * (Buying Price)
    const netSalesValue = revenue; // Net Sales Value = Revenue

    // Total Profit = Net Sales Value - Net Purchase Value
    const totalProfit = netSalesValue - netPurchaseValue;

    // Step 4: Return the calculated metrics in the response
    return res.status(200).json({
      totalProfit,
      revenue,
      sales,
      netPurchaseValue,
      netSalesValue,
    });
  } catch (err) {
    // If an error occurs during the process, handle it and return an error response.
    console.error('Error while generating product report:', err);
    return res
      .status(500)
      .json({ error: 'An error occurred while generating product report' });
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
  itemSold,
  getProductReport,
};
