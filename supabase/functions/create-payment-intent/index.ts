import Stripe from 'https://esm.sh/stripe@14'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-04-10' })

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseKey)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { plan, userId, tipo, verify } = await req.json()

    if (verify) {
      const intent = await stripe.paymentIntents.retrieve(verify)
      return new Response(JSON.stringify({ status: intent.status }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const clave = tipo === 'cliente' ? 'planes_cliente' : 'planes_coach'
    const { data } = await supabase
      .from('configuracion_ia')
      .select('valor')
      .eq('clave', clave)
      .single()

    if (!data?.valor) {
      return new Response(JSON.stringify({ error: `No se encontraron planes: ${clave}` }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const planes = JSON.parse(data.valor)
    const planData = planes.find((p: any) => p.key === plan)

    if (!planData) {
      return new Response(JSON.stringify({ error: `Plan desconocido: ${plan}` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const amount = Math.round(planData.precio * 100)

    const intent = await stripe.paymentIntents.create({
      amount,
      currency: 'mxn',
      metadata: { userId, plan, tipo: tipo || 'coach' },
    })

    return new Response(JSON.stringify({ clientSecret: intent.client_secret }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
