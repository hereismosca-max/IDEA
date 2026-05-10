import { NextResponse } from "next/server";

import { resolveCoursePath } from "@/lib/coursePaths";
import { generatePracticeProblem } from "@/lib/problemGenerator";

type RequestBody = {
  semester?: string;
  course?: string;
  topic?: string;
  difficulty?: "easy" | "medium" | "hard";
};

export async function POST(request: Request) {
  const body = (await request.json()) as RequestBody;

  if (!body.semester || !body.course) {
    return NextResponse.json(
      {
        error: "semester and course are required."
      },
      { status: 400 }
    );
  }

  const resolvedCourse = await resolveCoursePath(body.semester, body.course);

  if (!resolvedCourse) {
    return NextResponse.json(
      {
        error: "Course folder was not found."
      },
      { status: 404 }
    );
  }

  try {
    const problem = await generatePracticeProblem({
      semester: body.semester,
      course: body.course,
      coursePath: resolvedCourse.coursePath,
      topic: body.topic,
      difficulty: body.difficulty
    });

    return NextResponse.json({
      ok: true,
      problem
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown generation error."
      },
      { status: 500 }
    );
  }
}
