const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

const PORT = process.env.PORT || 8080;
const clientDir = path.join(__dirname, "..", "client");

const players = new Map();
let nextId = 1;

const server = http.createServer((req, res) => {
    let file = req.url === "/" ? "/index.html" : req.url;
    const filePath = path.normalize(path.join(clientDir, file));

    if (!filePath.startsWith(clientDir)) {
        res.writeHead(403);
        return res.end("Forbidden");
    }

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            return res.end("Not found");
        }

        res.writeHead(200, {
            "Content-Type": "text/html; charset=utf-8"
        });

        res.end(data);
    });
});

const wss = new WebSocket.Server({ server });

function broadcast() {
    const output = {};

    for (const [id, player] of players) {
        output[id] = {
            id: player.id,
            x: player.x,
            y: player.y,
            z: player.z,
            rot: player.rot,
            animal: player.animal,
            race: player.race
        };
    }

    const message = JSON.stringify({
        type: "state",
        players: output
    });

    for (const ws of wss.clients) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(message);
        }
    }
}

wss.on("connection", (ws) => {

    const id = String(nextId++);

    players.set(id, {
        id,
        x: 0,
        y: 1,
        z: 0,
        rot: 0,
        animal: "แมว",
        race: "mammal"
    });

    ws.send(JSON.stringify({
        type: "welcome",
        id
    }));

    ws.on("message", (raw) => {

        let message;

        try {
            message = JSON.parse(raw);
        } catch {
            return;
        }

        const player = players.get(id);

        if (!player) return;

        if (message.type === "move") {

            player.x = Number(message.x) || 0;
            player.y = Number(message.y) || 1;
            player.z = Number(message.z) || 0;
            player.rot = Number(message.rot) || 0;

            if (message.animal) {
                player.animal =
                    String(message.animal).slice(0, 30);
            }
        }

        if (message.type === "respawn") {

            player.x = 0;
            player.y = 1;
            player.z = 0;
        }

        if (message.type === "attack") {

            ws.send(JSON.stringify({
                type: "message",
                text: "⚔️ โจมตี"
            }));
        }

        if (message.type === "skill") {

            ws.send(JSON.stringify({
                type: "message",
                text: "✨ ใช้สกิล"
            }));
        }

        broadcast();
    });

    ws.on("close", () => {

        players.delete(id);
        broadcast();
    });
});

server.listen(PORT, () => {

    console.log(
        "Beast Evolution server running on port " + PORT
    );
});
