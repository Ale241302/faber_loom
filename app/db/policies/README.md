# RLS — nota de ubicación

La **verdad** de Row-Level Security vive en `/sql` (bootstrap local) y, más
adelante, en migraciones **alembic**. Este paquete Python **solo documenta**;
no define ni aplica policies.

## Modelo (R2)

- Toda tabla aislable lleva `tenant_id uuid NOT NULL`.
- `ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY` en cada tabla
  (excepto `tenants`, que es la raíz y no lleva `tenant_id`).
- Las policies usan:

  ```sql
  USING      (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
  ```

- El backend fija el tenant **por servidor** con
  `SET LOCAL app.current_tenant_id = '<uuid>'` dentro de la sesión del request
  (ver `app/core/tenant.py`). **Nunca** se lee el tenant de un header de cliente.
- El rol de aplicación `faberloom_app` es `NOSUPERUSER` para que RLS aplique de
  verdad (un superusuario haría bypass de las policies).

Ver `sql/003_rls.sql` para el DDL canónico.
