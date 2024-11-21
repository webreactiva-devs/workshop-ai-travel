import type { APIRoute } from "astro";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: import.meta.env.GROQ_API_KEY });

const MODEL = "llama-3.2-11b-vision-preview";

export const POST: APIRoute = async ({ request }) => {
  try {
    const { base64Image } = await request.json();

    if (!base64Image) {
      return new Response(
        JSON.stringify({
          error: "No se ha proporcionado una imagen para generar la nota",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const messages: Groq.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `
            From image place generate a JSON response with these fields: latitude, longitude and name of the place.
            Format example: {"latitude": 40.7128, "longitude": -74.0060, "placeName": "London"}
            Dont give me greets or explanations, only the JSON`,
          },
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${base64Image}`,
            },
          },
        ],
      },
    ];

    const chatCompletion = await groq.chat.completions.create({
      messages,
      model: MODEL,
      response_format: { type: "json_object" },
    });

    if (!chatCompletion || !chatCompletion.choices) {
      throw new Error(
        "No se pudo obtener una respuesta válida del modelo de IA"
      );
    }

    const generatedContent = chatCompletion.choices[0]?.message?.content;
    let generatedNote = "";
    let location = null;

    try {
      const parsedContent = JSON.parse(generatedContent);
      generatedNote = parsedContent.note;
      location = {
        latitude: parsedContent.latitude,
        longitude: parsedContent.longitude,
        placeName: parsedContent.placeName,
      };
    } catch (e) {
      generatedNote = generatedContent;
    }

    return new Response(JSON.stringify({ generatedNote, location }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in /api/generate-note-groq:", error);
    return new Response(
      JSON.stringify({ error: "Error al generar la nota con IA" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
