import { NextResponse } from "next/server";

import { getAvailableSemesters, getCoursesForSemester } from "@/lib/courses";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const semester = searchParams.get("semester");
  const result = semester
    ? await getCoursesForSemester(semester)
    : await getAvailableSemesters();

  return NextResponse.json(result, {
    status: result.error ? 200 : 200
  });
}
