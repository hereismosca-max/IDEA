import {
  type PracticeAttemptRecord,
  readCourseAttempts
} from "./practiceStorage";

type GroupSummary = {
  name: string;
  attempts: number;
  averageScore: number;
  lowScoreCount: number;
};

type SignalSummary = {
  name: string;
  count: number;
};

export type WeaknessSummary = {
  totalAttempts: number;
  gradedAttempts: number;
  averageScore: number | null;
  weakestTopics: GroupSummary[];
  weakestProblemTypes: GroupSummary[];
  weaknessSignals: SignalSummary[];
  recentAttempts: PracticeAttemptRecord[];
  recommendations: string[];
};

export async function analyzeCourseWeakness(
  coursePath: string
): Promise<WeaknessSummary> {
  const attempts = await readCourseAttempts(coursePath);
  const gradedAttempts = attempts.filter(
    (attempt) => typeof attempt.score === "number"
  );

  if (!gradedAttempts.length) {
    return {
      totalAttempts: attempts.length,
      gradedAttempts: 0,
      averageScore: null,
      weakestTopics: [],
      weakestProblemTypes: [],
      weaknessSignals: [],
      recentAttempts: attempts.slice(0, 5),
      recommendations: [
        "Complete and submit a few practice problems to unlock weakness analysis."
      ]
    };
  }

  const weakestTopics = summarizeGroups(gradedAttempts, (attempt) =>
    normalizeLabel(attempt.problem.topic)
  );
  const weakestProblemTypes = summarizeGroups(gradedAttempts, (attempt) =>
    normalizeLabel(attempt.problem.problemType)
  );
  const weaknessSignals = summarizeSignals(gradedAttempts);

  return {
    totalAttempts: attempts.length,
    gradedAttempts: gradedAttempts.length,
    averageScore: average(gradedAttempts.map((attempt) => attempt.score || 0)),
    weakestTopics,
    weakestProblemTypes,
    weaknessSignals,
    recentAttempts: attempts.slice(0, 5),
    recommendations: buildRecommendations({
      weakestTopics,
      weakestProblemTypes,
      weaknessSignals
    })
  };
}

function summarizeGroups(
  attempts: PracticeAttemptRecord[],
  getLabel: (attempt: PracticeAttemptRecord) => string
) {
  const groups = new Map<string, PracticeAttemptRecord[]>();

  for (const attempt of attempts) {
    const label = getLabel(attempt);
    const current = groups.get(label) || [];

    current.push(attempt);
    groups.set(label, current);
  }

  return Array.from(groups.entries())
    .map(([name, groupAttempts]) => ({
      name,
      attempts: groupAttempts.length,
      averageScore: average(
        groupAttempts.map((attempt) => attempt.score || 0)
      ),
      lowScoreCount: groupAttempts.filter((attempt) => (attempt.score || 0) < 70)
        .length
    }))
    .sort((a, b) => {
      if (b.lowScoreCount !== a.lowScoreCount) {
        return b.lowScoreCount - a.lowScoreCount;
      }

      return a.averageScore - b.averageScore;
    })
    .slice(0, 5);
}

function summarizeSignals(attempts: PracticeAttemptRecord[]) {
  const counts = new Map<string, number>();

  for (const attempt of attempts) {
    for (const signal of attempt.grading?.weaknessSignals || []) {
      const label = normalizeLabel(signal);
      counts.set(label, (counts.get(label) || 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

function buildRecommendations(input: {
  weakestTopics: GroupSummary[];
  weakestProblemTypes: GroupSummary[];
  weaknessSignals: SignalSummary[];
}) {
  const recommendations: string[] = [];
  const weakestTopic = input.weakestTopics[0];
  const weakestType = input.weakestProblemTypes[0];
  const repeatedSignal = input.weaknessSignals[0];

  if (weakestTopic && weakestTopic.averageScore < 75) {
    recommendations.push(
      `Review ${weakestTopic.name}; your average there is ${weakestTopic.averageScore}%.`
    );
  }

  if (weakestType && weakestType.averageScore < 75) {
    recommendations.push(
      `Practice more ${weakestType.name} problems; this format is currently below target.`
    );
  }

  if (repeatedSignal) {
    recommendations.push(
      `Watch for this repeated issue: ${repeatedSignal.name}.`
    );
  }

  if (!recommendations.length) {
    recommendations.push(
      "Your recent graded work looks stable. Keep adding attempts so the weakness profile becomes more reliable."
    );
  }

  return recommendations;
}

function normalizeLabel(value?: string) {
  return value?.trim() || "Uncategorized";
}

function average(values: number[]) {
  if (!values.length) {
    return 0;
  }

  return Math.round(
    values.reduce((sum, value) => sum + value, 0) / values.length
  );
}
