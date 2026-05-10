"use client";

import { useEffect, useRef, useState } from "react";

type PracticeWorkspaceProps = {
  course: string;
  semester: string;
  problemId?: string;
};

type GeneratedProblem = {
  id?: string;
  generatedAt?: string;
  course?: string;
  semester?: string;
  topic: string;
  problemType: string;
  difficulty: "easy" | "medium" | "hard";
  problem: string;
  answerParts?: string[];
  needsDrawing?: boolean;
};

type GradeResult = {
  scorePercent: number;
  briefFeedback: string;
  strengths: string[];
  improvements: string[];
  weaknessSignals: string[];
  exampleSolution?: string;
};

type PracticeAttempt = {
  id: string;
  submittedAt: string;
  answers: Record<string, string>;
  score: number | null;
  feedback: string | null;
  grading: GradeResult | null;
  gradingError: string | null;
};

export function PracticeWorkspace({
  course,
  semester,
  problemId
}: PracticeWorkspaceProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [problem, setProblem] = useState<GeneratedProblem | null>(null);
  const [attempts, setAttempts] = useState<PracticeAttempt[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [gradeResult, setGradeResult] = useState<GradeResult | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [showBadReasons, setShowBadReasons] = useState(false);
  const [badReasons, setBadReasons] = useState({
    type: false,
    content: false,
    other: ""
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingFeedback, setIsSavingFeedback] = useState(false);
  const answerParts = getAnswerParts(problem);

  async function loadProblem() {
    setIsLoading(true);
    setError(null);
    setAnswers({});
    setAttempts([]);
    setSubmitMessage(null);
    setGradeResult(null);
    setFeedbackMessage(null);
    setShowBadReasons(false);
    setBadReasons({ type: false, content: false, other: "" });
    clearCanvas();

    try {
      const response = problemId
        ? await fetch(
            `/api/problem-set/problem?semester=${encodeURIComponent(semester)}&course=${encodeURIComponent(course)}&problemId=${encodeURIComponent(problemId)}`
          )
        : await fetch("/api/problem-generator/generate", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              semester,
              course,
              difficulty: "medium"
            })
          });
      const data = (await response.json()) as {
        ok?: boolean;
        problem?: GeneratedProblem;
        attempts?: PracticeAttempt[];
        error?: string;
      };

      if (!response.ok || !data.problem) {
        throw new Error(
          data.error ||
            (problemId
              ? "Unable to load the selected problem."
              : "Unable to generate a practice problem.")
        );
      }

      setProblem(data.problem);
      setAttempts(data.attempts || []);
    } catch (caughtError) {
      setProblem(null);
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to generate a practice problem."
      );
    } finally {
      setIsLoading(false);
    }
  }

  function updateAnswer(part: string, value: string) {
    setAnswers((currentAnswers) => ({
      ...currentAnswers,
      [part]: value
    }));
  }

  async function submitAnswer() {
    if (!problem) {
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage(null);

    try {
      const response = await fetch("/api/practice/attempts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          semester,
          course,
          problem,
          answers,
          drawingDataUrl: getDrawingDataUrl()
        })
      });
      const data = (await response.json()) as {
        ok?: boolean;
        record?: PracticeAttempt;
        grading?: GradeResult | null;
        gradingError?: string | null;
        error?: string;
      };

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Unable to save your answer.");
      }

      setGradeResult(data.grading || null);
      if (data.record) {
        setAttempts((currentAttempts) => [data.record!, ...currentAttempts]);
      }
      setSubmitMessage(
        data.grading
          ? "Answer saved and graded."
          : data.gradingError || "Answer saved, but grading did not complete."
      );
    } catch (caughtError) {
      setSubmitMessage(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to save your answer."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function saveFeedback(rating: "good" | "bad") {
    if (!problem) {
      return;
    }

    setIsSavingFeedback(true);
    setFeedbackMessage(null);

    try {
      const response = await fetch("/api/problem-generator/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          semester,
          course,
          problem,
          rating,
          reasons: rating === "bad" ? badReasons : undefined
        })
      });
      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Unable to save problem feedback.");
      }

      setFeedbackMessage(
        rating === "good"
          ? "Problem archived as good."
          : "Problem archived as bad."
      );
      setShowBadReasons(false);
    } catch (caughtError) {
      setFeedbackMessage(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to save problem feedback."
      );
    } finally {
      setIsSavingFeedback(false);
    }
  }

  function startDrawing(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    isDrawingRef.current = true;
    canvas.setPointerCapture(event.pointerId);
    const context = canvas.getContext("2d");
    const point = getCanvasPoint(canvas, event);

    context?.beginPath();
    context?.moveTo(point.x, point.y);
  }

  function draw(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) {
      return;
    }

    const point = getCanvasPoint(canvas, event);

    context.lineWidth = 2;
    context.lineCap = "round";
    context.strokeStyle = "#1f2937";
    context.lineTo(point.x, point.y);
    context.stroke();
  }

  function stopDrawing(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;

    isDrawingRef.current = false;
    canvas?.releasePointerCapture(event.pointerId);
  }

  function clearCanvas() {
    const canvas = canvasRef.current;

    if (canvas) {
      drawGraphGrid(canvas);
    }
  }

  function getDrawingDataUrl() {
    if (!problem?.needsDrawing) {
      return null;
    }

    return canvasRef.current?.toDataURL("image/png") || null;
  }

  useEffect(() => {
    // A practice problem should be generated automatically when this page opens.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadProblem();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course, semester, problemId]);

  useEffect(() => {
    if (problem?.needsDrawing && canvasRef.current) {
      drawGraphGrid(canvasRef.current);
    }
  }, [problem?.needsDrawing]);

  return (
    <section className="w-full max-w-3xl rounded-md border border-slate-200 bg-white p-6 text-left shadow-sm">
      <div className="border-b border-slate-200 pb-4">
        <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
          Practice
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">{course}</h1>
        <p className="mt-1 text-sm text-slate-500">{semester}</p>
      </div>

      <div className="mt-6 space-y-6">
        <div>
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-base font-semibold text-slate-900">Problem</h2>
            <button
              type="button"
              onClick={loadProblem}
              disabled={isLoading}
              className="rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:border-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              New Problem
            </button>
          </div>

          {isLoading ? (
            <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
              Generating a course-specific practice problem...
            </div>
          ) : null}

          {!isLoading && error ? (
            <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">
              {error}
            </div>
          ) : null}

          {!isLoading && problem ? (
            <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              <div className="mb-3 flex flex-wrap gap-2 text-xs font-medium text-slate-500">
                <span className="rounded border border-slate-200 bg-white px-2 py-1">
                  {problem.topic}
                </span>
                <span className="rounded border border-slate-200 bg-white px-2 py-1">
                  {problem.problemType}
                </span>
                <span className="rounded border border-slate-200 bg-white px-2 py-1 capitalize">
                  {problem.difficulty}
                </span>
              </div>
              <p className="whitespace-pre-wrap">{problem.problem}</p>
            </div>
          ) : null}

          {!isLoading && problem && attempts.length ? (
            <div className="mt-4 space-y-3">
              <h2 className="text-sm font-semibold text-slate-900">
                Previous Attempts
              </h2>
              {attempts.map((attempt, index) => (
                <details
                  key={attempt.id}
                  className="rounded-md border border-slate-200 bg-white"
                >
                  <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-slate-800">
                    Attempt {attempts.length - index}
                    {attempt.score !== null ? ` - ${attempt.score}%` : ""}
                    <span className="ml-2 text-xs font-normal text-slate-500">
                      {formatAttemptDate(attempt.submittedAt)}
                    </span>
                  </summary>
                  <div className="space-y-4 border-t border-slate-200 px-4 py-4">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800">
                        Your Answer
                      </h3>
                      <div className="mt-2 space-y-3">
                        {Object.entries(attempt.answers).map(([part, answer]) => (
                          <div
                            key={part}
                            className="rounded-md border border-slate-200 bg-slate-50 p-3"
                          >
                            <p className="text-xs font-medium text-slate-500">
                              {part}
                            </p>
                            <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                              {answer || "[blank]"}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {attempt.feedback ? (
                      <div>
                        <h3 className="text-sm font-semibold text-slate-800">
                          Grader Feedback
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-slate-700">
                          {attempt.feedback}
                        </p>
                      </div>
                    ) : null}

                    {attempt.grading ? (
                      <>
                        <div className="grid gap-4 md:grid-cols-2">
                          <FeedbackList
                            title="Strengths"
                            items={attempt.grading.strengths}
                          />
                          <FeedbackList
                            title="Improve"
                            items={attempt.grading.improvements}
                          />
                        </div>
                        {attempt.grading.exampleSolution ? (
                          <ExampleSolution
                            solution={attempt.grading.exampleSolution}
                          />
                        ) : null}
                      </>
                    ) : null}

                    {attempt.gradingError ? (
                      <p className="text-sm text-red-700">
                        {attempt.gradingError}
                      </p>
                    ) : null}
                  </div>
                </details>
              ))}
            </div>
          ) : null}

          {!isLoading && problem ? (
            <div className="mt-4 rounded-md border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => saveFeedback("good")}
                  disabled={isSavingFeedback}
                  className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Good
                </button>
                <button
                  type="button"
                  onClick={() => setShowBadReasons((current) => !current)}
                  disabled={isSavingFeedback}
                  className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs font-medium text-red-800 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Bad
                </button>
                {feedbackMessage ? (
                  <p className="text-xs text-slate-600">{feedbackMessage}</p>
                ) : null}
              </div>

              {showBadReasons ? (
                <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
                  <p className="text-sm font-medium text-slate-800">
                    What is wrong with this problem?
                  </p>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={badReasons.type}
                      onChange={(event) =>
                        setBadReasons((current) => ({
                          ...current,
                          type: event.target.checked
                        }))
                      }
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    Problem type is not useful
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={badReasons.content}
                      onChange={(event) =>
                        setBadReasons((current) => ({
                          ...current,
                          content: event.target.checked
                        }))
                      }
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    Content does not match the course
                  </label>
                  <label
                    htmlFor="bad-reason-other"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Other
                  </label>
                  <textarea
                    id="bad-reason-other"
                    value={badReasons.other}
                    onChange={(event) =>
                      setBadReasons((current) => ({
                        ...current,
                        other: event.target.value
                      }))
                    }
                    placeholder="Add a specific reason..."
                    className="min-h-20 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  />
                  <button
                    type="button"
                    onClick={() => saveFeedback("bad")}
                    disabled={isSavingFeedback}
                    className="rounded-md bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Archive Bad Problem
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {problem?.needsDrawing ? (
          <div>
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-base font-semibold text-slate-900">
                Diagram
              </h2>
              <button
                type="button"
                onClick={clearCanvas}
                className="rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:border-slate-500 hover:bg-slate-50"
              >
                Clear
              </button>
            </div>
            <canvas
              ref={canvasRef}
              width={900}
              height={520}
              onPointerDown={startDrawing}
              onPointerMove={draw}
              onPointerUp={stopDrawing}
              onPointerCancel={stopDrawing}
              className="mt-3 h-96 w-full touch-none rounded-md border border-slate-300 bg-white shadow-sm"
            />
            <p className="mt-2 text-xs text-slate-500">
              Use the grid to draw curves, lines, axes, or labeled diagrams. The
              drawing will be submitted with your written answer.
            </p>
          </div>
        ) : null}

        <div className="space-y-4">
          <h2 className="text-base font-semibold text-slate-900">Your Answer</h2>
          {answerParts.map((part) => (
            <div key={part}>
              <label
                htmlFor={`practice-answer-${part}`}
                className="text-sm font-medium text-slate-700"
              >
                {part}
              </label>
              <textarea
                id={`practice-answer-${part}`}
                value={answers[part] || ""}
                onChange={(event) => updateAnswer(part, event.target.value)}
                placeholder="Type your answer here..."
                disabled={isLoading || !problem}
                className="mt-2 min-h-32 w-full resize-y rounded-md border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-50"
              />
            </div>
          ))}
        </div>

        <div>
          <label
            htmlFor="answer-file"
            className="text-base font-semibold text-slate-900"
          >
            Optional File Upload
          </label>
          <input
            id="answer-file"
            type="file"
            disabled
            className="mt-3 block w-full text-sm text-slate-600 file:mr-4 file:rounded-md file:border-0 file:bg-slate-200 file:px-4 file:py-2 file:text-sm file:font-medium file:text-slate-700 disabled:opacity-60"
          />
          <p className="mt-2 text-xs text-slate-500">
            File-based answer checking will be connected in a later step.
          </p>
        </div>

        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-slate-500">
            {submitMessage || "Answer checking will run when you submit."}
          </p>
          <button
            type="button"
            onClick={submitAnswer}
            disabled={!problem || isSubmitting}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
          >
            {isSubmitting ? "Saving..." : "Submit Answer"}
          </button>
        </div>

        {gradeResult ? (
          <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-slate-900">
                Grader Feedback
              </h2>
              <span className="rounded-md bg-slate-900 px-3 py-1 text-sm font-semibold text-white">
                {gradeResult.scorePercent}%
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              {gradeResult.briefFeedback}
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <FeedbackList title="Strengths" items={gradeResult.strengths} />
              <FeedbackList
                title="Improve"
                items={gradeResult.improvements}
              />
            </div>
            {gradeResult.weaknessSignals.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {gradeResult.weaknessSignals.map((signal) => (
                  <span
                    key={signal}
                    className="rounded border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600"
                  >
                    {signal}
                  </span>
                ))}
              </div>
            ) : null}
            {gradeResult.exampleSolution ? (
              <ExampleSolution solution={gradeResult.exampleSolution} />
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ExampleSolution({ solution }: { solution: string }) {
  return (
    <div className="mt-4 rounded-md border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-800">
        Example Solution
      </h3>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
        {solution}
      </p>
    </div>
  );
}

function FeedbackList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      {items.length ? (
        <ul className="mt-2 space-y-1 text-sm leading-6 text-slate-600">
          {items.map((item) => (
            <li key={item}>- {item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-slate-500">No notes.</p>
      )}
    </div>
  );
}

function getAnswerParts(problem: GeneratedProblem | null) {
  if (!problem) {
    return ["Answer"];
  }

  if (problem.answerParts?.length) {
    return problem.answerParts;
  }

  return inferAnswerParts(problem.problem);
}

function inferAnswerParts(problemText: string) {
  const parts = new Set<string>();
  const patterns = [
    /\(([a-z])\)/gi,
    /\bpart\s+([a-z])\b/gi,
    /^\s*([a-z])\.\s+/gim,
    /^\s*([0-9]+)[.)]\s+/gm
  ];

  for (const pattern of patterns) {
    const matches = Array.from(problemText.matchAll(pattern));

    for (const match of matches) {
      const label = match[1];

      if (label) {
        parts.add(/^\d+$/.test(label) ? `Question ${label}` : `Part (${label.toLowerCase()})`);
      }
    }
  }

  return parts.size ? Array.from(parts).slice(0, 12) : ["Answer"];
}

function formatAttemptDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function drawGraphGrid(canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d");

  if (!context) {
    return;
  }

  const { width, height } = canvas;
  const margin = 48;
  const gridStep = 40;
  const axisX = Math.round(height / 2);
  const axisY = Math.round(width / 2);

  context.clearRect(0, 0, width, height);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);

  context.lineWidth = 1;
  context.strokeStyle = "#e5e7eb";

  for (let x = margin; x <= width - margin; x += gridStep) {
    context.beginPath();
    context.moveTo(x, margin / 2);
    context.lineTo(x, height - margin / 2);
    context.stroke();
  }

  for (let y = margin / 2; y <= height - margin / 2; y += gridStep) {
    context.beginPath();
    context.moveTo(margin, y);
    context.lineTo(width - margin, y);
    context.stroke();
  }

  context.lineWidth = 2;
  context.strokeStyle = "#64748b";
  context.beginPath();
  context.moveTo(margin, axisX);
  context.lineTo(width - margin, axisX);
  context.stroke();

  context.beginPath();
  context.moveTo(axisY, margin / 2);
  context.lineTo(axisY, height - margin / 2);
  context.stroke();

  context.fillStyle = "#64748b";
  context.font = "14px system-ui, sans-serif";
  context.fillText("x", width - margin + 12, axisX + 5);
  context.fillText("y", axisY - 4, margin / 2 - 8);
  context.fillText("0", axisY + 8, axisX + 18);

  context.lineWidth = 1;
  context.strokeStyle = "#94a3b8";

  for (let x = axisY - gridStep; x >= margin; x -= gridStep) {
    drawTick(context, x, axisX, "vertical");
  }

  for (let x = axisY + gridStep; x <= width - margin; x += gridStep) {
    drawTick(context, x, axisX, "vertical");
  }

  for (let y = axisX - gridStep; y >= margin / 2; y -= gridStep) {
    drawTick(context, axisY, y, "horizontal");
  }

  for (let y = axisX + gridStep; y <= height - margin / 2; y += gridStep) {
    drawTick(context, axisY, y, "horizontal");
  }
}

function drawTick(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  direction: "horizontal" | "vertical"
) {
  context.beginPath();

  if (direction === "vertical") {
    context.moveTo(x, y - 5);
    context.lineTo(x, y + 5);
  } else {
    context.moveTo(x - 5, y);
    context.lineTo(x + 5, y);
  }

  context.stroke();
}

function getCanvasPoint(
  canvas: HTMLCanvasElement,
  event: React.PointerEvent<HTMLCanvasElement>
) {
  const rect = canvas.getBoundingClientRect();

  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height
  };
}
