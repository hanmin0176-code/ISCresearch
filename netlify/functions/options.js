const { getSessionFromEvent } = require('./_lib/auth');
const { getSupabaseAdmin } = require('./_lib/supabase');

exports.handler = async (event) => {
  const session = getSessionFromEvent(event);
  if (!session) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: '인증이 필요합니다.' }),
    };
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('disease_rules')
      .select('insurer_name, product_type')
      .eq('is_active', true)
      .limit(5000);

    if (error) {
      throw error;
    }

    const insurers = [...new Set((data || []).map((item) => item.insurer_name).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, 'ko')
    );

    const productTypes = [...new Set((data || []).map((item) => item.product_type).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, 'ko')
    );

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({
        insurers,
        productTypes,
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({
        error: error.message || '옵션 조회 중 오류가 발생했습니다.',
      }),
    };
  }
};
