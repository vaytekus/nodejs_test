const path = require('path');

const express = require('express');
const { body } = require('express-validator');

const adminController = require('../controllers/admin');
const isAuth = require('../middleware/is-auth');

const router = express.Router();

// /admin/add-product => GET
router.get('/add-product', isAuth, adminController.getAddProduct);

// /admin/products => GET
router.get('/products', adminController.getProducts);

// /admin/add-product => POST
router.post('/add-product', [
  body('title').trim().isLength({ min: 3 }).withMessage('Please enter a title with at least 3 characters.'),
  // body('imageUrl').trim().isURL().withMessage('Please enter a valid image URL.'),
  body('price').trim().isFloat().withMessage('Please enter a valid price.'),
  body('description').trim().isLength({ min: 5, max: 400 }).withMessage('Please enter a description with at least 5 characters and less than 400 characters.'),
], isAuth, adminController.postAddProduct);

router.get('/edit-product/:productId', isAuth, adminController.getEditProduct);

router.post('/edit-product', [
  body('title').trim().isLength({ min: 3 }).withMessage('Please enter a title with at least 3 characters.'),
  // body('imageUrl').trim().isURL().withMessage('Please enter a valid image URL.'),
  body('price').trim().isFloat().withMessage('Please enter a valid price.'),
  body('description').trim().isLength({ min: 5, max: 400 }).withMessage('Please enter a description with at least 5 characters and less than 400 characters.'),
], isAuth, adminController.postEditProduct);

router.delete('/product/:productId', isAuth, adminController.deleteProduct);

module.exports = router;
