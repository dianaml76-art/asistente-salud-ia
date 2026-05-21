# 🏥 Asistente de Salud con IA – Estimador de Copago

Agente conversacional que usa **IA (GroqCloud)** para sugerir especialidades médicas, incluyendo **Traumatología**, basadas en síntomas, sexo y edad, y luego calcula el copago exacto y recomienda el hospital más económico según el plan de seguro.

## 🤖 Uso de Inteligencia Artificial

- **Modelo**: GroqCloud (Llama 3.3 70B) vía Cloudflare Worker.
- **Función**: Analiza el síntoma, sexo y edad del paciente y devuelve la especialidad médica más probable.
- **Fallback**: Si la IA falla, el sistema usa una lógica local basada en palabras clave (que incluye Traumatología).
- Este desarrollo cumplió con el espíritu del hackathon: usar IA para acelerar y mejorar la solución.

## 🚀 Enlace público del agente

[https://dianam176-art.github.io/asistente-salud-ia/](https://dianam176-art.github.io/asistente-salud-ia/)

## 📋 Características

- **Detección con IA**: Usa Groq para entender síntomas complejos.
- **Pregunta sexo y edad** para refinar la derivación.
- **Especialidades incluidas**: Alergología, Cardiología, Dermatología, Endocrinología, Gastroenterología, Ginecología, Infectología, Medicina General, Neumología, Neurología, Odontología, Otorrinolaringología, Psiquiatría, Psicología, Urología, **Traumatología**.
- **Simula 3 planes de seguro** (Básico, Estándar, Premium).
- **Calcula copago exacto** en USD.
- **Compara 3 hospitales** (Norte, Centro, Sur) y muestra el más económico.
- **Diseño responsive** y conversacional moderno.

## 🛠️ Tecnologías

- HTML5, CSS3, JavaScript puro.
- Cloudflare Worker (proxy para llamadas a Groq).
- GroqCloud API (modelo llama-3.3-70b-versatile).
- GitHub Pages.

## 🔧 Configuración técnica (para el desarrollador)

1. Clona el repositorio.
2. Crea un Worker en Cloudflare con el código del proxy (incluido en el repositorio o en la documentación).
3. Añade la variable de entorno `GROQ_API_KEY` con tu clave de Groq.
4. Actualiza la constante `WORKER_URL` en `index.html` con la URL de tu Worker.
5. Despliega `index.html` en GitHub Pages.

## 📦 Despliegue en GitHub Pages

1. Sube `index.html` a un repositorio público.
2. Ve a Settings → Pages → Branch `main` → Save.
3. En 1-2 minutos tu agente estará vivo.

## 📄 Licencia

MIT – Libre de usar, modificar y distribuir.

---
*Desarrollado para HackIAthon – Reto 3*  
*IA utilizada: DeepSeek para código + GroqCloud para especialidades*
