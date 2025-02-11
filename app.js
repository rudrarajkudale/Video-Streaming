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
    public_id: String, // To store Cloudinary's public_id for deletion
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
            public_id: req.file.filename, // Store public_id for later deletion
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
        const videos = await Video.find();
        res.render("show", { videos });
    } catch (err) {
        console.error("Error fetching videos:", err);
        res.status(500).json({ message: "Error fetching videos" });
    }
});

app.get("/edit/:id", async (req, res) => {
    try {
        const video = await Video.findById(req.params.id);
        if (!video) {
            return res.status(404).send("Video not found");
        }
        res.render("edit", { video }); // Render the edit form
    } catch (error) {
        console.error("Edit page error:", error);
        res.status(500).send("Server error");
    }
});

app.post("/update/:id", async (req, res) => {
    try {
        const { name } = req.body;
        const video = await Video.findByIdAndUpdate(req.params.id, { name }, { new: true });

        if (!video) {
            return res.status(404).send("Video not found");
        }

        res.send("<script>alert('Video updated successfully!'); window.location='/show';</script>");
    } catch (error) {
        console.error("Update error:", error);
        res.status(500).send("Error updating video");
    }
});


// Delete Video Route
app.delete("/delete/:id", async (req, res) => {
    try {
        const videoId = req.params.id;
        const video = await Video.findById(videoId);

        if (!video) {
            return res.status(404).json({ message: "Video not found" });
        }

        // Extract public ID from Cloudinary URL
        const publicId = video.url.split('/').pop().split('.')[0];

        // Delete from Cloudinary
        await cloudinary.uploader.destroy(publicId, { resource_type: "video" });

        // Delete from MongoDB
        await Video.findByIdAndDelete(videoId);

        res.status(200).json({ message: "Video deleted successfully" });
    } catch (error) {
        console.error("Delete error:", error);
        res.status(500).json({ message: "Error deleting video" });
    }
});


// Start Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
