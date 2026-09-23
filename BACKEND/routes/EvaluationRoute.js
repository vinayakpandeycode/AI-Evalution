const express = require("express");
const multer = require("multer");
const {
  extractDocumentText,
} = require("../utils/geminiExtractor");
const Evaluation = require("../models/Evaluation");

console.log(
  "🧪 EvaluationRoute extractDocumentText:",
  typeof extractDocumentText
);

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(
        new Error(
          "Unsupported file type. Please upload PDF, JPG, JPEG, or PNG."
        )
      );
    }

    cb(null, true);
  },
});

router.post(
  "/",
  upload.fields([
    {
      name: "questionPaper",
      maxCount: 1,
    },
    {
      name: "answerCopy",
      maxCount: 1,
    },
  ]),
  async (req, res) => {
    try {
      console.log("\n=================================");
      console.log("🚀 NEW EVALUATION REQUEST");
      console.log("=================================");

      const { difficulty } = req.body;

      const questionPaperFile =
        req.files?.questionPaper?.[0];

      const answerCopyFile =
        req.files?.answerCopy?.[0];

      console.log(
        "📄 Question Paper:",
        questionPaperFile?.originalname || "Missing"
      );

      console.log(
        "📝 Answer Copy:",
        answerCopyFile?.originalname || "Missing"
      );

      console.log(
        "🎯 Difficulty:",
        difficulty || "Missing"
      );

      // -----------------------------------------
      // VALIDATION
      // -----------------------------------------

      if (!questionPaperFile) {
        return res.status(400).json({
          error: "Question paper is required.",
        });
      }

      if (!answerCopyFile) {
        return res.status(400).json({
          error: "Student answer copy is required.",
        });
      }

      if (!difficulty) {
        return res.status(400).json({
          error: "Difficulty level is required.",
        });
      }

      // -----------------------------------------
      // FILE SIZE CHECK
      // -----------------------------------------

      console.log(
        `📦 Question Paper Size: ${(
          questionPaperFile.size /
          1024 /
          1024
        ).toFixed(2)} MB`
      );

      console.log(
        `📦 Answer Copy Size: ${(
          answerCopyFile.size /
          1024 /
          1024
        ).toFixed(2)} MB`
      );

      // -----------------------------------------
      // STEP 1: EXTRACT QUESTION PAPER
      // -----------------------------------------

      console.log("\n🔍 STEP 1: Extracting Question Paper...");

      const questionPaperText =
        await extractDocumentText(
          questionPaperFile.buffer,
          questionPaperFile.mimetype
        );

      if (!questionPaperText || !questionPaperText.trim()) {
        return res.status(422).json({
          error:
            "Could not extract readable text from the question paper.",
        });
      }

      console.log(
        `✅ Question Paper extracted: ${questionPaperText.length} characters`
      );

      console.log(
        "📄 Question Paper Preview:"
      );

      console.log(
        questionPaperText.substring(0, 1000)
      );

      // -----------------------------------------
      // STEP 2: EXTRACT STUDENT ANSWER COPY
      // -----------------------------------------

      console.log("\n🔍 STEP 2: Extracting Student Answer Copy...");

      const answerCopyText =
        await extractDocumentText(
          answerCopyFile.buffer,
          answerCopyFile.mimetype
        );

      if (!answerCopyText || !answerCopyText.trim()) {
        return res.status(422).json({
          error:
            "Could not extract readable text from the student answer copy.",
        });
      }

      console.log(
        `✅ Student Answer Copy extracted: ${answerCopyText.length} characters`
      );

      console.log(
        "📝 Student Answer Preview:"
      );

      console.log(
        answerCopyText.substring(0, 1000)
      );

      // -----------------------------------------
      // STEP 3: TEMPORARY STORAGE
      // -----------------------------------------
      //
      // We are temporarily storing the extracted
      // question paper text in referenceAnswers
      // because the current MongoDB schema expects
      // referenceAnswers.
      //
      // The next step will convert the raw question
      // paper into structured questions + marks.
      // -----------------------------------------

      const referenceAnswers = [
        {
          question: "Extracted Question Paper",
          answer: questionPaperText,
        },
      ];

      const extractedAnswers = [
        answerCopyText,
      ];

      // -----------------------------------------
      // STEP 4: CREATE EVALUATION
      // -----------------------------------------

      const newEvaluation = new Evaluation({
        referenceAnswers,
        extractedAnswers,
        difficulty,
      });

      await newEvaluation.save();

      console.log(
        "\n✅ Evaluation created successfully:"
      );

      console.log(
        "🆔 Evaluation ID:",
        newEvaluation._id.toString()
      );

      console.log(
        "=================================\n"
      );

      return res.status(201).json({
        message: "Documents extracted successfully.",
        id: newEvaluation._id,
        extraction: {
          questionPaperCharacters:
            questionPaperText.length,
          answerCopyCharacters:
            answerCopyText.length,
        },
      });
    } catch (error) {
      console.error(
        "\n🚨 EVALUATION ERROR:"
      );

      console.error(
        error.stack || error.message || error
      );

      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({
          error:
            "File size cannot exceed 20 MB.",
        });
      }

      if (
        error.message?.includes(
          "Unsupported file type"
        )
      ) {
        return res.status(400).json({
          error: error.message,
        });
      }

      return res.status(500).json({
        error: "Evaluation failed.",
        details:
          error.message ||
          "Unknown server error.",
      });
    }
  }
);

module.exports = router;