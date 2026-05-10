import { readdir } from "fs/promises";
import path from "path";

const COURSE_DATABASE_DIR = path.join(process.cwd(), "course_database");

export type ResolvedCourse = {
  semester: string;
  course: string;
  coursePath: string;
};

export async function resolveCoursePath(
  semester: string,
  course: string
): Promise<ResolvedCourse | null> {
  const semesters = await readdir(COURSE_DATABASE_DIR, { withFileTypes: true });
  const semesterExists = semesters.some(
    (entry) => entry.isDirectory() && entry.name === semester
  );

  if (!semesterExists) {
    return null;
  }

  const semesterPath = path.join(COURSE_DATABASE_DIR, semester);
  const courses = await readdir(semesterPath, { withFileTypes: true });
  const courseExists = courses.some(
    (entry) => entry.isDirectory() && entry.name === course
  );

  if (!courseExists) {
    return null;
  }

  return {
    semester,
    course,
    coursePath: path.join(semesterPath, course)
  };
}
