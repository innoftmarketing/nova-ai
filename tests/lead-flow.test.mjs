import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { NextRequest, NextResponse } from 'next/server.js';

const transpile = (source) => ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

// Execute the real form callback with only browser/network boundaries replaced.
const page = ts.createSourceFile('page.tsx', fs.readFileSync('src/app/page.tsx', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let submitSource;
function visit(node) {
  if (ts.isJsxAttribute(node) && node.name.getText(page) === 'onSubmit') {
    submitSource = node.initializer.expression.getText(page);
  }
  ts.forEachChild(node, visit);
}
visit(page);
async function submit({ segment = 'casa', age = '3_10ans', revenue = '500k_2m', language = 'fr', status = 200, success = true, networkError = false, pixelError = false } = {}) {
  const events = [], redirects = [], errors = [], pending = [], requests = [];
  const callback = vm.runInNewContext(transpile(`const submit = ${submitSource}; submit;`), {
    submitting: false, setSubmitting: value => pending.push(value), setSubmitError: value => errors.push(value),
    FormData: class { constructor(values) { this.values = values; } get(key) { return this.values[key] || ''; } },
    getStoredUtms: () => ({}), getStoredLanguage: () => language,
    crypto: { randomUUID: () => 'test-event-id' },
    window: { location: { href: 'https://example.test/' }, fbq: (...args) => { if (pixelError) throw Error('pixel failed'); events.push(args); } },
    citySegment: segment, otherCity: 'Rabat', selectedDateLabel: '25 Septembre 2026', selectedTime: '10:30',
    fetch: async (url, options) => { requests.push(JSON.parse(options.body)); if (networkError) throw Error('offline'); return Response.json({ success }, { status }); },
    URLSearchParams, router: { push: url => redirects.push(url) }, console: { error() {} },
  });
  await callback({ preventDefault() {}, currentTarget: { fullName: 'Test Person', phone: '0600000000', company_age: age, company_ca: revenue } });
  return { events, redirects, errors, pending, requests };
}

for (const [label, input] of [
  ['qualified', {}], ['outside Casablanca', { segment: 'autre' }],
  ['young company', { age: 'moins_1an' }], ['lower revenue', { revenue: 'lt500k' }],
  ['Arabic campaign', { language: 'ar' }], ['tracking warning', { status: 207 }],
]) {
  test(`${label}: saved enquiry emits Lead and reaches the shared thank-you page`, async () => {
    const result = await submit(input);
    assert.equal(result.events.length, 1);
    assert.equal(result.events[0][1], 'Lead');
    assert.equal(result.events[0][3].eventID, result.requests[0].eventId);
    const url = new URL(result.redirects[0], 'https://example.test');
    assert.equal(url.pathname, '/merci');
    assert.equal(url.searchParams.get('time'), '10:30');
  });
}
for (const input of [{ status: 500 }, { status: 400 }, { success: false }, { networkError: true }]) {
  test(`failed submission ${JSON.stringify(input)} stays on form without conversion`, async () => {
    const result = await submit(input);
    assert.equal(result.events.length, 0);
    assert.equal(result.redirects.length, 0);
    assert.ok(result.errors.at(-1));
    assert.equal(result.pending.at(-1), false);
  });
}
test('pixel failure does not prevent confirmation of a saved enquiry', async () => {
  const result = await submit({ pixelError: true });
  assert.equal(new URL(result.redirects[0], 'https://example.test').pathname, '/merci');
});

async function postLead({ fields = {}, crmStatus = 200, configured = true, capiOk = true } = {}) {
  const events = [], requests = [];
  const loaded = { exports: {} };
  vm.runInNewContext(transpile(fs.readFileSync('src/app/api/leads/route.ts', 'utf8')), {
    exports: loaded.exports, module: loaded, URLSearchParams,
    process: { env: configured ? { PERFEX_CRM_URL: 'https://crm.example.test', PERFEX_CRM_API_TOKEN: 'test-only' } : {} },
    console: { error() {} },
    require: name => {
      if (name === 'next/server') return { NextResponse };
      if (name === '@/lib/google-auth') return { getCalendarClient: () => null };
      if (name === '@/lib/meta-capi') return { sendCAPIEvent: async event => { events.push(event); return { ok: capiOk }; } };
      throw Error(`Unexpected dependency: ${name}`);
    },
    fetch: async (url, options) => { requests.push({ url, body: new URLSearchParams(options.body) }); return Response.json({ status: crmStatus === 200 }, { status: crmStatus }); },
  });
  const response = await loaded.exports.POST(new NextRequest('https://example.test/api/leads', {
    method: 'POST', body: JSON.stringify({ fullName: 'Test Person', phone: '0600000000', city: 'Casablanca', citySegment: 'casa', companyAge: '3_10ans', companyCA: '500k_2m', eventId: 'test-event-id', ...fields }),
  }));
  return { response, body: await response.json(), events, requests };
}
for (const fields of [{}, { city: 'Rabat', citySegment: 'other' }, { companyAge: 'moins_1an' }, { companyCA: 'lt500k' }]) {
  test(`server counts saved enquiry ${JSON.stringify(fields)}`, async () => {
    const result = await postLead({ fields });
    assert.equal(result.body.success, true);
    assert.equal(result.events.length, 1);
    assert.equal(result.events[0].eventName, 'Lead');
    assert.equal(result.events[0].eventId, 'test-event-id');
    if (Object.keys(fields).length) assert.match(result.requests[0].body.get('description'), /NON QUALIFIÉ/);
  });
}
for (const input of [{ crmStatus: 500 }, { configured: false }, { fields: { phone: '' } }]) {
  test(`unsaved enquiry ${JSON.stringify(input)} cannot report success or convert`, async () => {
    const result = await postLead(input);
    assert.equal(result.response.ok, false);
    assert.notEqual(result.body.success, true);
    assert.equal(result.events.length, 0);
  });
}
test('tracking failure still confirms CRM-saved enquiry', async () => {
  const result = await postLead({ capiOk: false });
  assert.equal(result.response.status, 207);
  assert.equal(result.body.success, true);
});
