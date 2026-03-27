const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const INITIAL_MARKETS = [
    { id: "1", question: "Will Bitcoin hit $100k before December?", yesShares: 4200, noShares: 5800, endTime: "2026-12-01T00:00:00Z", volumeAmount: 4500000, category: "Crypto", status: "OPEN" },
    { id: "2", question: "Will the Fed cut rates in Q4 2026?", yesShares: 6500, noShares: 3500, endTime: "2026-12-31T00:00:00Z", volumeAmount: 1200000, category: "Finance", status: "OPEN" },
    { id: "3", question: "Will SpaceX land on Mars in 2026?", yesShares: 1200, noShares: 8800, endTime: "2026-12-31T23:59:59Z", volumeAmount: 890000, category: "Science", status: "OPEN" },
    { id: "4", question: "Ethereum ETF approved by SEC?", yesShares: 8800, noShares: 1200, endTime: "2026-06-30T00:00:00Z", volumeAmount: 3100000, category: "Crypto", status: "OPEN" },
    { id: "5", question: "Will GPT-5 be released by OpenAI before 2027?", yesShares: 7600, noShares: 2400, endTime: "2026-12-31T00:00:00Z", volumeAmount: 2400000, category: "Technology", status: "OPEN" },
    { id: "6", question: "US GDP growth > 2.5% in 2026?", yesShares: 5500, noShares: 4500, endTime: "2027-01-31T00:00:00Z", volumeAmount: 1800000, category: "Economy", status: "OPEN" }
];

let globalMarkets = [...INITIAL_MARKETS];
let globalTrades = [];

app.prepare().then(() => {
    const server = createServer(async (req, res) => {
        try {
            const parsedUrl = parse(req.url, true);
            await handle(req, res, parsedUrl);
        } catch (err) {
            console.error("Error handling request", req.url, err);
            res.statusCode = 500;
            res.end("internal server error");
        }
    });

    const io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    io.on("connection", (socket) => {
        console.log("Client connected:", socket.id);

        // Provide initial state
        socket.emit("initial_state", {
            markets: globalMarkets,
            trades: globalTrades
        });

        socket.on("place_trade", (tradeData, callback) => {
            const marketIndex = globalMarkets.findIndex(m => m.id === tradeData.marketId);
            if (marketIndex === -1 || globalMarkets[marketIndex].status === "RESOLVED") {
                if (callback) callback({ success: false, error: "Market unavailable" });
                return;
            }

            const market = globalMarkets[marketIndex];
            if (tradeData.type === "YES") {
                market.yesShares += tradeData.amount;
            } else {
                market.noShares += tradeData.amount;
            }
            market.volumeAmount += tradeData.amount;

            const newTrade = {
                id: Math.random().toString(36).substring(7),
                marketId: tradeData.marketId,
                marketQuestion: tradeData.marketQuestion,
                type: tradeData.type,
                amount: tradeData.amount,
                price: tradeData.price,
                shares: tradeData.shares,
                timestamp: new Date().toISOString()
            };

            globalTrades.unshift(newTrade);

            // Broadcast globally
            io.emit("market_updated", market);
            io.emit("trade_executed", newTrade);

            if (callback) callback({ success: true, trade: newTrade });
        });

        socket.on("resolve_market", (data, callback) => {
            const { marketId, outcome } = data;
            const marketIndex = globalMarkets.findIndex(m => m.id === marketId);
            if (marketIndex === -1 || globalMarkets[marketIndex].status === "RESOLVED") {
                if (callback) callback({ success: false, error: "Invalid market" });
                return;
            }

            globalMarkets[marketIndex].status = "RESOLVED";
            globalMarkets[marketIndex].winningOutcome = outcome;

            io.emit("market_resolved", { marketId, outcome });

            if (callback) callback({ success: true });
        });

        socket.on("create_market", (marketData, callback) => {
            const newMarket = {
                id: (globalMarkets.length + 1).toString(),
                question: marketData.question,
                yesShares: 5000, // Initial balanced pool
                noShares: 5000,
                endTime: marketData.endTime,
                volumeAmount: 0,
                category: marketData.category,
                status: "OPEN"
            };

            globalMarkets.push(newMarket);
            io.emit("market_updated", newMarket); // Broadcast the new market to everyone

            if (callback) callback({ success: true, market: newMarket });
        });

        socket.on("disconnect", () => {
            console.log("Client disconnected:", socket.id);
        });
    });

    server.once("error", (err) => {
        console.error(err);
        process.exit(1);
    });

    server.listen(port, () => {
        console.log(`> Ready on http://${hostname}:${port}`);
        console.log(`> Socket.io engine active`);
    });
});
