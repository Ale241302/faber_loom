# worker — placeholder (workers async, sin implementar)

Reservado para **workers asíncronos** (tareas en segundo plano: indexado de KB,
embeddings, ejecuciones del engine encoladas, etc.). Hoy es solo un placeholder;
no hay broker ni proceso worker corriendo en local.

Al implementar, respetar las mismas restricciones que el engine (R4): timeout y
cost cap por tarea, sin tools externas/HTTP/code-exec, y HITL (R3) para
cualquier salida.
