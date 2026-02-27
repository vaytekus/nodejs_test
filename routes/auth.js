const express = require('express');
const { check, body } = require('express-validator');

const router = express.Router();
const authController = require('../controllers/auth');
const User = require('../models/user');

router.get('/login', authController.getLogin);

router.post('/login', authController.postLogin);

router.get('/signup', authController.getSignup);

router.post('/signup', 
  [
    check('email')
      .isEmail()
      .withMessage('Please enter a valid email.')
      // .normalizeEmail(), 
      .custom((value, { req }) => {
        if(value.includes('@test.com')) {
          throw new Error('This email address is forbidden!');
        }
        return true;
      }), 
    body('password', 'Please enter a password with only numbers and text at least 5 characters.')
      .trim()
      .isLength({ min: 2 })
      .isAlphanumeric(),
    check('confirmPassword')
      .trim()
      .custom((value, { req }) => {
        if(value !== req.body.password) {
          throw new Error('Passwords have to match!');
        }
        return true;
      })
  ],
  authController.postSignup);

router.post('/logout', authController.postLogout);

router.get('/reset', authController.getReset);

router.post('/reset', authController.postReset);

router.get('/reset/:token', authController.getNewPassword);

router.post('/new-password', authController.postNewPassword);

module.exports = router;