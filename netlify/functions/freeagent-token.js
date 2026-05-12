// Netlify Function: freeagent-token
// ----------------------------------
// Acts as a secure server-side proxy for the FreeAgent OAuth token endpoint.
// The client-side app POSTs here with the auth code (or refresh token), and
// this function adds the OAuth secret (held in a Netlify environment variable)
// before forwarding to FreeAgent.
//
// Why this exists: FreeAgent OAuth requires a client_secret, which cannot
// safely live in browser code. This function keeps the secret server-side.
//
// Required environment variables (set in Netlify Site configuration):
//   FREEAGENT_CLIENT_SECRET           — secret for the production app
//   FREEAGENT_SANDBOX_CLIENT_SECRET   — secret for the sandbox app (optional)

exports.handler = async (event) => {
  // CORS preflight — Netlify Functions are same-origin in normal use,
  // but include headers in case the function is called cross-origin in dev.
  const corsHeaders = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: 'Method not allowed' };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (e) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'invalid_json' }),
    };
  }

  const { grant_type, code, refresh_token, client_id, redirect_uri, env } = payload;

  if (!client_id || !grant_type) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'missing_required_fields' }),
    };
  }

  // Pick the right secret + endpoint based on env
  const isSandbox  = env === 'sandbox';
  const clientSecret = isSandbox
    ? process.env.FREEAGENT_SANDBOX_CLIENT_SECRET
    : process.env.FREEAGENT_CLIENT_SECRET;

  if (!clientSecret) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'server_misconfigured',
        error_description: `Missing ${isSandbox ? 'FREEAGENT_SANDBOX_CLIENT_SECRET' : 'FREEAGENT_CLIENT_SECRET'} env var in Netlify`,
      }),
    };
  }

  const tokenUrl = isSandbox
    ? 'https://api.sandbox.freeagent.com/v2/token_endpoint'
    : 'https://api.freeagent.com/v2/token_endpoint';

  // Build the body for FreeAgent
  const body = new URLSearchParams();
  body.set('grant_type',    grant_type);
  body.set('client_id',     client_id);
  body.set('client_secret', clientSecret);
  if (grant_type === 'authorization_code') {
    body.set('code',         code || '');
    body.set('redirect_uri', redirect_uri || '');
  } else if (grant_type === 'refresh_token') {
    body.set('refresh_token', refresh_token || '');
  }

  try {
    const res = await fetch(tokenUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    body.toString(),
    });
    const text = await res.text();
    return {
      statusCode: res.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: text,
    };
  } catch (err) {
    return {
      statusCode: 502,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'upstream_error',
        error_description: String(err),
      }),
    };
  }
};
