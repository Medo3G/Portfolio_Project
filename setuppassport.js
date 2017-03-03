var passport = require("passport");

var regisredUser = require("./models/RegisteredUser");
var LocalStrategy = require("passport-local").Strategy;

passport.use("login", new LocalStrategy(
  function(username, password, done) {
    regisredUser.findOne({ username: username }, function(err, user) {
      if (err) {
        return done(err);
      }
      if (!user) {
        return done(null, false, { message: "Invaild username/password!" });
      }

      user.checkPassword(password, function(err, isMatch) {
        if (err) {
          return done(err);
        }
        if (isMatch) {
          return done(null, user);
        } else {
          return done(null, false, { message: "Invaild username/password!" });
        }
      });
    });
  }));

module.exports = function() {
  passport.serializeUser(function(user, done) {
    done(null, user._id);
  });

  passport.deserializeUser(function(id, done) {
    regisredUser.findById(id, function(err, user) {
      done(err, user);
    });
  });
};
