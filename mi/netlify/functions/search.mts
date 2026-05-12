import type { Context, Config } from "@netlify/functions";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const { query } = await req.json();

  if (!query || typeof query !== "string") {
    return new Response(JSON.stringify({ error: "Query is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const stream = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 1024,
    system:
      "Te egy tudásalapú keresőmotor vagy az AMISEARCH tanulási platformon. A felhasználók tananyagokkal kapcsolatos kérdéseket tesznek fel. Válaszolj tömören, informatívan, és ha releváns, használj felsorolásokat vagy rövid bekezdéseket. Magyarul és angolul is tudsz kommunikálni. Fókuszálj az oktatási tartalmakra: definíciók, képletek, összefoglalók, vizsgakérdések.",
    messages: [{ role: "user", content: query }],
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
  path: "/api/search",
  method: "POST",
};
