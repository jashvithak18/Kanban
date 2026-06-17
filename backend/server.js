require('dotenv').config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { MongoClient } = require("mongodb");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(express.json());

// CORS headers for HTTP requests (like /upload)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve static uploads
app.use("/uploads", express.static(uploadsDir));

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique name keeping original extension
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Upload endpoint
app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }
  const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
  res.json({
    url: fileUrl,
    name: req.file.originalname,
    type: req.file.mimetype
  });
});

// MongoDB setup
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017";
const client = new MongoClient(MONGODB_URI);

let db;
let tasksCollection;

async function connectDB() {
  const primaryUri = process.env.MONGODB_URI || "mongodb://localhost:27017";
  const fallbackUri = "mongodb://localhost:27017";

  try {
    await client.connect();
    const dbName = client.options.dbName || "kanban";
    db = client.db(dbName);
    tasksCollection = db.collection("tasks");
    console.log(`Connected to MongoDB database: ${dbName}`);
  } catch (error) {
    console.warn(`Failed to connect to primary MongoDB URI: ${error.message}`);
    if (primaryUri !== fallbackUri) {
      console.log(`Attempting fallback connection to local MongoDB: ${fallbackUri}`);
      try {
        const fallbackClient = new MongoClient(fallbackUri);
        await fallbackClient.connect();
        db = fallbackClient.db("kanban");
        tasksCollection = db.collection("tasks");
        console.log(`Connected to fallback local MongoDB database: kanban`);
      } catch (fallbackError) {
        console.error("Failed to connect to both primary and fallback MongoDB:", fallbackError);
        process.exit(1);
      }
    } else {
      console.error("Failed to connect to MongoDB:", error);
      process.exit(1);
    }
  }
}

// Helper wrapper to handle try/catch and emit task:error back to the originating socket
const handleEvent = (socket, eventName, handler) => {
  socket.on(eventName, async (data) => {
    try {
      await handler(data);
    } catch (err) {
      console.error(`${eventName} failed:`, err);
      socket.emit("task:error", { message: err.message, event: eventName });
    }
  });
};

// WebSocket setup
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Send initial state when client requests sync
  handleEvent(socket, "sync:tasks", async () => {
    const dbTasks = await tasksCollection.find({}, { projection: { _id: 0 } }).toArray();
    socket.emit("sync:tasks", { tasks: dbTasks });
  });

  // Send initial state immediately to the newly connected user
  (async () => {
    try {
      const dbTasks = await tasksCollection.find({}, { projection: { _id: 0 } }).toArray();
      socket.emit("sync:tasks", { tasks: dbTasks });
    } catch (err) {
      console.error("Initial sync:tasks failed:", err);
      socket.emit("task:error", { message: err.message, event: "sync:tasks" });
    }
  })();

  // Create Task
  handleEvent(socket, "task:create", async (data) => {
    const { title, description, priority, category } = data;
    if (!title) {
      throw new Error("title is required");
    }
    const now = new Date().toISOString();
    const newTask = {
      id: crypto.randomUUID(),
      title,
      description: description || "",
      column: "todo",
      priority: priority || "medium",
      category: category || "feature",
      attachments: data.attachments || [],
      createdAt: now,
      updatedAt: now
    };
    await tasksCollection.insertOne({ ...newTask });
    io.emit("task:created", newTask);
  });

  // Update Task
  handleEvent(socket, "task:update", async (data) => {
    const { id, ...fields } = data;
    if (!id) {
      throw new Error("task id is required");
    }
    delete fields._id;
    const now = new Date().toISOString();
    const updatedTask = await tasksCollection.findOneAndUpdate(
      { id },
      {
        $set: {
          ...fields,
          updatedAt: now
        }
      },
      {
        returnDocument: "after",
        projection: { _id: 0 }
      }
    );
    if (!updatedTask) {
      throw new Error(`task with id ${id} not found`);
    }
    io.emit("task:updated", updatedTask);
  });

  // Move Task
  handleEvent(socket, "task:move", async (data) => {
    const { id, column } = data;
    if (!id) {
      throw new Error("task id is required");
    }
    const now = new Date().toISOString();
    const updatedTask = await tasksCollection.findOneAndUpdate(
      { id },
      {
        $set: {
          column,
          updatedAt: now
        }
      },
      {
        returnDocument: "after",
        projection: { _id: 0 }
      }
    );
    if (!updatedTask) {
      throw new Error(`task with id ${id} not found`);
    }
    io.emit("task:moved", updatedTask);
  });

  // Delete Task
  handleEvent(socket, "task:delete", async (data) => {
    const { id } = data;
    if (!id) {
      throw new Error("task id is required");
    }
    const result = await tasksCollection.deleteOne({ id });
    if (result.deletedCount === 0) {
      throw new Error(`task with id ${id} not found`);
    }
    io.emit("task:deleted", { id });
  });

  // Attach File to Task
  handleEvent(socket, "task:attach", async (data) => {
    const { id, attachment } = data;
    if (!id) {
      throw new Error("task id is required");
    }
    const now = new Date().toISOString();
    const updatedTask = await tasksCollection.findOneAndUpdate(
      { id },
      {
        $push: { attachments: attachment },
        $set: { updatedAt: now }
      },
      {
        returnDocument: "after",
        projection: { _id: 0 }
      }
    );
    if (!updatedTask) {
      throw new Error(`task with id ${id} not found`);
    }
    io.emit("task:updated", updatedTask);
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

async function startServer() {
  await connectDB();
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
