import { NextResponse } from "next/server";

import { resolveCoursePath } from "@/lib/coursePaths";
import { generateProblemGuide } from "@/lib/problemGuide";

type RequestBody = {
  semester?: string;
  course?: string;
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
    const result = await generateProblemGuide(resolvedCourse);

    return NextResponse.json({
      ok: true,
      ...result
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
