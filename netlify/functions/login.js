const { buildSessionCookie, createToken } = require('./_lib/auth');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'POST 요청만 가능합니다.' }),
    };
  }

  try {
    const { code } = JSON.parse(event.body || '{}');
    const accessCode = process.env.ADMIN_ACCESS_CODE;

    if (!accessCode) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'ADMIN_ACCESS_CODE가 설정되지 않았습니다.' }),
      };
    }

    if (!code || code !== accessCode) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: '관리자 코드가 올바르지 않습니다.' }),
      };
    }

    const adminName = process.env.ADMIN_ACCESS_NAME || '관리자';
    const token = createToken(adminName);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Set-Cookie': buildSessionCookie(token),
      },
      body: JSON.stringify({
        ok: true,
        adminName,
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({
        error: error.message || '로그인 처리 중 오류가 발생했습니다.',
      }),
    };
  }
};
