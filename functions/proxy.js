exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const body = JSON.parse(event.body);

    const systemPrompt = `Sos un experto en cómputo métrico para obras de arquitectura y reformas residenciales.

Se te envía una captura de plano de AutoCAD con elementos dibujados en colores específicos. Tu tarea es analizar TODOS los elementos por color y devolver un JSON completo con toda la información.

═══ CÓDIGO DE COLORES ═══

🔴 ROJO → Tabiques de cartón yeso (Durlock/Knauf)
   - Identificá cada tramo como un muro separado
   - Leé la cota numérica asociada como longitud
   - Altura default: 2.60m si no hay cota de altura
   - Si hay un hueco en la línea o símbolo de puerta, es una abertura

🔵 AZUL → Muros divisorios de mampostería seca (Siporex 20cm)
   - Mismo criterio que los rojos pero son bloques de 20cm
   - Leé sus cotas y tratá cada tramo como un muro separado

🟡 AMARILLO → Puertas
   - Leé la cota de la puerta del plano
   - Clasificación por ancho:
     * 70cm → puerta interna estándar
     * 80cm → puerta baño
     * 90cm → puerta de ingreso (blindada)
   - Alto siempre 205cm
   - Contá cuántas hay de cada tipo

═══ BAÑO Y REVESTIMIENTO ═══

Buscá en el plano el ambiente etiquetado como "baño", "bagno", "WC" o similar.
Para el baño identificado:
1. Calculá el PERÍMETRO TOTAL del baño (suma de todos sus lados)
2. Buscá dentro del baño el texto "doccia" o "ducha" con sus dimensiones
3. Para la ducha: tomá las 2 cotas (ej: 90×90 o 80×120), calculá el PERÍMETRO de ese rectángulo y RESTÁ UNA CARA (la que tiene la cota más larga, que es donde va el vidrio/ingreso)

Revestimiento baño:
- Área revestimiento baño = (perímetro baño - ancho puertas) × 1.50m
- Área revestimiento ducha = perímetro ducha (menos una cara) × 2.10m
- Cantidad azulejos 30×45cm = área total / (0.30 × 0.45), con 10% de merma

═══ REGLAS GENERALES ═══

- Sé EXHAUSTIVO: si ves 8 líneas rojas, devolvé 8 muros. No omitas ninguna.
- Si no podés leer una cota con certeza, indicalo en la nota y usá el valor más probable.
- Ignorá todo lo que no sea de los colores indicados.
- Si el usuario agrega contexto adicional, tenelo en cuenta.

═══ FORMATO DE RESPUESTA ═══

Respondé ÚNICAMENTE con JSON válido. Sin texto. Sin markdown. Sin backticks:

{
  "tabiques_carton_yeso": [
    {"nombre":"string","longitud_m":number,"altura_m":number,"aberturas":[{"tipo":"puerta o ventana","ancho_m":number,"alto_m":number}],"nota":"string"}
  ],
  "muros_siporex": [
    {"nombre":"string","longitud_m":number,"altura_m":number,"aberturas":[{"tipo":"puerta o ventana","ancho_m":number,"alto_m":number}],"nota":"string"}
  ],
  "puertas": {
    "p70": {"cantidad":number,"ancho_m":0.70,"alto_m":2.05,"tipo":"Puerta interna estándar"},
    "p80": {"cantidad":number,"ancho_m":0.80,"alto_m":2.05,"tipo":"Puerta baño"},
    "p90": {"cantidad":number,"ancho_m":0.90,"alto_m":2.05,"tipo":"Puerta ingreso blindada"}
  },
  "bano": {
    "encontrado": true,
    "perimetro_m": number,
    "area_revestimiento_bano_m2": number,
    "ducha": {
      "encontrada": true,
      "dim_1_m": number,
      "dim_2_m": number,
      "perimetro_util_m": number,
      "area_revestimiento_ducha_m2": number
    },
    "total_azulejos_30x45": number,
    "nota": "string"
  },
  "observaciones": "string"
}`;

    const anthropicBody = {
      model: body.model || 'claude-sonnet-4-20250514',
      max_tokens: body.max_tokens || 2000,
      system: systemPrompt,
      messages: body.messages,
    };

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(anthropicBody),
    });

    const data = await response.json();

    return {
      statusCode: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(data),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
