"use client";

import { useEffect, useState } from "react";

type CourseSelectorProps = {
  initialSemester?: string | null;
  onCourseSelect: (selection: { semester: string; course: string }) => void;
};

type CoursesResponse = {
  courses: string[];
  error: string | null;
};

type SemestersResponse = {
  semesters: string[];
  error: string | null;
};

export function CourseSelector({
  initialSemester,
  onCourseSelect
}: CourseSelectorProps) {
  const [semesters, setSemesters] = useState<string[]>([]);
  const [courses, setCourses] = useState<string[]>([]);
  const [selectedSemester, setSelectedSemester] = useState<string | null>(
    initialSemester || null
  );
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(Boolean(initialSemester));
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (initialSemester) {
      void loadCoursesForSemester(initialSemester);
    }
  }, [initialSemester]);

  async function loadSemesters() {
    setIsOpen(true);
    setIsLoading(true);
    setError(null);
    setSelectedSemester(null);
    setCourses([]);

    try {
      const response = await fetch("/api/courses");

      if (!response.ok) {
        throw new Error("Request failed");
      }

      const data = (await response.json()) as SemestersResponse;
      setSemesters(data.semesters);
      setError(data.error);
    } catch {
      setSemesters([]);
      setCourses([]);
      setError("Unable to load semesters. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function loadCoursesForSemester(semester: string) {
    setSelectedSemester(semester);
    setIsLoading(true);
    setError(null);
    setCourses([]);

    try {
      const response = await fetch(
        `/api/courses?semester=${encodeURIComponent(semester)}`
      );

      if (!response.ok) {
        throw new Error("Request failed");
      }

      const data = (await response.json()) as CoursesResponse;
      setCourses(data.courses);
      setError(data.error);
    } catch {
      setCourses([]);
      setError("Unable to load courses. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="w-full max-w-md">
      <button
        type="button"
        onClick={loadSemesters}
        className="w-full rounded-md bg-slate-900 px-5 py-3 text-base font-medium text-white shadow-sm hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
      >
        Choose Course
      </button>

      {isOpen ? (
        <div className="mt-5 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          {selectedSemester ? (
            <div className="mb-4 flex items-center justify-between gap-3 text-left">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Semester
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {selectedSemester}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedSemester(null);
                  setCourses([]);
                  setError(null);
                }}
                className="rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:border-slate-500 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500"
              >
                Back
              </button>
            </div>
          ) : null}

          {isLoading ? (
            <p className="text-sm text-slate-600">
              {selectedSemester ? "Loading courses..." : "Loading semesters..."}
            </p>
          ) : null}

          {!isLoading && error ? (
            <p className="text-sm leading-6 text-slate-600">{error}</p>
          ) : null}

          {!isLoading && !error && !selectedSemester && semesters.length > 0 ? (
            <div className="space-y-2">
              {semesters.map((semester) => (
                <button
                  key={semester}
                  type="button"
                  onClick={() => loadCoursesForSemester(semester)}
                  className="w-full rounded-md border border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-800 hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500"
                >
                  {semester}
                </button>
              ))}
            </div>
          ) : null}

          {!isLoading && !error && selectedSemester && courses.length > 0 ? (
            <div className="space-y-2">
              {courses.map((course) => (
                <button
                  key={course}
                  type="button"
                  onClick={() =>
                    onCourseSelect({ semester: selectedSemester, course })
                  }
                  className="w-full rounded-md border border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-800 hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500"
                >
                  {course}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
