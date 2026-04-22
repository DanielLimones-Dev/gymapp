import { useState } from 'react'
import { Modal, View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { AntDesign } from '@expo/vector-icons'

// ─────────────────────────────────────────────
// DOCUMENTO 1 — Términos y Condiciones
// ─────────────────────────────────────────────
const TERMINOS = [
  {
    titulo: '1. Descripción del Servicio',
    cuerpo: 'RepForge es una aplicación móvil de seguimiento de entrenamiento físico que ofrece: gestión de rutinas y programas de ejercicio, registro de progreso y métricas corporales, seguimiento de métricas de salud (glucosa, presión arterial, HRV), conexión con entrenadores personales (coaches), mensajería directa, comunidad, y asistencia mediante inteligencia artificial.\n\nRepForge opera como plataforma tecnológica de intermediación. No es una empresa de entrenamiento personal, no emplea coaches ni presta servicios de salud. Únicamente facilita el encuentro y la comunicación entre usuarios y entrenadores independientes.\n\nAl crear una cuenta o iniciar sesión aceptas estos Términos en su totalidad. Si no estás de acuerdo, no debes usar la aplicación.',
  },
  {
    titulo: '2. Cuenta de Usuario',
    cuerpo: 'Eres responsable de mantener la confidencialidad de tus credenciales. No debes compartir tu cuenta. Debes notificarnos de inmediato ante cualquier acceso no autorizado.\n\nRepForge se reserva el derecho de suspender o eliminar cuentas que incumplan estos términos, realicen actividades fraudulentas o proporcionen información falsa.',
  },
  {
    titulo: '3. Inteligencia Artificial',
    cuerpo: 'RepForge utiliza la API de Claude (Anthropic, Inc.) para generar recomendaciones de entrenamiento, análisis de progreso y respuestas personalizadas.\n\nLAS RESPUESTAS DE LA IA SON EXCLUSIVAMENTE INFORMATIVAS. No constituyen consejo médico, diagnóstico ni tratamiento. RepForge no garantiza su exactitud ni idoneidad para tu situación particular.',
  },
  {
    titulo: '4. RepForge como Plataforma Intermediaria',
    cuerpo: 'RepForge ES ÚNICAMENTE UNA PLATAFORMA TECNOLÓGICA DE INTERMEDIACIÓN.\n\nEsto significa que:\n\n• RepForge no contrata, emplea, supervisa ni dirige a los coaches registrados. Los coaches son profesionales independientes que usan la plataforma por su propia cuenta.\n\n• RepForge no verifica, certifica ni garantiza la formación académica, titulación, experiencia ni idoneidad profesional de ningún coach.\n\n• RepForge no es parte de la relación contractual entre el cliente y el coach. Cualquier acuerdo, compromiso, pago directo o disputa entre ambas partes es de exclusiva responsabilidad de las partes involucradas.\n\n• RepForge no responde por la calidad, exactitud, seguridad ni resultado de los planes de entrenamiento, rutinas, dietas, indicaciones o cualquier servicio prestado por los coaches a través de la plataforma.',
  },
  {
    titulo: '5. Condiciones Específicas para Coaches',
    cuerpo: 'Al registrarse como coach en RepForge, el entrenador acepta expresamente:\n\n• Que actúa como profesional independiente y no como empleado, socio ni representante de RepForge.\n\n• Que es el único responsable de los consejos, rutinas, planes de entrenamiento, recomendaciones nutricionales y cualquier otra indicación que proporcione a sus clientes.\n\n• Que debe comunicar honestamente a sus clientes su nivel de formación y certificaciones, o la ausencia de ellas.\n\n• Que no utilizará la plataforma para proporcionar diagnósticos médicos, prescribir medicamentos, ni realizar cualquier actividad que requiera licencia médica.\n\n• Que mantendrá la confidencialidad de los datos de salud y personales de sus clientes conforme al Aviso de Privacidad de RepForge.\n\n• Que el incumplimiento de estas condiciones puede resultar en la suspensión o eliminación de su cuenta sin previo aviso y sin derecho a reembolso.',
  },
  {
    titulo: '6. Exención del Cliente hacia el Coach',
    cuerpo: 'AL VINCULAR TU CUENTA A UN COACH DENTRO DE REPFORGE, COMO CLIENTE DECLARAS Y ACEPTAS EXPRESAMENTE LO SIGUIENTE:\n\n1. VOLUNTARIEDAD: Te vinculaste libremente al coach y sigues sus indicaciones de forma voluntaria y consciente, sin ningún tipo de coacción.\n\n2. ASUNCIÓN DE RIESGO: Reconoces que el ejercicio físico conlleva riesgos inherentes de lesión y que al seguir las rutinas o indicaciones del coach asumes personalmente dichos riesgos.\n\n3. RESPONSABILIDAD PERSONAL: Eres responsable de informar a tu coach sobre cualquier condición médica, lesión, embarazo u otro factor de riesgo antes de iniciar cualquier plan de entrenamiento. Si omites esta información y sufres un daño, el coach queda libre de toda responsabilidad.\n\n4. EXENCIÓN AL COACH: EN LA MÁXIMA MEDIDA PERMITIDA POR LA LEY, RENUNCIAS EXPRESAMENTE A INTERPONER CUALQUIER RECLAMACIÓN, DEMANDA JUDICIAL O EXTRAJUDICIAL, ACCIÓN LEGAL O ARBITRAJE CONTRA EL COACH POR:\n   • Lesiones físicas o musculoesqueléticas derivadas de ejecutar las rutinas o ejercicios asignados.\n   • Complicaciones de salud ocurridas durante o después de las sesiones de entrenamiento.\n   • Resultados no alcanzados (pérdida de peso, ganancia muscular, mejora de rendimiento u otros objetivos).\n   • Cualquier daño físico, psicológico o patrimonial relacionado con el seguimiento de los planes del coach.\n\n5. RESOLUCIÓN DIRECTA: Cualquier inconformidad con el servicio del coach debes resolverla directamente con él. RepForge no es árbitro ni mediador de disputas entre coach y cliente.',
  },
  {
    titulo: '7. Suscripciones y Pagos',
    cuerpo: 'PROCESADOR DE PAGOS — STRIPE:\nLos pagos dentro de RepForge son procesados por Stripe, Inc. (EE. UU.), plataforma certificada PCI-DSS nivel 1. RepForge no almacena ni accede a los datos de tus tarjetas. Al pagar aceptas también los Términos de Stripe en stripe.com/terms.\n\nSUSCRIPCIONES:\n• Se activan al completar el pago y se renuevan automáticamente.\n• Puedes cancelar en cualquier momento desde la configuración.\n• No se emiten reembolsos por períodos parciales salvo lo exigido por ley.\n\nPAGOS DIRECTOS COACH-CLIENTE:\nRepForge no interviene en los cobros que el coach realice directamente al cliente fuera de la plataforma. Dichos pagos son acuerdos privados entre las partes, y RepForge no tiene responsabilidad sobre ellos.\n\nPLATAFORMAS DE TIENDA:\nAlgunos planes pueden procesarse mediante Apple App Store o Google Play Store, sujetos a sus respectivas políticas.',
  },
  {
    titulo: '8. Comunidad',
    cuerpo: 'La sección de comunidad permite publicar contenido, comentar y reaccionar a publicaciones. Al publicar otorgas a RepForge una licencia no exclusiva para mostrarlo en la plataforma.\n\nQueda prohibido: contenido ofensivo, discriminatorio, falso, que infrinja derechos de terceros, spam o datos personales ajenos sin consentimiento.\n\nRepForge se reserva el derecho de eliminar contenido y suspender cuentas sin previo aviso.',
  },
  {
    titulo: '9. Propiedad Intelectual',
    cuerpo: 'Todos los derechos sobre el nombre RepForge, logotipo, interfaz, código fuente y bases de datos son propiedad exclusiva de sus desarrolladores. Queda prohibida su reproducción o distribución sin autorización expresa por escrito.',
  },
  {
    titulo: '10. Limitación de Responsabilidad',
    cuerpo: 'EN LA MÁXIMA MEDIDA PERMITIDA POR LEY, REPFORGE, SUS DESARROLLADORES, EMPLEADOS Y AFILIADOS NO SERÁN RESPONSABLES POR:\n\n• Lesiones, daños a la salud o complicaciones médicas derivadas del ejercicio, de las indicaciones de la IA, o de los planes proporcionados por los coaches.\n• Conductas, omisiones, negligencias o incumplimientos de los coaches hacia sus clientes.\n• Disputas económicas, contractuales o de cualquier otra naturaleza entre coaches y clientes.\n• Pérdida de datos, interrupciones del servicio o errores técnicos.\n• Cobros erróneos atribuibles a Stripe, Apple o Google.\n• Daños directos, indirectos, incidentales o consecuentes de cualquier naturaleza.\n\nEl uso de RepForge, la vinculación con un coach y la ejecución de cualquier plan de entrenamiento son enteramente bajo tu propio riesgo.',
  },
  {
    titulo: '11. Exención de Acciones Legales',
    cuerpo: 'AL ACEPTAR ESTOS TÉRMINOS, EN LA MEDIDA PERMITIDA POR LA LEY DE TU PAÍS, RENUNCIAS EXPRESAMENTE A INICIAR CUALQUIER RECLAMACIÓN, DEMANDA O ACCIÓN LEGAL CONTRA:\n\n• REPFORGE, sus desarrolladores y colaboradores, por daños derivados del uso de la aplicación.\n• LOS COACHES registrados en la plataforma, por lesiones, complicaciones de salud, resultados no alcanzados o cualquier otro daño derivado de seguir sus indicaciones de entrenamiento.\n\nEsta renuncia cubre: lesiones físicas o psicológicas, problemas de salud, pérdida de datos, daños patrimoniales y cualquier otro daño moral o material.\n\nSi la legislación de tu país no permite la renuncia total a estas acciones, la misma aplica en la máxima medida que dicha legislación permita.',
  },
  {
    titulo: '12. Modificaciones del Servicio',
    cuerpo: 'RepForge puede modificar, suspender o discontinuar el servicio en cualquier momento. Los cambios en estos Términos serán notificados en la app. El uso continuado implica aceptación.',
  },
  {
    titulo: '13. Ley Aplicable y Jurisdicción',
    cuerpo: 'Estos Términos se rigen por las leyes del país donde opera RepForge. Cualquier disputa no resuelta amistosamente se someterá a los tribunales competentes conforme a dicha legislación.',
  },
]

// ─────────────────────────────────────────────
// DOCUMENTO 2 — Aviso de Privacidad
// ─────────────────────────────────────────────
const PRIVACIDAD = [
  {
    titulo: 'Responsable del Tratamiento',
    cuerpo: 'RepForge y sus desarrolladores son responsables del tratamiento de tus datos personales recopilados a través de la aplicación móvil RepForge. Para cualquier consulta relacionada con tus datos puedes contactarnos a través de los canales de soporte de la aplicación.',
  },
  {
    titulo: 'Datos que Recopilamos',
    cuerpo: 'DATOS DE IDENTIFICACIÓN:\n• Nombre completo\n• Correo electrónico\n• Contraseña (almacenada cifrada, nunca en texto plano)\n• Foto de perfil (opcional)\n\nDATOS BIOMÉTRICOS Y DE SALUD:\n• Peso corporal e historial de cambios\n• Altura\n• Fecha de nacimiento y edad\n• Sexo biológico\n• Niveles de glucosa en sangre\n• Presión arterial (sistólica y diastólica)\n• Variabilidad de frecuencia cardíaca (HRV)\n• Lesiones previas o condiciones físicas declaradas\n\nDATOS DE ENTRENAMIENTO:\n• Rutinas y programas de ejercicio\n• Series, repeticiones y pesos registrados\n• Días y horarios de entrenamiento\n• Objetivos deportivos y nivel de experiencia\n\nDATOS DE USO:\n• Historial de interacciones con la IA\n• Publicaciones y comentarios en comunidad\n• Mensajes con coaches\n• Identificadores del dispositivo móvil',
  },
  {
    titulo: 'Finalidad del Tratamiento',
    cuerpo: 'Tus datos son utilizados exclusivamente para:\n\n• Prestarte el servicio de seguimiento de entrenamiento y salud.\n• Personalizar las recomendaciones de la IA de acuerdo a tu perfil.\n• Permitir a tu coach asignado hacer seguimiento de tu progreso.\n• Gestionar tu suscripción y procesar pagos.\n• Enviarte notificaciones relevantes sobre el servicio.\n• Mejorar la experiencia de usuario de la aplicación.\n• Cumplir con obligaciones legales aplicables.\n\nNo utilizamos tus datos para publicidad de terceros ni los vendemos a otras empresas.',
  },
  {
    titulo: 'Transferencias a Terceros',
    cuerpo: 'Para operar el servicio compartimos datos con los siguientes proveedores, quienes actúan como encargados del tratamiento:\n\n• SUPABASE (EE. UU.): Almacenamiento de base de datos, autenticación y sincronización en tiempo real. Tus datos se almacenan en servidores de Supabase, Inc.\n\n• STRIPE, INC. (EE. UU.): Procesamiento seguro de pagos. Stripe recibe datos de facturación e información de pago. Stripe es certificado PCI-DSS Nivel 1. RepForge nunca accede a tus datos de tarjeta.\n\n• ANTHROPIC, INC. (EE. UU.): Las consultas que realizas al asistente IA son procesadas por la API de Claude. Anthropic puede recibir el contenido de tus mensajes para generar respuestas.\n\n• APPLE / GOOGLE: Si usas inicio de sesión con Google o Apple, o realizas pagos a través de sus tiendas, dichas plataformas reciben los datos necesarios para la autenticación y/o cobro conforme a sus propias políticas de privacidad.\n\n• SENTRY (EE. UU.): Plataforma de monitoreo de errores técnicos. Puede recopilar datos anónimos de dispositivo y eventos de error para mejorar la estabilidad de la app.',
  },
  {
    titulo: 'Derechos del Usuario (ARCO)',
    cuerpo: 'Tienes derecho a:\n\n• ACCESO: Conocer qué datos personales tenemos sobre ti.\n• RECTIFICACIÓN: Corregir datos inexactos o incompletos.\n• CANCELACIÓN: Solicitar la eliminación de tus datos.\n• OPOSICIÓN: Oponerte al tratamiento de tus datos para finalidades específicas.\n• PORTABILIDAD: Recibir una copia de tus datos en formato legible.\n\nPara ejercer estos derechos contáctanos a través del soporte de la aplicación. Atenderemos tu solicitud en un plazo máximo de 30 días hábiles.',
  },
  {
    titulo: 'Retención de Datos',
    cuerpo: 'Conservamos tus datos mientras tu cuenta esté activa o sea necesario para prestarte el servicio. Al eliminar tu cuenta, tus datos personales serán eliminados de nuestros sistemas en un plazo máximo de 90 días, salvo que la ley nos obligue a conservarlos por un período mayor (por ejemplo, registros de transacciones financieras).\n\nLos mensajes en comunidad pueden permanecer en forma anonimizada tras la eliminación de cuenta.',
  },
  {
    titulo: 'Seguridad de los Datos',
    cuerpo: 'Implementamos las siguientes medidas de seguridad:\n\n• Cifrado en tránsito mediante HTTPS/TLS para todas las comunicaciones.\n• Contraseñas almacenadas con hash bcrypt mediante Supabase Auth.\n• Tokens de sesión con renovación automática y expiración.\n• Datos de pago manejados exclusivamente por Stripe bajo certificación PCI-DSS.\n• Monitoreo de errores y accesos anómalos mediante Sentry.\n\nNingún sistema es 100% seguro. En caso de brecha de seguridad que afecte tus datos, te notificaremos conforme a la ley aplicable.',
  },
  {
    titulo: 'Datos de Menores',
    cuerpo: 'RepForge no está dirigida a menores de 16 años. No recopilamos conscientemente datos de menores. Si tienes menos de 16 años, no debes registrarte ni usar la aplicación. Si detectamos que un usuario es menor de dicha edad, eliminaremos su cuenta y datos asociados.',
  },
  {
    titulo: 'Cambios al Aviso de Privacidad',
    cuerpo: 'Podemos actualizar este Aviso de Privacidad periódicamente. Te notificaremos de cambios relevantes dentro de la aplicación. El uso continuado del servicio tras la notificación implica la aceptación del aviso actualizado.',
  },
]

// ─────────────────────────────────────────────
// DOCUMENTO 3 — Exención de Responsabilidad Médica
// ─────────────────────────────────────────────
const EXENCION_MEDICA = [
  {
    titulo: 'RepForge NO es una Aplicación Médica',
    cuerpo: 'RepForge es una aplicación de seguimiento de actividad física y bienestar personal. NO ES una aplicación médica, clínica ni de diagnóstico. No está certificada por ninguna autoridad sanitaria ni regulatoria de ningún país.\n\nLa información, métricas y recomendaciones generadas por RepForge NO deben interpretarse como diagnóstico médico, prescripción, tratamiento ni consejo clínico de ningún tipo.',
  },
  {
    titulo: 'Métricas de Salud — Solo Seguimiento Personal',
    cuerpo: 'Las métricas que puedes registrar en RepForge (glucosa en sangre, presión arterial, variabilidad de frecuencia cardíaca, peso, composición corporal, entre otras) son herramientas de autoseguimiento personal.\n\nDichas métricas:\n• NO reemplazan el diagnóstico de un profesional médico.\n• NO deben usarse para tomar decisiones médicas sin supervisión.\n• Pueden verse afectadas por errores de medición del usuario o del dispositivo utilizado.\n• Los rangos de referencia mostrados en la app son orientativos y NO sustituyen los rangos clínicos personalizados que determina tu médico.\n\nSi registras valores fuera de rango, consulta a un profesional de la salud de inmediato.',
  },
  {
    titulo: 'La IA NO es tu Médico',
    cuerpo: 'El asistente de inteligencia artificial de RepForge (impulsado por Claude de Anthropic) está entrenado para proporcionar información general sobre ejercicio físico, nutrición y bienestar.\n\nEN NINGÚN CASO:\n• Las respuestas de la IA constituyen un diagnóstico médico.\n• La IA puede evaluar tu estado de salud real.\n• Las recomendaciones de la IA reemplazan la opinión de un médico, fisioterapeuta, nutriólogo u otro profesional sanitario.\n• Debes modificar medicamentos, tratamientos médicos o indicaciones de tu médico basándote en lo que dice la IA.\n\nSiempre consulta a un profesional de la salud calificado ante cualquier duda sobre tu salud.',
  },
  {
    titulo: 'Riesgo Inherente del Ejercicio Físico',
    cuerpo: 'El ejercicio físico, incluso cuando se realiza con supervisión, conlleva riesgos inherentes que incluyen sin limitarse a:\n\n• Lesiones musculares, tendinosas, ligamentosas, articulares u óseas.\n• Complicaciones cardiovasculares como arritmias, taquicardias o, en casos extremos, paro cardíaco.\n• Mareos, síncope (desmayo), hipoglucemia durante el ejercicio.\n• Rabdomiólisis por sobreentrenamiento.\n• Agravamiento de lesiones o condiciones preexistentes.\n\nAl usar RepForge reconoces y aceptas voluntaria y conscientemente todos estos riesgos.',
  },
  {
    titulo: 'Consulta Médica Obligatoria en Estos Casos',
    cuerpo: 'DEBES consultar a tu médico ANTES de usar cualquier programa de entrenamiento generado por RepForge si tienes o has tenido alguna de las siguientes condiciones:\n\n• Enfermedades cardiovasculares (hipertensión, cardiopatías, arritmias).\n• Diabetes tipo 1 o tipo 2.\n• Enfermedades respiratorias (asma severa, EPOC).\n• Embarazo o período de posparto reciente.\n• Lesiones musculoesqueléticas activas o recientes.\n• Cirugías recientes.\n• Osteoporosis u otras enfermedades óseas.\n• Trastornos alimenticios.\n• Cualquier condición crónica o aguda que afecte tu capacidad física.\n\nRepForge no puede evaluar tu aptitud física para el ejercicio. Esa evaluación solo puede realizarla un profesional médico.',
  },
  {
    titulo: 'Los Coaches NO son Profesionales de la Salud',
    cuerpo: 'Los coaches que operan en RepForge son entrenadores deportivos o personales independientes. Salvo que un coach indique y acredite expresamente lo contrario mediante documentación oficial, NO son médicos, fisioterapeutas, nutriólogos clínicos ni ningún otro profesional sanitario con habilitación legal para ejercer la medicina.\n\nLas rutinas, planes de entrenamiento, recomendaciones de alimentación y cualquier otra indicación de los coaches son de carácter deportivo y de libre práctica. NO constituyen prescripción médica, diagnóstico ni tratamiento clínico.\n\nRepForge NO verifica, valida ni certifica las credenciales, títulos, diplomas ni cualquier otra acreditación profesional de los coaches registrados en la plataforma. Es responsabilidad exclusiva del cliente solicitar y verificar dichas credenciales directamente al coach.',
  },
  {
    titulo: 'Exención Médica Total del Coach hacia el Cliente',
    cuerpo: 'AL VINCULARTE CON UN COACH EN REPFORGE, COMO CLIENTE ACEPTAS Y DECLARAS EXPRESAMENTE:\n\n1. Que seguiste o seguirás las indicaciones del coach de forma libre, voluntaria y consciente.\n\n2. Que informaste al coach sobre todas tus condiciones médicas, lesiones, limitaciones físicas y factores de riesgo relevantes. Si omitiste alguna información y sufriste un daño, el coach queda libre de toda responsabilidad médica derivada de dicha omisión.\n\n3. Que consultaste o consultarás a un médico antes de iniciar cualquier programa de entrenamiento, especialmente si presentas condiciones de riesgo.\n\n4. Que el coach no está obligado a conocer tu historial médico completo salvo lo que tú decidas compartir voluntariamente.\n\n5. QUE RENUNCIAS EXPRESAMENTE A CUALQUIER ACCIÓN LEGAL, RECLAMACIÓN O DEMANDA CONTRA EL COACH POR:\n   • Lesiones musculares, articulares, óseas, tendinosas o de cualquier otro tipo sufridas al ejecutar rutinas asignadas.\n   • Complicaciones cardiovasculares, metabólicas o de cualquier otra naturaleza ocurridas durante o después del entrenamiento.\n   • Agravamiento de lesiones o condiciones preexistentes que no fueron comunicadas al coach.\n   • Resultados físicos no alcanzados: pérdida de peso, ganancia muscular, mejora de marcas u otros objetivos.\n   • Daño psicológico, estrés o cualquier otro perjuicio derivado de la relación de entrenamiento.\n   • Muerte o incapacidad permanente o temporal derivada de la práctica del ejercicio físico.\n\nEsta exención es aplicable independientemente de si el daño ocurrió durante una sesión presencial, virtual o al ejecutar rutinas asignadas de forma autónoma.',
  },
  {
    titulo: 'Exención Total de Responsabilidad Médica — RepForge y Coaches',
    cuerpo: 'REPFORGE, SUS DESARROLLADORES, EMPLEADOS, COLABORADORES, Y TODOS LOS COACHES REGISTRADOS EN LA PLATAFORMA QUEDAN COMPLETAMENTE EXENTOS DE RESPONSABILIDAD POR:\n\n• Lesiones físicas de cualquier tipo o gravedad derivadas del ejercicio.\n• Complicaciones médicas por seguir recomendaciones de la IA o de los coaches.\n• Decisiones tomadas por el usuario basándose en métricas, análisis o recomendaciones de la app.\n• Agravamiento de condiciones preexistentes.\n• Muerte o incapacidad derivada de la práctica del ejercicio.\n\nAL ACEPTAR ESTOS TÉRMINOS CONFIRMAS:\n1. Has consultado o consultarás a un médico antes de iniciar cualquier programa de entrenamiento.\n2. Asumes plena y voluntariamente todos los riesgos del ejercicio físico.\n3. Renuncias a cualquier reclamación contra RepForge y contra los coaches por daños a tu salud.',
  },
  {
    titulo: 'Emergencias Médicas',
    cuerpo: 'RepForge NO es un servicio de emergencias. Si experimentas dolor en el pecho, dificultad para respirar, mareos intensos, pérdida de consciencia, o cualquier síntoma que pueda indicar una emergencia médica durante el ejercicio:\n\nDETEN EL EJERCICIO DE INMEDIATO Y LLAMA A LOS SERVICIOS DE EMERGENCIAS DE TU PAÍS (911, 112, u otro número local).\n\nNunca utilices RepForge como sustituto de atención médica de urgencia.',
  },
]

// ─────────────────────────────────────────────
// TABS
// ─────────────────────────────────────────────
const TABS = [
  { id: 'terminos',  label: 'Términos',   icon: 'file-text',   data: TERMINOS,       intro: 'Lee atentamente estos Términos y Condiciones. Al crear una cuenta o iniciar sesión confirmas que los has leído, comprendido y aceptado en su totalidad.' },
  { id: 'privacidad', label: 'Privacidad', icon: 'lock',        data: PRIVACIDAD,     intro: 'Este Aviso de Privacidad describe cómo RepForge recopila, utiliza, almacena y protege tus datos personales conforme a la legislación aplicable.' },
  { id: 'medica',    label: 'Exención\nMédica', icon: 'medicine-box', data: EXENCION_MEDICA, intro: 'Lee con especial atención esta sección. RepForge no es una aplicación médica. El ejercicio físico conlleva riesgos. Esta exención limita nuestra responsabilidad ante daños a tu salud.' },
]

export default function TermsModal({ visible, onClose, onAccept }) {
  const [activeTab, setActiveTab] = useState('terminos')
  const tab = TABS.find(t => t.id === activeTab)

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <LinearGradient colors={['#000000', '#050510', '#0a0a1f']} style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1 }}>

          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Documentos Legales</Text>
              <Text style={styles.headerSub}>RepForge — Versión 1.0 · Marzo 2026</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <AntDesign name="close" size={20} color="#8E8E93" />
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={styles.tabsRow}>
            {TABS.map(t => (
              <TouchableOpacity
                key={t.id}
                style={[styles.tab, activeTab === t.id && styles.tabActive]}
                onPress={() => setActiveTab(t.id)}
                activeOpacity={0.7}
              >
                <AntDesign name={t.icon} size={14} color={activeTab === t.id ? '#fff' : '#3a5080'} />
                <Text style={[styles.tabLabel, activeTab === t.id && styles.tabLabelActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Contenido */}
          <ScrollView
            key={activeTab}
            style={{ flex: 1 }}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Intro con fondo de advertencia en exención médica */}
            <View style={[styles.introBox, activeTab === 'medica' && styles.introBoxWarning]}>
              {activeTab === 'medica' && (
                <AntDesign name="exclamation-circle" size={16} color="#ff4466" style={{ marginBottom: 6 }} />
              )}
              <Text style={[styles.introText, activeTab === 'medica' && styles.introTextWarning]}>
                {tab.intro}
              </Text>
            </View>

            {tab.data.map((s) => (
              <View key={s.titulo} style={styles.section}>
                <Text style={[styles.sectionTitle, activeTab === 'medica' && styles.sectionTitleWarning]}>
                  {s.titulo}
                </Text>
                <Text style={styles.sectionBody}>{s.cuerpo}</Text>
              </View>
            ))}

            <View style={styles.footerRow}>
              <AntDesign name="safety" size={12} color="rgba(255,255,255,0.2)" />
              <Text style={styles.footer}>  Última actualización: marzo 2026</Text>
            </View>
          </ScrollView>

          {/* Botón */}
          <View style={styles.bottomBar}>
            <TouchableOpacity onPress={() => { onAccept?.(); onClose() }} style={styles.btnCerrarWrap}>
              <LinearGradient colors={['#1a3aff', '#0022cc']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnCerrar}>
                <Text style={styles.btnCerrarText}>ENTENDIDO Y ACEPTO</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

        </SafeAreaView>
      </LinearGradient>
    </Modal>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },
  headerSub: { color: '#8E8E93', fontSize: 10, marginTop: 2 },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center',
  },
  tabsRow: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  tab: {
    flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 8, paddingHorizontal: 4, borderRadius: 12, gap: 4,
    backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  tabActive: {
    backgroundColor: 'rgba(26,58,255,0.18)', borderColor: '#1a3aff',
  },
  tabLabel: { color: '#3a5080', fontSize: 10, fontWeight: '700', textAlign: 'center', letterSpacing: 0.2 },
  tabLabelActive: { color: '#fff' },
  content: { padding: 20, paddingBottom: 12 },
  introBox: {
    backgroundColor: 'rgba(68,136,255,0.07)', borderWidth: 1, borderColor: 'rgba(68,136,255,0.15)',
    borderRadius: 12, padding: 14, marginBottom: 24, alignItems: 'flex-start',
  },
  introBoxWarning: {
    backgroundColor: 'rgba(255,68,102,0.07)', borderColor: 'rgba(255,68,102,0.2)',
  },
  introText: { color: '#8E8E93', fontSize: 12, lineHeight: 18 },
  introTextWarning: { color: 'rgba(255,180,180,0.85)' },
  section: { marginBottom: 24 },
  sectionTitle: { color: '#4488ff', fontSize: 12, fontWeight: '800', letterSpacing: 0.4, marginBottom: 8 },
  sectionTitleWarning: { color: '#ff6688' },
  sectionBody: { color: 'rgba(255,255,255,0.65)', fontSize: 12, lineHeight: 20 },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 8, marginBottom: 20 },
  footer: { color: 'rgba(255,255,255,0.2)', fontSize: 10 },
  bottomBar: {
    padding: 16, paddingBottom: 24,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)',
  },
  btnCerrarWrap: { borderRadius: 16, overflow: 'hidden' },
  btnCerrar: { padding: 16, alignItems: 'center', borderRadius: 16 },
  btnCerrarText: { color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 2 },
})
