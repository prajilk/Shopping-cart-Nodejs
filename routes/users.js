var express = require('express');
var Handlebars = require('handlebars');
const addressHelper = require('../helpers/address-helper');
const cartHelper = require('../helpers/cart-helper');
const productHelper = require('../helpers/product-helper');
const userHelper = require('../helpers/user-helper');
const orderHelper = require('../helpers/order-helper')
var router = express.Router();


// VERIFY user session
const verifyLogin = (req, res, next) => {
  if (req.session.loggedIn) {
    next()
  } else {
    res.status(301).redirect('/login')
  }
}

// Convert price into INDIAN FORMAT
Handlebars.registerHelper("priceInIndianFormat", function (price) {
  price = parseInt(price)
  return price.toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR'
  });
});

// Calculate total price
Handlebars.registerHelper("calcTotalprice", function (price, quantity) {
  return parseInt(price) * parseInt(quantity)
});

// Compare helper for GET current address
Handlebars.registerHelper("eq", function (data1, data2, options) {
  if (JSON.stringify(data1) === JSON.stringify(data2)) {
    return options.fn(this);
  }
});

// Check status and change color
Handlebars.registerHelper("statusChecker", function (status) {
  if(status === 'pending'){
    return 'text-warning';
  } else {
    return 'text-success';
  }
});

/* GET product listing. */
router.get('/', function (req, res, next) {

  //Store previous path to the session to redirect to that path.
  req.session.source = req.originalUrl;

  productHelper.getProducts().then(async (products) => {

    let user = req.session.user;
    let cartItemCount = null;

    if (req.session.user) {
      cartItemCount = await cartHelper.getCartItemsCount(req.session.user._id)
    }
    res.render('users/view-products', { products, user, cartItemCount });
  })
});

/* GET login page */
router.get('/login', function (req, res) {
  if (req.session.loggedIn) {
    res.status(301).redirect('/')
  } else {
    res.render('users/login', req.session,false)
    req.session.isLoginError = null
  }
});

/* GET logout page */
router.get('/logout', function (req, res) {
  // req.session.destroy()
  req.session.user = null;
  req.session.loggedIn = false;
  res.status(301).redirect('/login')
});

/* GET signup page */
router.get('/signup', function (req, res) {
  res.render('users/signup',req.session)
  req.session.isSignupError = null
});

/* GET product page */
router.get('/product/:id', async function (req, res) {
  if(req.params.id){
    const product = await productHelper.getThisProduct(req.params.id)
    res.render('users/product',{user: req.session.user, product: product})
  } else {
    res.status(301).redirect('/')
  }
});

/* GET cart page */
router.get('/cart', verifyLogin, async function (req, res) {
  const cartItemsList = await cartHelper.getCartItemsList(req.session.user._id)
  if(cartItemsList.length === 0 ){
    res.render('users/cart', { user: req.session.user })
  } else {
    cartHelper.getCartItems(req.session.user._id).then(async (cartItems) => {

      // Calculate the total price by summing up the price values
      let totalPrice = await cartHelper.getCartTotalAmount(req.session.user._id)
      res.render('users/cart', { cartItems, totalPrice, user: req.session.user })
    })
  }
  
});

/* GET cart page */
router.get('/orders', verifyLogin, async function (req, res) {
  const orderedProductList = await orderHelper.getOrderProducts(req.session.user._id)
  res.render('users/orders', {user: req.session.user, productList: orderedProductList})
});

/* GET view-order page */
router.get('/orders/view-order/:id', verifyLogin, async function (req, res) {
  const productDetails = await orderHelper.getThisOrderProduct(req.session.user._id, req.params.id)
  const otherItemsInOrder = await orderHelper.getProductsFromThisOrder(req.session.user._id, productDetails.orders._id, req.params.id)
  res.render('users/view-order', {user: req.session.user, thisProductDetails: productDetails, otherItemsInOrder: otherItemsInOrder})
});

/* GET cart page */
router.get('/add-to-cart/:id', verifyLogin, async function (req, res) {
  if (req.params.id) {

    const isCartEmpty = await cartHelper.checkCartItems(req.session.user._id, req.params.id)
    if (isCartEmpty) {
      res.json({ status: true })
    }

    cartHelper.addToCart(req.session.user._id, req.params.id)

  } else {
    res.status(301).redirect('/')
  }
});

/* GET cart page */
router.get('/remove-cart-item/:id', verifyLogin, function (req, res) {
  if (req.params.id) {
    cartHelper.removeFromCart(req.session.user._id, req.params.id).then(() => {
      res.status(301).redirect('/cart')
    })
  } else {
    res.status(301).redirect('/')
  }
});

