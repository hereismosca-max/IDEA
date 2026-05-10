import Anthropic from "@anthropic-ai/sdk";
import { writeFile } from "fs/promises";
import path from "path";

import { scanCourseMaterials, type MaterialScanResult } from "./materialScanner";

const GUIDE_FILE_NAME = "problem_generation_guide.md";

export type ProblemGuideResult = {
  course: string;
  semester: string;
  guidePath: string;
  sampledFileCount: number;
  totalFileCount: number;
};

export async function generateProblemGuide(input: {
  semester: string;
  course: string;
  coursePath: string;
}): Promise<ProblemGuideResult> {
  const scan = await scanCourseMaterials(input.coursePath);
  const prompt = buildProblemGuidePrompt(input.semester, input.course, scan);
  const guide = await callClaudeForGuide(prompt);
  const guidePath = path.join(input.coursePath, GUIDE_FILE_NAME);

  await writeFile(guidePath, guide, "utf8");

  return {
    semester: input.semester,
    course: input.course,
    guidePath,
    sampledFileCount: scan.sampledFiles.length,
    totalFileCount: scan.files.length
  };
}

function buildProblemGuidePrompt(
  semester: string,
  course: string,
  scan: MaterialScanResult
) {
  const inventory = scan.files
    .map((file) => `- [${file.category}] ${file.relativePath}`)
    .join("\n");
  const samples = scan.sampledFiles
    .map(
      (file) => `\n\n## Source: ${file.relativePath}\nCategory: ${file.category}\n\n${file.text}`
    )
    .join("\n");

  return `You are the Problem Generator Profile Builder for a personal study tutor app.

Create a course-specific Markdown guide named problem_generation_guide.md for the problem generator.

Course: ${course}
Semester: ${semester}

Goal:
- Infer what this course tests and how exam/practice questions are likely structured.
- Record stable instructions so future problem generation does not need to reread all materials every time.
- Prefer evidence from syllabus, study guides, exams, solutions, problem sets, review sheets, and logistics notes.
- Treat files under supplement/ as high-priority student-provided guidance. Use them before lower-level raw materials when they disagree.
- Use lecture/slide materials to infer topics and concept coverage.
- If evidence is missing, state that confidence is low and use conservative academic intuition.

Important behavior requirements:
- Do not generate actual full practice questions in this guide.
- Do define problem types, topic coverage, answer expectations, and generation rules.
- Prefer course-specific patterns over generic advice.
- Separate evidence-backed claims from inferred claims.
- Explicitly mention whether supplement/ files were available and how they shaped the guide.
- Include warnings about what the generator should avoid.
- Keep the output as clean Markdown only.

Use this exact Markdown structure:

# Problem Generation Guide: ${course}

## Course Snapshot

## Material Inventory Summary

## Evidence From Course Materials

## Main Topics To Test

## Likely Exam / Practice Problem Types

## Topic-To-Problem Mapping

## Problem Generation Rules

## Answer Expectations

## Difficulty Calibration

## What To Avoid

## Fallback Behavior When Evidence Is Missing

## Open Questions For The Student

Material inventory:
${inventory}

Sampled source text:
${samples}`;
}

async function callClaudeForGuide(prompt: string) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set.");
  }

  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  });

  const response = await client.messages.create({
    model: process.env.CLAUDE_MODEL || "claude-sonnet-4-5-20250929",
    max_tokens: 4000,
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

  return firstContent.text.trim() + "\n";
}
