# Asignación de Rutinas de Coach a Cliente

## Objetivo
Permitir que un Coach pueda acceder a la pantalla de rutinas de un cliente específico y crear un programa de entrenamiento que se guarde bajo el [id](file:///d:/Escritorio/Daniel/ReactNative/gymapp2/app/%28app%29/chat/Chat.jsx#234-241) del cliente (en lugar del [id](file:///d:/Escritorio/Daniel/ReactNative/gymapp2/app/%28app%29/chat/Chat.jsx#234-241) del propio coach).

## Análisis del problema actual
1. La pantalla [ListaProgramas.jsx](file:///d:/Escritorio/Daniel/ReactNative/gymapp2/app/%28app%29/rutinas/ListaProgramas.jsx) (y sus hijas como `Ejercicios.jsx`) leen `supabase.auth.getUser()` al montarse y usan ese `userId` para cargar y guardar los datos usando [cargarPrograma(user.id)](file:///d:/Escritorio/Daniel/ReactNative/gymapp2/lib/storage.js#12-64).
2. Para que un coach modifique la rutina de un cliente, la pantalla de "Rutinas" tiene que recibir (vía parámetros de navegación) el `clienteId`.
3. Si el parámetro `clienteId` existe, la pantalla debe operar sobre ese ID en lugar del ID del coach.

## Cambios Propuestos

### 1. `app/(app)/dashboard.jsx` (o donde el coach ve la lista de sus clientes)
- Actualmente el Coach ve a sus clientes en la pantalla de Comunidad o Chat. Necesitamos asegurarnos de que el modal o sección donde el Coach toca a un cliente tenga un botón "Ver/Asignar Rutina".
- Al presionar ese botón, debe navegar a la pestaña de Rutinas pasando el parámetro: `navigation.navigate('Rutinas', { screen: 'ListaProgramas', params: { clienteId: cliente.id, nombreCliente: cliente.nombre_completo } })`.

### 2. `app/(app)/rutinas/ListaProgramas.jsx`
- Modificar la inicialización (`useEffect` y `useFocusEffect`):
  ```javascript
  const routeParams = route.params || {}
  const targetUserId = routeParams.clienteId || user.id
  setUserId(targetUserId)
  const local = await cargarPrograma(targetUserId)
  ```
- Ajustar [guardarYSincronizar](file:///d:/Escritorio/Daniel/ReactNative/gymapp2/lib/storage.js#91-95) para que reciba `targetUserId` en lugar de asumir el local si es que usamos AsyncStorage como intermediario, o modificar [storage.js](file:///d:/Escritorio/Daniel/ReactNative/gymapp2/lib/storage.js) para que soporte guardar datos de terceros.
- Mostrar una pequeña barra superior (si `clienteId` está presente) diciendo "Editando rutina de: Juan Pérez".

### 3. [lib/storage.js](file:///d:/Escritorio/Daniel/ReactNative/gymapp2/lib/storage.js) (Lógica de guardado)
- [guardarYSincronizar(programaActualizado, userId)](file:///d:/Escritorio/Daniel/ReactNative/gymapp2/lib/storage.js#91-95): Asegurarse de que el `userId` que se pasa como argumento se use tanto para Supabase (`eq('usuario_id', userId)`) como para AsyncStorage (opcional, aunque para el coach tal vez no queramos guardarlo en su AsyncStorage local, o guardarlo con un prefijo `prog_CLIENTEID`).

## Verificación
1. **Prueba como Coach:** Entrar a la app con la cuenta de un Coach. Seleccionar un cliente. Abrir su rutina. Crear un "Nuevo Programa".
2. **Prueba de guardado:** Verificar en la base de datos Supabase que en la tabla `programas` se haya insertado una fila donde `usuario_id` sea igual al ID del cliente, y NO al del coach.
3. **Prueba como Cliente:** Iniciar sesión con la cuenta del cliente ("prueba@live.com") y ver que el programa asignado por el Coach aparece mágicamente en su pestaña de Entrenamiento.
