import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

export type LlmProvider = "openai" | "claude";

export type LlmConnectionResult = {
  provider: LlmProvider;
  ok: boolean;
  model: string;
  message: string;
};

const OPENAI_DEFAULT_MODEL = "gpt-5.4-mini";
const CLAUDE_DEFAULT_MODEL = "claude-sonnet-4-5-20250929";

function getOpenAiModel() {
  return process.env.OPENAI_MODEL || OPENAI_DEFAULT_MODEL;
}

function getClaudeModel() {
  return process.env.CLAUDE_MODEL || CLAUDE_DEFAULT_MODEL;
}

export async function testOpenAiConnection(): Promise<LlmConnectionResult> {
  const model = getOpenAiModel();

  if (!process.env.OPENAI_API_KEY) {
    return {
      provider: "openai",
      ok: false,
      model,
      message: "OPENAI_API_KEY is not set."
    };
  }

  try {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const response = await client.responses.create({
      model,
      input: "Reply with exactly: connected",
      max_output_tokens: 16
    });

    return {
      provider: "openai",
      ok: true,
      model,
      message: response.output_text || "Connected."
    };
  } catch (error) {
    return {
      provider: "openai",
      ok: false,
      model,
      message: getErrorMessage(error)
    };
  }
}

export async function testClaudeConnection(): Promise<LlmConnectionResult> {
  const model = getClaudeModel();

  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      provider: "claude",
      ok: false,
      model,
      message: "ANTHROPIC_API_KEY is not set."
    };
  }

  try {
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });

    const response = await client.messages.create({
      model,
      max_tokens: 8,
      messages: [
        {
          role: "user",
          content: "Reply with exactly: connected"
        }
      ]
    });
    const firstContent = response.content[0];

    return {
      provider: "claude",
      ok: true,
      model,
      message:
        firstContent && firstContent.type === "text"
          ? firstContent.text
          : "Connected."
    };
  } catch (error) {
    return {
      provider: "claude",
      ok: false,
      model,
      message: getErrorMessage(error)
    };
  }
}

export async function testLlmConnection(provider: LlmProvider) {
  if (provider === "openai") {
    return testOpenAiConnection();
  }

  return testClaudeConnection();
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown connection error.";
}
