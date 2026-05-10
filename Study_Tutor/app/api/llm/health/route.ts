import { NextResponse } from "next/server";

import { testLlmConnection, type LlmProvider } from "@/lib/llm";

const PROVIDERS = ["openai", "claude"] as const;

function isProvider(value: string | null): value is LlmProvider {
  return PROVIDERS.some((provider) => provider === value);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const provider = searchParams.get("provider");

  if (isProvider(provider)) {
    const result = await testLlmConnection(provider);

    return NextResponse.json(result, {
      status: result.ok ? 200 : 500
    });
  }

  const results = await Promise.all(
    PROVIDERS.map((providerName) => testLlmConnection(providerName))
  );
  const allOk = results.every((result) => result.ok);

  return NextResponse.json(
    {
      ok: allOk,
      results
    },
    {
      status: allOk ? 200 : 500
    }
  );
}
