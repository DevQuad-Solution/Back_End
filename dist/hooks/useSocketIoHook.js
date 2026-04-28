"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const websocket_1 = require("../utils/websocket");
const io = (0, websocket_1.getIoInstance)(); // Get the io instance
const useSocketIoHook = () => {
    /**
     * Emit an event to a specific user by ID.
     * @param {string} id - User ID
     * @param {string} event - Event name
     * @param {*} arg - Argument to pass with the event
     */
    const emitToUser = (id, event, arg) => {
        if (id) {
            io.emitToSpecificUser(id, event, arg);
        }
        else {
            console.error("User ID is missing.");
        }
    };
    /**
     * Emit an event to the authenticated user (based on `req.user`).
     * @param {object} req - Express request object
     * @param {string} event - Event name
     * @param {*} arg - Argument to pass with the event
     */
    const emitToAuthUser = (req, event, arg) => {
        if (req.user && req.user._id) {
            io.emitToSpecificUser(req.user._id, event, arg);
        }
        else {
            console.error("Authenticated user not found.");
        }
    };
    /**
     * Emit an event to multiple users by their IDs.
     * @param {Array<string>} ids - Array of user IDs
     * @param {string} event - Event name
     * @param {*} arg - Argument to pass with the event
     */
    const emitToUsers = (ids, event, arg) => {
        if (Array.isArray(ids)) {
            ids.forEach((id) => {
                emitToUser(id, event, arg);
            });
        }
        else {
            console.error("Invalid IDs array.");
        }
    };
    /**
     * register a route
     * @param {string} event - Event name
     * @param {*} arg - Argument to pass with the event
     */
    const socketRoute = (event, arg) => {
        io.registerEvent(event, arg); // Emit event to all connected clients
    };
    return {
        emitToUser,
        emitToAuthUser,
        emitToUsers,
        socketRoute, // Renamed to more descriptive
    };
};
exports.default = useSocketIoHook;
