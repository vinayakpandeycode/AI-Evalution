require("dotenv").config();

const evaluateAnswers = async (
  referenceAnswers,
  extractedAnswers,
  difficulty
) => {
  try {
    console.log("🤖 Sending answers to OpenRouter...");

    const limitedExtracted = extractedAnswers.slice(
      0,
      referenceAnswers.length
    );

    const questions = referenceAnswers.map((ref, index) => ({
      question: ref.question || `Question ${index + 1}`,
      referenceAnswer: ref.answer || "",
      studentAnswer: limitedExtracted[index] || "",
    }));

    const prompt = `
You are an AI answer evaluator.

Evaluate the student's answers against the reference answers.

Difficulty level: ${difficulty || "medium"}

For every question:
- Give marks from 0 to 5.
- Compare the student's answer with the reference answer.
- Consider correctness, relevance, completeness and clarity.
- Do not give marks only because the answer is long.
- Give a short useful comment.

Also provide overall positive and negative insights.

Return ONLY valid JSON in this exact format:

{
  "marks": [0, 0],
  "comments": ["comment 1", "comment 2"],
  "insights": {
    "positives": ["positive 1", "positive 2"],
    "negatives": ["negative 1", "negative 2"]
  }
}

Questions and answers:

${JSON.stringify(questions, null, 2)}
`;

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        },
        body: JSON.stringify({
          model: process.env.OPENROUTER_MODEL || "openrouter/free",
          messages: [
            {
              role: "system",
              content:
                "You are a strict but fair academic answer evaluator. Return only valid JSON.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.2,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ OpenRouter API Error:", data);

      throw new Error(
        data?.error?.message || "OpenRouter API request failed"
      );
    }

    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("OpenRouter returned an empty response");
    }

    console.log("🤖 OpenRouter Response:", content);

    let result;

    try {
      result = JSON.parse(content);
    } catch (parseError) {
      const cleaned = content
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();

      result = JSON.parse(cleaned);
    }

    if (
      !Array.isArray(result.marks) ||
      !Array.isArray(result.comments) ||
      !result.insights
    ) {
      throw new Error("Invalid evaluation format returned by AI");
    }

    return {
      marks: result.marks,
      comments: result.comments,
      insights: {
        positives: result.insights.positives || [],
        negatives: result.insights.negatives || [],
      },
    };
  } catch (error) {
    console.error("❌ OpenRouter Evaluation Error:", error);
    throw error;
  }
};

module.exports = {
  evaluateAnswers,
};