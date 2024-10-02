const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    isAdmin: { type: Boolean, default: false },
    permissions: { type: [String], default: [] }
});

module.exports = mongoose.model('User', userSchema);