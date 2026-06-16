# engine — placeholder (E1, sin implementar)

Este paquete reservará el **engine ejecutor single-agent (E1)**. Hoy es solo un
placeholder: **no** se ejecuta nada y el POST de mensaje devuelve un marcador de
posición HITL (ver `app/api/space/router.py`).

## Restricciones de diseño (obligatorias al implementar — R4)

- **Single-agent E1**: un único agente ejecutor. Sin orquestación multi-agente.
- **Sin tools externas**: prohibido HTTP saliente, llamadas a APIs externas y
  ejecución de código (code-exec). El alcance es razonamiento + grounding sobre
  la KB interna.
- **Timeout obligatorio**: toda ejecución debe tener un límite de tiempo duro.
- **Cost cap obligatorio**: tope de costo/tokens por ejecución, sin excepción.
- **HITL (R3)**: ningún output sale sin aprobación humana en WorkLoom. El engine
  produce borradores; no auto-envía.
- **Grounding (R1)**: no inventa precios ni datos comerciales; `is_grounded`
  solo es `true` cuando el contenido está respaldado por la KB.

Mientras no esté conectado, el backend permanece en modo placeholder.
