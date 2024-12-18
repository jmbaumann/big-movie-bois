import { createServer } from "http";
import axios from "axios";
import bodyParser from "body-parser";
import express from "express";
import { Server } from "socket.io";

import { env } from "./env.mjs";

const app = express();
const server = createServer(app);
app.use(bodyParser.json({ limit: "20mb" }));

const io = new Server(server, {
  cors: {
    origin: env.BMB_URL,
  },
});

app.get("/test", (req, res) => {
  res.send("CONNECTED");
});

app.post("/ws", checkToken, (req) => {
  io.emit(req.body.eventName, req.body.eventData);
});

app.post("/draft", checkToken, async (req) => {
  const data = req.body.eventData;
  // console.log("/draft", data);
  io.emit(req.body.eventName, data);

  // setTimeout(
  //   async () => {
  //     const url = env.BMB_URL;

  //     try {
  //       await axios.post(`${url}/api/auto-draft`, {
  //         sessionId: data.sessionId,
  //         studioId: data.currentPick.studioId,
  //         pick: data.currentPick.num,
  //       });
  //     } catch (e) {
  //       console.log(e);
  //     }
  //   },
  //   data.currentPick.endTimestamp - data.currentPick.startTimestamp + 2500,
  // );
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

function checkToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ message: "Token missing" });
  if (token !== env.WEBSOCKET_TOKEN) return res.status(403).json({ message: "Invalid token" });

  next();
}
