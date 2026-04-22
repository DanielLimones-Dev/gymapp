// PerfilPublicoModal — perfil de coach o cliente
// Uso: <PerfilPublicoModal userId="..." nombre="..." avatarUrl="..." />
// Renderizar dentro de SwipeableModal o similar

import { useState, useEffect } from 'react'
import { View, Text, Image, ScrollView, ActivityIndicator, StyleSheet } from 'react-native'
import { AntDesign } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'

export default function PerfilPublicoModal({ userId, nombre: nombreFallback, avatarUrl: avatarFallback }) {
  const [datos, setDatos]   = useState(null)
  const [certs, setCerts]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) { setLoading(false); return }
    async function cargar() {
      setLoading(true)
      const [{ data: perfil }, { data: imagenes }] = await Promise.all([
        supabase
          .from('perfiles')
          .select('nombre_completo, avatar_url, rol, team_name, team_logo_url, especialidad, bio, experiencia_anos, certificaciones, objetivo, nivel_experiencia')
          .eq('id', userId)
          .single(),
        supabase
          .from('coach_certificaciones')
          .select('id, nombre, url')
          .eq('coach_id', userId),
      ])
      setDatos(perfil)
      setCerts(imagenes || [])
      setLoading(false)
    }
    cargar()
  }, [userId])

  if (loading) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#050510' }}>
      <ActivityIndicator color="#4488ff" />
    </View>
  )

  const nombre   = datos?.nombre_completo || nombreFallback || '—'
  const avatar   = datos?.avatar_url || avatarFallback
  const rol      = datos?.rol
  const esCoach  = rol === 'coach'
  const inicial  = nombre[0]?.toUpperCase()

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#050510' }}
      contentContainerStyle={{ padding: 24, paddingBottom: 60 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Avatar + nombre + badge rol */}
      <View style={{ alignItems: 'center', marginBottom: 24 }}>
        {avatar ? (
          <Image source={{ uri: avatar }} style={s.avatarImg} />
        ) : (
          <View style={s.avatarPlaceholder}>
            <Text style={s.avatarInicial}>{inicial}</Text>
          </View>
        )}
        <Text style={s.nombre}>{nombre}</Text>
        <View style={[s.rolBadge, esCoach && s.rolBadgeCoach]}>
          <AntDesign name={esCoach ? 'team' : 'user'} size={11} color={esCoach ? '#9933ff' : '#4488ff'} />
          <Text style={[s.rolBadgeText, esCoach && { color: '#9933ff' }]}>
            {esCoach ? 'COACH' : 'ATLETA'}
          </Text>
        </View>
      </View>

      {/* ── COACH: perfil completo ── */}
      {esCoach && (
        <>
          {/* Team logo + nombre */}
          {(datos?.team_logo_url || datos?.team_name) && (
            <View style={s.teamRow}>
              {datos?.team_logo_url && (
                <Image source={{ uri: datos.team_logo_url }} style={s.teamLogo} />
              )}
              {datos?.team_name && (
                <Text style={s.teamNombre}>{datos.team_name}</Text>
              )}
            </View>
          )}

          {/* Especialidades */}
          {datos?.especialidad && (
            <>
              <Text style={s.label}>ESPECIALIDADES</Text>
              <View style={s.chipsRow}>
                {datos.especialidad.split(',').map(e => e.trim()).filter(Boolean).map(e => (
                  <View key={e} style={s.chip}>
                    <Text style={s.chipText}>{e}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Bio */}
          {datos?.bio && (
            <>
              <Text style={s.label}>SOBRE EL EQUIPO</Text>
              <View style={s.card}><Text style={s.cardText}>{datos.bio}</Text></View>
            </>
          )}

          {/* Experiencia */}
          {datos?.experiencia_anos && (
            <>
              <Text style={s.label}>EXPERIENCIA</Text>
              <View style={[s.card, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
                <AntDesign name="star" size={18} color="#ff9900" />
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>{datos.experiencia_anos} años de experiencia</Text>
              </View>
            </>
          )}

          {/* Certificaciones texto */}
          {datos?.certificaciones && (
            <>
              <Text style={s.label}>FORMACIÓN Y CERTIFICACIONES</Text>
              <View style={s.card}><Text style={s.cardText}>{datos.certificaciones}</Text></View>
            </>
          )}

          {/* Certificaciones imágenes */}
          {certs.length > 0 && (
            <>
              <Text style={s.label}>CERTIFICADOS</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {certs.map(c => (
                    <View key={c.id}>
                      <Image source={{ uri: c.url }} style={s.certImg} />
                      <Text style={s.certNombre} numberOfLines={1}>{c.nombre}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </>
          )}

          {!datos?.bio && !datos?.especialidad && !datos?.experiencia_anos && !datos?.certificaciones && certs.length === 0 && (
            <EmptyState texto="Este coach aún no ha completado su perfil público" />
          )}
        </>
      )}

      {/* ── CLIENTE: perfil básico ── */}
      {!esCoach && (
        <>
          {datos?.objetivo && (
            <>
              <Text style={s.label}>OBJETIVO</Text>
              <View style={[s.card, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
                <AntDesign name="aim" size={16} color="#4488ff" />
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14, textTransform: 'capitalize' }}>{datos.objetivo}</Text>
              </View>
            </>
          )}
          {datos?.nivel_experiencia && (
            <>
              <Text style={s.label}>NIVEL</Text>
              <View style={[s.card, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
                <AntDesign name="star" size={16} color="#ff9900" />
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>{datos.nivel_experiencia}</Text>
              </View>
            </>
          )}
          {!datos?.objetivo && !datos?.nivel_experiencia && (
            <EmptyState texto="Este atleta no ha completado su perfil público" />
          )}
        </>
      )}
    </ScrollView>
  )
}

function EmptyState({ texto }) {
  return (
    <View style={{ alignItems: 'center', paddingTop: 20 }}>
      <AntDesign name="profile" size={32} color="#1a2a4a" style={{ marginBottom: 10 }} />
      <Text style={{ color: '#2a4488', fontSize: 14, textAlign: 'center' }}>{texto}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  avatarImg:         { width: 90, height: 90, borderRadius: 28, marginBottom: 14 },
  avatarPlaceholder: { width: 90, height: 90, borderRadius: 28, backgroundColor: 'rgba(68,136,255,0.1)', borderWidth: 1.5, borderColor: 'rgba(68,136,255,0.3)', justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  avatarInicial:     { color: '#4488ff', fontSize: 34, fontWeight: '900' },
  nombre:            { color: '#fff', fontSize: 22, fontWeight: '900', marginBottom: 8 },
  rolBadge:          { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#4488ff15', borderWidth: 1, borderColor: '#4488ff33', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5 },
  rolBadgeCoach:     { backgroundColor: '#9933ff15', borderColor: '#9933ff33' },
  rolBadgeText:      { color: '#4488ff', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  teamRow:           { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20, backgroundColor: '#07071a', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#0f1a3a' },
  teamLogo:          { width: 48, height: 48, borderRadius: 12 },
  teamNombre:        { color: '#fff', fontSize: 17, fontWeight: '900', flex: 1 },
  label:             { color: '#2a4488', fontSize: 9, fontWeight: '900', letterSpacing: 2, marginBottom: 10 },
  chipsRow:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  chip:              { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: '#9933ff33', backgroundColor: '#9933ff10' },
  chipText:          { color: '#9933ff', fontSize: 12, fontWeight: '700' },
  card:              { backgroundColor: '#07071a', borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 14, padding: 16, marginBottom: 20 },
  cardText:          { color: '#aabbdd', fontSize: 14, lineHeight: 22 },
  certImg:           { width: 120, height: 120, borderRadius: 14 },
  certNombre:        { color: '#2a4488', fontSize: 10, marginTop: 4, maxWidth: 120 },
})
