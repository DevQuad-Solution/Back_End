import { Server } from 'socket.io';
import { ObjectId } from 'mongoose';
import { Account } from '../models/account';
import corsOptions from '../config/cors';
import { verifyToken } from './tokenService';

let io: any;
const connectedUsers = new Map();

/**
 * Initialize the Socket.IO server, attaching it to the provided HTTP server.
 * @param {Object} server - The HTTP server instance to attach the Socket.IO server to.
 */
const useSocket = (server: any) => {
  io = new Server(server, {
    cors: corsOptions, // Apply CORS settings for cross-origin requests
  });

  /**
   * Middleware for JWT authentication; executes for every socket connection.
   * @param {Object} socket - The socket instance for the connection.
   * @param {Function} next - The next middleware function to call.
   */
  io.use(async (socket: any, next: any) => {
    const token = socket.handshake.auth.token; // Extract token from the socket handshake

    // If no token is provided, reject the connection with an error
    if (!token) {
      return next(new Error('Authentication error: Token is missing'));
    }

    try {
      // Verify the provided token using the secret key, extracting the user ID
      const decoded: any = verifyToken(token, process.env.ACCESS_KEY as string);
      const user = await Account.findById(decoded.id); // Look up the user in the database using the decoded ID

      // If no user is found, reject the connection
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      // Attach the user ID to the socket object for future reference
      socket.userId = user.id.toString(); // Ensure the user ID is a string
      next(); // Proceed with the connection if authentication is successful
    } catch (error) {
      console.error('JWT verification error:', error); // Log any JWT verification errors
      return next(new Error('Authentication error: Invalid token')); // Reject the connection on token verification failure
    }
  });

  /**
   * Emit an event to all active sockets of a specified user.
   * @param {string} id - The user ID to emit the event to.
   * @param {string} event - The event name to emit.
   * @param {*} arg - The argument to pass with the event.
   */
  io.emitToSpecificUser = (id: ObjectId, event: string, arg: any) => {
    const userIdStr = id.toString(); // Normalize user ID to string for consistency
    const userSockets = connectedUsers.get(userIdStr); // Retrieve the list of connected sockets for the user
    console.log('emited to ', id);
    // If the user has active sockets, emit the event to each socket
    if (userSockets && userSockets.length) {
      userSockets.forEach((socketId: any) => {
        io.to(socketId).emit(event, arg); // Emit the specified event along with the arguments
      });
    }
  };

  /**
   * Register a socket event handler, enabling encapsulation of request-response logic.
   * @param {string} eventName - The name of the event to listen for.
   * @param {Function} handler - The function to handle the event when it occurs.
   */
  io.registerEvent = (eventName: string, handler: any) => {
    io.on('connection', (socket: any) => {
      // Register the event listener for the specified event
      socket.on(eventName, async (data: any) => {
        try {
          // Creating a req-like object to simulate Express.js request structure
          const req = {
            socket, // Reference to the current socket connection
            body: data, // The data payload received with the event
            user: socket.user || {}, // Attach user information, if available
            params: {}, // Placeholder for any route parameters that might be needed
            query: {}, // Placeholder for query string parameters
          };

          // Creating a res-like object to simulate Express.js response structure
          const res = {
            send: (response: any) => {
              socket.emit(`${eventName}Success`, response); // Send a success response back to the client
            },
            status: (code: any) => {
              return {
                send: (response: any) => {
                  // Emit an error response with a specified status code and message
                  socket.emit(`${eventName}Error`, {
                    status: code,
                    message: response,
                  });
                },
              };
            },
          };

          // Invoke the handler function, passing the simulated req and res objects
          await handler(req, res);
        } catch (error) {
          console.error(`Error in event ${eventName}:`, error); // Log the error for debugging
          socket.emit('error', { message: 'An error occurred' }); // Emit a generic error message back to the client
        }
      });
    });
  };

  /**
   * Handle socket connection and maintain user socket state.
   * @param {Object} socket - The socket instance for the connection.
   */
  io.on('connection', (socket: any) => {
    const userId = socket.userId.toString(); // Convert user ID to string for consistency

    // Add the socket ID to the user's list of active sockets
    if (connectedUsers.has(userId)) {
      connectedUsers.get(userId).push(socket.id);
    } else {
      connectedUsers.set(userId, [socket.id]); // Initialize with the first socket ID
    }

    // Emit a welcome message to the user who just connected
    socket.emit('welcome', {
      message: `Welcome ${userId}! You are successfully connected.`,
    });

    // Handle socket disconnection
    socket.on('disconnect', () => {
      if (connectedUsers.has(userId)) {
        const userSockets = connectedUsers.get(userId).filter((id: string) => id !== socket.id); // Remove the current socket ID from the user's active sockets
        if (userSockets.length > 0) {
          connectedUsers.set(userId, userSockets); // Update the user's socket list
        } else {
          connectedUsers.delete(userId); // Remove user if no sockets remain
        }
      }
    });
  });

  return {
    io, // Return the initialized io instance for external access
  };
};

/**
 * Get the initialized Socket.IO instance.
 * @returns {Object} - The Socket.IO instance.
 * @throws {Error} - Throws an error if Socket.IO is not initialized.
 */
const getIoInstance = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io; // Return the io instance if initialized
};

export { useSocket, getIoInstance };
