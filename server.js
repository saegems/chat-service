// server.js
require("dotenv").config({"override": true});
const WebSocket = require("ws");
const connectToDatabase = require("./utils/database.js");
const formatDateToMariaDB = require("./utils/format.js");
const {encrypt, decrypt, compress, decompress} = require("./utils/crypt.js");

const PORT = process.env.PORT || 8000;

const webSocketServer = new WebSocket.Server({ port: PORT });
let db;

connectToDatabase()
    .then((database) => {
        db = database;
    })
    .catch((error) => {
        process.exit(1);
    });

const activeConnections = new Map();
const userConnections = new Map(); 

webSocketServer.on("connection", (ws) => {
    console.log("New client connected");
    const connectionId = Date.now() + Math.random().toString(36).substr(2, 9);
    
    activeConnections.set(ws, {
        id: connectionId,
        username: null,
        messages: []
    });

    ws.send(JSON.stringify({ status: "welcome", message: "Welcome to the WebSocket server" }));
    
    ws.isAlive = true;
    ws.on('pong', () => {
        ws.isAlive = true;
    });

    ws.on("message", (message) => {
        try {
            const data = JSON.parse(message);
            console.log(`Received message from ${data.sender} to ${data.receiver}`);
            
            const connectionData = activeConnections.get(ws);
            if (connectionData && !connectionData.username) {
                connectionData.username = data.sender;
                userConnections.set(data.sender, ws);
                console.log(`Registered username: ${data.sender} for connection ${connectionId}`);
            }
            
            const messageData = {
                "sender": compress(encrypt(data.sender)),
                "receiver": compress(encrypt(data.receiver)),
                "text": compress(encrypt(data.message)),
                "status": "delivered",
                "time": formatDateToMariaDB(new Date())
            };
            
            if (connectionData) {
                connectionData.messages.push(messageData);
            }

            const responseData = {
                status: "delivered",
                message: data.message,
                sender: data.sender,
                receiver: data.receiver,
                time: formatDateToMariaDB(new Date())
            };
            ws.send(JSON.stringify(responseData));
            
            const receiverConnection = userConnections.get(data.receiver);
            if (receiverConnection && receiverConnection.readyState === WebSocket.OPEN) {
                const receiverMessage = {
                    sender: data.sender,
                    receiver: data.receiver,
                    message: data.message,
                    time: formatDateToMariaDB(new Date())
                };
                receiverConnection.send(JSON.stringify(receiverMessage));
                console.log(`Message forwarded to ${data.receiver}`);
            }
            
            console.log(`Message delivered from ${data.sender} to ${data.receiver}`);
            
        } catch (error) {
            console.log(`Invalid message format: ${error}`);
            ws.send(JSON.stringify({ status: "error", message: "Invalid JSON format" }));
        }
    });

    ws.on("close", () => {
        console.log("Client disconnected");
        const connectionData = activeConnections.get(ws);
        
        if (connectionData && connectionData.messages.length > 0 && db) {
            console.log(`Saving ${connectionData.messages.length} messages to database`);
            
            connectionData.messages.forEach((message) => {
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
        }
        
        if (connectionData && connectionData.username) {
            userConnections.delete(connectionData.username);
        }
        activeConnections.delete(ws);
        console.log(`Active connections: ${activeConnections.size}`);
    });

    ws.on("error", (error) => {
        console.log(`Server error: ${error}`);
        const connectionData = activeConnections.get(ws);
        if (connectionData && connectionData.username) {
            userConnections.delete(connectionData.username);
        }
        activeConnections.delete(ws);
    });
    
    console.log(`Active connections: ${activeConnections.size}`);
});

const heartbeatInterval = setInterval(() => {
    webSocketServer.clients.forEach((ws) => {
        if (ws.isAlive === false) {
            console.log("Terminating inactive connection");
            const connectionData = activeConnections.get(ws);
            if (connectionData && connectionData.username) {
                userConnections.delete(connectionData.username);
            }
            activeConnections.delete(ws);
            return ws.terminate();
        }
        
        ws.isAlive = false;
        ws.ping(() => {}); 
    });
}, 30000); 

webSocketServer.on('close', () => {
    clearInterval(heartbeatInterval);
    console.log("WebSocket server closed");
});

console.log(`Server running on ws://localhost:${PORT}`);
