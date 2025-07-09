require("dotenv").config();

const app = require("./app");
const mongoose = require("mongoose");
const http = require('http');
const { Server } = require('socket.io');

const Message = require('./models/Message');
const User = require('./models/User');

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on('join', async ({ username, room }) => {
        try {
            const user = await User.findOneAndUpdate(
                { username },
                { socketId: socket.id, currentRoom: room },
                { upsert: true, new: true }
            );

            socket.join(room);

            socket.emit('message', { 
                user: 'Admin', 
                text: `Welcome to the ${room} room!`,
                timestamp: Date.now(),
            });
        
            const lastMessages = await Message.find({ room }).sort({ timestamp: -1 }).limit(50);
            socket.emit('previousMessages', lastMessages.reverse());

            socket.broadcast.to(room).emit('message', {
                user: 'Admin',
                text: `${username} has joined!`,
                timestamp: Date.now(),
            });
    
            const usersInRoom = await User.find({ currentRoom: room });
            io.to(room).emit('users', usersInRoom.map(u => u.username));

        } catch (error) {
            console.error("Error in join event:", error);
        }
    });

    socket.on('sendMessage', async (messageText) => {
        try {
            const user = await User.findOne({ socketId: socket.id });
            if (user && user.currentRoom) {
                const newMessage = await Message.create({
                    text: messageText,
                    user: user.username,
                    room: user.currentRoom
                });
                io.to(user.currentRoom).emit('message', newMessage);
            }
        } catch (error) {
            console.error("Error sending message:", error);
        }
    });

    socket.on('privateMessage', async ({ recipient, text }) => {
        try {
            const sender = await User.findOne({ socketId: socket.id });
            const recipientUser = await User.findOne({ username: recipient });
            if (recipientUser && sender) {
                io.to(recipientUser.socketId).emit('privateMessage', {
                    sender: sender.username,
                    text,
                    timestamp: Date.now()
                });
            }
        } catch (error) {
            console.error("Error sending private message:", error);
        }
    });

    socket.on('typing', async () => {
        const user = await User.findOne({ socketId: socket.id });
        if (user && user.currentRoom) {
            socket.broadcast.to(user.currentRoom).emit('typing', user.username);
        }
    });

    socket.on('disconnect', async () => {
        try {
            const user = await User.findOne({ socketId: socket.id });
            if (user && user.currentRoom) {
                io.to(user.currentRoom).emit('message', {
                    user: 'Admin',
                    text: `${user.username} has left`,
                    timestamp: Date.now(),
                });
                
                const remainingUsers = await User.find({ currentRoom: user.currentRoom, socketId: { $ne: socket.id } });
                io.to(user.currentRoom).emit('users', remainingUsers.map(u => u.username));
            }
        } catch (error) {
            console.error("Error on disconnect:", error);
        }
    });
});

const PORT = process.env.PORT || 4000;
const MONGOURL = process.env.MONGOURL;

mongoose.connect(MONGOURL)
    .then(() => {
        console.log("Connect with database done");
        server.listen(PORT, () => {
            console.log("Server is running successfully on", PORT);
        });
    })
    .catch(error => {
        console.log(error.message);
    });


// require("dotenv").config();

// const app = require("./app");
// const mongoose = require("mongoose");
// const http = require('http');
// const { Server } = require('socket.io');

// // --- استيراد النماذج الجديدة ---
// const Message = require('./models/Message');
// const User = require('./models/User');

// const server = http.createServer(app);
// const io = new Server(server, {
//     cors: {
//         origin: "http://localhost:5173", // تأكد من أن هذا هو عنوان الفرونت إند الصحيح
//         methods: ["GET", "POST"]
//     }
// });

// // --- لم نعد بحاجة لهذه، سنتعامل مع قاعدة البيانات مباشرة ---
// // const users = new Map(); 
// // const rooms = new Map();

// io.on('connection', (socket) => {
//     console.log(`User connected: ${socket.id}`);

//     // --- Join room (مُعدَّل بالكامل) ---
//     socket.on('join', async ({ username, room }) => {
//         try {
//             // الخطوة 1: التحقق من وجود المستخدم أو إنشاء مستخدم جديد
//             let user = await User.findOne({ username });
//             if (user) {
//                 // إذا كان المستخدم موجوداً، نحدث الـ socket.id الخاص به
//                 user.socketId = socket.id;
//                 await user.save();
//             } else {
//                 // إذا لم يكن موجوداً، ننشئ مستخدماً جديداً
//                 user = await User.create({ username, socketId: socket.id });
//             }

