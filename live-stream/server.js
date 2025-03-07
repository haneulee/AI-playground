const https = require("https");
const fs = require("fs");
const WebSocket = require("ws");

// SSL 인증서 설정
const options = {
  key: fs.readFileSync("key.pem"),
  cert: fs.readFileSync("cert.pem"),
  // SSL 검증 설정 추가
  rejectUnauthorized: false,
};

// HTTPS 서버 생성
const server = https.createServer(options);

// WebSocket 서버를 HTTPS 서버에 연결
const wss = new WebSocket.Server({ server });

console.log("Starting WebSocket server...");

// 연결 로깅 추가
wss.on("connection", (ws) => {
  console.log("New client connected");

  ws.on("message", (message) => {
    try {
      console.log("Received message:", message.toString());
      const data = JSON.parse(message);
      const room = data.room;

      switch (data.type) {
        case "join":
          if (!rooms.has(room)) {
            rooms.set(room, new Set());
          }
          rooms.get(room).add(ws);
          ws.room = room;

          // Send confirmation back to client
          ws.send(
            JSON.stringify({
              type: "room_joined",
              room: room,
            })
          );

          // Notify other peers in the room
          rooms.get(room).forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(
                JSON.stringify({
                  type: "ready",
                  room: room,
                })
              );
            }
          });
          break;

        case "offer":
        case "answer":
        case "candidate":
          if (rooms.has(room)) {
            rooms.get(room).forEach((client) => {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(message.toString());
              }
            });
          }
          break;
      }
    } catch (error) {
      console.error("Error handling message:", error);
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
    if (ws.room && rooms.has(ws.room)) {
      rooms.get(ws.room).delete(ws);
      if (rooms.get(ws.room).size === 0) {
        rooms.delete(ws.room);
      }
    }
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
  });
});

// 포트 변경 (8443 -> 9443)
const PORT = 9443;
server.listen(PORT, "localhost", () => {
  console.log(`Server running on wss://localhost:${PORT}`);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});

const rooms = new Map();
