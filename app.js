var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var exphbs = require('express-handlebars');
var fileUpload = require('express-fileupload')
var db = require('./config/connection')
var session = require('express-session')

var adminRouter = require('./routes/admin');
var usersRouter = require('./routes/users');

var app = express();

const hbs = exphbs.create({
  extname: 'hbs',defaultLayout: 'layout',layoutDir: __dirname+'/views/layouts/',partialsDir: __dirname+'/views/partials/'
})

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.engine('hbs',hbs.engine)
app.set('view engine', 'hbs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(fileUpload());
app.use(session({
  secret: "MyKeyForShoppingCart", 
  saveUninitialized: true,
  resave: false,
  cookie: {maxAge: 30 * 24 * 60 * 60 * 1000}}))

db.connect()

app.use('/', usersRouter);
app.use('/admin', adminRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
