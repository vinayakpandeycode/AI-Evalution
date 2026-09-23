import React, { useState } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
} from "@hello-pangea/dnd";
import { FaPlus, FaTimes, FaMagic } from "react-icons/fa";
import "./QnASection.css";

const QnASection = ({ onReferenceChange }) => {
  const [questions, setQuestions] = useState([
    { question: "", answer: "" },
  ]);

  const [loadingStates, setLoadingStates] = useState({});

  const API_BASE_URL =
    import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

  const addQuestion = () => {
    const newQuestions = [
      ...questions,
      { question: "", answer: "" },
    ];

    setQuestions(newQuestions);
    updateReferenceAnswers(newQuestions);
  };

  const removeQuestion = (index) => {
    const updatedQuestions = questions.filter(
      (_, i) => i !== index
    );

    setQuestions(updatedQuestions);
    updateReferenceAnswers(updatedQuestions);
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const reordered = [...questions];

    const [movedItem] = reordered.splice(
      result.source.index,
      1
    );

    reordered.splice(
      result.destination.index,
      0,
      movedItem
    );

    setQuestions(reordered);
    updateReferenceAnswers(reordered);
  };

  const updateReferenceAnswers = (newQuestions) => {
    onReferenceChange(
      newQuestions.map(({ question, answer }) => ({
        question,
        answer,
      }))
    );
  };

  const generateAIAnswer = async (index) => {
    const questionText =
      questions[index].question.trim();

    if (!questionText) {
      return;
    }

    setLoadingStates((prev) => ({
      ...prev,
      [index]: true,
    }));

    try {
      console.log(
        "🤖 Generating answer for:",
        questionText
      );

      console.log(
        "🔗 Backend:",
        API_BASE_URL
      );

      const response = await fetch(
        `${API_BASE_URL}/api/ai/generate-answer`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            question: questionText,
          }),
        }
      );

      const data = await response.json();

      console.log("🤖 AI Response:", data);

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            "Failed to generate answer"
        );
      }

      const aiAnswer = data?.text?.trim();

      if (!aiAnswer) {
        throw new Error(
          "AI returned an empty answer"
        );
      }

      const newQuestions = [...questions];

      newQuestions[index] = {
        ...newQuestions[index],
        answer: aiAnswer,
      };

      setQuestions(newQuestions);

      updateReferenceAnswers(newQuestions);
    } catch (error) {
      console.error(
        "❌ AI Answer Error:",
        error
      );

      alert(
        error.message ||
          "Failed to generate answer. Please try again."
      );
    } finally {
      setLoadingStates((prev) => ({
        ...prev,
        [index]: false,
      }));
    }
  };

  return (
    <div className="qna-container">
      <h2>Q&A Panel</h2>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="qnaList">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
            >
              {questions.map((q, index) => (
                <Draggable
                  key={index}
                  draggableId={index.toString()}
                  index={index}
                >
                  {(provided) => (
                    <div
                      className="qna-box"
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                    >
                      <div className="qna-header">
                        <h3>
                          Question {index + 1}
                        </h3>

                        <button
                          type="button"
                          onClick={() =>
                            removeQuestion(index)
                          }
                        >
                          <FaTimes />
                        </button>
                      </div>

                      <textarea
                        placeholder="Enter your question here..."
                        value={q.question}
                        onChange={(e) => {
                          const newQuestions = [
                            ...questions,
                          ];

                          newQuestions[index] = {
                            ...newQuestions[index],
                            question:
                              e.target.value,
                          };

                          setQuestions(
                            newQuestions
                          );

                          updateReferenceAnswers(
                            newQuestions
                          );
                        }}
                      />

                      <h3>
                        Answer {index + 1}
                      </h3>

                      <textarea
                        className="answer-input"
                        placeholder="Enter the answer here..."
                        value={
                          loadingStates[index]
                            ? "Generating answer..."
                            : q.answer
                        }
                        onChange={(e) => {
                          const newQuestions = [
                            ...questions,
                          ];

                          newQuestions[index] = {
                            ...newQuestions[index],
                            answer:
                              e.target.value,
                          };

                          setQuestions(
                            newQuestions
                          );

                          updateReferenceAnswers(
                            newQuestions
                          );
                        }}
                      />

                      <button
                        type="button"
                        className="ai-btn"
                        onClick={() =>
                          generateAIAnswer(index)
                        }
                        disabled={
                          loadingStates[index]
                        }
                      >
                        <FaMagic />

                        {loadingStates[index]
                          ? " Generating..."
                          : " Generate Answer with AI"}
                      </button>
                    </div>
                  )}
                </Draggable>
              ))}

              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <button
        type="button"
        className="add-btn"
        onClick={addQuestion}
      >
        <FaPlus /> Add More
      </button>
    </div>
  );
};

export default QnASection;