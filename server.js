require("dotenv").config();
const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

const app = express();
const PORT = 5000;
  // Set EJS as the view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Serve the upload page
app.get("/", (req, res) => {
    res.render("upload");
});

// Video upload route


// Configure MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("MongoDB connected"))
    .catch(err => console.error(err));

// Configure Cloudinary
cloudinary.config({ 
    cloud_name: process.env.CLOUD_NAME, 
    api_key: process.env.API_KEY, 
    api_secret: process.env.API_SECRET 
});

// Cloudinary storage setup
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: "videos",
        resource_type: "video",
    },
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 100000000 }, // 100MB limit, adjust as needed
});

// Video upload route
app.post("/upload", upload.single("video"), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
    }
    res.status(200).json({ message: "File uploaded successfully", fileUrl: req.file.path });
});
  // Show all uploaded videos
  const Video = mongoose.model("Video", new mongoose.Schema({
    name: String,
    url: String,
}));

app.get("/show", async (req, res) => {
    try {
        const videos = await Video.find();  // Fetch video data from MongoDB
        res.render("show", { videos: videos });
    } catch (err) {
        res.status(500).json({ message: "Error fetching videos" });
    }
});


app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
