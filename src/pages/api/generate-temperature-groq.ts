import type { APIRoute } from "astro";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: import.meta.env.GROQ_API_KEY });
const MODEL = "llama3-groq-70b-8192-tool-use-preview";

async function getWeather({ latitude, longitude }) {
  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&temperature_2m=true`
  );
  const data = await response.json();
  return JSON.stringify({
    temperature: data.current_weather.temperature,
    weather_code: data.current_weather.weathercode,
  });
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const { locationInput } = await request.json();

    if (!locationInput) {
      return new Response(
        JSON.stringify({
          error: "No se ha proporcionado un lugar para generar la información",
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
        content: `Devuelve un JSON con la latitud y longitud del lugar: ${locationInput}`,
      },
    ];

    const tools = [
      {
        type: "function" as const,
        function: {
          name: "getWeather",
          description: "Get the current weather in a given location",
          parameters: {
            type: "object",
            properties: {
              latitude: {
                type: "number",
                description: "Place latitude",
              },
              longitude: {
                type: "number",
                description: "Place longitude",
              },
            },
            required: ["latitude", "longitude"],
          },
        },
      },
    ];

    const response = await groq.chat.completions.create({
      model: MODEL,
      messages: messages,
      tools: tools,
      tool_choice: "auto",
    });

    const responseMessage = response.choices[0].message;
    const toolCalls = responseMessage.tool_calls;
    let location = null;

    if (toolCalls) {
      const availableFunctions = {
        getWeather: getWeather,
      };

      for (const toolCall of toolCalls) {
        const functionName = toolCall.function.name;
        const functionToCall = availableFunctions[functionName];
        const functionArgs = JSON.parse(toolCall.function.arguments);
        const functionResponse = await functionToCall(functionArgs);

        location = {
          temperature: JSON.parse(functionResponse).temperature,
          weather_code: JSON.parse(functionResponse).weather_code,
          latitude: functionArgs.latitude,
          longitude: functionArgs.longitude,
        };
      }
    }

    return new Response(JSON.stringify({ location }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in /api/generate-note-groq:", error);
    return new Response(
      JSON.stringify({ error: "Error al calcular la temperatura con IA" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
