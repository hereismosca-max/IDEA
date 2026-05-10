import { NextResponse } from "next/server";
import { resolveCoursePath } from "@/lib/coursePaths";
import { readProblemWithAttempts } from "@/lib/practiceStorage";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const semester = searchParams.get("semester");
    const course = searchParams.get("course");
    const problemId = searchParams.get("problemId");

    if (!semester || !course || !problemId) {
      return NextResponse.json(
        { ok: false, error: "Semester, course, and problemId are required." },
        { status: 400 }
      );
    }

    const resolvedCourse = await resolveCoursePath(semester, course);

    if (!resolvedCourse) {
      return NextResponse.json(
        { ok: false, error: "Selected course does not exist." },
        { status: 404 }
      );
    }

    const result = await readProblemWithAttempts(
      resolvedCourse.coursePath,
      problemId
    );

    if (!result) {
      return NextResponse.json(
        { ok: false, error: "Selected problem does not exist." },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to load the selected problem."
      },
      { status: 500 }
    );
  }
}
