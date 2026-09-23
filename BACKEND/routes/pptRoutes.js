const express = require("express");
const { generateSlides, generatePPT } = require("../utils/PptGemini");
const path = require("path");
const fs = require("fs");

const router = express.Router();

router.post("/", async (req, res) => {
  let filePath = null;

  try {
    const { topic } = req.body;

    if (!topic || !topic.trim()) {
      return res.status(400).json({
        error: "Topic is required",
      });
    }

    console.log("📚 PPT request received:", topic);

    // Generate AI slide content
    const slides = await generateSlides(topic.trim());

    if (!slides || !Array.isArray(slides) || slides.length === 0) {
      return res.status(500).json({
        error: "Failed to generate slides",
      });
    }

    console.log(`✅ ${slides.length} slides generated`);

    // Generate PPT file
    const fileName = await generatePPT(topic.trim(), slides);

    filePath = path.resolve(__dirname, "..", fileName);

    console.log("📂 PPT path:", filePath);

    // Verify file exists
    if (!fs.existsSync(filePath)) {
      console.error("❌ PPT file not found:", filePath);

      return res.status(500).json({
        error: "Generated PPT file not found",
      });
    }

    const stats = fs.statSync(filePath);

    console.log(`📦 PPT size: ${stats.size} bytes`);

    if (stats.size === 0) {
      console.error("❌ PPT file is empty");

      return res.status(500).json({
        error: "Generated PPT file is empty",
      });
    }

    const downloadName =
      `AI-EvaluAIte-${topic.trim().replace(/[^a-zA-Z0-9]/g, "_")}.pptx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${downloadName}"`
    );

    res.setHeader("Content-Length", stats.size);

    // Send the actual file
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error("❌ Error sending PPT:", err);
        return;
      }

      console.log("✅ PPT successfully sent to browser");

      // Delete only after successful response
      setTimeout(() => {
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log("🗑️ Temporary PPT deleted");
          }
        } catch (deleteError) {
          console.error(
            "⚠️ Could not delete temporary PPT:",
            deleteError.message
          );
        }
      }, 10000);
    });
  } catch (error) {
    console.error(
      "❌ PPT Server Error:",
      error.message || error
    );

    // Don't attempt another response if headers already went out
    if (!res.headersSent) {
      return res.status(500).json({
        error: error.message || "Failed to generate PPT",
      });
    }
  }
});

module.exports = router;