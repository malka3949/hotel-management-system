#!/usr/bin/env node
// Updates all n8n workflows: Webhook → HTTP Request node (Resend API)

const N8N_KEY = process.env.N8N_API_KEY;
const RESEND_KEY = process.env.RESEND_API_KEY;
const BASE = process.env.N8N_BASE_URL || 'http://localhost:5678';

if (!N8N_KEY || !RESEND_KEY) {
  console.error('Missing N8N_API_KEY or RESEND_API_KEY');
  process.exit(1);
}

function webhookNode(id, path) {
  return {
    parameters: { httpMethod: 'POST', path, options: {} },
    id, name: 'Webhook',
    type: 'n8n-nodes-base.webhook',
    typeVersion: 1,
    position: [250, 300],
  };
}

// HTTP Request node v4 — sends JSON via specifyBody:'json' + jsonBody expression
function httpRequestNode(id, subjectExpr, textExpr) {
  const jsonBody = `={{ JSON.stringify({ from: "onboarding@resend.dev", to: "malka.develop3949@gmail.com", subject: ${subjectExpr}, text: ${textExpr} }) }}`;
  return {
    parameters: {
      method: 'POST',
      url: 'https://api.resend.com/emails',
      sendHeaders: true,
      headerParameters: {
        parameters: [
          { name: 'Authorization', value: `Bearer ${RESEND_KEY}` },
          { name: 'Content-Type', value: 'application/json' },
        ],
      },
      sendBody: true,
      contentType: 'json',
      specifyBody: 'json',
      jsonBody,
      options: {},
    },
    id, name: 'Send Email',
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4,
    position: [500, 300],
  };
}

const conn = { Webhook: { main: [[{ node: 'Send Email', type: 'main', index: 0 }]] } };
const settings = { executionOrder: 'v1' };

// Expression helpers — reference webhook body fields
const f = (field) => `$json["body"]["${field}"]`;

const workflows = [
  {
    id: 'vOZ77rpHCNDjHYrT', name: 'אישור הזמנה - הוטל',
    nodes: [
      webhookNode('wh-rc', 'reservation-confirmation'),
      httpRequestNode('email-rc',
        `"אישור הזמנה #" + ${f('reservationId')}`,
        `"שלום " + ${f('guestName')} + ",\\n\\nהזמנתך אושרה!\\nחדר: " + ${f('roomNumber')} + "\\nכניסה: " + ${f('checkIn')} + "\\nיציאה: " + ${f('checkOut')} + "\\n\\nתודה!"`,
      ),
    ],
    connections: conn, settings,
  },
  {
    id: 'QNz3j1O2wnsVcuhZ', name: 'ביטול הזמנה',
    nodes: [
      webhookNode('wh-cancel', 'reservation-cancelled'),
      httpRequestNode('email-cancel',
        `"ביטול הזמנה #" + ${f('reservationId')}`,
        `"שלום " + ${f('guestName')} + ",\\n\\nהזמנתך בוטלה.\\n\\nנשמח לשרתך בפעם הבאה."`,
      ),
    ],
    connections: conn, settings,
  },
  {
    id: 'QZFECJcVzT1kQGOE', name: "צ'ק-אין אורח",
    nodes: [
      webhookNode('wh-ci', 'checkin-completed'),
      httpRequestNode('email-ci',
        `"ברוכים הבאים - צ'ק-אין אושר"`,
        `"שלום " + ${f('guestName')} + ",\\n\\nצ'ק-אין לחדר " + ${f('roomNumber')} + " אושר.\\nיציאה: " + ${f('checkOutDate')} + "\\n\\nשהייה נעימה!"`,
      ),
    ],
    connections: conn, settings,
  },
  {
    id: 'bV0rCIhujBNmM6t5', name: "צ'ק-אאוט אורח",
    nodes: [
      webhookNode('wh-co', 'checkout-completed'),
      httpRequestNode('email-co',
        `"צ'ק-אאוט - תודה על שהייתך!"`,
        `"שלום " + ${f('guestName')} + ",\\n\\nצ'ק-אאוט בוצע בהצלחה.\\n\\nנשמח לראותך שוב!"`,
      ),
    ],
    connections: conn, settings,
  },
  {
    id: 'utSBBa1kFSHttSQd', name: 'תשלום הצליח - אישור לאורח',
    nodes: [
      webhookNode('wh-ps', 'payment-succeeded'),
      httpRequestNode('email-ps',
        `"קבלת תשלום ₪" + ${f('amount')}`,
        `"שלום " + ${f('guestName')} + ",\\n\\nתשלום של ₪" + ${f('amount')} + " התקבל בהצלחה.\\nאמצעי תשלום: " + ${f('paymentMethod')} + "\\n\\nתודה!"`,
      ),
    ],
    connections: conn, settings,
  },
  {
    id: 'oA4GogDF8shlreQh', name: 'תשלום נכשל - התראה לדלפק',
    nodes: [
      webhookNode('wh-pf', 'payment-failed'),
      httpRequestNode('email-pf',
        `"תשלום נכשל - " + ${f('guestName')}`,
        `"תשלום נכשל!\\n\\nאורח: " + ${f('guestName')} + "\\nסכום: ₪" + ${f('amount')} + "\\nשגיאה: " + ${f('errorCode')}`,
      ),
    ],
    connections: conn, settings,
  },
  {
    id: 'TwIpgiQtNZLuLAcJ', name: 'החזר כספי - אישור לאורח',
    nodes: [
      webhookNode('wh-rp', 'refund-processed'),
      httpRequestNode('email-rp',
        `"אישור החזר כספי ₪" + ${f('amount')}`,
        `"שלום " + ${f('guestName')} + ",\\n\\nהחזר של ₪" + ${f('amount')} + " אושר.\\nסיבה: " + ${f('reason')} + "\\n\\nהכסף יגיע תוך 3-5 ימי עסקים."`,
      ),
    ],
    connections: conn, settings,
  },
];

async function updateAndReactivate(wf) {
  const headers = { 'X-N8N-API-KEY': N8N_KEY, 'Content-Type': 'application/json' };
  await fetch(`${BASE}/api/v1/workflows/${wf.id}/deactivate`, { method: 'POST', headers });
  const res = await fetch(`${BASE}/api/v1/workflows/${wf.id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: wf.settings }),
  });
  const d = await res.json();
  if (!d.id) { console.log('PUT_ERR', wf.name, JSON.stringify(d).slice(0, 300)); return; }
  await fetch(`${BASE}/api/v1/workflows/${wf.id}/activate`, { method: 'POST', headers });
  console.log('UPDATED', wf.id, wf.name);
}

Promise.all(workflows.map(updateAndReactivate)).catch(e => console.error('ERR', e.message));
