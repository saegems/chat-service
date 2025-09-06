const WebSocket = require("ws");

function setupHeartbeat(webSocketServer, activeConnections, userConnections) {
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

    return heartbeatInterval;
}

module.exports = { setupHeartbeat };
