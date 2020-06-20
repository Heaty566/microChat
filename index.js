const express = require("express");
const mongoose = require("mongoose");
const compression = require("compression");
const helmet = require("helmet");
const _ = require("lodash");
const path = require("path");
const { User } = require("./model/user");
const { Room } = require("./model/room");
const socketio = require("socket.io");
const moment = require("moment");
const { emit } = require("process");

const app = express();
app.use(express.json());
app.use(helmet());
app.use(compression());
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use("/", (req, res) => {
        res.render("index.ejs");
});

mongoose.connect(
        "mongodb+srv://chatapp:wblC8fbwrx2mIz0h@cluster0-ybo16.mongodb.net/chatApp",
        { useNewUrlParser: true, useUnifiedTopology: true },
        () => {
                console.log("connect mongodb");
        }
);

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
        console.log(`Listening on port ${port}`);
});

const io = socketio(server);

io.on("connection", async (socket) => {
        const user = socket.handshake.query;
        if (user.username) {
                let currentUser = await User.findOne({ username: user.username });
                let listUsers = [];
                if (!currentUser) {
                        currentUser = new User({ username: user.username });
                        await currentUser.save();
                        listUsers = await User.find({ username: { $ne: currentUser.username } });
                        io.emit("updateListUsers", { listUsers });
                }

                listUsers = await User.find({ username: { $ne: currentUser.username } });
                socket.emit("getUserSuccess", { user: currentUser, listUsers });
        }
});

io.of("/chat").on("connection", (socket) => {
        socket.emit("loading");
        socket.on("connectWithUser", async (data) => {
                const getRoomId = _.sortBy([data.currentUser._id, data.connectUser]).join("");
                let currentRoom = await Room.findOne({ roomId: getRoomId });
                if (!currentRoom) {
                        currentRoom = new Room({ roomId: getRoomId });
                        await currentRoom.save();
                }

                const roomLeave = Object.keys(socket.rooms)[1];

                socket.leave(roomLeave);
                socket.join(String(currentRoom._id));
                socket.emit("connectWithUserSuccess", currentRoom);
        });

        socket.on("addNewMessage", async (data) => {
                const roomId = Object.keys(socket.rooms)[1];

                let currentRoom = await Room.findByIdAndUpdate(
                        roomId,
                        {
                                $push: {
                                        history: { msg: data.msg, user: data.user, time: moment().format("LLL") },
                                },
                        },
                        { new: true }
                );
                io.of("/chat").to(roomId).emit("updateMessages", currentRoom);
        });
});
