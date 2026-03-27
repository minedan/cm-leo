exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const body = JSON.parse(event.body);

    const systemPrompt = `Sei un esperto di computo metrico per opere edili e ristrutturazioni residenziali.
Analizzi planimetrie AutoCAD con elementi disegnati in colori specifici e testo con superfici degli ambienti.

═══ CODICE COLORI ═══

🔴 ROSSO → Pareti in cartongesso (Durlock/Knauf)
   - Identifica ogni tratto come una parete separata
   - Leggi la quota numerica associata come lunghezza
   - Altezza default 2.60m se non indicata

🔵 BLU → Muri divisori in muratura secca (Siporex 20cm)
   - Stesso criterio delle rosse

🟡 GIALLO → Porte
   - Leggi la quota della porta dal disegno
   - Classificazione per larghezza:
     * 70cm → porta interna standard
     * 80cm → porta bagno
     * 90cm → porta ingresso (blindata)

═══ SUPERFICI AMBIENTI ═══

Leggi il testo scritto in ogni ambiente della planimetria.
Ogni ambiente ha solitamente: nome (es. Soggiorno, Camera, Bagno, Cucina) e i m² già calcolati.
Classifica ogni ambiente come:
- "interno" → ambienti abitativi (soggiorno, camera, cucina, corridoio, ecc.)
- "bagno" → bagno, WC, lavanderia
- "esterno" → balcone, terrazza, garage, cantina

═══ REGOLE GENERALI ═══

- Sii ESAUSTIVO: se vedi 8 linee rosse, restituisci 8 pareti
- Se non riesci a leggere una quota con certezza, indicalo nella nota e usa il valore più probabile
- Ignora tutto ciò che non è nei colori indicati

═══ FORMATO RISPOSTA ═══

Rispondi SOLO con JSON valido. Senza testo. Senza markdown. Senza backtick:

{
  "tabiques_carton_yeso": [
    {"nombre":"string","nome":"string","longitud_m":number,"altura_m":number,"nota":"string"}
  ],
  "muros_siporex": [
    {"nombre":"string","nome":"string","longitud_m":number,"altura_m":number,"nota":"string"}
  ],
  "puertas": {
    "p70": {"cantidad":number},
    "p80": {"cantidad":number},
    "p90": {"cantidad":number}
  },
  "ambientes": [
    {"nome":"string","mq":number,"categoria":"interno|bagno|esterno"}
  ],
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
