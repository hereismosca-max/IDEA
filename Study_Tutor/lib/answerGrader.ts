import OpenAI from "openai";
import type { Responses } from "openai/resources/responses/responses";
import type { ProblemRecord } from "./practiceStorage";

const OPENAI_DEFAULT_MODEL = "gpt-5.4-mini";

export type GradeResult = {
  scorePercent: number;
  briefFeedback: string;
  strengths: string[];
  improvements: string[];
  weaknessSignals: string[];
  exampleSolution: string;
};

export async function gradePracticeAnswer(input: {
  problem: ProblemRecord;
  answers: Record<string, string>;
  drawingDataUrl?: string | null;
}): Promise<GradeResult> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set.");
  }

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
  const content: Responses.ResponseInputMessageContentList = [
    {
      type: "input_text",
      text: buildGradingPrompt({
        problem: input.problem,
        answers: input.answers,
        hasDrawing: Boolean(input.drawingDataUrl?.startsWith("data:image/"))
      })
    }
  ];

  if (input.drawingDataUrl?.startsWith("data:image/")) {
    content.push({
      type: "input_image",
      image_url: input.drawingDataUrl,
      detail: "low"
    });
  }

  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL || OPENAI_DEFAULT_MODEL,
    input: [
      {
        role: "user",
        content
      }
    ],
    max_output_tokens: 1400
  });

  return parseGradeResult(response.output_text);
}

function buildGradingPrompt(input: {
  problem: ProblemRecord;
  answers: Record<string, string>;
  hasDrawing: boolean;
}) {
  const { problem, answers } = input;

  return `You are the Answer Grader Agent for a personal study tutor app.

Grade the student's answer against the generated answer key and rubric.

Return strict JSON only. Do not wrap it in markdown.

Required JSON shape:
{
  "scorePercent": 70,
  "briefFeedback": "One or two concise sentences explaining the grade.",
  "strengths": ["short point"],
  "improvements": ["short point"],
  "weaknessSignals": ["topic or misconception label"],
  "exampleSolution": "A clear model answer the student can study."
}

Rules:
- scorePercent must be an integer from 0 to 100.
- Be fair and course-focused.
- Do not be overly generous for vague answers.
- Give useful feedback, but keep it brief.
- weaknessSignals should be useful later for weakness analysis.
- exampleSolution should be a complete but concise model answer for the problem.
- If a drawing image is attached, consider it as part of the student's answer.
- If every text answer is blank and no drawing is attached, treat it as the student having no idea. Score it near 0, do not invent strengths, and make improvements focus on the first concepts to learn.
- If some parts are blank, grade completed parts normally but explicitly mention the missing parts.

Problem metadata:
Course: ${problem.course || "unknown"}
Semester: ${problem.semester || "unknown"}
Topic: ${problem.topic || "unknown"}
Problem type: ${problem.problemType || "unknown"}
Difficulty: ${problem.difficulty || "unknown"}
Drawing attached: ${input.hasDrawing ? "yes" : "no"}

Problem:
${problem.problem || ""}

Expected answer:
${problem.expectedAnswer || ""}

Rubric:
${(problem.gradingRubric || []).map((item) => `- ${item}`).join("\n")}

Student answers:
${Object.entries(answers)
  .map(([part, answer]) => `${part}:\n${answer || "[blank]"}`)
  .join("\n\n")}`;
}

function parseGradeResult(text: string): GradeResult {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  const parsed = JSON.parse(cleaned) as Partial<GradeResult>;

  if (
    typeof parsed.scorePercent !== "number" ||
    typeof parsed.briefFeedback !== "string" ||
    !Array.isArray(parsed.strengths) ||
    !Array.isArray(parsed.improvements) ||
    !Array.isArray(parsed.weaknessSignals) ||
    typeof parsed.exampleSolution !== "string"
  ) {
    throw new Error("Grader response is missing required fields.");
  }

  return {
    scorePercent: clampScore(parsed.scorePercent),
    briefFeedback: parsed.briefFeedback,
    strengths: parsed.strengths.map(String).slice(0, 5),
    improvements: parsed.improvements.map(String).slice(0, 5),
    weaknessSignals: parsed.weaknessSignals.map(String).slice(0, 8),
    exampleSolution: parsed.exampleSolution
  };
}

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}
