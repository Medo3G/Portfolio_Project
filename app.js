var express = require("express");
var path = require("path");
var mongoose = require("mongoose");
var bodyParser = require("body-parser");
var multer  = require('multer')
var cookieParser = require("cookie-parser");
var session = require("express-session");
var flash = require("connect-flash");
var passport = require("passport");
var paginate = require('express-paginate');

var routes = require("./routes");
var setUpPassport = require("./setuppassport");

var app = express();

mongoose.connect("mongodb://localhost:27017/mini_project");
setUpPassport();

app.set("port", process.env.PORT || 3000);
app.use(express.static(path.join(__dirname, "")));
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({ extended: false }));

app.use(cookieParser());

app.use(session({
  secret: "zLJ?g8XH7eWBnRN_4K+qR@ZeRg5kv+p96FF@c^Cq",
  resave: true,
  saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(flash());

app.use(paginate.middleware(10, 50));

app.use(routes);

app.listen(app.get("port"), function() {
  console.log("Server started on port " + app.get("port"));
});
