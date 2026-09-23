const PptxGenJS = require("pptxgenjs");

const generateSlides = async (topic) => {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  const model = process.env.OPENROUTER_MODEL || "openrouter/free";

  const prompt = `
Create exactly 5 PowerPoint slides for the topic:

"${topic}"

Return ONLY valid JSON.

Required JSON format:

{
  "slides": [
    {
      "subheading": "Short slide subheading",
      "content": [
        "Bullet point 1",
        "Bullet point 2",
        "Bullet point 3",
        "Bullet point 4",
        "Bullet point 5"
      ]
    }
  ]
}

Rules:
- Exactly 5 slides.
- Every slide must have exactly 5 bullet points.
- Each bullet should be clear and educational.
- Each bullet should contain no more than 20 words.
- Do not use markdown.
- Do not use code fences.
- Do not add explanations outside JSON.
`;

  try {
    console.log("🤖 Generating PPT content using OpenRouter...");
    console.log("📌 Model:", model);
    console.log("📌 Topic:", topic);

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:5173",
          "X-Title": "AI-EvaluAIte PPT Generator",
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content:
                "You are a professional educational PowerPoint content generator. Return only valid JSON.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.4,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ OpenRouter PPT error:", data);

      throw new Error(
        data?.error?.message ||
          "OpenRouter failed to generate PPT content"
      );
    }

    let responseText =
      data?.choices?.[0]?.message?.content?.trim();

    if (!responseText) {
      throw new Error("OpenRouter returned empty PPT content");
    }

    console.log("📄 OpenRouter Raw Response:");
    console.log(responseText);

    // Remove accidental markdown code fences
    responseText = responseText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let parsed;

    try {
      parsed = JSON.parse(responseText);
    } catch (parseError) {
      console.error("❌ Failed to parse OpenRouter JSON:");
      console.error(responseText);

      throw new Error(
        "OpenRouter returned invalid JSON for PPT slides"
      );
    }

    if (!parsed.slides || !Array.isArray(parsed.slides)) {
      throw new Error("Invalid slide structure returned by OpenRouter");
    }

    const slides = parsed.slides.slice(0, 5).map((slide, index) => {
      const content = Array.isArray(slide.content)
        ? slide.content
            .map((point) => String(point).trim())
            .filter(Boolean)
            .slice(0, 5)
        : [];

      return {
        title: `Slide ${index + 1}`,
        subheading:
          String(slide.subheading || `Slide ${index + 1}`).trim(),
        content:
          content.length > 0
            ? content.join("\n")
            : "No content generated",
      };
    });

    if (slides.length === 0) {
      throw new Error("No slides generated");
    }

    console.log(`✅ ${slides.length} slides generated`);

    return slides;
  } catch (error) {
    console.error(
      "❌ generateSlides error:",
      error.message || error
    );

    throw error;
  }
};


const generatePPT = async (topic, slidesData) => {
  try {
    console.log("📊 Creating PowerPoint file...");
    console.log("📌 Topic:", topic);

    const ppt = new PptxGenJS();

    ppt.layout = "LAYOUT_WIDE";
    ppt.author = "AI-EvaluAIte";
    ppt.subject = topic;
    ppt.title = topic;
    ppt.company = "AI-EvaluAIte";
    ppt.lang = "en-US";

    slidesData.forEach((slideData, index) => {
      const { subheading, content } = slideData;

      const slide = ppt.addSlide();

      slide.background = {
        color: "FFA500",
      };

      slide.addText(`Slide ${index + 1}: ${subheading}`, {
        x: "10%",
        y: "10%",
        w: "80%",
        h: "15%",
        fontSize: 28,
        bold: true,
        color: "000000",
        align: "center",
        valign: "mid",
      });

      const bulletPoints = content
        .split("\n")
        .map((point) => point.trim())
        .filter(Boolean)
        .map((point) => ({
          text: point,
          options: {
            bullet: {
              indent: 18,
            },
            hanging: 3,
            fontSize: 20,
            color: "FFFFFF",
          },
        }));

      slide.addText(bulletPoints, {
        x: "10%",
        y: "30%",
        w: "80%",
        h: "60%",
        fontSize: 20,
        color: "FFFFFF",
        align: "left",
        valign: "top",
        breakLine: true,
        margin: 0.08,
      });
    });

    const fileName = `lecture_${Date.now()}.pptx`;

    const filePath = require("path").join(
      process.cwd(),
      fileName
    );

    await ppt.writeFile({
      fileName: filePath,
    });

    console.log("✅ PPT generated successfully:");
    console.log(filePath);

    return fileName;
  } catch (error) {
    console.error(
      "❌ generatePPT error:",
      error.message || error
    );

    throw error;
  }
};


module.exports = {
  generateSlides,
  generatePPT,
};