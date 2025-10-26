import express from "express";
import Podcast from "../models/Podcast";
import {
  uploadAudio,
  uploadVideo,
  deleteFileFromS3,
  uploadPodcast,
} from "../services/file-upload";
import multer from "multer";
import auth from "../middleware/auth";

const router = express.Router();

// Upload podcast with audio and/or video files to S3
router.post(
  "/",
  auth,
  uploadPodcast.fields([
    { name: "audio", maxCount: 1 },
    { name: "video", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const {
        title,
        description,
        category,
        tags,
        youtube,
        spotify,
        anghami,
        appleMusic,
      } = req.body;
      
      const files = req.files as {
        [fieldname: string]: Express.MulterS3.File[];
      };
      
      const audioFile = files?.audio?.[0];
      const videoFile = files?.video?.[0];
      const thumbnailFile = files?.thumbnail?.[0];

      if (!audioFile && !videoFile) {
        return res
          .status(400)
          .json({ error: "Please upload at least one audio or video file" });
      }

      // S3 files have a 'location' property with the public URL
      const audioUrl = audioFile ? audioFile.location : null;
      const videoUrl = videoFile ? videoFile.location : null;
      const thumbnailUrl = thumbnailFile ? thumbnailFile.location : null;

      const podcastData = {
        title,
        description,
        category,
        tags: tags ? tags.split(",").map((tag: string) => tag.trim()) : [],
        audioUrl,
        videoUrl,
        youtube,
        spotify,
        anghami,
        appleMusic,
        thumbnailUrl,
        createdAt: new Date(),
      };

      const podcast = new Podcast(podcastData);
      await podcast.save();

      res.status(201).json({
        message: "Podcast uploaded successfully!",
        podcast,
      });
    } catch (error: any) {
      console.error("Upload error:", error);
      res.status(400).json({ error: error.message });
    }
  }
);

// Upload only audio file to S3
router.post("/upload-audio", auth, uploadAudio.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No audio file uploaded" });
    }

    const file = req.file as Express.MulterS3.File;

    res.json({
      message: "Audio uploaded successfully",
      url: file.location,
      key: file.key,
      size: file.size,
    });
  } catch (error: any) {
    console.error("Audio upload error:", error);
    res.status(500).json({ error: "Failed to upload audio" });
  }
});

// Upload only video file to S3
router.post("/upload-video", auth, uploadVideo.single("video"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No video file uploaded" });
    }

    const file = req.file as Express.MulterS3.File;

    res.json({
      message: "Video uploaded successfully",
      url: file.location,
      key: file.key,
      size: file.size,
    });
  } catch (error: any) {
    console.error("Video upload error:", error);
    res.status(500).json({ error: "Failed to upload video" });
  }
});

// Get all podcasts with pagination, search, and filters
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Search and filter parameters
    const search = req.query.search as string;
    const tags = req.query.tags as string;
    const category = req.query.category as string;
    const sortBy = (req.query.sortBy as string) || "createdAt";
    const sortOrder = (req.query.sortOrder as string) || "desc";

    // Build query object
    let query: any = {};

    // General search across title, description, AND tags
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { tags: { $regex: search, $options: "i" } },
      ];
    }

    if (category) {
      query.category = category;
    }

    // Additional tag filtering (exact matches only)
    if (tags) {
      const tagList = tags.split(",").map((tag) => tag.trim());
      query.tags = { $in: tagList.map((tag) => new RegExp(`^${tag}$`, "i")) };
    }

    // Build sort object
    const sortObj: any = {};
    sortObj[sortBy] = sortOrder === "asc" ? 1 : -1;

    // Execute query with pagination
    const podcasts = await Podcast.find(query)
      .skip(skip)
      .limit(limit)
      .sort(sortObj);

    // Get total count for pagination info
    const totalPodcasts = await Podcast.countDocuments(query);
    const totalPages = Math.ceil(totalPodcasts / limit);

    res.status(200).json({
      podcasts,
      pagination: {
        currentPage: page,
        totalPages,
        totalPodcasts,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
        limit,
      },
      filters: {
        search,
        tags,
        category,
        sortBy,
        sortOrder,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single podcast by ID
router.get("/:id", async (req, res) => {
  console.log("Fetching podcast with ID:", req.params.id);
  try {
    const { id } = req.params;
    const podcast = await Podcast.findById(id);

    if (!podcast) {
      return res.status(404).json({ error: "Podcast not found" });
    }

    res.status(200).json(podcast);
  } catch (error: any) {
    // Handle invalid ObjectId format
    if (error.name === "CastError") {
      return res.status(400).json({ error: "Invalid podcast ID format" });
    }
    res.status(500).json({ error: error.message });
  }
});

// PARTIAL UPDATE - Patch podcast by ID
router.patch("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const updatedPodcast = await Podcast.findByIdAndUpdate(
      id,
      { $set: updates },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedPodcast) {
      return res.status(404).json({ error: "Podcast not found" });
    }

    res.status(200).json({
      message: "Podcast updated successfully",
      podcast: updatedPodcast,
    });
  } catch (error: any) {
    if (error.name === "CastError") {
      return res.status(400).json({ error: "Invalid podcast ID format" });
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// Delete podcast and remove files from S3
router.delete("/:id", auth, async (req, res) => {
  console.log('hi')
  try {
    const { id } = req.params;

    const podcast = await Podcast.findById(id);

    if (!podcast) {
      return res.status(404).json({ error: "Podcast not found" });
    }

    // Delete files from S3 if they exist
    try {
      if (podcast.audioUrl) {
        await deleteFileFromS3(podcast.audioUrl);
        console.log("Audio file deleted from S3:", podcast.audioUrl);
      }
      if (podcast.videoUrl) {
        await deleteFileFromS3(podcast.videoUrl);
        console.log("Video file deleted from S3:", podcast.videoUrl);
      }
    } catch (s3Error: any) {
      console.error("Error deleting files from S3:", s3Error);
      // Continue with database deletion even if S3 deletion fails
    }

    // Delete podcast from database
    await Podcast.findByIdAndDelete(id);

    res.status(200).json({
      message: "Podcast and associated files deleted successfully",
      deletedPodcast: podcast,
    });
  } catch (error: any) {
    if (error.name === "CastError") {
      return res.status(400).json({ error: "Invalid podcast ID format" });
    }
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware for multer errors
router.use(
  (
    error: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          error:
            "File is too large. Max size is 500MB for video and 100MB for audio",
        });
      }
      return res.status(400).json({ error: error.message });
    }

    if (
      error.message === "Only audio files are allowed!" ||
      error.message === "Only video files are allowed!"
    ) {
      return res.status(400).json({ error: error.message });
    }

    next(error);
  }
);

export default router;
