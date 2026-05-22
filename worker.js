export default {
  async fetch(request, env, ctx) {
    // Solo permitir POST
    if (request.method !== "POST") {
      return new Response("Método no permitido", { status: 405 });
    }

    const url = new URL(request.url);
    // Este Worker solo responde a /api/chat
    if (url.pathname !== "/api/chat") {
      return new Response("No encontrado", { status: 404 });
    }

    // Configuración CORS (permite a tu página web llamar al Worker)
    const corsHeaders = {
      "Access-Control-Allow-Origin": "https://dianam176-art.github.io",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Recibir los datos que envía el frontend
      const { messages, symptom, sex, age, duration, city } = await request.json();

      // Construir un prompt claro para Groq
      const systemPrompt = `Eres Vitalia, un asistente médico conversacional y empático. Tu objetivo es ayudar al paciente a entender su síntoma y guiarlo hacia la especialidad adecuada.

Reglas:
- Si el paciente aún no ha dado su sexo, pregúntale de forma natural.
- Si no ha dado su edad, pregúntala.
- Si no ha dado la duración de los síntomas (días), pregúntala.
- Si no ha dado la ciudad donde vive, pregúntala.
- Si ya tienes toda la información (síntoma, sexo, edad, duración, ciudad), entonces:
   - Determina la especialidad médica más probable de esta lista: Alergología, Cardiología, Dermatología, Endocrinología, Gastroenterología, Ginecología, Infectología, Medicina General, Neumología, Neurología, Odontología, Otorrinolaringología, Psiquiatría, Psicología, Urología, Traumatología, Reumatología, Oftalmología, Oncología.
   - Devuelve un JSON con:
     {
       "message": "respuesta amable para el paciente resumiendo el hallazgo",
       "next_action": "show_results",
       "specialty": "especialidad elegida",
       "urgency": "🔴 URGENTE / 🟡 PRIORIDAD MEDIA / 🟢 PRIORIDAD BAJA",
       "documents": ["lista de documentos recomendados"]
     }
- Si falta información, devuelve:
   {
     "message": "pregunta natural para obtener el dato faltante",
     "next_action": "ask_info"
   }

Información actual del paciente (puede ser null):
Síntoma: ${symptom || "no proporcionado"}
Sexo: ${sex || "no proporcionado"}
Edad: ${age || "no proporcionado"}
Duración (días): ${duration || "no proporcionado"}
Ciudad: ${city || "no proporcionado"}

Historial de la conversación:
${messages.slice(-8).map(m => `${m.role}: ${m.content}`).join('\n')}

Responde ÚNICAMENTE con el JSON, sin texto adicional.`;

      const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "system", content: systemPrompt }],
          temperature: 0.2,
        }),
      });

      const groqData = await groqResponse.json();
      const assistantReply = groqData.choices?.[0]?.message?.content || "{}";
      let parsed;
      try {
        parsed = JSON.parse(assistantReply);
      } catch (e) {
        parsed = { message: assistantReply, next_action: "show_results", specialty: "Medicina General" };
      }

      return new Response(JSON.stringify(parsed), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: "Error interno del servidor" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
  }
};
