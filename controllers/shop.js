const fs = require('fs');
const path = require('path');
const pdfkit = require('pdfkit');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const Product = require('../models/product');
const Order = require('../models/order');

const ITEMS_PER_PAGE = 2;

exports.getProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then(product => {
      res.render('shop/product-detail', {
        product: product,
        pageTitle: product.title,
        path: '/products',
      });
    })
    .catch(err => {
      const error = new Error(err || 'Getting product failed. Please try again.');
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getProducts = (req, res, next) => {
  const page = +req.query.page || 1;

  Product.find()
    .skip((page - 1) * ITEMS_PER_PAGE)
    .limit(ITEMS_PER_PAGE)
    .then(products => {
      Product.countDocuments()
        .then(totalProducts => {
          const hasNextPage = ITEMS_PER_PAGE * page < totalProducts;
          const hasPreviousPage = page > 1;
          const nextPage = hasNextPage ? page + 1 : null;
          const previousPage = hasPreviousPage ? page - 1 : null;
          
          res.render('shop/product-list', {
            prods: products,
            pageTitle: 'All Products',
            path: '/products',
            currentPage: page,
            hasNextPage: hasNextPage,
            hasPreviousPage: hasPreviousPage,
            nextPage: nextPage,
            previousPage: previousPage,
            lastPage: Math.ceil(totalProducts / ITEMS_PER_PAGE),
            firstPage: 1,
            pages: Array.from({ length: Math.ceil(totalProducts / ITEMS_PER_PAGE) }, (_, i) => i + 1),
          });
        })
        .catch(err => {
          const error = new Error(err || 'Getting products failed. Please try again.');
          error.httpStatusCode = 500;
          return next(error);
        });
    })
    .catch(err => {
      const error = new Error(err || 'Getting products failed. Please try again.');
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getIndex = (req, res, next) => {
  const page = +req.query.page || 1;

  Product.find()
    .skip((page - 1) * ITEMS_PER_PAGE)
    .limit(ITEMS_PER_PAGE)
    .then(products => {
      Product.countDocuments()
        .then(totalProducts => {
          const hasNextPage = ITEMS_PER_PAGE * page < totalProducts;
          const hasPreviousPage = page > 1;
          const nextPage = hasNextPage ? page + 1 : null;
          const previousPage = hasPreviousPage ? page - 1 : null;
          
          res.render('shop/index', {
            prods: products,
            pageTitle: 'Shop',
            path: '/',
            currentPage: page,
            hasNextPage: hasNextPage,
            hasPreviousPage: hasPreviousPage,
            nextPage: nextPage,
            previousPage: previousPage,
            lastPage: Math.ceil(totalProducts / ITEMS_PER_PAGE),
            firstPage: 1,
            pages: Array.from({ length: Math.ceil(totalProducts / ITEMS_PER_PAGE) }, (_, i) => i + 1),
          });
        })
        .catch(err => {
          const error = new Error(err || 'Getting products failed. Please try again.');
          error.httpStatusCode = 500;
          return next(error);
        });
    })
    .catch(err => {
      const error = new Error(err || 'Getting products failed. Please try again.');
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getCart = (req, res, next) => {
  req.user
    .populate('cart.items.productId')
    .then(user => {
      const products = user.cart.items;
      res.render('shop/cart', {
        path: '/cart',
        pageTitle: 'Your Cart',
        products: products,
      });
    })
    .catch(err => {
      const error = new Error(err || 'Getting cart failed. Please try again.');
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postCart = (req, res, next) => {
  const prodId = req.body.productId;
  Product.findById(prodId)
    .then(product => {
      return req.user.addToCart(product);
    })
    .then(result => {
      res.redirect('/cart');
    })
    .catch(err => {
      const error = new Error(err || 'Adding to cart failed. Please try again.');
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postCartDeleteProduct = (req, res, next) => {
  const prodId = req.body.productId;
  req.user
    .removeFromCart(prodId)
    .then(result => {
      res.redirect('/cart');
    })
    .catch(err => {
      const error = new Error(err || 'Removing from cart failed. Please try again.');
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getCheckout = (req, res, next) => {
  let products = [];
  let totalSum = 0;

  req.user
    .populate('cart.items.productId')
    .then(user => {
      products = user.cart.items;
      totalSum = products.reduce((acc, curr) => acc + curr.productId.price * curr.quantity, 0);

      return stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        // amount: totalSum * 100,
        // currency: 'usd',
        line_items: products.map(p => ({
          price_data: {
            currency: 'usd',
            product_data: { name: p.productId.title },
            unit_amount: p.productId.price * 100
          },
          quantity: p.quantity
        })),
        mode: 'payment',
        // success_url: `${process.env.APP_URL}/checkout/success`,
        // cancel_url: `${process.env.APP_URL}/checkout/cancel`,
        success_url: req.protocol + '://' + req.get('host') + '/checkout/success', // http://localhost:3000/checkout/success
        cancel_url: req.protocol + '://' + req.get('host') + '/checkout/cancel', // http://localhost:3000/checkout/cancel
      });      
    })
    .then(session => {
      res.render('shop/checkout', {
        path: '/checkout',
        pageTitle: 'Checkout',
        products: products,
        totalSum: totalSum,
        sessionId: session.id,
        checkoutUrl: session.url
      });
    })
    .catch(err => {
      const error = new Error(err || 'Getting cart failed. Please try again.');
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getCheckoutSuccess = (req, res, next) => {
  req.user
    .populate('cart.items.productId')
    .then(user => {
      const products = user.cart.items
        .filter(i => i.productId)
        .map(i => ({
          quantity: i.quantity,
          product: { ...i.productId._doc }
        }));
      const order = new Order({
        user: {
          email: req.user.email,
          userId: req.user._id
        },
        products: products,
        isAuthenticated: req.session.isLoggedIn
      });
      return order.save();
    })
    .then(result => {
      return req.user.clearCart();
    })
    .then(() => {
      res.redirect('/orders');
    })
    .catch(err => {
      const error = new Error(err || 'Getting orders failed. Please try again.');
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postOrder = (req, res, next) => {
  req.user
    .populate('cart.items.productId')
    .then(user => {
      const products = user.cart.items
        .filter(i => i.productId)
        .map(i => ({
          quantity: i.quantity,
          product: { ...i.productId._doc }
        }));
      const order = new Order({
        user: {
          email: req.user.email,
          userId: req.user._id
        },
        products: products,
        isAuthenticated: req.session.isLoggedIn
      });
      return order.save();
    })
    .then(result => {
      return req.user.clearCart();
    })
    .then(() => {
      res.redirect('/orders');
    })
    .catch(err => {
      const error = new Error(err || 'Getting orders failed. Please try again.');
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getOrders = (req, res, next) => {
  Order.find({ 'user.userId': req.user._id })
    .then(orders => {
      res.render('shop/orders', {
        path: '/orders',
        pageTitle: 'Your Orders',
        orders: orders,
      });
    })
    .catch(err => {
      const error = new Error(err || 'Getting orders failed. Please try again.');
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getInvoice = (req, res, next) => {
  const orderId = req.params.orderId;


  Order.findById(orderId)
    .then(order => {
      if(!order) {
        return next(new Error('Order not found.'));
      }

      if(order.user.userId.toString() !== req.user._id.toString()) {
        return next(new Error('Unauthorized.'));
      }

      const invoiceName = 'invoice-' + orderId + '.pdf';
      const invoicePath = path.join(__dirname, '..', 'data', 'invoices', invoiceName);
      // fs.readFile(invoicePath, (err, data) => {
      //   if(err) {
      //     const error = new Error(err || 'Getting invoice failed. Please try again.');
      //     error.httpStatusCode = 500;
      //     return next(error);
      //   }
      //   res.setHeader('Content-Type', 'application/pdf');
      //   res.setHeader('Content-Disposition', 'inline; filename="' + invoiceName + '"'); // attachment
      //   res.send(data);
      // });
      
      // const file = fs.createReadStream(invoicePath);
      // res.setHeader('Content-Type', 'application/pdf');
      // res.setHeader('Content-Disposition', 'inline; filename="' + invoiceName + '"'); // attachment
      // file.pipe(res);
      const pdfDocument = new pdfkit();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="' + invoiceName + '"'); // attachment
      pdfDocument.pipe(fs.createWriteStream(invoicePath));
      pdfDocument.pipe(res);

      pdfDocument.font('Helvetica-Bold');
      pdfDocument.fontSize(25).text('Invoice', { underline: true, align: 'center' });
      pdfDocument.moveDown();
      pdfDocument.fontSize(20).text('Order ID: ' + orderId, { align: 'center' });
      pdfDocument.moveDown();
      pdfDocument.fontSize(15).text('Order Date: ' + new Date().toLocaleDateString(), { align: 'center' });
      pdfDocument.moveDown();
      pdfDocument.fontSize(15).text('Order Total: ' + order.quantity, { align: 'center' });
      pdfDocument.end();
    })
    .catch((err) => {
      const error = new Error(err || 'Getting invoice failed. Please try again.');
      error.httpStatusCode = 500;
      return next(error);
    });
};