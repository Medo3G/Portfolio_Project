var mongoose = require("mongoose");


var workSchema = mongoose.Schema({
  title: {type:String, required: true},
  details: {type: String},
  type:{type: String, required: true},
  link: {type: String},
  screenshot_paths: {type: [String]}
});

var Work = mongoose.model("Work", workSchema);
module.exports = Work;
