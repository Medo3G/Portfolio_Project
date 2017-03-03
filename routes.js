var express = require("express");
var passport = require("passport");
var multer  = require('multer');
var fs = require("fs-extra");
var validator = require("valid-url");
var paginate = require('express-paginate');
var mongoosePaginate = require('mongoose-paginate');

var User = require("./models/RegisteredUser");
var Work = require("./models/Work");

var profileImageStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'images/profile_images')
  },
  filename: function (req, file, cb) {
    cb(null, req.body.username + '-' + Date.now())
  }
});

var profilePics = multer({
  storage: profileImageStorage
});

var tempScreenshotStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'images/tmp/')
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now())
  }
});

var screenshots = multer({
  storage: tempScreenshotStorage
});

var router = express.Router();

router.use(function(req, res, next) {
  res.locals.currentUser = req.user;
  res.locals.errors = req.flash("error");
  res.locals.warnings = req.flash("warning");
  res.locals.infos = req.flash("info");
  next();
});

router.get("/", function(req, res, next) {
  res.render("index");
});

router.get("/register", function(req, res, next) {
  res.render("register");
});

router.get("/login", function(req, res, next) {
  res.render("login");
});

router.get("/editinfo", ensureAuthenticated, function(req, res, next) {
  res.render("editinfo");
});

router.get("/addworks", ensureAuthenticated, function(req, res, next) {
  if (req.user.works.length == 0){
    req.flash("warning", "You cuurently don't have any works. Please add at least one work so your portfolio becomes public");
  }
  res.locals.warnings = req.flash("warning");
  res.render("addworks");
});

router.get("/list",function(req,res,next){
  User.paginate({works: { $exists: true, $not: {$size: 0} }},{ page: req.query.page, limit: req.query.limit},function(err, portfolios, pageCount, itemCount){
    if (err){
      return next(err);
    }
    res.render("list", {
      portfolios: portfolios.docs,
      pageCount: pageCount,
      itemCount: itemCount,
      pages: res.locals.paginate.getArrayPages(3, portfolios.pages, req.query.page)
    });
  });
});

router.get("/portfolio/:username", function(req, res, next) {
  User.findOne({ username: req.params.username }, function(err, user) {
    if (err) { return next(err); }
    if (!user) {
      req.flash("error","User does not exist");
      res.redirect('/');
    }
    if (user.works.length == 0){
      req.flash("error","User does not have any works");
      res.redirect('/');
    }
    res.render("portfolio", { user: user });
  });
});


router.get("/logout", function(req, res) {
  req.logout();
  res.redirect("/");
});

router.post("/register", profilePics.single('profile_pic'), function(req, res, next) {
  var username = req.body.username;
  var password = req.body.password;
  var name = req.body.name;
  if (req.file){
    if (req.file.mimetype !== 'image/jpeg'){
      req.flash("error","Profile image format must be JPG");
      fs.remove(req.file.path, function(err){
        if (err){return next(err)}
      });
      return res.redirect("/register");
    }

    if (req.file.size > (1024*1024)){
      req.flash("error","Filesize must not exceed 1MB");
      fs.remove(req.file.path, function(err){
        if (err){return next(err)}
      });
      return res.redirect("/register");
    }
  }

  User.findOne({ username: username }, function(err, user) {
    if (err) { return next(err); }
    if (user) {
      if (req.file){
        fs.remove(req.file.path, function(err){
          if (err){return next(err)}
        });
      }
      req.flash("error", "Username already taken");
      return res.redirect("/register");
    }
    var newUser;
    if (req.file){
      newUser =  new User({
        username: username,
        password: password,
        name: name,
        profile_pic_path: req.file.path
      });

    }
    else{
      newUser = new User({
        username: username,
        password: password,
        name: name
      });
    }
    newUser.save(next);
    req.flash("info","Account successfully created");
  });
}, passport.authenticate("login", {
  successRedirect: "/",
  failureRedirect: "/register",
  failureFlash: true
}));

