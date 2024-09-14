import { createServer } from "http";
import bodyParser from "body-parser";
import express from "express";
import { Server } from "socket.io";

const app = express();
const server = createServer(app);
app.use(bodyParser.json({ limit: "20mb" }));

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
  },
});

app.post("/trigger-event", (req, res) => {
  console.log(req.body);
  io.emit(req.body.eventName, req.body.eventData);
});

io.on("connect", (socket) => {
  console.log("connected");

  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
});

server.listen(8080, () => {
  console.log("listening on *:8080");
});
