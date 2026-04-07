const { clearSessionCookie } = require('./_lib/auth');

exports.handler = async () => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Set-Cookie': clearSessionCookie(),
    },
    body: JSON.stringify({
      ok: true,
    }),
  };
};
