// Referencia compartida para la navegación del stack de rutinas
// Separado para evitar ciclos de dependencia entre dashboard y CoachDashboard
export const rutinasNavigation = {
  ref: null,
  goToEjercicios(bloqueId, diaKey, uid) {
    if (rutinasNavigation.ref) {
      rutinasNavigation.ref.navigate('Ejercicios', { bloqueId, diaKey, userId: uid, noAnim: true })
    } else {
      rutinasNavigation.pendingNav = { bloqueId, diaKey, userId: uid, noAnim: true }
    }
  },
}
