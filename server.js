require('dotenv').config();
require('./config/db');
const userRouter = require('./routes/userRoute');
const productRouter = require('./routes/product');
const categoryRouter = require('./routes/category');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');

const app = express();

const http = require('http').createServer(app);
// const io = require('socket.io')(http, {
//   cors: {
//     origin: 'http://localhost:3000',
//     methods: ['GET', 'POST'],
//   },
// });

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
app.use('/api/categories', categoryRouter);

app.use((err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.message = err.message || 'Internal server error';
  res.status(err.statusCode).json({
    message: err.message,
  });
});

// io.on('connection', (socket) => {
//   console.log('A user connected');

//   // Handle the order placement event
//   socket.on('placeOrder', (data) => {
//     // Process the order and save it to the database
//     console.log(data);
//     socket.emit('orderNotification', {
//       message: 'Your order has been placed!',
//     });
//   });

//   // Handle disconnection
//   socket.on('disconnect', () => {
//     console.log('A user disconnected');
//   });
// });

http.listen(port, () => console.log(`Listening on port ${port}`));