/* GET checkout page */
router.get('/checkout', verifyLogin, (req, res) => {
  
  //Store previous path to the session to redirect to that path.
  req.session.source = req.originalUrl;

  cartHelper.getCartItems(req.session.user._id).then(async (cartItems) => {
    let totalPrice = await cartHelper.getCartTotalAmount(req.session.user._id)
    let address = await addressHelper.getCurrentAddress(req.session.user._id)
    if(address){
      res.render('users/checkout', { cartItems, totalPrice, user: req.session.user, address: address })
    } else {
      res.status(301).redirect('/add-address')
    }
  })
});

/* GET address page */
router.get('/address', verifyLogin, (req, res) => {

  addressHelper.getAllAddress(req.session.user._id).then(async (addressList) => {
    let currentAddressId = await addressHelper.getCurrentAddress(req.session.user._id)
    res.render('users/address', { 
      user: req.session.user, 
      addressList: addressList.reverse(), 
      currentAddressId: currentAddressId? currentAddressId._id : null})
  })
});

/* GET add-address page */
router.get('/add-address', verifyLogin, (req, res) => {
  res.render('users/add-address', { user: req.session.user })
});

/* GET update-address page */
router.get('/update-address/:id', verifyLogin, async (req, res) => {
  let address = await addressHelper.getThisAddress(req.session.user._id, req.params.id)
  res.render('users/update-address', { user: req.session.user, address })
});

/* GET delete-address page */
router.get('/delete-address/:id', verifyLogin, async (req, res) => {
  if(req.params.id){
    await addressHelper.deleteAddress(req.session.user._id, req.params.id)
  }
  res.status(301).redirect('/address')
});

/* POST search */
router.post('/search', async (req, res) => {
  let payload = req.body.payload.trim()
  let searchResult = await productHelper.searchProducts(payload)
  searchResult = searchResult.slice(0,10);
  res.send({payload: searchResult})
});

/* POST update-address page */
router.post('/update-current-address', verifyLogin, async (req, res) => {
  await addressHelper.updateCurrentAddress(req.session.user._id, req.body.address).then(() => {
    res.status(301).redirect(req.session.source)
  })
});

/* POST update-address page */
router.post('/update-address/:id', async (req, res) => {
  await addressHelper.updateAddress(req.session.user._id, req.params.id, req.body)
  res.status(301).redirect('/address')
});

/* POST add-address page */
router.post('/add-address', (req, res) => {
  addressHelper.addAddress(req.session.user._id, req.body)
  res.status(301).redirect('/address')
});

/* POST checkout page */
router.post('/checkout',async function (req, res, next) {
  const paymentMethod = req.body.paymentMethod;
  const totalAmount = await cartHelper.getCartTotalAmount(req.session.user._id);
  if(totalAmount === null){
    res.status(301).redirect('/orders')
    return
  }
  const cartItemsList = await cartHelper.getCartItemsList(req.session.user._id);
  const currentAddress = await addressHelper.getCurrentAddress(req.session.user._id)

  if(currentAddress){
    orderHelper.placeOrder(req.session.user._id,currentAddress._id,paymentMethod,totalAmount,cartItemsList).then((response)=>{
      cartHelper.emptyCartAfterOrderPlaced(req.session.user._id).then(()=>{
        res.render('users/order-confirm', { user: req.session.user, totalAmount:totalAmount,address: currentAddress })
      })
    })
  } else {
    res.status(301).redirect('/cart')
  }
});

/* POST change-Quantity */
router.post('/change-quantity', function (req, res, next) {
  cartHelper.changeProductQuantity(req.body).then((response) => {
    res.json(response)
  })
});

/* POST signup page */
router.post('/signup', function (req, res) {
  userHelper.doSignup(req.body).then(()=>{
    res.status(301).redirect('/login')
  }).catch(()=>{
    req.session.isSignupError = "Email ID already in use."
    res.status(301).redirect('/signup')
  })
});

/* POST login page */
router.post('/login', function (req, res) {
  userHelper.doLogin(req.body).then((status) => {
    if (status.success) {
      req.session.loggedIn = true;
      req.session.user = status.user
      res.status(301).redirect('/')
    } else {

      if (status.incorrectPass) {
        req.session.isLoginError = "Invalid password, Please try again"
      } else {
        req.session.isLoginError = "Invalid email, Please try again"
      }
      res.status(301).redirect('/login')
    }
  })
});

module.exports = router;
