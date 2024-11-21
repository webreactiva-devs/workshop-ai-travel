import type { APIRoute } from "astro";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: import.meta.env.GROQ_API_KEY });

const MODEL = "llama3-70b-8192";

export const POST: APIRoute = async ({ request }) => {
  const data = await request.json();
  const text = data.text;

  if (!text) {
    return new Response(
      JSON.stringify({
        error: "No se ha proporcionado texto para generar tags",
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  return handleGroqRequest(text);
};

async function handleGroqRequest(text) {
  const completionRequest = {
    messages: [
      {
        role: "system" as const,
        content: `Eres un asistente especializado en analizar notas de viaje.
          Tu tarea es extraer tags relevante separados por comas.
          No me des explicaciones. Dame solo los tags separados por comas. Sin introducciones.`,
      },
      {
        role: "user" as const,
        content: text,
      },
    ],
    model: MODEL,
    temperature: 1,
    max_tokens: 1024,
    top_p: 1,
    stream: false as const,
  };

  console.dir(completionRequest, { depth: null });

  try {
    const chatCompletion = await groq.chat.completions.create(
      completionRequest
    );

    if (!chatCompletion || !chatCompletion.choices) {
      throw new Error(
        "No se pudo obtener una respuesta válida del modelo de IA"
      );
    }

    console.dir(chatCompletion, { depth: null });

    const generatedText = chatCompletion.choices[0]?.message?.content;
    const usage = chatCompletion.usage;
    const tags = generatedText
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    return new Response(JSON.stringify({ tags, usage }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in /api/generate-tags (groq):", error);
    return new Response(
      JSON.stringify({ error: "Error al generar los tags con IA" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
