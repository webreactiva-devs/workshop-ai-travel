import type { APIRoute } from "astro";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: import.meta.env["OPENAI_API_KEY"] });

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

  return handleOpenAIRequest(text);
};

async function handleOpenAIRequest(text) {
  try {
    const chatCompletion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `Eres un asistente especializado en analizar notas de viaje. 
          Tu tarea es extraer tags relevante separados por comas.
          No me des explicaciones. Dame solo los tags separados por comas. Sin introducciones.`,
        },
        { role: "user", content: text },
      ],
      model: "gpt-4o",
    });

    console.dir(chatCompletion, { depth: null });

    if (!chatCompletion || !chatCompletion.choices) {
      throw new Error(
        "No se pudo obtener una respuesta válida del modelo de IA"
      );
    }

    const generatedText = chatCompletion.choices[0]?.message?.content;
    const tags = generatedText
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    return new Response(JSON.stringify({ tags }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in /api/generate-tags (openai):", error);
    return new Response(
      JSON.stringify({ error: "Error al generar los tags con IA" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
