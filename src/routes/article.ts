import express from "express";
import Article from "../models/Article";
import auth from "../middleware/auth";
import { uploadArticleMedia, uploadArticle } from "../services/file-upload";

const router = express.Router();



router.post(
  "/",
  auth,
  uploadArticle.single("thumbnail"), // Handle single thumbnail upload
  async (req, res) => {
    try {
      const file = req.file as Express.MulterS3.File;

      // Get thumbnail URL from uploaded file
      const thumbnailUrl = file ? file.location : req.body.thumbnail || "";

      const articleData = {
        ...req.body,
        thumbnail: thumbnailUrl,
        tags: req.body.tags
          ? typeof req.body.tags === "string"
            ? req.body.tags.split(",").map((tag: string) => tag.trim())
            : req.body.tags
          : [],
        date: req.body.date ? new Date(req.body.date) : new Date(),
      };

      const newArticle = await Article.create(articleData);
      res.status(201).json(newArticle);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

// READ - Get all articles with pagination, search and filtering
router.get("/", async (req, res) => {
  console.log("fetching articles");
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const search = req.query.search as string;
    const tags = req.query.tags as string;
    const category = req.query.category as string;
    const status = req.query.status as string;
    const author = req.query.author as string;
    const sortBy = (req.query.sortBy as string) || "date"; // Changed to "date"
    const sortOrder = (req.query.sortOrder as string) || "desc";

    let query: any = {};

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } },
        { tags: { $regex: search, $options: "i" } },
      ];
    }

    if (category) {
      query.category = category;
    }

    if (status) {
      query.status = status;
    }

    if (author) {
      query.author = { $regex: author, $options: "i" };
    }

    if (tags) {
      const tagList = tags.split(",").map((tag) => tag.trim());
      query.tags = { $in: tagList.map((tag) => new RegExp(`^${tag}$`, "i")) };
    }

    const sortObj: any = {};
    sortObj[sortBy] = sortOrder === "asc" ? 1 : -1;

    const articles = await Article.find(query)
      .skip(skip)
      .limit(limit)
      .sort(sortObj);

    const totalArticles = await Article.countDocuments(query);
    const totalPages = Math.ceil(totalArticles / limit);

    res.status(200).json({
      articles,
      pagination: {
        currentPage: page,
        totalPages,
        totalArticles,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
        limit,
      },
      filters: {
        search,
        tags,
        category,
        status,
        author,
        sortBy,
        sortOrder,
      },
    });
  } catch (error: any) {
    console.log(error)
    res.status(500).json({ error: error.message });
  }
});

// READ - Get published articles only (public endpoint)
router.get("/published", async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const search = req.query.search as string;
    const category = req.query.category as string;

    let query: any = { status: "published" };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } },
      ];
    }

    if (category) {
      query.category = category;
    }

    const articles = await Article.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ publishDate: -1 })
      .select("-content"); // Don't send full content in list view

    const totalArticles = await Article.countDocuments(query);
    const totalPages = Math.ceil(totalArticles / limit);

    res.status(200).json({
      articles,
      pagination: {
        currentPage: page,
        totalPages,
        totalArticles,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
        limit,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// READ - Get article by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const article = await Article.findById(id);

    if (!article) {
      return res.status(404).json({ error: "Article not found" });
    }

    res.status(200).json(article);
  } catch (error: any) {
    if (error.name === "CastError") {
      return res.status(400).json({ error: "Invalid article ID format" });
    }
    res.status(500).json({ error: error.message });
  }
});

// READ - Get article by slug (SEO-friendly URLs)
router.get("/slug/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const article = await Article.findOne({
      slug: slug,
      status: "published", // Only return published articles via slug
    });

    if (!article) {
      return res.status(404).json({ error: "Article not found" });
    }

    res.status(200).json(article);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PARTIAL UPDATE - Patch article by ID
router.patch("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const updatedArticle = await Article.findByIdAndUpdate(
      id,
      { $set: updates },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedArticle) {
      return res.status(404).json({ error: "Article not found" });
    }

    res.status(200).json(updatedArticle);
  } catch (error: any) {
    if (error.name === "CastError") {
      return res.status(400).json({ error: "Invalid article ID format" });
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// UPDATE - Publish/Unpublish article
router.patch("/:id/status", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["draft", "published", "archived"].includes(status)) {
      return res.status(400).json({
        error: "Invalid status. Must be draft, published, or archived",
      });
    }

    const updatedArticle = await Article.findByIdAndUpdate(
      id,
      {
        status,
        publishDate: status === "published" ? new Date() : undefined,
      },
      { new: true }
    );

    if (!updatedArticle) {
      return res.status(404).json({ error: "Article not found" });
    }

    res.status(200).json(updatedArticle);
  } catch (error: any) {
    if (error.name === "CastError") {
      return res.status(400).json({ error: "Invalid article ID format" });
    }
    res.status(500).json({ error: error.message });
  }
});

// DELETE - Delete article by ID
router.delete("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('hit')

    const deletedArticle = await Article.findByIdAndDelete(id);

    if (!deletedArticle) {
      return res.status(404).json({ error: "Article not found" });
    }

    res.status(200).json({
      message: "Article deleted successfully",
      deletedArticle,
    });
  } catch (error: any) {
    if (error.name === "CastError") {
      return res.status(400).json({ error: "Invalid article ID format" });
    }
    res.status(500).json({ error: error.message });
  }
});

// ANALYTICS - Get article stats
router.get("/stats/overview", auth, async (req, res) => {
  try {
    const stats = await Article.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const totalArticles = await Article.countDocuments();
    const publishedArticles = await Article.countDocuments({
      status: "published",
    });
    const draftArticles = await Article.countDocuments({ status: "draft" });

    res.status(200).json({
      totalArticles,
      publishedArticles,
      draftArticles,
      statusBreakdown: stats,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post(
  "/upload-media",
  auth,
  uploadArticleMedia.single("media"),
  async (req, res) => {
    try {
      const file = req.file as Express.MulterS3.File;
      
      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      res.status(200).json({ 
        url: file.location,
        key: file.key,
        type: file.mimetype
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

export default router;
