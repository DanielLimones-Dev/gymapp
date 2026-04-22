// ─────────────────────────────────────────────────────────────────────────────
// excelImport.js — Utilidades de importación directa Excel → RepForge
// (sin IA). Usado por ListaProgramas y IAScreen (para el texto hacia la IA).
// ─────────────────────────────────────────────────────────────────────────────
import * as XLSX from 'xlsx'

export const GRUPO_MAP = {
  'Pantorrilla':'Pantorrillas','Pantorrillas':'Pantorrillas',
  'Cuadriceps':'Cuádriceps','Cuádriceps':'Cuádriceps',
  'Isquiosurales':'Femorales','Femorales':'Femorales',
  'Adductores':'Abdomen','Pectoral':'Pecho','Pecho':'Pecho',
  'Espalda':'Espalda','Deltoides':'Hombros','Hombros':'Hombros',
  'Tríceps':'Tríceps','Triceps':'Tríceps',
  'Bíceps':'Bíceps','Biceps':'Bíceps',
  'Glúteo':'Glúteos','Glúteos':'Glúteos',
  'Abdomen':'Abdomen','Trapecio':'Espalda',
}

export const TIPOS_VALIDOS = ['Adaptativo', 'Acumulación', 'Intensificación', 'Peaking', 'Descarga']

