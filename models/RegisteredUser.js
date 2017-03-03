var bcrypt = require("bcrypt-nodejs");
var mongoose = require("mongoose");
var mongoosePaginate = require('mongoose-paginate');
var SALT_FACTOR = 10;

var work = require("./Work");


var userSchema = mongoose.Schema({
  username: {type: String, required: true, unique: true },
  password: {type: String, required: true},
  name: {type: String},
  profile_pic_path: {type: String},
  works: {type: [work.workSchema]}
});

userSchema.plugin(mongoosePaginate);

var noop = function() {};

userSchema.pre("save", function(done) {
  var user = this;

  if (!user.isModified("password")) {
    return done();
  }

  bcrypt.genSalt(SALT_FACTOR, function(err, salt) {
    if (err) {
      return done(err);
    }
    bcrypt.hash(user.password, salt, noop, function(err, hashedPassword) {
      if (err) {
        return done(err);
      }
      user.password = hashedPassword;
      done();
    });
  });
});

userSchema.methods.checkPassword = function(guess, done) {
  bcrypt.compare(guess, this.password, function(err, isMatch) {
    done(err, isMatch);
  });
};

userSchema.methods.displayName = function() {
  return this.name || this.username;
};

var RegisteredUser = mongoose.model("RegisteredUser", userSchema);
module.exports = RegisteredUser;
