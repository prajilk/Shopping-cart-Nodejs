var express = require('express');
var router = express.Router();
var Handlebars = require('handlebars');
const path = require('path');
var productHelper = require('../helpers/product-helper')
var adminHelper = require('../helpers/admin-helper')
var userHelper = require('../helpers/user-helper')
var db = require('../config/connection')
const { ObjectId } = require('mongodb');
const { PRODUCT_COLLECTION } = require('../config/collections');
const orderHelper = require('../helpers/order-helper');

// VERIFY admin session
const verifyAdminLogin = (req, res, next) => {
  if (req.session.adminLoggedIn) {
    next()
  } else {
    res.status(301).redirect('/admin/login')
  }
}

// Custom helper for adding S.no to items
Handlebars.registerHelper("add", function (value) {
  return parseInt(value) + 1;
});

// Custom helper for getDateDifferenceInDays
Handlebars.registerHelper("getDateDifferenceInDays", function (placedDate) {
  const orderDate = new Date(placedDate);
  const todaysDate = new Date(new Date().toDateString());
  const diffInMs = Math.abs(todaysDate - orderDate);
  const diffInDays = Math.round(diffInMs / (24 * 60 * 60 * 1000));
  if(diffInDays === 0)
    return 'Today'
  else
    return diffInDays.toString()+' days ago';
});

// Check status and change color
Handlebars.registerHelper("compareStatus", function (status) {
  if(status === 'placed')
    return "PENDING"
  else if(status === 'packed')
    return 'PACKED'
  else if(status === 'shipped')
    return 'SHIPPED'
  else if(status === 'out for delivery')
    return 'OUT FOR DELIVERY'
  else if(status === 'delivered')
    return 'DELIVERED'
});

// Check status delivered
Handlebars.registerHelper("isDelivered", function (status) {
  if(status === 'delivered')
    return 'disabled'
});

// Check status delivered
Handlebars.registerHelper("currentOrders", function (status) {
  if(status === 'delivered')
    return false
  else 
    return true
});

// Check status and change color
Handlebars.registerHelper("checkStatus", function (status) {
  if(status === 'placed'){
    return 'text-warning';
  } else {
    return 'text-success';
  }
});


/* GET home page. */
router.get('/',verifyAdminLogin, function (req, res, next) {
  productHelper.getProducts().then((products) => {
    res.render('admin/view-products', { products, admin: true })
  })

});

/* GET login page */
router.get('/login', function (req, res) {
  if (req.session.adminLoggedIn) {
    res.status(301).redirect('/admin')
  } else {
    res.render('admin/login', {error: req.session.isLoginError, admin: true})
    req.session.isLoginError = null
  }
});

/* GET logout page */
router.get('/logout', function (req, res) {
  // req.session.destroy()
  req.session.admin = null;
  req.session.adminLoggedIn = false;
  res.status(301).redirect('/admin/login')
});

/* GET all-orders page */
router.get('/all-orders',verifyAdminLogin, async function (req, res) {
  const orders = await orderHelper.getAllOrders();
  res.render('admin/all-orders',{admin: true, allOrders: orders})
});

/* GET view-order page */
router.get('/all-orders/view-order/:id',verifyAdminLogin, async function (req, res) {
  const orderDetails = await orderHelper.getOrderFullDetails(req.params.id)
  const accountDetails = await userHelper.getAccountDetails(orderDetails.user)
  res.render('admin/view-order',{admin: true, orderDetails: orderDetails,accountDetails: accountDetails})
});

/* get update-order-status */
router.get('/all-orders/update-order-status/:id',verifyAdminLogin, async function (req, res) {
  await orderHelper.updateOrderStatus(req.params.id)
  res.status(301).redirect('/admin/all-orders/view-order/'+req.params.id)
});

/* GET all-orders page */
router.get('/all-users',verifyAdminLogin, async function (req, res) {
  const accountList = await userHelper.getAllAccountDetails();
  res.render('admin/all-users',{admin: true,accountList: accountList})
});

/* GET add product page. */
router.get('/add-product',verifyAdminLogin, function (req, res) {
  res.render('admin/add-product', { admin: true })
});

/* GET update product page. */
router.get('/update-product/:id',verifyAdminLogin, async function (req, res) {
  const data = await db.get().collection(PRODUCT_COLLECTION).findOne({ _id: new ObjectId(req.params.id) })
  res.render('admin/update-product', { admin: true, data })
});

/* GET remove product page. */
router.get('/remove-product/:id',verifyAdminLogin, async function (req, res) {
  const data = await db.get().collection(PRODUCT_COLLECTION).findOne({ _id: new ObjectId(req.params.id) })
  res.render('admin/remove-product', { admin: true, data })
});

/* GET confirm remove product page. */
router.get('/remove/:id',verifyAdminLogin, async function (req, res) {
  productHelper.removeProduct(req.params.id)
  res.status(301).redirect("/admin")
});

/* POST add product page. */
router.post('/', function (req, res) {

  productHelper.addProduct(req.body, (id) => {

    const filename = id + '.jpg';
    const filepath = path.join('./public/images/product-images', filename)

    req.files.image.mv(filepath, (err) => {
      if (!err) {
        productHelper.getProducts().then((products) => {
          res.render('admin/view-products', { products, admin: true })
        })
      }
      else console.log(err);
    })

  })
  res.status(301).redirect("/admin")
})

/* POST login page */
router.post('/login', function (req, res) {
  adminHelper.doLogin(req.body).then((status) => {
    if (status.success) {
      req.session.adminLoggedIn = true;
      req.session.admin = status.admin
      res.status(301).redirect('/admin')
    } else {

      if (status.incorrectPass) {
        req.session.isLoginError = "Invalid password, Please try again"
      } else {
        req.session.isLoginError = "Invalid email, Please try again"
      }
      res.status(301).redirect('/admin/login')
    }
  })
});

/* POST update product page. */
router.post('/update-success/:id', function (req, res) {

  const filename = req.params.id + '.jpg';
  const filepath = path.join('./public/images/product-images', filename)
  
  if(req.files){
    req.files.image.mv(filepath)
  }
  productHelper.updateProduct(req.body)
  res.status(301).redirect("/admin")

})

module.exports = router;