//             socket.join(room);

//             // الخطوة 2: إرسال رسالة ترحيب للمستخدم الحالي
//             socket.emit('message', { 
//                 user: 'Admin', 
//                 text: `Welcome to the ${room} room!`,
//                 timestamp: Date.now(),
//                 room: room
//             });
        
//             // الخطوة 3: إرسال سجل المحادثات السابق في هذه الغرفة
//             const lastMessages = await Message.find({ room: room }).sort({ timestamp: -1 }).limit(50);
//             socket.emit('previousMessages', lastMessages.reverse()); // نرسلها بترتيبها الصحيح

//             // الخطوة 4: إعلام باقي المستخدمين في الغرفة بانضمام مستخدم جديد
//             socket.broadcast.to(room).emit('message', {
//                 user: 'Admin',
//                 text: `${username} has joined!`,
//                 timestamp: Date.now(),
//                 room: room
//             });
    
//             // الخطوة 5: تحديث قائمة المستخدمين في الغرفة
//             const usersInRoom = await User.find({ socketId: { $in: Array.from(io.sockets.adapter.rooms.get(room) || []) } });
//             io.to(room).emit('users', usersInRoom.map(u => u.username));

//         } catch (error) {
//             console.error("Error in join event:", error);
//             // يمكنك إرسال رسالة خطأ للعميل هنا
//         }
//     });

//     // --- Handle messages (مُعدَّل) ---
//     socket.on('sendMessage', async (messageText) => {
//         try {
//             const user = await User.findOne({ socketId: socket.id });
//             if (user) {
//                 const room = [...socket.rooms].find(r => r !== socket.id); // إيجاد الغرفة التي يتواجد بها المستخدم
//                 if (room) {
//                     // إنشاء وحفظ الرسالة في قاعدة البيانات
//                     const newMessage = await Message.create({
//                         text: messageText,
//                         user: user.username,
//                         room: room
//                     });

//                     // بث الرسالة المحفوظة لجميع من في الغرفة
//                     io.to(room).emit('message', newMessage);
//                 }
//             }
//         } catch (error) {
//             console.error("Error sending message:", error);
//         }
//     });

//     // --- Private messaging (مُعدَّل) ---
//     // يمكن تطويره لاحقاً لحفظ الرسائل الخاصة أيضاً
//     socket.on('privateMessage', async ({ recipient, text }) => {
//         try {
//             const sender = await User.findOne({ socketId: socket.id });
//             const recipientUser = await User.findOne({ username: recipient });

//             if (recipientUser && sender) {
//                 // هنا يمكنك أيضاً حفظ الرسالة الخاصة في قاعدة البيانات إذا أردت
//                 io.to(recipientUser.socketId).emit('privateMessage', {
//                     sender: sender.username,
//                     text,
//                     timestamp: Date.now()
//                 });
//             }
//         } catch (error) {
//             console.error("Error sending private message:", error);
//         }
//     });

//     // --- Typing indicator (لا تغيير هنا) ---
//     socket.on('typing', async () => {
//         const user = await User.findOne({ socketId: socket.id });
//         const room = [...socket.rooms].find(r => r !== socket.id);
//         if (user && room) {
//             socket.broadcast.to(room).emit('typing', user.username);
//         }
//     });

//     // --- Disconnect (مُعدَّل) ---
//     socket.on('disconnect', async () => {
//         console.log(`User disconnected: ${socket.id}`);
//         try {
//             const user = await User.findOne({ socketId: socket.id });
//             if (user) {
//                 const room = [...socket.rooms].find(r => r !== socket.id);
//                 // يمكننا حذف المستخدم من قاعدة البيانات عند الخروج أو فقط تحديث حالته
//                 // حالياً سنتركه لكي لا نفقد بياناته
//                 if (room) {
//                     io.to(room).emit('message', {
//                         user: 'Admin',
//                         text: `${user.username} has left`,
//                         timestamp: Date.now(),
//                         room: room
//                     });
                    
