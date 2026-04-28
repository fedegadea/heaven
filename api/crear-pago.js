// api/crear-pago.js — Mercado Pago · HAVEN
const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN || '';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { titulo, precio, email, metadata } = req.body;

  if (!titulo || !precio || !email) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }

  if (!MP_ACCESS_TOKEN) {
    return res.status(500).json({ error: 'MP_ACCESS_TOKEN no configurado' });
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || `https://${req.headers.host}`;

    const body = {
      items: [{
        title: titulo,
        quantity: 1,
        unit_price: Number(precio),
        currency_id: 'ARS',
      }],
      payer: { email },
      back_urls: {
        success: `${baseUrl}/?status=approved&external_reference=${metadata?.order_number || ''}`,
        failure: `${baseUrl}/?status=failure`,
        pending: `${baseUrl}/?status=pending`,
      },
      auto_return: 'approved',
      external_reference: metadata?.order_number || '',
      statement_descriptor: 'HAVEN CLUB',
      metadata: metadata || {},
    };

    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(body),
    });

    const data = await mpRes.json();

    if (!mpRes.ok) {
      console.error('MP error:', data);
      return res.status(500).json({ error: data.message || 'Error en Mercado Pago' });
    }

    return res.status(200).json({ init_point: data.init_point, id: data.id });

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
