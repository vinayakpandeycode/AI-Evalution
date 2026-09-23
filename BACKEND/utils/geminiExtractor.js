const { PDFParse } = require("pdf-parse");
require("dotenv").config();

/**
 * =========================================================
 * PDF TEXT EXTRACTION
 * =========================================================
 *
 * Uses pdf-parse v2.x
 */
async function extractPdfText(buffer) {
  let parser = null;

  try {
    if (!buffer || !Buffer.isBuffer(buffer)) {
      throw new Error("Invalid PDF buffer");
    }

    console.log("📄 Parsing PDF...");

    parser = new PDFParse({
      data: buffer,
    });

    const result = await parser.getText();

    const text = result?.text || "";

    console.log(
      `📄 PDF text extracted: ${text.length} characters`
    );

    if (!text.trim()) {
      console.warn(
        "⚠️ PDF contains no extractable text."
      );

      console.warn(
        "⚠️ The PDF may be scanned/image-only."
      );
    }

    return text;
  } catch (error) {
    console.error(
      "❌ PDF extraction error:",
      error.message || error
    );

    throw new Error(
      `Failed to extract text from PDF: ${
        error.message || "Unknown PDF error"
      }`
    );
  } finally {
    /**
     * Release PDF parser resources
     */
    if (parser) {
      try {
        await parser.destroy();
      } catch (destroyError) {
        console.error(
          "⚠️ PDF parser cleanup error:",
          destroyError.message || destroyError
        );
      }
    }
  }
}

/**
 * =========================================================
 * IMAGE OCR USING OPENROUTER VISION
 * =========================================================
 *
 * Supports:
 * - JPG
 * - JPEG
 * - PNG
 */
