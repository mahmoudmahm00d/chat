const path = require("path");
const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const formatMessage = require("./utils/messages");
const {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers,
  getUser,
} = require("./utils/users");

const app = express();
const server = http.createServer(app);
const io = socketio(server);
const botName = "Management";

app.use(express.static(path.join(__dirname, "public")));

io.on("connection", (socket) => {
  socket.on("joinRoom", ({ username, room }) => {
    //Add user to users list

    const userInList = getUser(username, room);

    if (userInList) {
      socket.emit("alreadyExists", { username, room });
      return;
    }
    
    const user = userJoin(socket.id, username, room);

    socket.join(user.room);

    socket.emit("message", formatMessage(botName, "Welcome to chat."));

    socket.broadcast
      .to(user.room)
      .emit(
        "message",
        formatMessage(botName, `${user.username} has joined the chat`)
      );

    // Send users and room info
    io.to(user.room).emit("roomUsers", {
      room: user.room,
      users: getRoomUsers(user.room),
    });
  });

  socket.on("chatMessage", (message) => {
    //Spicefy who is the user
    const user = getCurrentUser(socket.id);
    //Write message to his room
    io.to(user.room).emit("message", formatMessage(user.username, message));
  });

  socket.on("disconnect", () => {
    //Delete user from users list
    const user = userLeave(socket.id);
    //if there is such a user with that socket id
    if (user) {
      io.to(user.room).emit(
        "message",
        formatMessage(botName, `${user.username} has left the chat.`)
      );

      //Update rooms' users
      io.to(user.room).emit("roomUsers", {
        room: user.room,
        users: getRoomUsers(user.room),
      });
    }
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => console.log(`server started on port ${PORT}`));
