import express from "express";
import Article from "../models/Article";
import auth from "../middleware/auth";
import { uploadArticleMedia, uploadArticle } from "../services/file-upload";

const router = express.Router();

const MAX_SEARCH_LENGTH = 100;
const MAX_TAG_LENGTH = 50;
const MAX_CATEGORY_LENGTH = 50;
const MAX_AUTHOR_LENGTH = 100;

// Validate and sanitize search input
function validateSearchInput(input: string, maxLength: number): string {
  if (!input) return "";

  // Trim and limit length
  let sanitized = input.trim().substring(0, maxLength);

  // Remove potentially malicious characters
  // Allow: letters, numbers, spaces, hyphens, underscores, and common punctuation
  sanitized = sanitized.replace(/[^a-zA-Z0-9\s\-_.,'!?@#]/g, "");

  // Escape special regex characters that might remain
  sanitized = sanitized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  return sanitized;
}

// Validate tags array
function validateTags(tagsString: string): string[] {
  if (!tagsString) return [];

  const tags = tagsString.split(",").map((tag) => tag.trim());

  // Limit number of tags
  const validTags = tags
    .slice(0, 10) // Max 10 tags
    .filter((tag) => tag.length > 0 && tag.length <= MAX_TAG_LENGTH)
    .map((tag) => validateSearchInput(tag, MAX_TAG_LENGTH))
    .filter((tag) => tag.length > 0);

  return validTags;
}

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

router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100); // Max 100 items per page
    const skip = (page - 1) * limit;

    // Validate and sanitize inputs
    const search = validateSearchInput(
      req.query.search as string,
      MAX_SEARCH_LENGTH
    );
    const tagsString = req.query.tags as string;
    const category = validateSearchInput(
      req.query.category as string,
      MAX_CATEGORY_LENGTH
    );
    const status = req.query.status as string;
    const author = validateSearchInput(
      req.query.author as string,
      MAX_AUTHOR_LENGTH
    );
    const sortBy = (req.query.sortBy as string) || "date";
    const sortOrder = (req.query.sortOrder as string) || "desc";

    // Validate status against allowed values
    const validStatuses = ["draft", "published", "archived"];
    const validatedStatus = validStatuses.includes(status) ? status : "";

    // Validate sortBy against allowed fields
    const validSortFields = [
      "date",
      "title",
      "publishDate",
      "createdAt",
      "updatedAt",
    ];
    const validatedSortBy = validSortFields.includes(sortBy) ? sortBy : "date";

    // Validate sortOrder
    const validatedSortOrder = sortOrder === "asc" ? "asc" : "desc";

    let query: any = {};

    if (search && search.length > 0) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } },
        { tags: { $regex: search, $options: "i" } },
      ];
    }

    if (category && category.length > 0) {
      query.category = category;
    }

    if (validatedStatus) {
      query.status = validatedStatus;
    }

    if (author && author.length > 0) {
      query.author = { $regex: author, $options: "i" };
    }

    if (tagsString) {
      const tagList = validateTags(tagsString);
      if (tagList.length > 0) {
        query.tags = { $in: tagList.map((tag) => new RegExp(`^${tag}$`, "i")) };
      }
    }

    const sortObj: any = {};
    sortObj[validatedSortBy] = validatedSortOrder === "asc" ? 1 : -1;

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
        tags: tagsString,
        category,
        status: validatedStatus,
        author,
        sortBy: validatedSortBy,
        sortOrder: validatedSortOrder,
      },
    });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ error: error.message });
  }
});

// READ - Get published articles only (public endpoint)
router.get("/published", async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
    const skip = (page - 1) * limit;

    const search = validateSearchInput(
      req.query.search as string,
      MAX_SEARCH_LENGTH
    );
    const category = validateSearchInput(
      req.query.category as string,
      MAX_CATEGORY_LENGTH
    );

    let query: any = { status: "published" };

    if (search && search.length > 0) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } },
      ];
    }

    if (category && category.length > 0) {
      query.category = category;
    }

    const articles = await Article.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ publishDate: -1 })
      .select("-content");

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
        type: file.mimetype,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

export default router;
