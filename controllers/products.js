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
      SELECT id, category, buying_price, quantity, unit, expiry_date, threshold_value, name, user_id
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
      SELECT id, category, buying_price, quantity, unit, expiry_date, threshold_value, name, user_id
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

    const queryCount = `SELECT COUNT(id) as total FROM products`;
    const countResult = await executeQuery(queryCount);

    const totalProducts = countResult[0].total;

    const query = `
      SELECT id, category, buying_price, quantity, unit, expiry_date, threshold_value, name, user_id
      FROM products
      LIMIT ?, ?
    `;

    const params = [startIndex, endIndex - startIndex];

    const result = await executeQuery(query, params);

    // Return the paginated products in the response
    return res.status(200).json({ totalProducts, products: result });
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

    // Step 3: Fetch the sales for the product
    const fetchSalesQuery = 'SELECT * FROM sales WHERE product_id = ?';
    const productSales = await executeQuery(fetchSalesQuery, [productId]);

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

    // Step 4: Calculate MoM Profit and YoY Profit based on the sales data
    const moMProfit = await calculateMoMProfit(productId);
    const yoYProfit = await calculateYoYProfit(productId);

    // Step 5: Return the calculated metrics in the response
    return res.status(200).json({
      totalProfit,
      revenue,
      sales,
      netPurchaseValue,
      netSalesValue,
      moMProfit,
      yoYProfit,
    });
  } catch (err) {
    // If an error occurs during the process, handle it and return an error response.
    console.error('Error while generating product report:', err);
    return res
      .status(500)
      .json({ error: 'An error occurred while generating product report' });
  }
};

const getAllProductsReport = async (req, res) => {
  try {
    // Step 1: Fetch all products from the database
    const fetchProductsQuery = 'SELECT * FROM products';
    const products = await executeQuery(fetchProductsQuery);

    if (!products || products.length === 0) {
      return res.status(404).json({ error: 'No products found' });
    }

    // Initialize variables to hold aggregated metrics
    let totalProfit = 0;
    let totalRevenue = 0;
    let totalSales = 0;
    let totalNetPurchaseValue = 0;
    let totalNetSalesValue = 0;
    let totalMoMProfit = 0;
    let totalYoYProfit = 0;

    // Step 2: Iterate through each product to calculate metrics
    for (const product of products) {
      const productId = product.id;

      // Fetch sales and calculate metrics for the current product
      const productSales = await fetchSalesAndCalculateMetrics(productId);

      // Aggregate the metrics
      totalProfit += productSales.totalProfit;
      totalRevenue += productSales.revenue;
      totalSales += productSales.sales;
      totalNetPurchaseValue += productSales.netPurchaseValue;
      totalNetSalesValue += productSales.netSalesValue;
      totalMoMProfit += productSales.moMProfit;
      totalYoYProfit += productSales.yoYProfit;
    }

    // Step 3: Return the aggregated metrics in the response
    return res.status(200).json({
      totalProfit,
      totalRevenue,
      totalSales,
      totalNetPurchaseValue,
      totalNetSalesValue,
      totalMoMProfit,
      totalYoYProfit,
    });
  } catch (err) {
    // If an error occurs during the process, handle it and return an error response.
    console.error('Error while generating overall product report:', err);
    return res.status(500).json({
      error: 'An error occurred while generating overall product report',
    });
  }
};

const fetchSalesAndCalculateMetrics = async (productId) => {
  try {
    // Step 1: Fetch the product from the database
    const fetchProductQuery = 'SELECT * FROM products WHERE id = ?';
    const product = await executeQuery(fetchProductQuery, [productId]);

    // Step 2: Check if the product exists
    if (!product || product.length === 0) {
      return {
        totalProfit: 0,
        revenue: 0,
        sales: 0,
        netPurchaseValue: 0,
        netSalesValue: 0,
        moMProfit: 0,
        yoYProfit: 0,
      };
    }

    // Step 3: Fetch the sales for the product
    const fetchSalesQuery = 'SELECT * FROM sales WHERE product_id = ?';
    const productSales = await executeQuery(fetchSalesQuery, [productId]);

    // Step 4: Calculate the metrics for the product
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

    // Step 5: Calculate MoM Profit and YoY Profit based on the sales data
    const moMProfit = await calculateMoMProfit(productId);
    const yoYProfit = await calculateYoYProfit(productId);

    // Step 6: Return the calculated metrics
    return {
      totalProfit,
      revenue,
      sales,
      netPurchaseValue,
      netSalesValue,
      moMProfit,
      yoYProfit,
    };
  } catch (err) {
    console.error('Error while fetching sales and calculating metrics:', err);
    throw err;
  }
};

