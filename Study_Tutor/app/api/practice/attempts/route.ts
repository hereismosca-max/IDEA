import { NextResponse } from "next/server";
import { gradePracticeAnswer } from "@/lib/answerGrader";
import { resolveCoursePath } from "@/lib/coursePaths";
import {
  type ProblemRecord,
  savePracticeAttempt
} from "@/lib/practiceStorage";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      semester?: string;
      course?: string;
      problem?: unknown;
      answers?: unknown;
      drawingDataUrl?: string | null;
    };

    if (!body.semester || !body.course) {
      return NextResponse.json(
        { ok: false, error: "Semester and course are required." },
        { status: 400 }
      );
    }

    if (!body.problem || typeof body.problem !== "object") {
      return NextResponse.json(
        { ok: false, error: "Problem data is required." },
        { status: 400 }
      );
    }

    if (!body.answers || typeof body.answers !== "object") {
      return NextResponse.json(
        { ok: false, error: "Answer data is required." },
        { status: 400 }
      );
    }

    const resolvedCourse = await resolveCoursePath(body.semester, body.course);

    if (!resolvedCourse) {
      return NextResponse.json(
        { ok: false, error: "Selected course does not exist." },
        { status: 404 }
      );
    }

    let grading = null;
    let gradingError = null;

    try {
      grading = await gradePracticeAnswer({
        problem: body.problem as ProblemRecord,
        answers: body.answers as Record<string, string>,
        drawingDataUrl: body.drawingDataUrl || null
      });
    } catch (error) {
      gradingError =
        error instanceof Error ? error.message : "Unable to grade the answer.";
    }

    const record = await savePracticeAttempt({
      coursePath: resolvedCourse.coursePath,
      semester: resolvedCourse.semester,
      course: resolvedCourse.course,
      problem: body.problem as ProblemRecord,
      answers: body.answers as Record<string, string>,
      drawingDataUrl: body.drawingDataUrl || null,
      grading,
      gradingError
    });

    return NextResponse.json({
      ok: true,
      record,
      grading,
      gradingError
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to save the practice attempt."
      },
      { status: 500 }
    );
  }
}
