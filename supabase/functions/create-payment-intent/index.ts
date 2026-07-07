import Stripe from 'https://esm.sh/stripe@14'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-04-10' })

const PRECIOS_COACH: Record<string, number> = {
  starter: 999,   // $9.99
  pro:     1999,  // $19.99
  elite:   3999,  // $39.99
}

const PRECIOS_CLIENTE: Record<string, number> = {
  mensual:    999,   // $9.99
  trimestral: 2499,  // $24.99
  anual:      7999,  // $79.99
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { plan, userId, tipo, verify } = await req.json()

    // Verificar PaymentIntent existente
    if (verify) {
      const intent = await stripe.paymentIntents.retrieve(verify)
      return new Response(JSON.stringify({ status: intent.status }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const esCliente = tipo === 'cliente'
    const precios   = esCliente ? PRECIOS_CLIENTE : PRECIOS_COACH
    const amount    = precios[plan]

    if (!amount) {
      return new Response(JSON.stringify({ error: `Plan desconocido: ${plan}` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const intent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      metadata: { userId, plan, tipo: esCliente ? 'cliente' : 'coach' },
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
