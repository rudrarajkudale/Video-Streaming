require("dotenv").config();
const express = require("express");
const multer = require("multer");
const mongoose = require("mongoose");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const path = require("path");

const app = express();
const PORT = 5000;

// Set EJS as the view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log("MongoDB connected"))
    .catch(err => console.error("MongoDB connection error:", err));

// Define Video Model
const Video = mongoose.model("Video", new mongoose.Schema({
    name: String,
    url: String,
}));

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET,
});

// Cloudinary Storage Setup
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: "videos",
        resource_type: "video",
    },
});

const upload = multer({ storage: storage, limits: { fileSize: 100000000 } }); // 100MB limit

// Serve Upload Page
app.get("/", (req, res) => {
    res.render("upload");
});

// Video Upload Route
app.post("/upload", upload.single("video"), async (req, res) => {
    if (!req.file) {
        return res.status(400).send("<script>alert('No file uploaded'); window.location='/';</script>");
    }

    try {
        const newVideo = new Video({
            name: req.file.originalname,
            url: req.file.path,
        });

        await newVideo.save();

        res.send("<script>alert('Video uploaded successfully!'); window.location='/show';</script>");
    } catch (error) {
        console.error("Upload error:", error);
        res.status(500).send("<script>alert('Error saving video to database'); window.location='/';</script>");
    }
});


// Show All Uploaded Videos
app.get("/show", async (req, res) => {
    try {
        const videos = await Video.find(); // Fetch all videos
        console.log("Fetched videos:", videos); // Debugging line
        res.render("show", { videos: videos });
    } catch (err) {
        console.error("Error fetching videos:", err);
        res.status(500).json({ message: "Error fetching videos" });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
