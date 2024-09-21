import { createServer } from "http";
import axios from "axios";
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

app.post("/trigger-event", (req) => {
  io.emit(req.body.eventName, req.body.eventData);
});

app.post("/draft-event", async (req) => {
  const data = req.body.eventData;
  console.log(data);
  io.emit(req.body.eventName, data);

  setTimeout(
    async () => {
      const url = "http://localhost:3000";

      try {
        await axios.post(`${url}/api/auto-draft`, {
          sessionId: data.sessionId,
          studioId: data.currentPick.studioId,
          pick: data.currentPick.num,
        });
      } catch (e) {
        // console.log(e);
      }
    },
    data.currentPick.endTimestamp - data.currentPick.startTimestamp + 2500,
  );
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
