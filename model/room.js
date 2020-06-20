const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema({
        roomId: {
                type: String,
                required: true,
        },
        history: {
                type: Array,
                default: [],
        },
});

const Room = mongoose.model("Room", roomSchema);

module.exports.Room = Room;
