import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import Upload from "./Upload";
import Difficulty from "./Difficulty";
import Footer from "./Footer";
import axios from "axios";
import "./Form.css";

const API_BASE_URL =
  import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

export default function Form() {
  const [questionPaper, setQuestionPaper] = useState(null);
  const [answerCopy, setAnswerCopy] = useState(null);

  const [difficulty, setDifficulty] = useState("Medium");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleQuestionPaperUpload = (file) => {
    setQuestionPaper(file);
  };

  const handleAnswerCopyUpload = (file) => {
    setAnswerCopy(file);
  };

  const handleDifficultyChange = (level) => {
    setDifficulty(level);
  };

  const handleSubmit = async () => {
    if (!questionPaper) {
      alert("Please upload the question paper.");
      return;
    }

    if (!answerCopy) {
      alert("Please upload the student's answer copy.");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();

      formData.append("questionPaper", questionPaper);
      formData.append("answerCopy", answerCopy);
      formData.append("difficulty", difficulty);

      console.log("📄 Question Paper:", questionPaper.name);
      console.log("📝 Answer Copy:", answerCopy.name);
      console.log("🎯 Difficulty:", difficulty);

      const response = await axios.post(
        `${API_BASE_URL}/api/evaluations`,
        formData
      );

      console.log("✅ Evaluation Response:", response.data);

      const evaluationId =
        response.data?.id || response.data?._id;

      if (!evaluationId) {
        throw new Error("Evaluation ID was not returned by the server.");
      }

      navigate(`/scorecard/${evaluationId}`);
    } catch (error) {
      console.error(
        "❌ Evaluation submission failed:",
        error.response?.data || error.message
      );

      const message =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        "Evaluation failed.";

      alert(`Evaluation failed: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />

      <main className="form-hero">
        <h1 className="form-title">
          AI Automated <span className="highlight">Evaluation</span>
        </h1>

        <p className="form-text">
          Upload the question paper and student's answer copy,
          <br />
          and let AI evaluate the answers automatically.
        </p>

        {/* Question Paper */}
        <section className="evaluation-upload-section">
          <h2>📄 Question Paper</h2>
          <p>
            Upload the exam/question paper containing the questions.
          </p>

          <Upload onFileUpload={handleQuestionPaperUpload} />
        </section>

        {/* Student Answer Copy */}
        <section className="evaluation-upload-section">
          <h2>📝 Student Answer Copy</h2>
          <p>
            Upload the student's handwritten or typed answer copy.
          </p>

          <Upload onFileUpload={handleAnswerCopyUpload} />
        </section>
      </main>

      <Difficulty onDifficultyChange={handleDifficultyChange} />

      <div className="evaluation-summary">
        <p>
          <strong>Question Paper:</strong>{" "}
          {questionPaper ? questionPaper.name : "Not uploaded"}
        </p>

        <p>
          <strong>Answer Copy:</strong>{" "}
          {answerCopy ? answerCopy.name : "Not uploaded"}
        </p>

        <p>
          <strong>Difficulty:</strong> {difficulty}
        </p>
      </div>

      <button
        className="submit-btn"
        onClick={handleSubmit}
        disabled={loading}
      >
        {loading ? "🤖 Evaluating..." : "🚀 Start AI Evaluation"}
      </button>

      <Footer />
    </>
  );
}