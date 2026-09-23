const express = require("express");

const router = express.Router();

router.post("/generate-answer", async (req, res) => {
  try {
    const { question } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({
        error: "Question is required",
      });
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(500).json({
        error: "OPENROUTER_API_KEY is not configured",
      });
    }

    const model = process.env.OPENROUTER_MODEL || "openrouter/free";

    console.log("🤖 OpenRouter request:", {
      model,
      question,
    });

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content:
                "You are an academic answer assistant. Provide a clear, accurate, well-structured answer suitable for a student's reference answer. Do not mention that you are an AI.",
            },
            {
              role: "user",
              content: question.trim(),
            },
          ],
          temperature: 0.4,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ OpenRouter API error:", data);

      return res.status(response.status).json({
        error:
          data?.error?.message ||
          "OpenRouter request failed",
      });
    }

    const text = data?.choices?.[0]?.message?.content?.trim();

    if (!text) {
      console.error("❌ Empty OpenRouter response:", data);

      return res.status(502).json({
        error: "OpenRouter returned an empty response",
      });
    }

    console.log("✅ OpenRouter answer generated");

    return res.json({
      text,
    });
  } catch (error) {
    console.error("❌ Generate answer error:", error);

    return res.status(500).json({
      error: "Failed to generate answer",
      details: error.message,
    });
  }
});

module.exports = router;