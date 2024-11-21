import type { APIRoute } from "astro";
import Groq from "groq-sdk";
import fs from "fs";

const groq = new Groq({ apiKey: import.meta.env.GROQ_API_KEY });
const MODEL = "llama3-groq-70b-8192-tool-use-preview";

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();
    const audioFile = formData.get("file") as File;

    if (!audioFile) {
      return new Response(
        JSON.stringify({ error: "No se ha proporcionado un archivo de audio" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Create a temporary file path
    const tempFilePath = `/tmp/${audioFile.name}`;
    const buffer = Buffer.from(await audioFile.arrayBuffer());
    fs.writeFileSync(tempFilePath, buffer);

    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(tempFilePath),
      model: "whisper-large-v3-turbo",
      response_format: "json",
      language: "es",
    });

    return new Response(JSON.stringify({ transcription: transcription.text }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in /api/transcribe-audio:", error);
    return new Response(
      JSON.stringify({ error: "Error al transcribir el audio" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
