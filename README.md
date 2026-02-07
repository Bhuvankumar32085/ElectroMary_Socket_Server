# ElectroMart Socket Server

This is the socket server used in the ElectroMart project.  
It handles all real-time features between the Next.js application and users.

---

## Live Links

Socket server:
https://electromary-socket-server.onrender.com

Next.js application (frontend + backend):
https://electro-mart-u5yl.vercel.app

---

## Purpose

This server is used only for real-time communication.  
The main backend logic remains inside the Next.js app.

It is responsible for:
- real-time order updates
- vendor order notifications
- product update sync
- product active / inactive updates
- chat message delivery
- order cancelled and returned events

---

## Tech Stack

- Node.js
- Express.js
- Socket.IO
- CORS
- dotenv

---

## How it Works

1. Client connects to socket server
2. Client sends userId using `user_id_with_socket`
3. Server maps userId with socketId
4. On events, server emits data to correct users
5. On disconnect, socket mapping is cleaned automatically

Multiple tabs and page refresh are supported.

---

## Socket Events

### Client to Server

```js
socket.emit("user_id_with_socket", {
  userID: "USER_ID"
});
