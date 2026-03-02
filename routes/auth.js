const express = require('express');
const { check, body } = require('express-validator');

const router = express.Router();
const authController = require('../controllers/auth');
const User = require('../models/user');

router.get('/login', authController.getLogin);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Please enter a valid email.').normalizeEmail({ gmail_remove_dots: false }).trim(),
    body('password').trim().notEmpty().withMessage('Please enter your password.')
  ],
  authController.postLogin
);

router.get('/signup', authController.getSignup);

router.post('/signup', 
  [
    check('email')
      .isEmail()
      .normalizeEmail({ gmail_remove_dots: false })
      .trim()
      .withMessage('Please enter a valid email.')
      .custom((value, { req }) => {
        return User.findOne({email: value})
          .then(userDoc => {
            if (userDoc) {
              return Promise.reject('E-Mail already exists!');
            }
          });
      }),
    body('password', 'Please enter a password with only numbers and text at least 2 characters.')
      .trim()
      .isLength({ min: 2 })
      .isAlphanumeric()
      .trim(),
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