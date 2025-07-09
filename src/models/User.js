const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  socketId: {
    type: String,
    required: true,
  },
  // --- السطر الجديد الذي يجب إضافته ---
  currentRoom: {
    type: String,
  }
});

const User = mongoose.model('User', userSchema);

module.exports = User;


// const mongoose = require("mongoose");
// const { hash: hashing } = require("../helpers/hashing");
// const createAdmin = require("../helpers/createAdmin");

// const userSchema = mongoose.Schema({
//     email: {
//         type: String,
//         required: [true, 'Email is required'],
//         unique: true,
//         validate: {
//             validator: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
//             message: 'Invalid email format'
//         }
//     },
//     password: {
//         type: String,
//         required: true
//     },
//     name: {
//         type: String,
//         required: true
//     },
//     age: {
//         type: Number,
//         required: true,
//         min: [18, 'Must be at least 18 years old'],
//     },
//     role: {
//         type: String,
//         default: "user",
//         enum: ["user", "admin", "data-entry"]
//     },
//     profile: {
//         type: String,
//     }
// }, {
//     timestamps: true
// }) 

// userSchema.pre('save', async function(next) {
//     if(this.isNew) {
//         if(this.isModified('password')) {
//             const hash = await hashing(this.password);

//             this.password = hash;
//         }
//     }
//     next();
// });

// userSchema.statics.paginate = async function({ page = 1, limit = 10, sort = '-createdAt' }) {
//     const skip = (page - 1) * limit;
//     const data = await this.find().skip(skip).limit(limit).sort(sort);
//     const total = await this.countDocuments();
//     return { users: data, total, page, pages: Math.ceil(total / limit) };
// };

// const User = new mongoose.model("User", userSchema);

// createAdmin(User, "admin@gmail.com", "123456789")
//     .then(e => {
//         console.log("Added admin done")
//     })
//     .catch(error => {
//         console.log(error.message)
//     })

// module.exports = User 