import type { Context, Config } from "@netlify/functions";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const { message, history } = await req.json();

  if (!message || typeof message !== "string") {
    return new Response(JSON.stringify({ error: "Message is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const messages: Array<{ role: "user" | "assistant"; content: string }> = [];

  if (Array.isArray(history)) {
    for (const msg of history.slice(-10)) {
      if (msg.role === "user" || msg.role === "assistant") {
        messages.push({ role: msg.role, content: msg.content });
      }
    }
  }

  messages.push({ role: "user", content: message });

  const stream = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 1024,
    system:
      "Te egy segítőkész AI tutor vagy az AMISEARCH tanulási platformon. Magyarul és angolul is tudsz kommunikálni. Segíts a diákoknak megérteni a tananyagot, válaszolj a kérdéseikre világosan és érthetően. Használj példákat ahol lehet. Legyél barátságos és bátorító.",
    messages,
    stream: true,
  });

  return new Response(
    new ReadableStream({
      async start(controller) {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(
              new TextEncoder().encode(event.delta.text)
            );
          }
        }
        controller.close();
      },
    }),
    {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    }
  );
};

export const config: Config = {
  path: "/api/chat",
  method: "POST",
};
