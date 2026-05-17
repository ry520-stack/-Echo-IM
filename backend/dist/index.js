"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const app_1 = __importDefault(require("./app"));
const socket_service_1 = require("./services/socket.service");
const delayed_service_1 = require("./services/delayed.service");
const PORT = process.env.PORT || 3001;
const httpServer = (0, http_1.createServer)(app_1.default);
(0, socket_service_1.initSocket)(httpServer);
(0, delayed_service_1.startDelayedMessageScheduler)();
httpServer.listen(PORT, () => {
    console.log(`Echo server running on http://localhost:${PORT}`);
});
//# sourceMappingURL=index.js.map