export function normalizarTipo(raw) {
  const s = String(raw || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  if (s.includes('adapt'))                      return 'Adaptativo'
  if (s.includes('acum'))                       return 'Acumulación'
  if (s.includes('intens'))                     return 'Intensificación'
  if (s.includes('peak') || s.includes('pico')) return 'Peaking'
  if (s.includes('descarg') || s.includes('deload')) return 'Descarga'
  return TIPOS_VALIDOS.includes(raw) ? raw : 'Acumulación'
}

// Parsea un string de reps del Excel ("10,15" / "10-15" / 10.15 / "15") → {repsMin, repsMax}
export function parsearReps(raw) {
  const s = String(raw).trim()
  const m1 = s.match(/(\d+)[,\-](\d+)/)
  if (m1) return { repsMin: parseInt(m1[1]), repsMax: parseInt(m1[2]) }
  // XLSX puede leer "10,15" como decimal 10.15
  const m2 = s.match(/^(\d+)\.(\d+)$/)
  if (m2) return { repsMin: parseInt(m2[1]), repsMax: parseInt(m2[2]) }
  const n = parseInt(s)
  if (!isNaN(n) && n > 0) return { repsMin: n, repsMax: n + 2 }
  return { repsMin: 8, repsMax: 12 }
}

// Distribuye N días de entrenamiento de forma estándar en la semana (Lun=0…Dom=6)
export function spreadDias(n) {
  const tables = {
    1: [0],
    2: [0, 3],
    3: [0, 2, 4],
    4: [0, 1, 3, 4],
    5: [0, 1, 2, 3, 4],
    6: [0, 1, 2, 3, 4, 5],
    7: [0, 1, 2, 3, 4, 5, 6],
  }
  return tables[Math.min(7, Math.max(1, n))] || [0, 2, 4]
}

function etiquetaDia(grupos) {
  const g = new Set(grupos)
  const pierna  = g.has('Cuádriceps') || g.has('Femorales') || g.has('Glúteos') || g.has('Pantorrillas')
  const pecho   = g.has('Pecho')
  const espalda = g.has('Espalda')
  const brazos  = g.has('Bíceps') || g.has('Tríceps')
  if (pierna && !pecho && !espalda)                return 'LEGS'
  if (pecho && espalda && !pierna)                 return 'UPPER'
  if (pecho && !espalda && !pierna)                return 'PUSH'
  if (espalda && !pecho && !pierna)                return 'PULL'
  if (brazos && !pierna && !pecho && !espalda)     return 'ARMS'
  if (g.has('Abdomen') && grupos.length <= 2)      return 'CORE'
  if (g.has('Hombros') && !pierna && !pecho && !espalda) return 'ARMS'
  return 'FULLBODY'
}

// ─── Conversión directa Excel → estructura RepForge (sin IA) ─────────────────
// Devuelve { nombrePrograma, descripcion, bloques[] }
// Cada bloque tiene ejerciciosPorDia y etiquetasPorDia con índices de día-de-semana
// reales (usando spreadDias), no los índices secuenciales del Excel.
export function excelAPrograma(workbook, sheetName) {
  const ws = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', blankrows: false })
  const filtradas = rows.filter(r => r.some(c => c !== '' && c !== 0))

  let semanasTotales = 0, tipoMeso = 'Acumulación', nombreMeso = sheetName
  filtradas.forEach(r => {
    const c0 = String(r[0])
    if (/Duracion/i.test(c0))            semanasTotales = parseInt(String(r[3])) || 0
    if (/Nombre del mesociclo/i.test(c0)) tipoMeso = String(r[3]) || tipoMeso
  })

  // Detectar columnas de semanas
  let semanaCols = []
  filtradas.forEach(r => {
    const found = []
    r.forEach((cell, ci) => { if (/^SEMANA\s*\d+/i.test(String(cell))) found.push(ci) })
    if (found.length > semanaCols.length) semanaCols = found
  })
  if (semanaCols.length === 0) semanaCols = [6]

  const numSemanas    = semanaCols.length
  const semanasPerBloque = semanasTotales > 0 ? Math.max(1, Math.round(semanasTotales / numSemanas)) : 1

  // Parsear ejercicios por día (índices secuenciales del Excel: 0, 1, 2…)
  const diasData = {}
  let diaActual = null
  filtradas.forEach(r => {
    const c0 = String(r[0]).trim()
    if (/^Día\s*\d+/i.test(c0)) {
      diaActual = parseInt(c0.replace(/^Día\s*/i, '')) - 1
      diasData[diaActual] = []
      return
    }
    if (diaActual === null) return
    const grupo  = String(r[1]).trim()
    const nombre = String(r[3]).trim()
    if (!nombre || nombre === '0' || nombre === 'Ejercicio' || !grupo || grupo === '0' || grupo === 'Grupo muscular') return
    const { repsMin, repsMax } = parsearReps(r[semanaCols[0] + 2])
    const seriesPorSemana = semanaCols.map(ci => parseInt(r[ci]) || 0)
    const rirPorSemana    = semanaCols.map(ci => {
      const rs = String(r[ci + 3]).replace(/RIR\s*/i, '').trim()
      return parseInt(rs.match(/(\d+)/)?.[1] ?? '2')
    })
    if (seriesPorSemana.every(s => s === 0)) return
    diasData[diaActual].push({
      grupo: GRUPO_MAP[grupo] || grupo,
      nombre: nombre.replace(/\s*\([A-Za-z]\)\s*$/, '').trim(),
      repsMin, repsMax, seriesPorSemana, rirPorSemana,
    })
  })

  const diasConEjs = Object.entries(diasData).filter(([, ejs]) => ejs.length > 0)

  // Mapear índices secuenciales del Excel → días reales de la semana
  const diasReales = spreadDias(diasConEjs.length)

  const bloques = semanaCols.map((_, semIdx) => {
    const ejerciciosPorDia = {}
    const etiquetasPorDia  = {}
    diasConEjs.forEach(([, ejs], seqIdx) => {
      const diaReal = diasReales[seqIdx] ?? seqIdx
      const ejsDia  = ejs.map(e => ({
        id: `ej_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        nombre: e.nombre,
        grupo:  e.grupo,
        series: e.seriesPorSemana[semIdx] || e.seriesPorSemana[0],
        reps: e.repsMin === e.repsMax ? String(e.repsMin) : `${e.repsMin}-${e.repsMax}`,
        repsMin: e.repsMin,
        repsMax: e.repsMax,
        rir:    e.rirPorSemana[semIdx] ?? e.rirPorSemana[0],
        peso:   '',
        historial: [],
      }))
      ejerciciosPorDia[diaReal] = ejsDia
      etiquetasPorDia[diaReal]  = etiquetaDia(ejsDia.map(e => e.grupo))
    })
    return {
      nombre: `${nombreMeso} — Semana ${semIdx + 1}`,
      tipo:   normalizarTipo(tipoMeso),
      semanas: semanasPerBloque,
      etiquetasPorDia,
      ejerciciosPorDia,
    }
  })

  return { nombrePrograma: nombreMeso, descripcion: `${normalizarTipo(tipoMeso)} · ${numSemanas} semanas · ${diasConEjs.length} días`, bloques }
}

// ─── Pre-procesa workbook para enviar texto compacto a la IA ─────────────────
export function procesarExcelParaIA(workbook) {
  const resultado = []

  for (const sheetName of workbook.SheetNames) {
    const ws = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', blankrows: false })
    const filtradas = rows.filter(r => r.some(c => c !== '' && c !== 0))

    const tieneDias = filtradas.some(r => /^Día\s*\d+/i.test(String(r[0]).trim()))
    if (!tieneDias) continue

    let semanasTotales = 0, tipoMeso = 'Acumulación'
    filtradas.forEach(r => {
      const c0 = String(r[0])
      if (/Duracion/i.test(c0))            semanasTotales = parseInt(String(r[3])) || 0
      if (/Nombre del mesociclo/i.test(c0)) tipoMeso = String(r[3]) || tipoMeso
    })

    let semanaCols = []
    filtradas.forEach(r => {
      const found = []
      r.forEach((cell, ci) => { if (/^SEMANA\s*\d+/i.test(String(cell))) found.push(ci) })
      if (found.length > semanaCols.length) semanaCols = found
    })
    if (semanaCols.length === 0) semanaCols = [6]

    const numSemanas       = semanaCols.length
    const semanasPerBloque = semanasTotales > 0 ? Math.max(1, Math.round(semanasTotales / numSemanas)) : 1

    const dias = {}
    let diaActual = null
    filtradas.forEach(r => {
      const c0 = String(r[0]).trim()
      if (/^Día\s*\d+/i.test(c0)) {
        diaActual = parseInt(c0.replace(/^Día\s*/i, '')) - 1
        dias[diaActual] = []
        return
      }
      if (diaActual === null) return
      const grupo  = String(r[1]).trim()
      const nombre = String(r[3]).trim()
      if (!nombre || nombre === '0' || nombre === 'Ejercicio' || !grupo || grupo === '0' || grupo === 'Grupo muscular') return
      const { repsMin, repsMax } = parsearReps(r[semanaCols[0] + 2])
      const seriesPorSemana = semanaCols.map(ci => parseInt(r[ci]) || 0)
      const rirPorSemana    = semanaCols.map(ci => {
        const rs = String(r[ci + 3]).replace(/RIR\s*/i, '').trim()
        return parseInt(rs.match(/(\d+)/)?.[1] ?? '2')
      })
      if (seriesPorSemana.every(s => s === 0)) return
      dias[diaActual].push({ grupo: GRUPO_MAP[grupo] || grupo, nombre: nombre.replace(/\s*\([A-Za-z]\)\s*$/, '').trim(), repsMin, repsMax, seriesPorSemana, rirPorSemana })
    })

    const diasConEjs = Object.entries(dias).filter(([, ejs]) => ejs.length > 0)
    if (diasConEjs.length === 0) continue

    const lines = [
      `=== ${sheetName} | ${tipoMeso} | ${numSemanas} bloques de ${semanasPerBloque} semana(s) ===`,
      `(Cada bloque = mismos ejercicios, series distintas. series=[S1,S2,...SN] RIR=[R1,...RN])`,
    ]
    diasConEjs.forEach(([diaIdx, ejs]) => {
      lines.push(`DÍA ${parseInt(diaIdx) + 1}:`)
      ejs.forEach(e => {
        const serStr = `[${e.seriesPorSemana.join(',')}]`
        const rirStr = e.rirPorSemana.every(r => r === e.rirPorSemana[0]) ? String(e.rirPorSemana[0]) : `[${e.rirPorSemana.join(',')}]`
        lines.push(`  ${e.grupo} - ${e.nombre}: ${serStr}x${e.repsMin}-${e.repsMax} RIR${rirStr}`)
      })
    })
    resultado.push({ nombre: sheetName, texto: lines.join('\n') })
  }

  if (resultado.length > 0) return resultado

  // Fallback: texto raw
  return workbook.SheetNames.map(name => {
    const ws = workbook.Sheets[name]
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', blankrows: false })
    const filtradas = rows.filter(r => r.some(c => c !== ''))
    return { nombre: name, texto: `=== Hoja: ${name} ===\n${filtradas.map(r => r.filter(c => c !== '').join(' | ')).join('\n')}` }
  })
}
