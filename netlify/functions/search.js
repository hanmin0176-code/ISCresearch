const { getSessionFromEvent } = require('./_lib/auth');
const { getSupabaseAdmin } = require('./_lib/supabase');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'POST 요청만 가능합니다.' }),
    };
  }

  const session = getSessionFromEvent(event);
  if (!session) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: '인증이 필요합니다.' }),
    };
  }

  try {
    const { query = '', insurer = 'ALL', productType = 'ALL' } = JSON.parse(event.body || '{}');

    if (!query && insurer === 'ALL' && productType === 'ALL') {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: '검색어 또는 필터를 입력해주세요.' }),
      };
    }

    const supabase = getSupabaseAdmin();
    let builder = supabase
      .from('disease_rules')
      .select(
        'id, insurer_name, product_type, disease_code, disease_name, original_exception_text, min_elapsed_text, treatment_period_text, hospitalization_text, surgery_text, remarks, source_version, applied_at',
        { count: 'exact' }
      )
      .eq('is_active', true)
      .order('insurer_name', { ascending: true })
      .limit(100);

    if (insurer !== 'ALL') {
      builder = builder.eq('insurer_name', insurer);
    }

    if (productType !== 'ALL') {
      builder = builder.eq('product_type', productType);
    }

    const cleanedQuery = String(query).trim().replaceAll(',', ' ');
    if (cleanedQuery) {
      const like = `%${cleanedQuery}%`;
      builder = builder.or(
        `disease_code.ilike.${like},disease_name.ilike.${like},search_keywords.ilike.${like},original_exception_text.ilike.${like},remarks.ilike.${like}`
      );
    }

    const { data, error, count } = await builder;

    if (error) {
      throw error;
    }

    const resultCount = count || (data || []).length;
    await supabase.from('search_logs').insert({
      admin_name: session.adminName || '관리자',
      query: cleanedQuery || null,
      insurer_filter: insurer === 'ALL' ? null : insurer,
      product_type_filter: productType === 'ALL' ? null : productType,
      result_count: resultCount,
      ip_address: getIpAddress(event),
      user_agent: event.headers['user-agent'] || null,
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({
        ok: true,
        query: cleanedQuery,
        count: resultCount,
        results: data || [],
        message: '검색이 완료되었습니다.',
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({
        error: error.message || '검색 처리 중 오류가 발생했습니다.',
      }),
    };
  }
};

function getIpAddress(event) {
  const headerValue =
    event.headers['x-nf-client-connection-ip'] ||
    event.headers['x-forwarded-for'] ||
    event.headers['client-ip'] ||
    '';

  return String(headerValue).split(',')[0].trim() || null;
}
