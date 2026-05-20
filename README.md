# 🏥 Asistente de Salud con IA – Estimador de Copago

Agente conversacional que usa **IA (GroqCloud)** para sugerir especialidades médicas basadas en síntomas, sexo y edad, y luego calcula el copago exacto y recomienda el hospital más económico según el plan de seguro.

## 🤖 Uso de Inteligencia Artificial

- **Modelo**: GroqCloud (Llama 3.3 70B) vía Cloudflare Worker.
- **Función**: Analiza el síntoma, sexo y edad del paciente y devuelve la especialidad médica más probable.
- **Fallback**: Si la IA falla, el sistema usa una lógica local basada en palabras clave.
- Este desarrollo cumplió con el espíritu del hackathon: usar IA para acelerar y mejorar la solución.

## 🚀 Enlace público del agente

[https://dianaml76.github.io/nuevo-repo/](https://dianaml76.github.io/nuevo-repo/)  
*(Reemplaza `nuevo-repo` por el nombre de tu repositorio actual)*

## 📋 Características

- **Detección con IA**: Usa Groq para entender síntomas complejos.
- **Pregunta sexo y edad** para refinar la derivación.
- **Simula 3 planes de seguro** (Básico, Estándar, Premium).
- **Calcula copago exacto** en USD.
- **Compara 3 hospitales** (Norte, Centro, Sur) y muestra el más económico.
- **Diseño responsive** y conversacional moderno.

## 🛠️ Tecnologías

- HTML5, CSS3, JavaScript puro.
- Cloudflare Worker (proxy para llamadas a Groq).
- GroqCloud API (modelo llama-3.3-70b-versatile).
- GitHub Pages.



---
*Desarrollado para HackIAthon – Reto 3*  
*IA utilizada: DeepSeek para código + GroqCloud para especialidades*