async function extractImageText(
  buffer,
  mimeType = "image/jpeg"
) {
  try {
    if (!buffer || !Buffer.isBuffer(buffer)) {
      throw new Error("Invalid image buffer");
    }

    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error(
        "OPENROUTER_API_KEY is not configured"
      );
    }

    /**
     * Vision model
     *
     * Priority:
     * 1. OPENROUTER_VISION_MODEL
     * 2. OPENROUTER_MODEL
     * 3. openrouter/free
     */
    const model =
      process.env.OPENROUTER_VISION_MODEL ||
      process.env.OPENROUTER_MODEL ||
      "openrouter/free";

    const base64Image =
      buffer.toString("base64");

    console.log("");
    console.log(
      "================================="
    );
    console.log(
      "👁️ OPENROUTER VISION OCR"
    );
    console.log(
      "================================="
    );

    console.log(
      "🤖 Model:",
      model
    );

    console.log(
      "📦 MIME:",
      mimeType
    );

    console.log(
      "📦 Image size:",
      `${(buffer.length / 1024 / 1024).toFixed(2)} MB`
    );

    /**
     * Abort request after 60 seconds
     * so the application never stays stuck forever.
     */
    const controller =
      new AbortController();

    const timeout = setTimeout(() => {
      console.error(
        "⏰ OpenRouter OCR request timed out after 60 seconds"
      );

      controller.abort();
    }, 60000);

    try {
      console.log(
        "📤 Sending OCR request to OpenRouter..."
      );

      const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${process.env.OPENROUTER_API_KEY}`,

            "Content-Type":
              "application/json",

            "HTTP-Referer":
              process.env.FRONTEND_URL ||
              "http://localhost:5173",

            "X-Title":
              "AI-EvaluAIte Document Extractor",
          },

          body: JSON.stringify({
            model,

            messages: [
              {
                role: "system",

                content:
                  "You are a high-accuracy document OCR assistant. " +
                  "Extract only the text that is visibly present in the document image. " +
                  "Preserve question numbers, answer numbers, headings, mathematical expressions, " +
                  "symbols, equations, paragraphs, and the original reading order. " +
                  "Do not solve questions. " +
                  "Do not summarize. " +
                  "Do not add explanations. " +
                  "Do not invent text that is not visible.",
              },

              {
                role: "user",

                content: [
                  {
                    type: "text",

                    text: `
Extract ALL readable text from this document image.

IMPORTANT RULES:

1. Preserve the original order of the content.
2. Preserve question numbering.
3. Preserve answer numbering.
4. Preserve sub-question numbering such as:
   (a), (b), (i), (ii), Q1, Q2, etc.
5. Preserve mathematical equations and symbols as accurately as possible.
6. Preserve headings where visible.
7. Preserve paragraphs and line breaks where practical.
8. Do NOT solve any question.
9. Do NOT summarize the content.
10. Do NOT add information that is not visible.
11. If a word is unclear, do not invent a replacement.
12. Return ONLY the extracted document text.

This document may be a student's handwritten answer copy.
Carefully read the handwriting and maintain the answer sequence.
                    `.trim(),
                  },

                  {
                    type: "image_url",

                    image_url: {
                      url:
                        `data:${mimeType};base64,${base64Image}`,
                    },
                  },
                ],
              },
            ],

            temperature: 0,
          }),

          signal: controller.signal,
        }
      );

      console.log(
        "📥 OpenRouter HTTP status:",
        response.status
      );

      const responseText =
        await response.text();

      console.log(
        "📥 OpenRouter response received."
      );

      let data;

      try {
        data = JSON.parse(
          responseText
        );
      } catch (parseError) {
        console.error(
          "❌ OpenRouter returned invalid JSON:"
        );

        console.error(
          responseText.substring(
            0,
            2000
          )
        );

        throw new Error(
          "OpenRouter returned an invalid response"
        );
      }

      /**
       * API error
       */
      if (!response.ok) {
        console.error(
          "❌ OpenRouter OCR API error:"
        );

        console.error(
          JSON.stringify(
            data,
            null,
            2
          )
        );

        throw new Error(
          data?.error?.message ||
            `OpenRouter request failed with status ${response.status}`
        );
      }

      /**
       * Extract model response
       */
      const text =
        data?.choices?.[0]?.message?.content?.trim();

      if (!text) {
        console.error(
          "❌ OpenRouter returned empty OCR result:"
        );

        console.error(
          JSON.stringify(
            data,
            null,
            2
          )
        );

        throw new Error(
          "OpenRouter returned empty OCR text"
        );
      }

      console.log(
        `📝 Image text extracted: ${text.length} characters`
      );

      console.log(
        "✅ IMAGE OCR COMPLETED"
      );

      console.log(
        "================================="
      );

      return text;

    } finally {
      clearTimeout(timeout);
    }

  } catch (error) {

    /**
     * Request timeout
     */
    if (error.name === "AbortError") {
      console.error(
        "❌ OpenRouter OCR request timed out."
      );

      throw new Error(
        "OCR request timed out after 60 seconds. Please try again."
      );
    }

    console.error(
      "❌ Image OCR error:",
      error.message || error
    );

    throw new Error(
      `Failed to extract text from image: ${
        error.message ||
        "Unknown OCR error"
      }`
    );
  }
}

/**
 * =========================================================
 * MAIN DOCUMENT EXTRACTOR
 * =========================================================
 *
 * Supported:
 *
 * application/pdf
 * image/jpeg
 * image/jpg
 * image/png
 */
async function extractDocumentText(
  buffer,
  mimeType
) {
  if (!buffer) {
    throw new Error(
      "Document buffer is missing"
    );
  }

  if (!mimeType) {
    throw new Error(
      "Document MIME type is missing"
    );
  }

  console.log("");
  console.log(
    "🔍 Extracting document..."
  );

  console.log(
    "📦 MIME type:",
    mimeType
  );

  console.log(
    "📦 Buffer size:",
    `${(buffer.length / 1024 / 1024).toFixed(2)} MB`
  );

  /**
   * =======================================================
   * PDF
   * =======================================================
   */
  if (
    mimeType === "application/pdf"
  ) {
    return await extractPdfText(
      buffer
    );
  }

  /**
   * =======================================================
   * JPEG
   * =======================================================
   */
  if (
    mimeType === "image/jpeg"
  ) {
    return await extractImageText(
      buffer,
      "image/jpeg"
    );
  }

  /**
   * =======================================================
   * JPG
   * =======================================================
   */
  if (
    mimeType === "image/jpg"
  ) {
    return await extractImageText(
      buffer,
      "image/jpeg"
    );
  }

  /**
   * =======================================================
   * PNG
   * =======================================================
   */
  if (
    mimeType === "image/png"
  ) {
    return await extractImageText(
      buffer,
      "image/png"
    );
  }

  /**
   * =======================================================
   * UNSUPPORTED
   * =======================================================
   */
  throw new Error(
    `Unsupported file type: ${mimeType}. ` +
      "Supported formats are PDF, JPG, JPEG, and PNG."
  );
}

/**
 * =========================================================
 * EXPORTS
 * =========================================================
 */
module.exports = {
  extractDocumentText,
  extractPdfText,
  extractImageText,
};