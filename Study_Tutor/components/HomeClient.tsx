"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { ActionPanel } from "@/components/ActionPanel";
import { CourseSelector } from "@/components/CourseSelector";

type SelectedCourse = {
  semester: string;
  course: string;
};

type HomeClientProps = {
  initialSelectedCourse: SelectedCourse | null;
};

export function HomeClient({ initialSelectedCourse }: HomeClientProps) {
  const router = useRouter();
  const [selectedCourseOverride, setSelectedCourseOverride] = useState<
    SelectedCourse | null | undefined
  >(undefined);
  const [selectorSemester, setSelectorSemester] = useState<string | null>(null);
  const selectedCourse =
    selectedCourseOverride === undefined
      ? initialSelectedCourse
      : selectedCourseOverride;

  function handleCourseSelect(course: SelectedCourse) {
    setSelectedCourseOverride(course);
    setSelectorSemester(null);
    router.push(
      `/?semester=${encodeURIComponent(course.semester)}&course=${encodeURIComponent(course.course)}`
    );
  }

  function returnToCourseSelector() {
    setSelectorSemester(selectedCourse?.semester || null);
    setSelectedCourseOverride(null);
    window.history.replaceState(null, "", "/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="flex w-full max-w-xl flex-col items-center gap-6 text-center">
        {selectedCourse ? (
          <ActionPanel
            course={selectedCourse.course}
            semester={selectedCourse.semester}
            onBack={returnToCourseSelector}
          />
        ) : (
          <CourseSelector
            initialSemester={selectorSemester}
            onCourseSelect={handleCourseSelect}
          />
        )}
      </div>
    </main>
  );
}
