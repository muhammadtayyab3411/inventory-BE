require('dotenv').config();
require('./config/db');
const userRouter = require('./routes/userRoute');
const productRouter = require('./routes/product');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');

const app = express();

const port = process.env.PORT || 8000;

app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  cors({
    origin: '*',
  })
);
app.use(cookieParser());

app.use('/api', userRouter);
app.use('/api/products', productRouter);

app.use((err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.message = err.message || 'Internal server error';
  res.status(err.statusCode).json({
    message: err.message,
  });
});

app.listen(port, () => console.log(`API running at port ${port}`));
