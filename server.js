require("dotenv").config();
const WebSocket = require("ws");

const PORT = process.env.PORT;

const webSocketServer = new WebSocket.Server({ port: PORT });

webSocketServer.on("connection", (ws) => {
    console.log("New client connected");

    ws.on("message", (message) => {
        try {
            const data = JSON.parse(message);
            console.log(`Received: sender=${data.sender}, receiver=${data.receiver}, message=${data.message}`);

            ws.send(JSON.stringify({
                status: "success",
                message: `Server received: ${data.message}`,
                sender: data.sender,
                receiver: data.receiver
            }));
        } catch (error) {
            console.log(`Invalid message format: ${error}`);
            ws.send(JSON.stringify({ status: "error", message: "Invalid JSON format" }));
        }
    });

    ws.on("close", () => {
        console.log("Client disconnected");
    });

    ws.on("error", (error) => {
        console.log(`Server error: ${error}`);
    });

    ws.send(JSON.stringify({ status: "welcome", message: "Welcome to the WebSocket server" }));
});

console.log(`Server running on ws://localhost:${PORT}`);
