import { io, Socket } from "socket.io-client";

// Socket URL configuration - use VITE_SOCKET_URL or fallback to API base
const getSocketUrl = (): string => {
  // In production, use VITE_SOCKET_URL or derive from VITE_API_URL
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }

  // Fallback: derive from API URL (remove /api suffix)
  if (import.meta.env.VITE_API_URL) {
    const apiUrl = import.meta.env.VITE_API_URL;
    return apiUrl.replace(/\/api\/?$/, "");
  }

  // Development fallback
  return "http://localhost:5000";
};

export const SOCKET_URL = getSocketUrl();

// Socket path - can be customized for proxy configurations
export const SOCKET_PATH = import.meta.env.VITE_SOCKET_PATH || "/socket.io";

// Create socket instance with production-ready configuration
export const createSocket = (): Socket => {
  const socket = io(SOCKET_URL, {
    path: SOCKET_PATH,
    transports: ["websocket", "polling"], // Prefer WebSocket, fallback to polling
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    autoConnect: true,
  });

  // Debug logging in development
  if (import.meta.env.DEV) {
    socket.on("connect", () => {
      console.log("[Socket] Connected:", socket.id);
    });

    socket.on("disconnect", (reason) => {
      console.log("[Socket] Disconnected:", reason);
    });

    socket.on("connect_error", (error) => {
      console.error("[Socket] Connection error:", error.message);
    });
  }

  return socket;
};

// Singleton socket instance
let socketInstance: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socketInstance) {
    socketInstance = createSocket();
  }
  return socketInstance;
};

export const disconnectSocket = (): void => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
};

export default {
  SOCKET_URL,
  SOCKET_PATH,
  createSocket,
  getSocket,
  disconnectSocket,
};
