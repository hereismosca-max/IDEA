import { execFile } from "child_process";
import { readdir, readFile, stat } from "fs/promises";
import path from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const IGNORED_FILES = new Set([".DS_Store", "problem_generation_guide.md"]);
const MAX_EXTRACTED_FILES = 30;
const MAX_CHARS_PER_FILE = 2200;
const MAX_TOTAL_CHARS = 42000;

export type CourseMaterialFile = {
  relativePath: string;
  category: "supplement" | "knowledge" | "practice" | "other";
  extension: string;
  score: number;
};

export type MaterialScanResult = {
  files: CourseMaterialFile[];
  sampledFiles: Array<CourseMaterialFile & { text: string }>;
};

export async function scanCourseMaterials(coursePath: string): Promise<MaterialScanResult> {
  const files = await listMaterialFiles(coursePath);
  const sampledFiles = [];
  let totalChars = 0;

  for (const file of files.slice(0, MAX_EXTRACTED_FILES)) {
    if (totalChars >= MAX_TOTAL_CHARS) {
      break;
    }

    const text = await extractText(path.join(coursePath, file.relativePath));
    const normalizedText = normalizeText(text).slice(0, MAX_CHARS_PER_FILE);

    if (!normalizedText) {
      continue;
    }

    sampledFiles.push({
      ...file,
      text: normalizedText
    });
    totalChars += normalizedText.length;
  }

  return {
    files,
    sampledFiles
  };
}

async function listMaterialFiles(coursePath: string) {
  const files: CourseMaterialFile[] = [];

  async function walk(directoryPath: string) {
    const entries = await readdir(directoryPath, { withFileTypes: true });

    for (const entry of entries) {
      if (IGNORED_FILES.has(entry.name)) {
        continue;
      }

      const fullPath = path.join(directoryPath, entry.name);

      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      const relativePath = path.relative(coursePath, fullPath);
      const extension = path.extname(entry.name).toLowerCase();

      files.push({
        relativePath,
        category: getCategory(relativePath),
        extension,
        score: scoreMaterial(relativePath)
      });
    }
  }

  await walk(coursePath);

  return files.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }

    return a.relativePath.localeCompare(b.relativePath);
  });
}

async function extractText(filePath: string) {
  const extension = path.extname(filePath).toLowerCase();

  try {
    if (extension === ".pdf") {
      const { stdout } = await execFileAsync("pdftotext", [
        "-f",
        "1",
        "-l",
        "6",
        "-layout",
        filePath,
        "-"
      ]);

      return stdout;
    }

    if (extension === ".docx") {
      const { stdout } = await execFileAsync("textutil", [
        "-convert",
        "txt",
        "-stdout",
        filePath
      ]);

      return stdout;
    }

    if ([".md", ".txt", ".do"].includes(extension)) {
      return readFile(filePath, "utf8");
    }

    if ([".html", ".htm"].includes(extension)) {
      const html = await readFile(filePath, "utf8");

      return htmlToText(html);
    }

    const fileStats = await stat(filePath);

    return `Unsupported file type ${extension || "unknown"}; size ${fileStats.size} bytes.`;
  } catch (error) {
    return `Text extraction failed: ${error instanceof Error ? error.message : "unknown error"}`;
  }
}

function getCategory(relativePath: string): CourseMaterialFile["category"] {
  const firstPart = relativePath.split(path.sep)[0]?.toLowerCase();

  if (firstPart === "knowledges") {
    return "knowledge";
  }

  if (firstPart === "supplement") {
    return "supplement";
  }

  if (firstPart === "practices") {
    return "practice";
  }

  return "other";
}

function scoreMaterial(relativePath: string) {
  const lowerPath = relativePath.toLowerCase();
  let score = 0;

  if (lowerPath.startsWith("supplement/")) score += 180;
  if (lowerPath.includes("topic")) score += 95;
  if (lowerPath.includes("generation") || lowerPath.includes("instruction")) score += 90;
  if (lowerPath.includes("syllabus")) score += 100;
  if (lowerPath.includes("exam polic")) score += 95;
  if (lowerPath.includes("study") || lowerPath.includes("guide")) score += 85;
  if (lowerPath.includes("final")) score += 80;
  if (lowerPath.includes("midterm")) score += 78;
  if (lowerPath.includes("exam")) score += 75;
  if (lowerPath.includes("answer") || lowerPath.includes("solution") || lowerPath.includes("sol")) score += 65;
  if (lowerPath.includes("problem set") || lowerPath.includes("pset")) score += 55;
  if (lowerPath.includes("worksheet") || lowerPath.includes("discussion") || lowerPath.includes("section")) score += 45;
  if (lowerPath.includes("review")) score += 40;
  if (lowerPath.includes("slide") || lowerPath.includes("lecture") || lowerPath.includes("class")) score += 25;
  if (lowerPath.endsWith(".md")) score += 20;

  return score;
}

function normalizeText(text: string) {
  return text
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function htmlToText(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|section|article|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'");
}
