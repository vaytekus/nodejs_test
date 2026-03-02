const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const { MongoStore } = require('connect-mongo');
const { doubleCsrf } = require('csrf-csrf');
require('dotenv').config();
const flash = require('connect-flash');

const errorController = require('./controllers/error');
const User = require('./models/user');
const MONGODB_URI = process.env.MONGODB_URI;

const app = express();

const {
  doubleCsrfProtection,
} = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET || 'my secret',
  getSessionIdentifier: (req) => req.session?.id ?? req.sessionID ?? '',
  cookieName: process.env.NODE_ENV === 'production' ? '__Host-x-csrf-token' : 'x-csrf-token',
  cookieOptions: {
    sameSite: 'strict',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
  },
  getCsrfTokenFromRequest: (req) => req.body?._csrf ?? req.headers['x-csrf-token'],
});

app.set('view engine', 'ejs');
app.set('views', 'views');

const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'my secret',
  resave: false,
  saveUninitialized: true, // required so session id is stable for csrf-csrf (same id on GET and POST)
  store: new MongoStore({
    mongoUrl: MONGODB_URI,
    expires: 1000 * 60 * 60 * 24 * 30
  })
}));
app.use(cookieParser());

app.use(doubleCsrfProtection);
app.use(flash());

app.use((req, res, next) => {
  // throw new Error('User not found.');
  if (!req.session.user) {
    return next();
  }
  
  User.findById(req.session.user._id)
    .then(user => {
      if (!user) {
        return next(new Error('User not found.'));
      }

      req.user = user;
      next();
    })
    .catch(err => {
      next(new Error(err || 'User not found.'));
    });
});

// Make CSRF token and flash messages available in all views
app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn;
  res.locals.csrfToken = req.csrfToken();
  res.locals.errorMessage = req.flash('error')[0];
  res.locals.successMessage = req.flash('success')[0];
  next();
});

app.use('/admin', adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

app.use('/500', errorController.get500);
app.use(errorController.get404);

app.use((error, req, res, next) => {
  console.log(error);
  res.status(error.httpStatusCode || 500).render('500', {
    pageTitle: 'Error!',
    path: '/500',
    isAuthenticated: req.isLoggedIn
  });
});

mongoose
  .connect(
    MONGODB_URI
  )
  .then(result => {
    app.listen(3000);
  })
  .catch(err => {
    console.log(err);
  });