//                     // تحديث قائمة المستخدمين بعد خروج أحدهم
//                     const usersInRoom = await User.find({ socketId: { $in: Array.from(io.sockets.adapter.rooms.get(room) || []) } });
//                     io.to(room).emit('users', usersInRoom.map(u => u.username).filter(name => name !== user.username));
//                 }
//             }
//         } catch (error) {
//             console.error("Error on disconnect:", error);
//         }
//     });
// });

// const PORT = process.env.PORT || 4000;
// const MONGOURL = process.env.MONGOURL;

// mongoose.connect(MONGOURL)
//     .then(() => {
//         console.log("Connect with database done");
//         server.listen(PORT, () => {
//             console.log("Server is running successfully on", PORT);
//         });
//     })
//     .catch(error => {
//         console.log(error.message);
//     });



// require("dotenv").config()

// const app = require("./app");
// const mongoose = require("mongoose");

// const http = require('http');
// const { Server } = require('socket.io');

// const server = http.createServer(app);
// const io = new Server(server, {
//     cors: {
//         origin: "http://localhost:5173",
//         methods: ["GET", "POST"]
//     }
// });

// const users = new Map(); // socket.id -> {name, room}

// const rooms = new Map(); // roomName -> Set(socket.ids)

// // => [{ tech: [1, 2, 3, 4], general: [10] }]

// io.on('connection', (socket) => {
//     console.log(`User connected: ${socket.id}`);

//     // Join room
//     socket.on('join', ({ username, room }) => {
//         // Add user to room
//         users.set(socket.id, { username, room });
        
//         // Initialize room if needed
//         if (!rooms.has(room)) rooms.set(room, new Set());

//         rooms.get(room).add(socket.id);
        
//         socket.join(room);

//         socket.emit('message', { 
//             user: 'Admin', 
//             text: `Welcome to ${room}!`,
//             timestamp: Date.now()
//         });
    
//         // Notify room about new user
//         socket.broadcast.to(room).emit('message', {
//             user: 'Admin',
//             text: `${username} has joined!`,
//             timestamp: Date.now()
//         });
    
//         // Update user list for room
//         io.to(room).emit('users', getUsersInRoom(room));
//     });

//     // Handle messages
//     socket.on('sendMessage', (message) => {
//         const user = users.get(socket.id);

//         if (user) {
//             io.to(user.room).emit('message', {
//                 user: user.username,
//                 text: message,
//                 timestamp: Date.now()
//             });
//         }
//     });

//     // Private messaging
//     socket.on('privateMessage', ({ recipient, text }) => {
//         const sender = users.get(socket.id);
//         const recipientSocket = findSocketByUsername(recipient);
        
//         if (recipientSocket && sender) {
//             io.to(recipientSocket).emit('privateMessage', {
//                 sender: sender.username,
//                 recipient,
//                 text,
//                 timestamp: Date.now()
//             });
//         }
//     });

//     // Typing indicator
//     socket.on('typing', () => {
//         const user = users.get(socket.id);

//         if (user) {
//             socket.broadcast.to(user.room).emit('typing', user.username);
//         }
//     });

//     // Disconnect
//     socket.on('disconnect', () => {
//         const user = users.get(socket.id);

//         if (user) {
//             users.delete(socket.id);
//             const roomUsers = rooms.get(user.room);
            
//             if (roomUsers) {
//                 roomUsers.delete(socket.id);
                
//                 io.to(user.room).emit('message', {
//                     user: 'Admin',
//                     text: `${user.username} has left`,
//                     timestamp: Date.now()
//                 });
                
//                 io.to(user.room).emit('users', getUsersInRoom(user.room));
//             }
//         }
//     });

//     // Helper functions
//     function getUsersInRoom(room) {
//         return Array.from(rooms.get(room) || [])
//         .map(id => users.get(id)?.username)
//         .filter(Boolean);
//     }
    
//     function findSocketByUsername(username) {
//         for (const [socketId, user] of users) {
//             if (user.username === username) return socketId;
//         }
//         return null;
//     }
// });

// const PORT = process.env.PORT || 4000
// const MONGOURL = process.env.MONGOURL;

// mongoose.connect(MONGOURL)
//     .then(() => {
//         console.log("Connect with database done");

//         server.listen(PORT, () => {
//             console.log("Server is running successfully on", PORT)
//         })
//     })
//     .catch(error => {
//         console.log(error.message);
//     });


// Promise.reject("error")
//     .catch(err => "recovered")
//     .then(val => console.log(val));