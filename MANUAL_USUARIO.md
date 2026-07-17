# Manual del Usuario — Mi Almacén

**Versión 1.4.0**
Aplicación de gestión para almacenes, kioscos y despensas.

---

## Índice

1. [¿Qué es Mi Almacén?](#qué-es-mi-almacén)
2. [Primeros pasos](#primeros-pasos)
3. [Inicio — Panel de control](#inicio--panel-de-control)
4. [Productos](#productos)
5. [Fiados](#fiados)
6. [Lista de precios (PDF)](#lista-de-precios-pdf)
7. [Configuración](#configuración)
8. [Tu plan: prueba gratuita y Pro](#tu-plan-prueba-gratuita-y-pro)
9. [Preguntas frecuentes](#preguntas-frecuentes)
10. [Contacto y soporte](#contacto-y-soporte)

---

## ¿Qué es Mi Almacén?

Mi Almacén es una aplicación para celular pensada para dueños de almacenes, kioscos y despensas que quieren:

- Saber en todo momento **quién les debe y cuánto**.
- Tener su **catálogo de productos** con precios de venta actualizados.
- Generar y compartir una **lista de precios en PDF** para mostrar a los clientes.
- Registrar **fiados y cobros** de forma simple y rápida.

La aplicación funciona en Android y no requiere conexión permanente a internet para consultarla, aunque necesita conexión para sincronizar los datos.

---

## Primeros pasos

### Crear una cuenta

1. Abrir la aplicación.
2. Tocar **Registrarse**.
3. Ingresar un correo electrónico y una contraseña (mínimo 6 caracteres).
4. Ingresar el nombre del comercio.
5. Tocar **Crear cuenta**.

La aplicación creará automáticamente el perfil del negocio y las 10 categorías de productos predeterminadas.

### Iniciar sesión

Si ya tiene una cuenta, ingrese su correo y contraseña en la pantalla de inicio.

Si no hay conexión a internet (o el servidor tarda demasiado en responder), aparece un mensaje "No pudimos conectar" con un botón **Reintentar** — no pierde el correo ni la contraseña que ya escribió. Lo mismo pasa al registrarse o al recuperar la contraseña.

### Cerrar sesión

Ir a **Configuración** → sección **Cuenta** → tocar **Cerrar sesión**.

---

## Inicio — Panel de control

La pantalla de inicio es el resumen del negocio. Muestra dos tarjetas:

### Tarjeta de Fiados

Indica:
- **Total pendiente** — suma de todo lo que deben los clientes.
- **Cuántos clientes deben** — cantidad de clientes con deuda mayor a $0.

El color de la tarjeta cambia:
- **Fondo rojo** — hay deuda pendiente.
- **Fondo verde** — todos los clientes están al día.
- **Fondo blanco** — no hay clientes cargados aún.

Tocar la tarjeta lleva directamente a la pantalla de Fiados.

### Tarjeta de Inventario

Muestra la cantidad de productos cargados en el catálogo.

Desde esta tarjeta se puede:
- **Nuevo producto** — agregar un producto al catálogo.
- **Lista PDF** — ir a la pantalla para generar la lista de precios.

---

## Productos

### Lista inicial de productos

La primera vez que abre la pestaña **Productos** con el catálogo vacío, la aplicación ofrece dos opciones:

- **Cargar lista inicial** — importa 90 productos de almacén preconfigurados con costo y precio sugerido (+40% de margen). Los productos quedan en su catálogo y puede editarlos o borrarlos como cualquier otro.
- **Empezar desde cero** — no importa nada; usted carga sus propios productos manualmente.

Esta oferta aparece una sola vez. Si elige "Empezar desde cero" y luego quiere cargar productos, puede hacerlo manualmente desde el botón **+**.

### Ver los productos

La pestaña **Productos** muestra todos los productos del catálogo.

- Usar la **barra de búsqueda** para buscar por nombre.
- Usar los **chips de categoría** para filtrar por categoría.

Cada producto muestra:
- Nombre
- Categoría y tipo
- Costo y margen aplicado
- **Precio de venta** (número grande a la derecha)

### Agregar un producto

1. Tocar el botón **+** en la esquina superior derecha.
2. Completar los campos:
   - **Nombre** (obligatorio)
   - **Tipo**: Unidad, Pack o Peso
   - **Categoría** (obligatorio — tocar uno de los chips)
   - **Costo** (precio al que compra el producto)
   - **Margen de ganancia** (porcentaje que se suma al costo)
   - **Redondeo** — el precio se redondea al valor elegido ($1, $5, $10, $50 o $100)
3. Ver el **precio de venta calculado** en tiempo real.
4. Tocar **Guardar producto**.

> **Ejemplo:** Aceite de 1 litro, costo $2.500, margen 40%, redondeo $10 → precio de venta: $3.510

### Editar o eliminar un producto

Tocar el producto en la lista para abrir la pantalla de edición.

- Modificar los campos necesarios y tocar **Guardar cambios**.
- Para eliminar, tocar **Eliminar producto** (se pedirá confirmación).

---

## Fiados

### ¿Qué es un fiado?

Un fiado es una venta a crédito: el cliente lleva el producto y paga después. Mi Almacén registra cuánto debe cada cliente y el historial de cada movimiento.

### Ver los clientes

La pestaña **Fiados** muestra:
- Una **barra de resumen** con el total pendiente, cuántos deben y cuántos están al día.
- La **lista de clientes**, ordenada por nombre.

Cada tarjeta de cliente muestra:
- Inicial del nombre (círculo de color)
- Nombre completo
- Teléfono (si fue cargado)
- **Monto que debe** (rojo si debe, verde si está al día)

### Agregar un cliente

1. Tocar el botón **+**.
2. Ingresar el nombre (obligatorio) y teléfono (opcional).
3. Tocar **Guardar cliente**.

### Registrar un fiado

1. Tocar el nombre del cliente en la lista.
2. Tocar **Registrar fiado**.
3. Ingresar el monto.
4. Ingresar una descripción opcional (ej: "pan, leche, aceite").
5. Tocar **Confirmar fiado**.

El saldo del cliente aumenta y el movimiento queda registrado en el historial.

### Registrar un cobro

1. Tocar el nombre del cliente en la lista.
2. Tocar **Registrar cobro** (solo disponible si el cliente debe algo).
3. Ingresar el monto cobrado.
4. Tocar **Confirmar cobro**.

El saldo del cliente se reduce. Si el cobro es igual al saldo, queda en $0 (al día).

### Ver el historial de un cliente

En la pantalla del cliente, debajo de los botones de acción, aparece el **historial de movimientos** con fecha, tipo (fiado/cobro), monto y saldo resultante.

---

## Lista de precios (PDF)

La lista de precios es accesible desde la pestaña **Productos**, tocando el botón **Lista de precios** (debajo de los chips de categoría).

### Generar el PDF

1. Ir a la pestaña **Productos**.
2. Tocar **Lista de precios**.
3. (Opcional) Elegir una categoría en el selector de arriba para imprimir solo esa sección — por ejemplo, reimprimir únicamente "Bebidas" sin generar todo el catálogo de nuevo. Por defecto está seleccionado **Todas las categorías**.
4. Ver la cantidad de productos que se incluirán.
5. Tocar **Generar lista**.
6. Una vez generada, elegir **Abrir PDF**, **Imprimir** o **Compartir PDF** (WhatsApp, email, Drive, etc.).

El PDF incluye los productos ordenados por categoría, con nombre, costo y precio de venta, en letra grande para encontrar productos rápido.

> **Nota:** Si no hay productos cargados, la lista no estará disponible. Primero cargue productos desde la pestaña **Productos**. Si elige una categoría sin productos, la aplicación se lo va a avisar antes de generar el PDF.

---

## Configuración

La pestaña **Config** tiene estas secciones:

### Mi comercio

- **Nombre del negocio** — el nombre que aparece en el encabezado del PDF y en la pantalla de inicio. Tocar **Guardar** para aplicar el cambio.
- **Email** — el correo registrado (solo lectura).

### Productos

Valores que se pre-completan automáticamente al crear un nuevo producto:

- **Margen por defecto (%)** — porcentaje de ganancia predeterminado. Si trabaja siempre con el mismo margen, configúrelo aquí y no tendrá que escribirlo cada vez.
- **Redondeo por defecto** — el tipo de redondeo más usado en su negocio.
- **Categoría por defecto** — la categoría que se selecciona automáticamente al crear un producto.

Tocar **Guardar preferencias** para aplicar los cambios.

> Si deja un campo vacío y guarda, se borra el valor guardado anteriormente.

### Categorías

Tocar **Administrar categorías** para ver y gestionar las categorías:

- Las **10 categorías del sistema** (Almacén, Bebidas, Lácteos, Carnes, Fiambrería, Verdulería, Limpieza, Higiene, Panadería, Otros) tienen un ícono de candado y no se pueden eliminar.
- Se pueden **agregar categorías propias** escribiendo el nombre en la barra superior y tocando el botón **+**.
- Las categorías personalizadas se pueden eliminar con el ícono de papelera, **siempre que no tengan productos asignados**.

> Si intenta eliminar una categoría con productos, la aplicación le avisará cuántos productos tiene esa categoría y le pedirá que los reasigne primero.

### Ayuda

- **Ver guía inicial** — vuelve a mostrar la guía de primeros pasos.
- **Contactar soporte** — abre nuestro sitio web para consultas, activar el plan Pro o reportar un problema. Es la forma más rápida de comunicarse con nosotros directamente desde la app.

### Mis datos

- **Exportar mis datos (JSON)** — genera un archivo con todos sus productos, clientes, fiados e historial de caja, listo para guardar en Google Drive, WhatsApp o email como respaldo. Si pasaron 7 días o más desde la última exportación, aparece un aviso recordatorio arriba de esta sección.

### Cuenta

- **Cerrar sesión** — cierra la sesión actual. Los datos quedan guardados en la nube.
- **Solicitar eliminación de cuenta** — al final de Configuración, en la sección "Zona peligrosa". Envía un aviso a soporte pidiendo el borrado de la cuenta. **No borra nada al instante**: su cuenta sigue activa y puede seguir usándola con normalidad mientras el equipo de soporte procesa la solicitud manualmente. Una vez enviada, la pantalla muestra la fecha en que se solicitó y no se puede volver a solicitar (ya quedó registrada).

### Versión de la app y avisos de actualización

Al final de Configuración siempre puede ver qué versión de Mi Almacén tiene instalada ("Versión de la app: X.X.X"). Cuando publicamos una versión nueva, puede aparecer un aviso al abrir la app invitándolo a actualizar, con un botón para ir a la página de descarga. Si no quiere actualizar en ese momento, toque **"Ahora no"**: el aviso se cierra y no vuelve a molestarlo hasta la próxima vez que abra la app.

---

## Tu plan: prueba gratuita y Pro

Cada negocio tiene un plan que determina si puede seguir registrando datos
nuevos.

- **Prueba gratuita (30 días)** — al crear la cuenta, tiene 30 días de acceso completo sin ningún costo. En la pantalla de Inicio y en Configuración aparece un aviso con los días restantes.
- **Pro** — acceso completo, sin límite de tiempo.
- **Solo lectura** — puede ver todos sus datos (productos, clientes, historial de caja) y generar el PDF de precios, pero no puede crear, editar, borrar ni registrar ningún movimiento nuevo. Esto ocurre cuando termina la prueba gratuita sin activar Pro, o si la cuenta queda en este estado por soporte.
- **Suspendida** — puede consultar sus datos, pero no puede operar. Hay que contactar a soporte para resolverlo.

Cuando una acción está bloqueada por el estado del plan, la aplicación
muestra un mensaje claro explicando por qué (nunca un error técnico) y qué
hacer — generalmente, contactar a soporte para activar Pro o resolver la
situación de la cuenta. Ese mensaje (en el aviso de Inicio/Configuración o
en el cuadro que aparece al intentar registrar algo) incluye un botón
("Activar Pro" o "Contactar soporte", según el caso) que abre directamente
nuestro sitio web — no hace falta buscar el contacto por otro lado. Durante
la prueba gratuita, también puede activar Pro en cualquier momento desde
Configuración, tocando el aviso de días restantes.

**¿Se pierden los datos si la cuenta queda en solo lectura o suspendida?**
No. Todos los datos permanecen intactos y visibles; lo único que cambia es
la posibilidad de crear o modificar información nueva.

---

## Preguntas frecuentes

**¿Se pierden los datos si desinstalo la app?**
No. Todos los datos se guardan en la nube (Firebase). Al volver a instalar la aplicación e iniciar sesión con el mismo correo, recupera todo.

**¿Puedo usar la app en más de un celular?**
Sí. Con el mismo correo y contraseña puede acceder desde cualquier dispositivo. Los cambios se sincronizan automáticamente.

**¿Qué pasa si no tengo internet?**
La aplicación requiere conexión para mostrar y sincronizar los datos. Sin conexión, puede ver los últimos datos cargados pero no podrá registrar movimientos nuevos.

**¿Cómo cambio el precio de un producto?**
Vaya a **Productos**, toque el producto que quiere modificar, cambie el costo o el margen y toque **Guardar cambios**. El precio de venta se recalcula automáticamente.

**¿Puedo cobrar una parte de lo que debe un cliente?**
Sí. En la pantalla del cliente, registre un cobro por el monto parcial. El sistema descuenta ese monto del saldo total.

**¿Cómo sé qué precio poner?**
La aplicación calcula el precio de venta en base al costo y al margen que usted define. Por ejemplo: si compra algo a $1.000 y quiere ganar el 50%, el precio de venta sugerido es $1.500 (más el redondeo que elija).

**¿Hay un límite de productos o clientes?**
No hay límite establecido en la aplicación.

**¿El PDF incluye los precios de costo?**
Sí, el PDF incluye costo y precio de venta para que el propietario tenga referencia al momento de imprimir o compartir.

**¿Cómo activo el plan Pro?**
Tocando el botón "Activar Pro" que aparece en el aviso de Inicio/Configuración (disponible durante toda la prueba gratuita, no solo cuando está por vencer) o en Configuración → Ayuda → "Contactar soporte". Cualquiera de los dos abre nuestro sitio web; la activación la realiza el equipo de Mi Almacén.

**¿Qué pasa si solicito eliminar mi cuenta y me arrepiento?**
Mientras la solicitud no fue procesada por soporte, la cuenta sigue activa y utilizable con normalidad. Contacte a soporte para cancelar la solicitud.

---

## Contacto y soporte

Para consultas, soporte técnico o sugerencias:

**Cristian Delgado**
Desarrollador
Maipú, Mendoza, Argentina
www.delgadodev.com.ar

---

## Derechos de autor

```
Copyright © 2026 Cristian Delgado
delgadocdev@hotmail.com
Maipú, Mendoza, Argentina

Todos los derechos reservados.

Esta aplicación y su documentación son propiedad exclusiva de Cristian Delgado.
Queda prohibida la reproducción total o parcial, distribución, modificación
o cualquier uso comercial de este software sin autorización escrita previa del autor.
```
