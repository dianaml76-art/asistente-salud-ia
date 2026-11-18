export default {
  async fetch(request, env, ctx) {
    // ========== CONFIGURACIÓN CORS ==========
    // En producción, puedes restringir a tu dominio:
    // "Access-Control-Allow-Origin": "https://dianam176-art.github.io"
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // ========== MANEJO DE OPTIONS (preflight) ==========
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // ========== SOLO POST ==========
    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Método no permitido. Usa POST." }),
        { status: 405, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // ========== RUTA VÁLIDA ==========
    const url = new URL(request.url);
    if (url.pathname !== "/api/chat") {
      return new Response(
        JSON.stringify({ error: "Ruta no encontrada. Usa /api/chat" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    try {
      // ========== RECIBIR DATOS DEL FRONTEND ==========
      const body = await request.json();
      const {
        messages = [],      // Historial de conversación (puede venir vacío)
        symptom = null,
        sex = null,
        age = null,
        duration = null,
        city = null
      } = body;

      // Validación mínima: necesitamos al menos el síntoma
      if (!symptom) {
        return new Response(
          JSON.stringify({ error: "Falta el campo 'symptom' en la petición." }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // ========== CONSTRUIR PROMPT SIMPLIFICADO ==========
      // La IA ya NO necesita preguntar sexo, edad, duración ni ciudad.
      // El frontend ya recopiló todo. La IA solo debe:
      //   1. Determinar la especialidad médica más probable.
      //   2. Estimar la urgencia.
      //   3. Recomendar documentos.
      const systemPrompt = `Eres Vitalia, un asistente médico experto. El paciente ya ha proporcionado TODA la información necesaria. Tu única tarea es analizar los datos y devolver un JSON con la especialidad médica más probable, el nivel de urgencia y los documentos recomendados.

DATOS DEL PACIENTE:
- Síntoma principal: ${symptom}
- Sexo biológico: ${sex || "no proporcionado"}
- Edad: ${age || "no proporcionado"} años
- Duración de los síntomas: ${duration !== null ? duration + " días" : "no proporcionado"}
- Ciudad: ${city || "no proporcionado"}

HISTORIAL DE CONVERSACIÓN (contexto adicional, puede estar vacío):
${messages.length > 0 ? messages.slice(-6).map(m => `${m.role}: ${m.content}`).join('\n') : "Sin historial previo."}

INSTRUCCIONES ESTRICTAS:
1. Elige UNA especialidad de esta lista exacta (sin inventar otras):
   Alergología, Cardiología, Dermatología, Endocrinología, Gastroenterología, Ginecología, Infectología, Medicina General, Neumología, Neurología, Odontología, Otorrinolaringología, Psiquiatría, Psicología, Urología, Traumatología, Reumatología, Oftalmología, Oncología, Pediatría, Geriatría, Nefrología, Hematología.

2. Determina la urgencia según estos criterios:
   - 🔴 URGENTE: dolor pecho, dificultad respiratoria, desmayo, convulsiones, sangrado abundante, pérdida de conciencia.
   - 🟡 PRIORIDAD MEDIA: fiebre alta, mareos, dolor de cabeza intenso, vómitos persistentes, dolor abdominal fuerte.
   - 🟢 PRIORIDAD BAJA: síntomas leves o crónicos sin riesgo inmediato.

3. Recomienda entre 2 y 4 documentos útiles para la consulta (cédula, carnet, exámenes previos, etc.).

4. Si la edad es menor de 13 años, la especialidad DEBE ser "Pediatría" (a menos que sea una emergencia obvia).

RESPONDE ÚNICAMENTE CON ESTE JSON (sin texto adicional, sin markdown, sin explicaciones):
{
  "message": "resumen breve y empático para el paciente (1-2 frases)",
  "next_action": "show_results",
  "specialty": "especialidad elegida de la lista",
  "urgency": "🔴 URGENTE" | "🟡 PRIORIDAD MEDIA" | "🟢 PRIORIDAD BAJA",
  "documents": ["documento 1", "documento 2", "..."]
}`;

      // ========== LLAMADA A GROQ ==========
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
          response_format: { type: "json_object" }, // Fuerza respuesta JSON válida
        }),
      });

      // ========== VALIDAR RESPUESTA DE GROQ ==========
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

      // ========== PARSEAR JSON CON FALLBACK ROBUSTO ==========
      let parsed;
      try {
        parsed = JSON.parse(assistantReply);
      } catch (parseError) {
        console.error("Error al parsear JSON de Groq:", parseError, "Respuesta raw:", assistantReply);
        // Fallback: intentar extraer el JSON si viene envuelto en texto
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

      // ========== VALIDAR CAMPOS OBLIGATORIOS ==========
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

      // Asegurar que next_action sea siempre "show_results"
      parsed.next_action = "show_results";

      // ========== DEVOLVER RESPUESTA ==========
      return new Response(JSON.stringify(parsed), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });

    } catch (error) {
      // ========== MANEJO DE ERRORES ==========
      console.error("Error interno en el Worker:", error.message, error.stack);
      
      return new Response(
        JSON.stringify({
          error: "Error interno del servidor. La IA no está disponible.",
          details: error.message,
          // Fallback para que el frontend no se quede sin respuesta
          message: "No pude conectar con la IA en este momento. Usaré la lógica local para ayudarte.",
          next_action: "show_results",
          specialty: null, // El frontend usará su lógica local
          urgency: null,
          documents: null
        }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
  }
};
