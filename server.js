require("dotenv").config({"override": true});
const WebSocket = require("ws");
const connectToDatabase = require("./utils/database.js");
const formatDateToMariaDB = require("./utils/format.js");
const {encrypt, decrypt, compress, decompress} = require("./utils/crypt.js");

const PORT = process.env.PORT;

const webSocketServer = new WebSocket.Server({ port: PORT });
let db;

connectToDatabase()
    .then((database) => {
        db = database;
    })
    .catch((error) => {
        process.exit(1);
    });

webSocketServer.on("connection", (ws) => {
    console.log("New client connected");
    const messages = [];

    ws.on("message", (message) => {
        try {
            const data = JSON.parse(message);
            const messageData = {
                "sender": compress(encrypt(data.sender)),
                "receiver": compress(encrypt(data.receiver)),
                "text": compress(encrypt(data.message)),
                "status": "delivered",
                "time": formatDateToMariaDB(new Date())
            };
            messages.push(messageData);

            console.log(messageData);
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
        if(messages.length > 0 && db) {
            messages.forEach((message) => {
                const query = `
                INSERT INTO messages (sender, receiver, text, status, time)
                VALUES (?, ?, ?, ?, ?)
                `;
                const values = [
                    message.sender,
                    message.receiver,
                    message.text,
                    message.status,
                    message.time
                ];
                db.query(query, values, (error, results) => {
                    if (error) {
                        console.error(`Error inserting message into database: ${error}`);
                        return;
                    }
                    console.log(`Message inserted successfully: ${results.insertId}`);
                });
            });
            messages.length = 0;
        }
    });

    ws.on("error", (error) => {
        console.log(`Server error: ${error}`);
    });

    ws.send(JSON.stringify({ status: "welcome", message: "Welcome to the WebSocket server" }));
});

console.log(`Server running on ws://localhost:${PORT}`);
