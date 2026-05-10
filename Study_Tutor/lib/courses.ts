import { readdir } from "fs/promises";
import path from "path";

import type { CoursesResult, SemestersResult } from "./types";

const COURSE_DATABASE_DIR = path.join(process.cwd(), "course_database");

async function getDirectoryEntries(directoryPath: string) {
  const entries = await readdir(directoryPath, { withFileTypes: true });

  return entries.filter((entry) => entry.isDirectory());
}

export async function getAvailableSemesters(): Promise<SemestersResult> {
  try {
    const semesters = (await getDirectoryEntries(COURSE_DATABASE_DIR))
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b));

    if (semesters.length === 0) {
      return {
        semesters: [],
        error: "No semesters found. Please add semester folders inside course_database."
      };
    }

    return { semesters, error: null };
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;

    if (nodeError.code === "ENOENT") {
      return {
        semesters: [],
        error: "No semesters found. Please add semester folders inside course_database."
      };
    }

    return {
      semesters: [],
      error: "Unable to read semester folders right now. Please check course_database permissions."
    };
  }
}

export async function getCoursesForSemester(semester: string): Promise<CoursesResult> {
  try {
    const semestersResult = await getAvailableSemesters();

    if (semestersResult.error) {
      return { courses: [], error: semestersResult.error };
    }

    if (!semestersResult.semesters.includes(semester)) {
      return {
        courses: [],
        error: "Selected semester does not exist in course_database."
      };
    }

    const semesterPath = path.join(COURSE_DATABASE_DIR, semester);
    const courses = (await getDirectoryEntries(semesterPath))
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b));

    if (courses.length === 0) {
      return {
        courses: [],
        error: "No courses recorded."
      };
    }

    return { courses, error: null };
  } catch {
    return {
      courses: [],
      error: "Unable to read course folders right now. Please check course_database permissions."
    };
  }
}

export async function courseExists(courseName: string): Promise<boolean> {
  const semestersResult = await getAvailableSemesters();

  if (semestersResult.error) {
    return false;
  }

  const courseResults = await Promise.all(
    semestersResult.semesters.map((semester) => getCoursesForSemester(semester))
  );

  return courseResults.some(
    (result) => !result.error && result.courses.includes(courseName)
  );
}
