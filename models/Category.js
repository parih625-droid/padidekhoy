const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  image: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Indexes
categorySchema.index({ name: 1 });

module.exports = mongoose.model('Category', categorySchema);