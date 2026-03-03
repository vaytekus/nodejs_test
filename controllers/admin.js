const path = require('path');
const mongoose = require('mongoose');
const fileHelper = require('../util/file');

const Product = require('../models/product');
const { validationResult } = require('express-validator');

exports.getAddProduct = (req, res, next) => {
  res.render('admin/edit-product', {
    pageTitle: 'Add Product',
    path: '/admin/add-product',
    editing: false,
    errorMessages: null,
    hasError: false,
    validationErrors: [],
  });
};

exports.postAddProduct = (req, res, next) => {
  const title = req.body.title;
  // const imageUrl = req.body.image;
  const image = req.file;
  const price = req.body.price;
  const description = req.body.description;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Add Product',
      path: '/admin/add-product',
      editing: false,
      product: {
        title: title,
        price: price,
        description: description
      },
      hasError: true,
      errorMessage: errors.array()[0].msg,
      validationErrors: errors.array(),
    });
  }

  if(!image) {
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Add Product',
      path: '/admin/add-product',
      editing: false,
      hasError: true,
      product: {
        title: title,
        price: price,
        description: description
      },
      errorMessage: 'Attached file is not an image.',
      validationErrors: [],
    });
  }
  
  const imageUrl = image.path;

  const product = new Product({
    // _id: new mongoose.Types.ObjectId('69a19d9d6c70f36b3a546d77'),
    title: title,
    price: price,
    description: description,
    imageUrl: imageUrl,
    userId: req.user
  });

  product
    .save()
    .then(result => {
      console.log('Created Product');
      res.redirect('/admin/products');
    })
    .catch(err => {
      const error = new Error(err || 'Creating product failed. Please try again.');
      error.httpStatusCode = 500;
      return next(error);

      // res.redirect('/500');

      // return res.status(500).render('admin/edit-product', {
      //   pageTitle: 'Add Product',
      //   path: '/admin/add-product',
      //   editing: false,
      //   product: {
      //     title: title,
      //     price: price,
      //     description: description,
      //     imageUrl: imageUrl,
      //     userId: req.user
      //   },
      //   hasError: true,
      //   errorMessage: 'Creating product failed. Please try again.',
      //   validationErrors: [],
      // });
    });
};

exports.getEditProduct = (req, res, next) => {
  const editMode = req.query.edit;
  if (!editMode) {
    return res.redirect('/');
  }
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then(product => {
      if (!product) {
        return res.redirect('/');
      }
      res.render('admin/edit-product', {
        pageTitle: 'Edit Product',
        path: '/admin/edit-product',
        editing: editMode,
        product: product,
        errorMessages: null,
        hasError: false,
        validationErrors: [],
      });
    })
    .catch(err => {
      const error = new Error(err || 'Creating product failed. Please try again.');
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getProducts = (req, res, next) => {
  Product.find({userId: req.user._id})
    // .select('title price -_id')
    // .populate('userId', 'name')  
    .then(products => {
      res.render('admin/products', {
        prods: products,
        pageTitle: 'Admin Products',
        path: '/admin/products',
      });
    })
    .catch(err => console.log(err));
};

exports.postEditProduct = (req, res, next) => {
  const prodId = req.body.productId;
  const updatedTitle = req.body.title;
  const updatedPrice = req.body.price;
  // const updatedImageUrl = req.body.imageUrl;
  const image = req.file;
  const updatedDesc = req.body.description;
  const errors = validationResult(req);

  if (!prodId || prodId.trim() === '') {
    return res.redirect('/admin/products');
  }

  if (!errors.isEmpty()) {
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Edit Product',
      path: '/admin/edit-product',
      editing: true,
      product: {
        _id: prodId,
        title: updatedTitle,
        price: updatedPrice,
        description: updatedDesc,
        // imageUrl: updatedImageUrl,
      },
      hasError: true,
      errorMessage: errors.array()[0].msg,
      validationErrors: errors.array(),
    });
  }

  Product.findById(prodId)
    .then(product => {
      if(product.userId.toString() !== req.user._id.toString()) {
        return res.redirect('/');
      }

      product.title = updatedTitle;
      product.price = updatedPrice;
      product.description = updatedDesc;
      // product.imageUrl = updatedImageUrl;
      if(image) {
        fileHelper.deleteFile(product.imageUrl);
        product.imageUrl = image.path;
      }
      return product.save()
        .then(result => {
          console.log('UPDATED PRODUCT!');
          res.redirect('/admin/products');
        })
        .catch(err => {
          console.log(err);
          res.redirect('/admin/products');
        });
    })
    .catch(err => {
      const error = new Error(err || 'Creating product failed. Please try again.');
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.deleteProduct = (req, res, next) => {
  const prodId = req.params.productId;

  Product.findById(prodId)
    .then(product => {
      if (!product) {
        return Promise.reject(new Error('Product not found.'));
      }
      const imagePath = path.isAbsolute(product.imageUrl)
        ? product.imageUrl
        : path.join(__dirname, '..', product.imageUrl);
      return fileHelper.deleteFile(imagePath).then(() => product);
    })
    .then(product => Product.deleteOne({ _id: prodId, userId: req.user._id }))
    .then(() => {
      console.log('DESTROYED PRODUCT');
      // res.redirect('/admin/products');
      res.status(200).json({ message: 'Product deleted successfully.' });
    })
    .catch(err => {
      // const error = new Error(err || 'Deleting product failed. Please try again.');  
      // error.httpStatusCode = 500;
      // return next(error);
      res.status(500).json({ message: 'Deleting product failed. Please try again.' });
    });
};
