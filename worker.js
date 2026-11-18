export default {
  async fetch(request, env, ctx) {
    // ========== CORS ==========
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Método no permitido. Usa POST." }),
        { status: 405, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const url = new URL(request.url);
    if (url.pathname !== "/api/chat") {
      return new Response(
        JSON.stringify({ error: "Ruta no encontrada. Usa /api/chat" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    try {
      const body = await request.json();
      const {
        messages = [],
        symptom = null,
        sex = null,
        age = null,
        duration = null,
        city = null
      } = body;

      if (!symptom) {
        return new Response(
          JSON.stringify({ error: "Falta el campo 'symptom' en la petición." }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const systemPrompt = `Eres Vitalia, un asistente médico experto. El paciente ya ha proporcionado TODA la información necesaria. Tu única tarea es analizar los datos y devolver un JSON con la especialidad médica más probable, el nivel de urgencia y los documentos recomendados.

DATOS DEL PACIENTE:
- Síntoma principal: ${symptom}
- Sexo biológico: ${sex || "no proporcionado"}
- Edad: ${age || "no proporcionado"} años
- Duración de los síntomas: ${duration !== null ? duration + " días" : "no proporcionado"}
- Ciudad: ${city || "no proporcionado"}

HISTORIAL DE CONVERSACIÓN (contexto adicional):
${messages.length > 0 ? messages.slice(-6).map(m => `${m.role}: ${m.content}`).join('\n') : "Sin historial previo."}

INSTRUCCIONES ESTRICTAS:
1. Elige UNA especialidad de esta lista exacta:
   Alergología, Cardiología, Dermatología, Endocrinología, Gastroenterología, Ginecología, Infectología, Medicina General, Neumología, Neurología, Odontología, Otorrinolaringología, Psiquiatría, Psicología, Urología, Traumatología, Reumatología, Oftalmología, Oncología, Pediatría, Geriatría, Nefrología, Hematología.

2. Determina la urgencia:
   - 🔴 URGENTE: dolor pecho, dificultad respiratoria, desmayo, convulsiones, sangrado abundante, pérdida de conciencia.
   - 🟡 PRIORIDAD MEDIA: fiebre alta, mareos, dolor de cabeza intenso, vómitos persistentes, dolor abdominal fuerte.
   - 🟢 PRIORIDAD BAJA: síntomas leves o crónicos sin riesgo inmediato.

3. Recomienda entre 2 y 4 documentos útiles.

4. Si la edad es menor de 13 años, la especialidad DEBE ser "Pediatría".

RESPONDE ÚNICAMENTE CON ESTE JSON (sin texto adicional):
{
  "message": "resumen breve y empático (1-2 frases)",
  "next_action": "show_results",
  "specialty": "especialidad elegida",
  "urgency": "🔴 URGENTE" | "🟡 PRIORIDAD MEDIA" | "🟢 PRIORIDAD BAJA",
  "documents": ["documento 1", "documento 2", "..."]
}`;

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
          response_format: { type: "json_object" },
        }),
      });

      if (!groqResponse.ok) {
        const errorText = await groqResponse.text();
        console.error("Error de Groq API:", groqResponse.status, errorText);
        throw new Error(`Groq API respondió ${groqResponse.status}: ${errorText}`);
      }

      const groqData = await groqResponse.json();
      const assistantReply = groqData.choices?.[0]?.message?.content;

      if (!assistantReply) {
        throw new Error("Groq no devolvió contenido en 'choices[0].message.content'");
      }

      let parsed;
      try {
        parsed = JSON.parse(assistantReply);
      } catch (parseError) {
        console.error("Error al parsear JSON de Groq:", parseError, "Respuesta raw:", assistantReply);
        const jsonMatch = assistantReply.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            parsed = JSON.parse(jsonMatch[0]);
          } catch (e) {
            parsed = null;
          }
        }
        if (!parsed) {
          parsed = {
            message: "No pude analizar la respuesta de la IA, pero aquí tienes una recomendación general.",
            next_action: "show_results",
            specialty: "Medicina General",
            urgency: "🟢 PRIORIDAD BAJA",
            documents: ["Cédula", "Carnet", "Lista de medicamentos actuales"]
          };
        }
      }

      const validSpecialties = [
        "Alergología", "Cardiología", "Dermatología", "Endocrinología",
        "Gastroenterología", "Ginecología", "Infectología", "Medicina General",
        "Neumología", "Neurología", "Odontología", "Otorrinolaringología",
        "Psiquiatría", "Psicología", "Urología", "Traumatología",
        "Reumatología", "Oftalmología", "Oncología", "Pediatría",
        "Geriatría", "Nefrología", "Hematología"
      ];

      if (!parsed.specialty || !validSpecialties.includes(parsed.specialty)) {
        console.warn("Especialidad inválida o ausente:", parsed.specialty);
        parsed.specialty = (age && age < 13) ? "Pediatría" : "Medicina General";
      }

      if (!parsed.urgency || !["🔴 URGENTE", "🟡 PRIORIDAD MEDIA", "🟢 PRIORIDAD BAJA"].includes(parsed.urgency)) {
        console.warn("Urgencia inválida o ausente:", parsed.urgency);
        parsed.urgency = "🟢 PRIORIDAD BAJA";
      }

      if (!Array.isArray(parsed.documents) || parsed.documents.length === 0) {
        console.warn("Documentos inválidos o ausentes:", parsed.documents);
        parsed.documents = ["Cédula", "Carnet"];
      }

      parsed.next_action = "show_results";

      return new Response(JSON.stringify(parsed), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });

    } catch (error) {
      console.error("Error interno en el Worker:", error.message, error.stack);
      
      return new Response(
        JSON.stringify({
          error: "Error interno del servidor. La IA no está disponible.",
          details: error.message,
          message: "No pude conectar con la IA en este momento. Usaré la lógica local para ayudarte.",
          next_action: "show_results",
          specialty: null,
          urgency: null,
          documents: null
        }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
  }
};