const calculateMoMProfit = async (productId) => {
  try {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // Months are zero-based (0 - 11)

    // Calculate profit for the current month
    const currentMonthProfitQuery =
      'SELECT SUM((quantity_sold * buying_price) - (quantity_sold * buying_price)) AS profit FROM sales INNER JOIN products ON sales.product_id = products.id WHERE YEAR(sale_date) = ? AND MONTH(sale_date) = ? AND product_id = ?';
    const currentMonthProfit = await executeQuery(currentMonthProfitQuery, [
      currentYear,
      currentMonth,
      productId,
    ]);

    // Calculate profit for the previous month
    const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const previousYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    const previousMonthProfitQuery =
      'SELECT SUM((quantity_sold * buying_price) - (quantity_sold * buying_price)) AS profit FROM sales INNER JOIN products ON sales.product_id = products.id WHERE YEAR(sale_date) = ? AND MONTH(sale_date) = ? AND product_id = ?';
    const previousMonthProfit = await executeQuery(previousMonthProfitQuery, [
      previousYear,
      previousMonth,
      productId,
    ]);

    const currentMonthProfitValue = currentMonthProfit[0].profit || 0;
    const previousMonthProfitValue = previousMonthProfit[0].profit || 0;

    const moMProfit = currentMonthProfitValue - previousMonthProfitValue;
    return moMProfit;
  } catch (err) {
    console.error('Error while calculating MoM Profit:', err);
    throw err;
  }
};

const calculateYoYProfit = async (productId) => {
  try {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const previousYear = currentYear - 1;

    // Calculate profit for the current year
    const currentYearProfitQuery =
      'SELECT SUM((quantity_sold * buying_price) - (quantity_sold * buying_price)) AS profit FROM sales INNER JOIN products ON sales.product_id = products.id WHERE YEAR(sale_date) = ? AND product_id = ?';
    const currentYearProfit = await executeQuery(currentYearProfitQuery, [
      currentYear,
      productId,
    ]);

    // Calculate profit for the previous year
    const previousYearProfitQuery =
      'SELECT SUM((quantity_sold * buying_price) - (quantity_sold * buying_price)) AS profit FROM sales INNER JOIN products ON sales.product_id = products.id WHERE YEAR(sale_date) = ? AND product_id = ?';
    const previousYearProfit = await executeQuery(previousYearProfitQuery, [
      previousYear,
      productId,
    ]);

    const currentYearProfitValue = currentYearProfit[0].profit || 0;
    const previousYearProfitValue = previousYearProfit[0].profit || 0;

    const yoYProfit = currentYearProfitValue - previousYearProfitValue;
    return yoYProfit;
  } catch (err) {
    console.error('Error while calculating YoY Profit:', err);
    throw err;
  }
};

const getBestSellingProducts = async (req, res) => {
  try {
    // Step 1: Fetch the top 10 best selling products from the database
    const bestSellingProductsQuery =
      'SELECT products.*, SUM(quantity_sold) AS totalQuantitySold ' +
      'FROM products ' +
      'INNER JOIN sales ON products.id = sales.product_id ' +
      'GROUP BY products.id ' +
      'ORDER BY totalQuantitySold DESC ' +
      'LIMIT 10';

    const bestSellingProducts = await executeQuery(bestSellingProductsQuery);

    // Step 2: Return the top 10 best selling products in the response
    return res.status(200).json(bestSellingProducts);
  } catch (err) {
    // If an error occurs during the process, handle it and return an error response.
    console.error('Error while fetching best selling products:', err);
    return res.status(500).json({
      error: 'An error occurred while fetching best selling products',
    });
  }
};

const getLowStockProducts = async (req, res) => {
  try {
    // Construct the SELECT query to retrieve low stock products
    const query = `
      SELECT category, buying_price, quantity, unit, expiry_date, threshold_value, name
      FROM products
      WHERE quantity < 5
    `;

    // No need for parameters in this query since we're not using any placeholders

    // Execute the query using the executeQuery function
    const result = await executeQuery(query);

    // Return the low stock products in the response
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
  itemSold,
  getProductReport,
  getAllProductsReport,
  getBestSellingProducts,
  getLowStockProducts,
};
