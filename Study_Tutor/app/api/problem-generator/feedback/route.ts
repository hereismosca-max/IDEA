import { NextResponse } from "next/server";
import { resolveCoursePath } from "@/lib/coursePaths";
import {
  type BadProblemReasons,
  type ProblemRecord,
  saveProblemFeedback
} from "@/lib/practiceStorage";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      semester?: string;
      course?: string;
      problem?: unknown;
      rating?: "good" | "bad";
      reasons?: BadProblemReasons;
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

    if (body.rating !== "good" && body.rating !== "bad") {
      return NextResponse.json(
        { ok: false, error: "Feedback rating must be good or bad." },
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

    const record = await saveProblemFeedback({
      coursePath: resolvedCourse.coursePath,
      semester: resolvedCourse.semester,
      course: resolvedCourse.course,
      problem: body.problem as ProblemRecord,
      rating: body.rating,
      reasons: body.reasons
    });

    return NextResponse.json({ ok: true, record });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to save problem feedback."
      },
      { status: 500 }
    );
  }
}
