const { getSessionFromEvent } = require('./_lib/auth');

exports.handler = async (event) => {
  const session = getSessionFromEvent(event);

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({
      ok: true,
      authenticated: Boolean(session),
      adminName: session?.adminName || null,
      config: {
        supabaseConfigured: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
        adminCodeConfigured: Boolean(process.env.ADMIN_ACCESS_CODE),
        sessionSecretConfigured: Boolean(process.env.SESSION_SECRET),
        openAiConfigured: Boolean(process.env.OPENAI_API_KEY),
      },
    }),
  };
};
