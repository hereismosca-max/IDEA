import Anthropic from "@anthropic-ai/sdk";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { readProblemFeedbackExamples } from "./practiceStorage";

const GUIDE_FILE_NAME = "problem_generation_guide.md";

export type GeneratedProblem = {
  id: string;
  generatedAt: string;
  course: string;
  semester: string;
  topic: string;
  problemType: string;
  difficulty: "easy" | "medium" | "hard";
  problem: string;
  answerParts: string[];
  needsDrawing: boolean;
  expectedAnswer: string;
  gradingRubric: string[];
};

export async function generatePracticeProblem(input: {
  semester: string;
  course: string;
  coursePath: string;
  topic?: string;
  difficulty?: "easy" | "medium" | "hard";
}): Promise<GeneratedProblem> {
  const guide = await readProblemGuide(input.coursePath);
  const feedbackExamples = await readProblemFeedbackExamples(input.coursePath);
  const prompt = buildProblemPrompt({
    semester: input.semester,
    course: input.course,
    topic: input.topic,
    difficulty: input.difficulty || "medium",
    guide,
    feedbackExamples
  });
  const generatedProblem = await callClaudeForProblem(prompt);
  const problem = addProblemMetadata(generatedProblem);

  await saveGeneratedProblem(input.coursePath, problem);

  return problem;
}

async function readProblemGuide(coursePath: string) {
  try {
    return await readFile(path.join(coursePath, GUIDE_FILE_NAME), "utf8");
  } catch {
    throw new Error(
      `Missing ${GUIDE_FILE_NAME}. Generate the course problem guide before generating practice problems.`
    );
  }
}

function buildProblemPrompt(input: {
  semester: string;
  course: string;
  topic?: string;
  difficulty: "easy" | "medium" | "hard";
  guide: string;
  feedbackExamples: Awaited<ReturnType<typeof readProblemFeedbackExamples>>;
}) {
  const feedbackText = formatFeedbackExamples(input.feedbackExamples);

  return `You are the Problem Generator Agent for a personal study tutor app.

Generate exactly one practice problem for the selected course.

Course: ${input.course}
Semester: ${input.semester}
Requested topic: ${input.topic || "choose the most useful topic from the guide"}
Requested difficulty: ${input.difficulty}

Use the course-specific guide below as your controlling instructions. The guide is more important than generic textbook style.

Return strict JSON only. Do not wrap it in markdown.

Required JSON shape:
{
  "course": "${input.course}",
  "semester": "${input.semester}",
  "topic": "specific topic name",
  "problemType": "specific problem type",
  "difficulty": "${input.difficulty}",
  "problem": "student-facing problem text",
  "answerParts": ["Part (a)", "Part (b)"],
  "needsDrawing": true,
  "expectedAnswer": "formal answer key for future grading",
  "gradingRubric": ["rubric item 1", "rubric item 2", "rubric item 3"]
}

Rules:
- Generate one problem only.
- Do not reveal the expected answer inside the problem text.
- Make the problem answerable in a text box.
- If the problem has multiple lettered/numbered parts, list each part in answerParts.
- If the problem asks the student to draw, graph, sketch, or diagram something, set needsDrawing to true.
- If no separate parts are needed, use ["Answer"] for answerParts.
- Match the problem type and answer expectations from the guide.
- If using math, write it plainly in text rather than LaTeX-heavy formatting.
- If evidence is weak, generate a concept/classification problem as the fallback.
- If good/bad archived examples are provided, imitate the useful structure of good examples and avoid the patterns described in bad examples.

Course guide:
${input.guide}

Archived good/bad examples from this course:
${feedbackText}`;
}

async function callClaudeForProblem(
  prompt: string
): Promise<Omit<GeneratedProblem, "id" | "generatedAt">> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set.");
  }

  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  });

  const response = await client.messages.create({
    model: process.env.CLAUDE_MODEL || "claude-sonnet-4-5-20250929",
    max_tokens: 1800,
    messages: [
      {
        role: "user",
        content: prompt
      }
    ]
  });
  const firstContent = response.content[0];

  if (!firstContent || firstContent.type !== "text") {
    throw new Error("Claude returned no text content.");
  }

  return parseGeneratedProblem(firstContent.text);
}

function parseGeneratedProblem(
  text: string
): Omit<GeneratedProblem, "id" | "generatedAt"> {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  const parsed = JSON.parse(cleaned) as Omit<
    GeneratedProblem,
    "id" | "generatedAt"
  >;

  if (
    !parsed.course ||
    !parsed.semester ||
    !parsed.topic ||
    !parsed.problemType ||
    !parsed.difficulty ||
    !parsed.problem ||
    !Array.isArray(parsed.answerParts) ||
    typeof parsed.needsDrawing !== "boolean" ||
    !parsed.expectedAnswer ||
    !Array.isArray(parsed.gradingRubric)
  ) {
    throw new Error("Generated problem JSON is missing required fields.");
  }

  if (parsed.answerParts.length === 0) {
    parsed.answerParts = ["Answer"];
  }

  return parsed;
}

function addProblemMetadata(
  problem: Omit<GeneratedProblem, "id" | "generatedAt">
): GeneratedProblem {
  const generatedAt = new Date().toISOString();
  const safeTopic = problem.topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);

  return {
    ...problem,
    id: `${generatedAt.replace(/[:.]/g, "-")}-${safeTopic || "problem"}`,
    generatedAt
  };
}

async function saveGeneratedProblem(
  coursePath: string,
  problem: GeneratedProblem
) {
  const directory = path.join(coursePath, "generated_problems");

  await mkdir(directory, { recursive: true });
  await writeFile(
    path.join(directory, `${problem.id}.json`),
    JSON.stringify(problem, null, 2),
    "utf8"
  );
}

function formatFeedbackExamples(
  feedbackExamples: Awaited<ReturnType<typeof readProblemFeedbackExamples>>
) {
  if (!feedbackExamples.good.length && !feedbackExamples.bad.length) {
    return "No archived good or bad examples yet.";
  }

  const good = feedbackExamples.good
    .map((record, index) => {
      const problem = record.problem;
      return `Good ${index + 1}: topic=${problem?.topic || "unknown"}; type=${problem?.problemType || "unknown"}; problem=${truncate(problem?.problem || "", 800)}`;
    })
    .join("\n");
  const bad = feedbackExamples.bad
    .map((record, index) => {
      const problem = record.problem;
      const reasons = record.reasons;
      return `Bad ${index + 1}: topic=${problem?.topic || "unknown"}; type=${problem?.problemType || "unknown"}; reasons=${JSON.stringify(reasons || {})}; problem=${truncate(problem?.problem || "", 800)}`;
    })
    .join("\n");

  return [
    good ? `Good examples:\n${good}` : "",
    bad ? `Bad examples:\n${bad}` : ""
  ]
    .filter(Boolean)
    .join("\n\n");
}

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}
