// api/enviar-mail.js — Emails de confirmación HEAVEN via Resend

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { order_number, type, customer_name, customer_email, customer_phone,
          customer_dni, amount, details, notes } = req.body;

  if (!customer_email || !order_number) {
    return res.status(400).json({ error: 'Faltan datos' });
  }

  const RESEND_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_KEY) return res.status(500).json({ error: 'RESEND_API_KEY no configurada' });

  const FROM = process.env.RESEND_FROM || 'HEAVEN <onboarding@resend.dev>';

  const html = buildEmail({ order_number, type, customer_name, customer_email,
                             customer_phone, customer_dni, amount, details, notes });

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM,
        to: [customer_email],
        subject: `HEAVEN · Confirmación ${order_number}`,
        html,
      }),
    });
    const data = await r.json();
    if (!r.ok) return res.status(500).json({ error: data.message });
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

// ── TIPOS ─────────────────────────────────────────────────────────────────────
function typeName(t) {
  return { entrada: 'Entrada al club', membresia: 'Membresía Heaven', evento: 'Evento especial', box: 'Box privado' }[t] || t;
}

// ── DETALLES SEGÚN TIPO ───────────────────────────────────────────────────────
function buildDetails(type, details, notes) {
  const rows = [];
  if (details?.day_label)  rows.push(['Día / Franja', details.day_label]);
  if (details?.name)       rows.push(['Producto', details.name]);
  if (details?.duration)   rows.push(['Duración', details.duration]);
  if (details?.box_date)   rows.push(['Fecha de reserva', details.box_date]);
  if (details?.box_time)   rows.push(['Horario', details.box_time]);
  if (details?.ticket_type && details.ticket_type !== 'general') rows.push(['Tipo', 'Miembro']);
  if (details?.event_date) rows.push(['Fecha del evento', details.event_date]);
  if (notes)               rows.push(['Observaciones', notes]);

  if (!rows.length) return '';
  return rows.map(([k, v]) => `
    <tr>
      <td style="padding:8px 0;font-size:13px;color:#888;width:40%;border-bottom:1px solid #f0f0f0">${k}</td>
      <td style="padding:8px 0;font-size:13px;color:#222;font-weight:600;border-bottom:1px solid #f0f0f0">${v}</td>
    </tr>`).join('');
}

// ── INSTRUCCIONES SEGÚN TIPO ──────────────────────────────────────────────────
function buildInstructions(type) {
  const map = {
    entrada:   '✔ Presentá este número de orden en la entrada del club para ingresar. No es necesario imprimirlo — alcanza con mostrar el mail desde tu celular.',
    membresia: '✔ Tu membresía se activa dentro de las 24 horas hábiles de confirmado el pago. Te contactaremos para coordinar el acceso.',
    evento:    '✔ Presentá este número de orden en la entrada del evento. Llegá con tiempo — el acceso se organiza por franja horaria.',
    box:       '✔ Tu reserva de box está confirmada. Presentate en recepción con este número de orden en la fecha y horario indicados.',
  };
  return map[type] || '✔ Guardá este número de orden y presentalo en recepción.';
}

// ── TEMPLATE HTML ─────────────────────────────────────────────────────────────
function buildEmail({ order_number, type, customer_name, customer_email,
                      customer_phone, customer_dni, amount, details, notes }) {
  const typeLabel    = typeName(type);
  const detailRows   = buildDetails(type, details, notes);
  const instructions = buildInstructions(type);
  const amountFmt    = amount ? '$' + Number(amount).toLocaleString('es-AR') : '';

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">

        <!-- HEADER -->
        <tr><td style="background:#0a0a0a;border-radius:16px 16px 0 0;padding:36px 40px;text-align:center">
          <div style="font-family:Georgia,serif;font-size:32px;font-weight:900;color:#c0392b;letter-spacing:8px">HEAVEN</div>
          <div style="font-size:10px;letter-spacing:4px;text-transform:uppercase;color:#555;margin-top:6px">Club · Buenos Aires</div>
        </td></tr>

        <!-- CONFIRMACIÓN -->
        <tr><td style="background:#fff;padding:36px 40px 0">
          <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#c0392b;margin-bottom:8px">${typeLabel}</div>
          <div style="font-size:24px;font-weight:700;color:#111;margin-bottom:4px">¡Compra confirmada, ${customer_name?.split(' ')[0]}!</div>
          <div style="font-size:14px;color:#888;margin-bottom:28px">Guardá este mail — es tu comprobante de acceso.</div>

          <!-- NÚMERO DE ORDEN -->
          <div style="background:#fafafa;border:1px solid #eee;border-left:4px solid #c0392b;border-radius:8px;padding:20px 24px;margin-bottom:28px;text-align:center">
            <div style="font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#888;margin-bottom:8px">Número de orden</div>
            <div style="font-family:Georgia,serif;font-size:28px;font-weight:900;color:#c0392b;letter-spacing:4px">${order_number}</div>
          </div>

          <!-- DETALLE -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px">
            <tr>
              <td style="padding:8px 0;font-size:13px;color:#888;width:40%;border-bottom:1px solid #f0f0f0">Producto</td>
              <td style="padding:8px 0;font-size:13px;color:#222;font-weight:600;border-bottom:1px solid #f0f0f0">${typeLabel}</td>
            </tr>
            ${detailRows}
            <tr>
              <td style="padding:8px 0;font-size:13px;color:#888;border-bottom:1px solid #f0f0f0">Cliente</td>
              <td style="padding:8px 0;font-size:13px;color:#222;font-weight:600;border-bottom:1px solid #f0f0f0">${customer_name || '—'}</td>
            </tr>
            ${customer_dni ? `<tr><td style="padding:8px 0;font-size:13px;color:#888;border-bottom:1px solid #f0f0f0">DNI</td><td style="padding:8px 0;font-size:13px;color:#222;font-weight:600;border-bottom:1px solid #f0f0f0">${customer_dni}</td></tr>` : ''}
            ${customer_phone ? `<tr><td style="padding:8px 0;font-size:13px;color:#888;border-bottom:1px solid #f0f0f0">Teléfono</td><td style="padding:8px 0;font-size:13px;color:#222;font-weight:600;border-bottom:1px solid #f0f0f0">${customer_phone}</td></tr>` : ''}
            ${amountFmt ? `<tr><td style="padding:12px 0;font-size:14px;color:#111;font-weight:700">Total pagado</td><td style="padding:12px 0;font-size:18px;color:#c0392b;font-weight:900">${amountFmt}</td></tr>` : ''}
          </table>
        </td></tr>

        <!-- INSTRUCCIONES -->
        <tr><td style="background:#fff;padding:0 40px 32px">
          <div style="background:#f9f0f0;border-radius:10px;padding:18px 20px;font-size:13px;color:#444;line-height:1.7">
            ${instructions}
          </div>
        </td></tr>

        <!-- FOOTER -->
        <tr><td style="background:#0a0a0a;border-radius:0 0 16px 16px;padding:28px 40px;text-align:center">
          <div style="font-family:Georgia,serif;font-size:16px;color:#c0392b;letter-spacing:4px;margin-bottom:8px">HEAVEN</div>
          <div style="font-size:11px;color:#444;line-height:1.7">
            Si tenés alguna pregunta, respondé este mail o contactanos por WhatsApp.<br/>
            Este es un mail automático de confirmación — no te vamos a enviar spam.
          </div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
