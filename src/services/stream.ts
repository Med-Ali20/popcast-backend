import fs from "fs";
import { promisify } from "util";
import path from "path";

const stat = promisify(fs.stat);

export const streamAudio = async (req: any, res: any) => {
  try {
    const filename = req.params.filename;
    
    // Try multiple possible paths
    const possiblePaths = [
      path.join(process.cwd(), "uploads/audio/", filename),           // From project root
      path.join(__dirname, "../uploads/audio/", filename),           // Relative to current file
      path.join(__dirname, "../../uploads/audio/", filename),        // One level up
      path.join(__dirname, "../../../uploads/audio/", filename),     // Two levels up
    ];

    console.log("=== AUDIO STREAMING DEBUG ===");
    console.log("Requested filename:", filename);
    console.log("Current working directory:", process.cwd());
    console.log("__dirname:", __dirname);
    
    let filePath: string | null = null;
    
    // Check each possible path
    for (const checkPath of possiblePaths) {
      console.log("Checking path:", checkPath);
      console.log("Exists:", fs.existsSync(checkPath));
      if (fs.existsSync(checkPath)) {
        filePath = checkPath;
        console.log("✅ Found file at:", filePath);
        break;
      }
    }

    // If file not found, list directory contents for debugging
    if (!filePath) {
      console.log("❌ File not found in any path!");
      
      // List what's actually in the audio directory
      const audioDir = path.join(process.cwd(), "uploads/audio/");
      console.log("Audio directory path:", audioDir);
      console.log("Audio directory exists:", fs.existsSync(audioDir));
      
      if (fs.existsSync(audioDir)) {
        const files = fs.readdirSync(audioDir);
        console.log("Files in audio directory:", files);
        
        // Check if the requested file exists with a different name
        const matchingFiles = files.filter(file => 
          file.toLowerCase().includes(filename.toLowerCase()) ||
          filename.toLowerCase().includes(file.toLowerCase())
        );
        console.log("Matching files:", matchingFiles);
      }
      console.log("==============================");
      
      return res.status(404).json({ 
        error: "Audio file not found",
        requestedFile: filename,
        checkedPaths: possiblePaths,
        audioDirectory: audioDir,
        audioDirExists: fs.existsSync(audioDir)
      });
    }

    const stats = await stat(filePath);
    const fileSize = stats.size;
    const range = req.headers.range;

    console.log("File size:", fileSize, "bytes");
    console.log("Range header:", range);
    console.log("==============================");

    if (range) {
      // Handle range requests for streaming
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;

      const stream = fs.createReadStream(filePath, { start, end });

      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunksize,
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-cache",
      });

      stream.pipe(res);
    } else {
      // Serve entire file
      res.writeHead(200, {
        "Content-Length": fileSize,
        "Content-Type": "audio/mpeg",
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-cache",
      });

      fs.createReadStream(filePath).pipe(res);
    }
  } catch (error: any) {
    console.error("Audio streaming error:", error);
    res.status(500).json({ error: error?.message, stack: error?.stack });
  }
};

export const streamVideo = async (req: any, res: any) => {
  try {
    const filename = req.params.filename;
    
    // Try multiple possible paths
    const possiblePaths = [
      path.join(process.cwd(), "uploads/video/", filename),           // From project root
      path.join(__dirname, "../uploads/video/", filename),           // Relative to current file
      path.join(__dirname, "../../uploads/video/", filename),        // One level up
      path.join(__dirname, "../../../uploads/video/", filename),     // Two levels up
    ];

    console.log("=== VIDEO STREAMING DEBUG ===");
    console.log("Requested filename:", filename);
    
    let filePath: string | null = null;
    
    // Check each possible path
    for (const checkPath of possiblePaths) {
      console.log("Checking path:", checkPath, "- Exists:", fs.existsSync(checkPath));
      if (fs.existsSync(checkPath)) {
        filePath = checkPath;
        console.log("✅ Found file at:", filePath);
        break;
      }
    }

    if (!filePath) {
      console.log("❌ File not found in any path!");
      
      // List what's actually in the video directory
      const videoDir = path.join(process.cwd(), "uploads/video/");
      if (fs.existsSync(videoDir)) {
        const files = fs.readdirSync(videoDir);
        console.log("Files in video directory:", files);
      }
      console.log("==============================");
      
      return res.status(404).json({ 
        error: "Video file not found",
        requestedFile: filename,
        checkedPaths: possiblePaths
      });
    }

    const stats = await stat(filePath);
    const fileSize = stats.size;
    const range = req.headers.range;

    console.log("File size:", fileSize, "bytes");
    console.log("Range header:", range);
    console.log("==============================");

    if (range) {
      // Handle range requests for streaming
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;

      const stream = fs.createReadStream(filePath, { start, end });

      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunksize,
        "Content-Type": "video/mp4",
        "Cache-Control": "no-cache",
      });

      stream.pipe(res);
    } else {
      // Serve entire file
      res.writeHead(200, {
        "Content-Length": fileSize,
        "Content-Type": "video/mp4",
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-cache",
      });

      fs.createReadStream(filePath).pipe(res);
    }
  } catch (error: any) {
    console.error("Video streaming error:", error);
    res.status(500).json({ error: error?.message });
  }
};

// Utility function to debug upload directories
export const debugUploads = (req: any, res: any) => {
  try {
    const audioDir = path.join(process.cwd(), "uploads/audio/");
    const videoDir = path.join(process.cwd(), "uploads/video/");
    
    const debug = {
      currentWorkingDirectory: process.cwd(),
      __dirname: __dirname,
      paths: {
        audioDir: audioDir,
        videoDir: videoDir,
        audioExists: fs.existsSync(audioDir),
        videoExists: fs.existsSync(videoDir)
      },
      files: {} as any
    };
    
    if (fs.existsSync(audioDir)) {
      debug.files.audio = fs.readdirSync(audioDir).map(file => ({
        name: file,
        fullPath: path.join(audioDir, file),
        size: fs.statSync(path.join(audioDir, file)).size
      }));
    }
    
    if (fs.existsSync(videoDir)) {
      debug.files.video = fs.readdirSync(videoDir).map(file => ({
        name: file,
        fullPath: path.join(videoDir, file),
        size: fs.statSync(path.join(videoDir, file)).size
      }));
    }
    
    res.json(debug);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};