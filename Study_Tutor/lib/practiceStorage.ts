import { mkdir, readdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { GradeResult } from "./answerGrader";

export type ProblemRecord = {
  id?: string;
  generatedAt?: string;
  course?: string;
  semester?: string;
  topic?: string;
  problemType?: string;
  difficulty?: string;
  problem?: string;
  answerParts?: string[];
  needsDrawing?: boolean;
  expectedAnswer?: string;
  gradingRubric?: string[];
};

export type ProblemFeedbackRating = "good" | "bad";

export type BadProblemReasons = {
  type?: boolean;
  content?: boolean;
  other?: string;
};

export type PracticeAttemptRecord = {
  id: string;
  submittedAt: string;
  semester: string;
  course: string;
  status: "graded" | "ungraded";
  problem: ProblemRecord;
  answers: Record<string, string>;
  drawingDataUrl: string | null;
  grading: GradeResult | null;
  score: number | null;
  feedback: string | null;
  gradingError: string | null;
};

export type ProblemSetItem = {
  id: string;
  generatedAt?: string;
  topic?: string;
  problemType?: string;
  difficulty?: string;
  problemPreview: string;
  attemptCount: number;
  lastAttemptAt: string | null;
  latestScore: number | null;
};

export async function savePracticeAttempt(input: {
  coursePath: string;
  semester: string;
  course: string;
  problem: ProblemRecord;
  answers: Record<string, string>;
  drawingDataUrl?: string | null;
  grading?: GradeResult | null;
  gradingError?: string | null;
}) {
  const submittedAt = new Date().toISOString();
  const id = buildRecordId(submittedAt, input.problem.id || input.problem.topic);
  const directory = path.join(input.coursePath, "answer_records");
  const record: PracticeAttemptRecord = {
    id,
    submittedAt,
    semester: input.semester,
    course: input.course,
    status: input.grading ? "graded" : "ungraded",
    problem: input.problem,
    answers: input.answers,
    drawingDataUrl: input.drawingDataUrl || null,
    grading: input.grading || null,
    score: input.grading?.scorePercent ?? null,
    feedback: input.grading?.briefFeedback ?? null,
    gradingError: input.gradingError || null
  };

  await mkdir(directory, { recursive: true });
  await writeFile(
    path.join(directory, `${id}.json`),
    JSON.stringify(record, null, 2),
    "utf8"
  );

  return record;
}

export async function listProblemSet(coursePath: string) {
  const [problems, attempts] = await Promise.all([
    readGeneratedProblems(coursePath),
    readPracticeAttempts(coursePath)
  ]);

  return problems.map((problem) => {
    const matchingAttempts = attempts
      .filter((attempt) => getProblemId(attempt.problem) === getProblemId(problem))
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
    const latestAttempt = matchingAttempts[0];

    return {
      id: getProblemId(problem),
      generatedAt: problem.generatedAt,
      topic: problem.topic,
      problemType: problem.problemType,
      difficulty: problem.difficulty,
      problemPreview: createProblemPreview(problem.problem || ""),
      attemptCount: matchingAttempts.length,
      lastAttemptAt: latestAttempt?.submittedAt || null,
      latestScore: latestAttempt?.score ?? null
    } satisfies ProblemSetItem;
  });
}

export async function readProblemWithAttempts(
  coursePath: string,
  problemId: string
) {
  const [problems, attempts] = await Promise.all([
    readGeneratedProblems(coursePath),
    readPracticeAttempts(coursePath)
  ]);
  const problem = problems.find((item) => getProblemId(item) === problemId);

  if (!problem) {
    return null;
  }

  return {
    problem,
    attempts: attempts
      .filter((attempt) => getProblemId(attempt.problem) === problemId)
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
  };
}

export async function readCourseAttempts(coursePath: string) {
  return readPracticeAttempts(coursePath);
}

export async function saveProblemFeedback(input: {
  coursePath: string;
  semester: string;
  course: string;
  problem: ProblemRecord;
  rating: ProblemFeedbackRating;
  reasons?: BadProblemReasons;
}) {
  const archivedAt = new Date().toISOString();
  const id = buildRecordId(archivedAt, input.problem.id || input.problem.topic);
  const directory = path.join(input.coursePath, "problem_archive", input.rating);
  const record = {
    id,
    archivedAt,
    semester: input.semester,
    course: input.course,
    rating: input.rating,
    reasons: input.rating === "bad" ? normalizeBadReasons(input.reasons) : null,
    problem: input.problem
  };

  await mkdir(directory, { recursive: true });
  await writeFile(
    path.join(directory, `${id}.json`),
    JSON.stringify(record, null, 2),
    "utf8"
  );

  return record;
}

export async function readProblemFeedbackExamples(coursePath: string) {
  const [good, bad] = await Promise.all([
    readArchivedProblems(path.join(coursePath, "problem_archive", "good"), 3),
    readArchivedProblems(path.join(coursePath, "problem_archive", "bad"), 3)
  ]);

  return { good, bad };
}

async function readArchivedProblems(directory: string, limit: number) {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => entry.name)
      .sort()
      .reverse()
      .slice(0, limit);

    const records = await Promise.all(
      files.map(async (file) => {
        const text = await readFile(path.join(directory, file), "utf8");
        return JSON.parse(text) as {
          rating: ProblemFeedbackRating;
          reasons?: BadProblemReasons | null;
          problem?: ProblemRecord;
        };
      })
    );

    return records;
  } catch {
    return [];
  }
}

async function readGeneratedProblems(coursePath: string) {
  const directory = path.join(coursePath, "generated_problems");

  try {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => entry.name)
      .sort()
      .reverse();

    const problems = await Promise.all(
      files.map(async (file) => {
        const text = await readFile(path.join(directory, file), "utf8");
        const problem = JSON.parse(text) as ProblemRecord;
        const id = problem.id || file.replace(/\.json$/i, "");

        return {
          ...problem,
          id
        };
      })
    );

    return problems;
  } catch {
    return [];
  }
}

async function readPracticeAttempts(coursePath: string) {
  const directory = path.join(coursePath, "answer_records");

  try {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => entry.name)
      .sort()
      .reverse();

    const attempts = await Promise.all(
      files.map(async (file) => {
        const text = await readFile(path.join(directory, file), "utf8");
        return JSON.parse(text) as PracticeAttemptRecord;
      })
    );

    return attempts;
  } catch {
    return [];
  }
}

function normalizeBadReasons(reasons?: BadProblemReasons) {
  return {
    type: Boolean(reasons?.type),
    content: Boolean(reasons?.content),
    other: reasons?.other?.trim() || ""
  };
}

function buildRecordId(timestamp: string, label?: string) {
  const safeLabel = (label || "record")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);

  return `${timestamp.replace(/[:.]/g, "-")}-${safeLabel || "record"}`;
}

function getProblemId(problem: ProblemRecord) {
  return problem.id || "";
}

function createProblemPreview(problem: string) {
  const compact = problem.replace(/\s+/g, " ").trim();

  return compact.length > 180 ? `${compact.slice(0, 180)}...` : compact;
}
