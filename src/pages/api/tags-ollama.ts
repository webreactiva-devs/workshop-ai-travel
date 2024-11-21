import type { APIRoute } from "astro";
import { Ollama } from "ollama";


const ollama = new Ollama({ host: "http://localhost:11434" }); 

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    const text = data.text;

    if (!text) {
      return new Response(
        JSON.stringify({
          error: "No se ha proporcionado texto para generar etiquetas",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { tags, usage } = await generateTagsWithOllama(text);

    return new Response(JSON.stringify({ tags, usage }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error en el endpoint /api/generate-tags:", error);
    return new Response(
      JSON.stringify({ error: "Error al procesar la solicitud" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

async function generateTagsWithOllama(
  text: string
): Promise<{
  tags: string[];
  usage: { total_tokens: number; total_time: number };
}> {
  try {
    const response = await ollama.chat({
      model: "llama2", 
      messages: [
        {
          role: "system",
          content: `Eres un asistente especializado en analizar notas de viaje. 
          Tu tarea es extraer etiquetas relevantes separadas por comas. 
          No me des explicaciones. Dame solo las etiquetas separadas por comas, sin introducciones.`,
        },
        { role: "user", content: text },
      ],
    });

    const generatedText = response.message?.content?.trim();
    if (!generatedText) {
      throw new Error("No se recibió contenido en la respuesta de Ollama");
    }

    const tags = generatedText
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    // Construcción del objeto usage basado en los datos de Ollama
    const usage = {
      total_tokens: response.eval_count || 0, // Usa eval_count como proxy de tokens procesados
      total_time: response.total_duration || 0, // Usa total_duration como tiempo total de procesamiento
    };

    return { tags, usage };
  } catch (error) {
    console.error("Error al generar etiquetas con Ollama:", error);
    throw new Error("Error al generar etiquetas con Ollama");
  }
}
