require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const Message = require('./models/Message');
const User = require('./models/User');

const app = express(); 


app.use(cors({
  origin: 'https://batoul7.github.io/chat-frontend', 
  optionsSuccessStatus: 200
}));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "https://batoul7.github.io/chat-frontend", 
    methods: ["GET", "POST"]
  }
});


app.get('/', (req, res) => {
  res.status(200).send('Chat Backend is running!');
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
// const cors = require('cors');
// const Message = require('./models/Message');
// const User = require('./models/User');
// const corsOptions = {
//   origin: 'https://batoul7.github.io',
//   optionsSuccessStatus: 200 
// };

// app.use(cors(corsOptions));

// const server = http.createServer(app);
// const io = new Server(server, {
//   cors: {
//     origin: "https://batoul7.github.io",
//     methods: ["GET", "POST"] 
//   }
// });

// io.on('connection', (socket) => {
//     console.log(`User connected: ${socket.id}`);

//     socket.on('join', async ({ username, room }) => {
//         try {
//             const user = await User.findOneAndUpdate(
//                 { username },
//                 { socketId: socket.id, currentRoom: room },
//                 { upsert: true, new: true }
//             );

//             socket.join(room);

//             socket.emit('message', { 
//                 user: 'Admin', 
//                 text: `Welcome to the ${room} room!`,
//                 timestamp: Date.now(),
//             });
        
//             const lastMessages = await Message.find({ room }).sort({ timestamp: -1 }).limit(50);
//             socket.emit('previousMessages', lastMessages.reverse());

//             socket.broadcast.to(room).emit('message', {
//                 user: 'Admin',
//                 text: `${username} has joined!`,
//                 timestamp: Date.now(),
//             });
    
//             const usersInRoom = await User.find({ currentRoom: room });
//             io.to(room).emit('users', usersInRoom.map(u => u.username));

//         } catch (error) {
//             console.error("Error in join event:", error);
//         }
//     });

//     socket.on('sendMessage', async (messageText) => {
//         try {
//             const user = await User.findOne({ socketId: socket.id });
//             if (user && user.currentRoom) {
//                 const newMessage = await Message.create({
//                     text: messageText,
//                     user: user.username,
//                     room: user.currentRoom
//                 });
//                 io.to(user.currentRoom).emit('message', newMessage);
//             }
//         } catch (error) {
//             console.error("Error sending message:", error);
//         }
//     });

//     socket.on('privateMessage', async ({ recipient, text }) => {
//         try {
//             const sender = await User.findOne({ socketId: socket.id });
//             const recipientUser = await User.findOne({ username: recipient });
//             if (recipientUser && sender) {
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

//     socket.on('typing', async () => {
//         const user = await User.findOne({ socketId: socket.id });
//         if (user && user.currentRoom) {
//             socket.broadcast.to(user.currentRoom).emit('typing', user.username);
//         }
//     });

//     socket.on('disconnect', async () => {
//         try {
//             const user = await User.findOne({ socketId: socket.id });
//             if (user && user.currentRoom) {
//                 io.to(user.currentRoom).emit('message', {
//                     user: 'Admin',
//                     text: `${user.username} has left`,
//                     timestamp: Date.now(),
//                 });
                
//                 const remainingUsers = await User.find({ currentRoom: user.currentRoom, socketId: { $ne: socket.id } });
//                 io.to(user.currentRoom).emit('users', remainingUsers.map(u => u.username));
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