router.post("/editinfo", profilePics.single('profile_pic'), function(req, res, next) {
  req.user.name = req.body.name;
  req.user.save(function(err) {
    if (err) {
      next(err);
      return;
    }
  });
  if (req.file){
    if (req.file.mimetype !== 'image/jpeg'){
      req.flash("error","Profile image format must be JPG");
      fs.remove(req.file.path, function(err){
        if (err){return next(err)}
      });
      return res.redirect("/editinfo");
    }

    if (req.file.size > (1024*1024)){
      req.flash("error","Filesize must not exceed 1MB");
      fs.remove(req.file.path, function(err){
        if (err){return next(err)}
      });
      return res.redirect("/editinfo");
    }

    var newPath = "images/profile_images/" + req.user.username + '-' + Date.now();

    fs.rename(req.file.path, newPath ,function(err){
      if (err){return next(err)}
    });

    if(req.user.profile_pic_path){
      fs.remove(req.user.profile_pic_path, function(err){
        if (err){return next(err)}
      });
    }

    req.user.profile_pic_path = newPath;
    req.user.save(function(err) {
      if (err) {
        next(err);
        return;
      }
    });
  }
  req.flash("info", "Profile updated!");
  res.redirect("/editinfo");
});

router.post("/addworklink",function(req,res,next){
  var title =  req.body.title;
  var type = "Link";
  var details = req.body.details;
  var link = req.body.link;

  if (title === ""){
    req.flash("error","You must enter a title for your work")
    return res.redirect("/addworks");
  }
  User.findOne({username: req.user.username},function(err,user){
    if (err) { return next(err); }
    for (var i = 0; i < user.works.length; i++) {
      if (user.works[i].title === title){
        req.flash("error","You already have another work with that title")
        return res.redirect("/addworks");
      }
    }

    if (! validator.isUri(link)){
      req.flash("error","You must enter a valid URL in the link field")
      return res.redirect("/addworks");
    }

    var work = new Work({
      title: title,
      type: type,
      details: details,
      link:link
    });

    req.user.works.addToSet(work);

    req.user.save(function(err) {
      if (err) {
        next(err);
        return;
      }
    });
    req.flash("info","Work successfully added");
    res.redirect("/addworks");

  });
});

router.post("/addworkscreenshots", screenshots.array("screenshot"), function(req,res,next){
  var title =  req.body.title;
  var type = "Screenshot";
  var details = req.body.details;

  if (title === ""){
    eq.flash("error","You must enter a title for your work")
    return res.redirect("/addworks");
  }
  User.findOne({username: req.user.username},function(err,user){
    if (err) { return next(err); }
    for (var i = 0; i < user.works.length; i++) {
      if (user.works[i].title === title){
        req.flash("error","You already have another work with that title")
        return res.redirect("/addworks");
      }
    }

    if (req.files.length == 0){
      req.flash("error", "You must upload at least one screenshot");
      res.redirect("/addworks");
    }

    for (var i = 0; i < req.files.length; i++) {

      if (req.files[i].mimetype !== 'image/jpeg'){
        req.flash("error","Image format must be JPG for all screenshots");
        for (var j = 0; j< req.files.length; j++) {
          fs.remove(req.files[j].path, function(err){
            if (err){return next(err)}
          });
        }
        return res.redirect("/addworks");
      }
      if (req.files[i].size > (1024*1024)){
        req.flash("error","Filesize must not exceed 1MB for all screenshots");
        for (var j = 0; j< req.files.length; j++) {
          fs.remove(req.files[j].path, function(err){
            if (err){return next(err)}
          });
        }
        return res.redirect("/addworks");
      }
    }

    var dir = "images/portfolios/" + req.user.username + '/' + req.user.username + '-' + req.body.title + '-' + Date.now();
    var screenshot_dirs = [];
    for (var i = 0; i < req.files.length; i++) {
      var newPath = dir + '/' + "screenshot" + i + '-' + Date.now();
      screenshot_dirs.push(newPath);
      fs.move(req.files[i].path, newPath ,function(err){
        if (err){return next(err)}
      }
    );
  }
  var work = new Work({
    title: title,
    type: type,
    details: details,
    screenshot_paths: screenshot_dirs
  });

  req.user.works.addToSet(work);

  req.user.save(function(err) {
    if (err) {
      next(err);
      return;
    }
  });

  req.flash("info","Work successfully added");
  res.redirect("/addworks");
});
});

router.post("/login", passport.authenticate("login", {
  successRedirect: "/",
  failureRedirect: "/login",
  failureFlash: true
}));

router.use(function(req, res, next){
  req.flash("error","Page not found");
  res.redirect('/');
})


router.use(function (err, req, res, next) {
  req.flash("error","Internal Server Error")
  res.redirect('/');
})

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    next();
  } else {
    req.flash("warning", "You must be logged in to see this page.");
    res.redirect("/login");
  }
}

module.exports = router;
