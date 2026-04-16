// import { Request } from "express";
import { Request } from "../utils/customRequest";

import { getIoInstance } from "../utils/websocket";
const io = getIoInstance(); // Get the io instance

const useSocketIoHook = () => {
  /**
   * Emit an event to a specific user by ID.
   * @param {string} id - User ID
   * @param {string} event - Event name
   * @param {*} arg - Argument to pass with the event
   */
  const emitToUser = (id: string, event: string, arg: any) => {
    if (id) {
      io.emitToSpecificUser(id, event, arg);
    } else {
      console.error("User ID is missing.");
    }
  };

  /**
   * Emit an event to the authenticated user (based on `req.user`).
   * @param {object} req - Express request object
   * @param {string} event - Event name
   * @param {*} arg - Argument to pass with the event
   */
  const emitToAuthUser = (req: Request, event: string, arg: any) => {
    if (req.user && req.user._id) {
      io.emitToSpecificUser(req.user._id, event, arg);
    } else {
      console.error("Authenticated user not found.");
    }
  };

  /**
   * Emit an event to multiple users by their IDs.
   * @param {Array<string>} ids - Array of user IDs
   * @param {string} event - Event name
   * @param {*} arg - Argument to pass with the event
   */
  const emitToUsers = (ids: string[], event: string, arg: any) => {
    if (Array.isArray(ids)) {
      ids.forEach((id) => {
        emitToUser(id, event, arg);
      });
    } else {
      console.error("Invalid IDs array.");
    }
  };

  /**
   * register a route
   * @param {string} event - Event name
   * @param {*} arg - Argument to pass with the event
   */
  const socketRoute = (event: string, arg: any) => {
    io.registerEvent(event, arg); // Emit event to all connected clients
  };

  return {
    emitToUser,
    emitToAuthUser,
    emitToUsers,
    socketRoute, // Renamed to more descriptive
  };
};

export default useSocketIoHook;
