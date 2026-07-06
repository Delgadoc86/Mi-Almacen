# Política de Privacidad — Mi Almacén

**Última actualización:** 06/07/2026

Esta Política de Privacidad describe qué datos recolecta la aplicación
móvil "Mi Almacén" (en adelante, "la Aplicación"), con qué finalidad, dónde
se almacenan y qué derechos tiene el usuario. Es específica de la
Aplicación y complementa (no reemplaza) la política de privacidad general
del sitio web delgadodev.com.ar.

**Responsable del tratamiento:** Cristian Delgado, Maipú, Mendoza,
Argentina. Contacto: delgadocdev@hotmail.com.

---

## 1. Qué datos recolecta la Aplicación

**Datos de la cuenta (obligatorios para usar la Aplicación):**
- Correo electrónico y contraseña (gestionados por Firebase Authentication;
  el Desarrollador nunca ve ni almacena la contraseña en texto plano).
- Nombre del negocio.
- Fecha de alta, último inicio de sesión y estado del plan (prueba, Pro,
  solo lectura, suspendido).

**Datos operativos (cargados voluntariamente por el usuario para gestionar
su negocio):**
- Productos, precios, costos y categorías.
- Datos de clientes del usuario que este decida registrar: nombre y,
  opcionalmente, teléfono o una referencia de contacto (módulo de Fiados).
- Movimientos de cuenta corriente, ingresos y egresos de caja.

**Datos técnicos automáticos:**
- Identificador de instalación y logs técnicos mínimos generados por
  Firebase para el funcionamiento de la sincronización y la seguridad
  (por ejemplo, para aplicar las reglas de acceso de Firestore).
- La Aplicación **no** utiliza herramientas de analítica de comportamiento
  ni publicidad, y no accede a contactos, ubicación, cámara ni micrófono
  del dispositivo.

## 2. Con qué finalidad se usan

Los datos se utilizan exclusivamente para:

- Permitir el funcionamiento de la Aplicación (autenticación, sincronización
  entre dispositivos, generación de PDFs de lista de precios).
- Gestionar el estado del plan (prueba/Pro/solo lectura/suspendido) y
  responder consultas de soporte.
- Cumplir con solicitudes del propio usuario (exportación de datos,
  eliminación de cuenta).

**No se utilizan los datos con fines publicitarios, no se venden ni se
ceden a terceros con fines comerciales.**

## 3. Dónde se almacenan los datos

Los datos se almacenan en **Google Firebase** (Cloud Firestore, Firebase
Authentication y Cloud Functions), infraestructura de Google Cloud
Platform. Esto implica que los datos pueden procesarse en servidores
ubicados fuera de la Argentina. Google mantiene certificaciones
internacionales de seguridad y protección de datos (ISO 27001, SOC 2/3,
entre otras) y actúa, a los efectos de la Ley 25.326, como **subencargado
del tratamiento** contratado por el Desarrollador.

## 4. Rol del usuario sobre los datos de sus propios clientes

Cuando el usuario carga en la Aplicación datos personales de sus propios
clientes (nombre, teléfono en el módulo de Fiados), el usuario es quien
actúa como **responsable del tratamiento** de esos datos frente a la Ley
25.326 — es su obligación contar con el consentimiento o base legal
correspondiente de sus clientes para registrarlos. El Desarrollador actúa
como **encargado del tratamiento**: solo almacena y protege esa información
por cuenta del usuario, sin acceder a ella para fines propios.

## 5. Seguridad

- Toda comunicación entre la Aplicación y los servidores viaja cifrada
  (HTTPS/TLS).
- El acceso a los datos está restringido por reglas de seguridad de
  Firestore: cada negocio solo puede leer y escribir sus propios datos;
  ningún negocio puede ver información de otro.
- El acceso administrativo (panel interno del Desarrollador) requiere una
  credencial especial asignada manualmente y queda registrado en un
  historial de auditoría.

## 6. Retención y eliminación de datos

- Los datos se conservan mientras la cuenta esté activa.
- El usuario puede solicitar la eliminación completa de su cuenta y datos
  desde la Aplicación (Configuración → Zona peligrosa → Solicitar
  eliminación de cuenta). La solicitud queda registrada de forma
  irreversible y se procesa manualmente; mientras tanto, la cuenta sigue
  activa y utilizable con normalidad.
- El usuario también puede exportar la totalidad de sus datos en cualquier
  momento (Configuración → Exportar mis datos) antes de solicitar la baja.

## 7. Derechos del usuario

Conforme a la Ley 25.326 de Protección de Datos Personales, el usuario
tiene derecho a:

- **Acceder** a sus datos personales.
- **Rectificar** datos inexactos o desactualizados.
- **Suprimir** sus datos (ver Sección 6).
- **Retirar** su consentimiento en cualquier momento.

Para ejercer estos derechos, puede escribir a delgadocdev@hotmail.com. La
**Agencia de Acceso a la Información Pública** (AAIP), autoridad de control
en materia de protección de datos personales en Argentina, es la vía de
reclamo ante cualquier violación a esta normativa
(www.argentina.gob.ar/aaip).

## 8. Menores de edad

La Aplicación no está dirigida a menores de 18 años y no recolecta a
sabiendas datos de menores.

## 9. Cambios en esta política

Esta política puede actualizarse para reflejar cambios en la Aplicación o
en la normativa aplicable. La fecha de "Última actualización" al inicio de
este documento indica la versión vigente.

## 10. Contacto

**Cristian Delgado**
Maipú, Mendoza, Argentina
Email: delgadocdev@hotmail.com
WhatsApp: +54 9 261-747-8090
Web: www.delgadodev.com.ar

---

## Anexo — Declaración de seguridad de datos (para publicación futura en Google Play)

Esta sección resume, en el formato que exige el "Data safety" de Google
Play Console, la información a declarar el día que la Aplicación se
publique en la tienda. Se incluye ahora para que la política ya esté
preparada:

| Tipo de dato | ¿Se recolecta? | ¿Se comparte con terceros? | Finalidad | ¿Es opcional? |
|---|---|---|---|---|
| Email | Sí | No | Autenticación de cuenta | No (obligatorio) |
| Nombre (del negocio) | Sí | No | Identificación de cuenta | No |
| Nombre/teléfono de clientes del usuario | Sí (lo carga el usuario) | No | Gestión de cuenta corriente propia del negocio | Sí |
| Datos financieros (precios, movimientos de caja) | Sí | No | Funcionalidad principal de la app | No |
| Identificadores del dispositivo | Sí (mínimo, vía Firebase) | No | Seguridad y funcionamiento técnico | No |
| Ubicación | No se recolecta | — | — | — |
| Datos de navegación/analítica | No se recolecta | — | — | — |

Todos los datos viajan cifrados en tránsito (HTTPS/TLS). El usuario puede
solicitar la eliminación de todos sus datos desde la propia app, en
cualquier momento.
