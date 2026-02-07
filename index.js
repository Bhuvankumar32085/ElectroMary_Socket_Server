import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5001;

// socket io
const io = new Server(server, {
  cors: {
    origin: "https://electro-mart-u5yl.vercel.app", //f
  },
});

// Middleware
app.use(
  cors({
    origin: "https://electro-mart-u5yl.vercel.app", //f
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const userIdWithSockets = new Map(); // userId -> Set(socketId)
const socketIdToUserId = new Map(); // socketId -> userId

io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  socket.on("user_id_with_socket", ({ userID }) => {
    if (!userID) {
      return;
    }

    if (!userIdWithSockets.has(userID)) {
      // userId ke pass socketId nahi to empty set bana do
      userIdWithSockets.set(userID, new Set());
    }

    userIdWithSockets.get(userID).add(socket.id); // agar user pehli baar h to set me socketId add karo agar same user ke liye dubara socket aaya ho set me fir add karo
    socketIdToUserId.set(socket.id, userID); // socketId unique nahi hogi user id unique hogi

    console.log("REGISTER", userID, socket.id);
    console.log("socketIdToUserId", socketIdToUserId);
    console.log("userIdWithSockets", userIdWithSockets);
  });

  socket.on("disconnect", () => {
    const userId = socketIdToUserId.get(socket.id); //jo socketId dissconnet hona charahi h us ki userId lo
    if (!userId) return;

    const set = userIdWithSockets.get(userId); // userId ke under Set() h
    if (set) {
      // ager Set h
      set.delete(socket.id); //bs bo hi Set se selet karo socketId ho delet hona charahi h
      if (set.size === 0) {
        // gar set ka size 0 hogaya to user pr Koy socketId nahi userId bhi delete kr do
        userIdWithSockets.delete(userId);
      }
    }

    socketIdToUserId.delete(socket.id); // jo socet gaya bo to delet ker hi do
    console.log("DISCONNECT", socket.id);
    console.log("socketIdToUserId", socketIdToUserId);
    console.log("userIdWithSockets", userIdWithSockets);
  });
});

app.post("/chat-update", (req, res) => {
  try {
    const { receiverId, message } = req.body;

    const sockets = userIdWithSockets.get(receiverId); //userIdWithSockets me userId ke pass bhoot sare socket ho sakte h
    if (!sockets || sockets.size === 0) {
      return res.json({ success: true, delivered: false });
    }

    for (const socketId of sockets) {
      // sb socket pr event do
      io.to(socketId).emit("update_chat", { message });
    }
    console.log("socketIdToUserId", socketIdToUserId);
    console.log("userIdWithSockets", userIdWithSockets);
    return res.json({ success: true, delivered: true });
  } catch (error) {
    console.error(error);
    return res.json({ success: true, delivered: true });
  }
});

app.post("/update-user-order-status", (req, res) => {
  try {
    const { order, userId } = req.body;
    console.log(userId);
    console.log("socketIdToUserId", socketIdToUserId);
    console.log("userIdWithSockets", userIdWithSockets);
    const sockets = userIdWithSockets.get(userId);
    if (!sockets || sockets.size === 0) {
      return res.json({ success: true, delivered: false });
    }

    for (const socketId of sockets) {
      // sb socket pr event do
      io.to(socketId).emit("update-user-order-status", { order });
    }

    return res.json({ success: true, delivered: true });
  } catch (error) {
    return res.json({ success: true, delivered: true });
  }
});

app.post("/update-verify-delivery-status", (req, res) => {
  try {
    const { order, userId } = req.body;
    console.log("verify-delivery:- ", order, userId);

    const sockets = userIdWithSockets.get(userId);
    if (!sockets || sockets.size === 0) {
      return res.json({ success: true, delivered: false });
    }

    for (const socketId of sockets) {
      // sb socket pr event do
      io.to(socketId).emit("update-verify-delivery-status", { order });
    }

    return res.json({ success: true, delivered: true });
  } catch (error) {
    return res.json({ success: true, delivered: true });
  }
});

app.post("/add-user-order-on-vendorOrders", (req, res) => {
  try {
    const { order, productVendor } = req.body;
    console.log("vendorOrders:- ", order, productVendor);

    const sockets = userIdWithSockets.get(productVendor);
    if (!sockets || sockets.size === 0) {
      return res.json({ success: true, delivered: false });
    }

    for (const socketId of sockets) {
      // sb socket pr event do
      io.to(socketId).emit("add-user-order-on-vendorOrders", { order });
    }

    return res.json({ success: true, delivered: true });
  } catch (error) {
    return res.json({ success: true, delivered: true });
  }
});

app.post("/update-product-realtime", (req, res) => {
  //edit product
  try {
    const { product } = req.body;

    if (!product || !product._id) {
      return res.json({ success: false });
    }

    // 🔥 ALL users ko broadcast
    io.emit("product-updated", { product });

    return res.json({ success: true });
  } catch (error) {
    console.error(error);
    return res.json({ success: false });
  }
});

// socket-server.js
app.post("/update-product-active", (req, res) => {
  try {
    const { product } = req.body;

    if (!product?._id) {
      return res.json({ success: false });
    }

    // 🔥 sab users ko notify
    io.emit("product-active-updated", { product });

    return res.json({ success: true });
  } catch (error) {
    console.error(error);
    return res.json({ success: false });
  }
});

app.post("/order-returned", (req, res) => {
  try {
    const { order, vendorId } = req.body;

    // 🔔 VENDOR
    const vendorSockets = userIdWithSockets.get(String(vendorId));
    if (vendorSockets) {
      for (const sid of vendorSockets) {
        io.to(sid).emit("order-returned", { order });
      }
    }

    return res.json({ success: true });
  } catch (e) {
    return res.json({ success: false });
  }
});

app.post("/order-cancelled", (req, res) => {
  try {
    const { order, vendorId } = req.body;

    // VENDOR notify
    const vendorSockets = userIdWithSockets.get(String(vendorId));
    if (vendorSockets) {
      for (const sid of vendorSockets) {
        io.to(sid).emit("order-cancelled", { order });
      }
    }

    return res.json({ success: true });
  } catch (e) {
    return res.json({ success: false });
  }
});

server.listen(PORT, () => {
  console.log(`Server listening on POST ${PORT}`);
});
