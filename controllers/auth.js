const crypto = require('crypto');

const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const sendgridTransport = require('nodemailer-sendgrid-transport');
const { validationResult } = require('express-validator');

const User = require('../models/user');

const transporter = nodemailer.createTransport(sendgridTransport({
  auth: {
    api_key: process.env.SENDGRID_API_KEY
  }
}))

const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@example.com'
if (!process.env.SENDGRID_FROM_EMAIL || fromEmail.includes('example.com')) {
  console.warn(
    'SendGrid: SENDGRID_FROM_EMAIL must be a verified Sender Identity. ' +
    'Set it in .env to the exact verified email (see SendGrid → Settings → Sender Authentication).'
  )
}

exports.getLogin = (req, res, next) => {
  if (req.session.isLoggedIn) {
    return res.redirect('/');
  }

  res.render('auth/login', {
    path: '/login',
    pageTitle: 'Login'
  });
}

exports.postLogin = (req, res, next) => {
  // res.setHeader('Set-Cookie', 'loggedIn=true; HttpOnly');
  const email = req.body.email;
  const password = req.body.password;
  User.findOne({email: email})
    .then(user => {
      if (!user) {
        req.flash('error', 'Invalid email or password.');
        return req.session.save((err) => {
          res.redirect('/login');
        });
      }

      return bcrypt
        .compare(password, user.password)
        .then(doMatch => {
          if (doMatch) {
            req.session.user = user;
            req.session.isLoggedIn = true;
            req.session.save(err => {
              console.log(err);
              res.redirect('/');
            });
          } else {
            req.flash('error', 'Invalid email or password.');
            return req.session.save((err) => {
              res.redirect('/login');
            });
          }
        });
    })
    .catch(err => console.log(err));
}

exports.getSignup = (req, res, next) => {
  res.render('auth/signup', {
    path: '/signup',
    pageTitle: 'Signup'
  });
}

exports.postSignup = (req, res, next) => {
  const email = (req.body.email && req.body.email.trim()) || '';
  const password = req.body.password;
  const confirmPassword = req.body.confirmPassword;
  const errors = validationResult(req);
  
  if(!errors.isEmpty()) {
    return res.status(422).render('auth/signup', {
      path: '/signup',
      pageTitle: 'Signup',
      errorMessage: errors.array()[0].msg
    });
  }

  if (password !== confirmPassword || !email) {
    req.flash('error', 'Invalid input. Check email and that passwords match.');
    return req.session.save((err) => {
      res.redirect('/signup');
    });
  }

  User.findOne({email: email})
    .then(userDoc => {
      if (userDoc) {
        req.flash('error', 'User already exists.');
        return req.session.save((err) => {
          res.redirect('/signup');
        });
      }

      return bcrypt.hash(password, 12)
        .then(hashedPassword => {
          const user = new User({
            email: email,
            password: hashedPassword,
            cart: { items: [] }
          });
    
          return user.save();
        })
        .then(() => {
          res.redirect('/login');
          return transporter.sendMail({
            to: email,
            from: fromEmail,
            subject: 'Signup Success',
            html: '<h1>Signup Success</h1>'
          });
        });

    })
    .catch(err => console.log(err));
}

exports.postLogout = (req, res, next) => {
  req.session.destroy(err => {
    console.log(err);
    res.redirect('/');
  });
}

exports.getReset = (req, res, next) => {
  res.render('auth/reset', {
    path: '/reset',
    pageTitle: 'Reset Password'
  });
}

exports.postReset = (req, res, next) => {
  crypto.randomBytes(32, (err, buffer) => {
    if (err) {
      return res.redirect('/reset');
    }

    const token = buffer.toString('hex');

    User.findOne({ email: req.body.email})
      .then(user => {
        if(!user) {
          req.flash('error', 'User with this email does not exist.');
          req.session.save((err) => {
            res.redirect('/reset');
          });

          return new Promise(() => {}); // stop chain so we don't send response again
        }

        user.resetToken = token;
        user.resetTokenExpiration = Date.now() + 3600000;
        return user.save();
      })
      .then(result => {
        return transporter.sendMail({
          to: req.body.email,
          from: fromEmail,
          subject: 'Reset Password',
          html: `<p>You requested a password reset</p>
            <p>Click <a href="http://localhost:3000/reset/${token}">here</a> to reset your password</p>
            <p>If you did not request a password reset, please ignore this email.</p>`
        });
      })
      .then(result => {
        res.redirect('/');
      })
      .catch(err => {
        console.log(err);
        res.redirect('/reset');
      });
  });
}

exports.getNewPassword = (req, res, next) => {
  const token = req.params.token;
  User.findOne({ resetToken: token, resetTokenExpiration: { $gt: Date.now() } })
    .then(user => {
      if (!user) {
        return res.redirect('/reset');
      }

      res.render('auth/new-password', {
        path: '/new-password',
        pageTitle: 'New Password',
        userId: user._id.toString(),
        passwordToken: token
      });
    })
    .catch(err => {
      console.log(err);
      res.redirect('/reset');
    });
    
}

exports.postNewPassword = (req, res, next) => {
  const password = req.body.password;
  const userId = req.body.userId;
  const passwordToken = req.body.passwordToken;

  User.findOne({
    resetToken: passwordToken,
    resetTokenExpiration: { $gt: Date.now() },
    _id: userId
  })
    .then(user => {
      bcrypt.hash(password, 12)
        .then(hashedPassword => {
          user.password = hashedPassword;
          user.resetToken = undefined;
          user.resetTokenExpiration = undefined;
          return user.save();
        })
        .then(result => {
          res.redirect('/login');
        })
        .catch(err => {
          console.log(err);
          res.redirect('/reset');
        });
    })
    .catch(err => {
      console.log(err);
      res.redirect('/reset');
    });
}