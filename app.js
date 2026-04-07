const pageRoot = document.getElementById('pageRoot');
const loginModal = document.getElementById('loginModal');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const accessCodeInput = document.getElementById('accessCodeInput');
const sessionBox = document.getElementById('sessionBox');
const sessionName = document.getElementById('sessionName');
const logoutButton = document.getElementById('logoutButton');
const searchForm = document.getElementById('searchForm');
const insurerSelect = document.getElementById('insurerSelect');
const productTypeSelect = document.getElementById('productTypeSelect');
const searchInput = document.getElementById('searchInput');
const statusText = document.getElementById('statusText');
const resultsSection = document.getElementById('resultsSection');
const resultsSummary = document.getElementById('resultsSummary');
const resultsBody = document.getElementById('resultsBody');

const state = {
  authenticated: false,
  adminName: '',
};

init();

async function init() {
  const health = await getHealth();
  applyHealth(health);

  if (health.authenticated) {
    state.authenticated = true;
    state.adminName = health.adminName || '관리자';
    openSession();
    await loadOptions();
  } else {
    closeSession();
  }
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  loginError.textContent = '';

  const code = accessCodeInput.value.trim();
  if (!code) {
    loginError.textContent = '관리자 코드를 입력해주세요.';
    return;
  }

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || '로그인에 실패했습니다.');
    }

    state.authenticated = true;
    state.adminName = data.adminName || '관리자';
    openSession();
    accessCodeInput.value = '';
    await loadOptions();
  } catch (error) {
    loginError.textContent = error.message;
  }
});

logoutButton.addEventListener('click', async () => {
  try {
    await fetch('/api/logout', { method: 'POST' });
  } finally {
    state.authenticated = false;
    state.adminName = '';
    closeSession();
    resultsSection.classList.add('hidden');
    resultsBody.innerHTML = '';
    pageRoot.classList.remove('searched');
  }
});

searchForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!state.authenticated) {
    statusText.textContent = '먼저 관리자 코드로 접속해주세요.';
    return;
  }

  const payload = {
    query: searchInput.value.trim(),
    insurer: insurerSelect.value,
    productType: productTypeSelect.value,
  };

  if (!payload.query && payload.insurer === 'ALL' && payload.productType === 'ALL') {
    statusText.textContent = '질환명 또는 질환코드를 입력하거나 필터를 선택해주세요.';
    return;
  }

  statusText.textContent = '검색 중입니다...';

  try {
    const response = await fetch('/api/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || '검색에 실패했습니다.');
    }

    renderResults(data);
    statusText.textContent = data.message || '검색이 완료되었습니다.';
  } catch (error) {
    statusText.textContent = error.message;
  }
});

async function getHealth() {
  try {
    const response = await fetch('/api/health');
    return await response.json();
  } catch (error) {
    return {
      ok: false,
      authenticated: false,
      config: {
        supabaseConfigured: false,
        adminCodeConfigured: false,
        sessionSecretConfigured: false,
        openAiConfigured: false,
      },
    };
  }
}

function applyHealth(health) {
  if (!health.ok) {
    statusText.textContent = '서버 상태를 확인하지 못했습니다.';
    return;
  }

  const warnings = [];
  if (!health.config.adminCodeConfigured) warnings.push('ADMIN_ACCESS_CODE 미설정');
  if (!health.config.sessionSecretConfigured) warnings.push('SESSION_SECRET 미설정');
  if (!health.config.supabaseConfigured) warnings.push('SUPABASE 환경변수 미설정');

  statusText.textContent = warnings.length
    ? `초기 설정 필요: ${warnings.join(' / ')}`
    : '검색 준비가 완료되었습니다.';
}

function openSession() {
  sessionBox.classList.remove('hidden');
  loginModal.classList.add('hidden');
  sessionName.textContent = `${state.adminName} 접속중`;
}

function closeSession() {
  sessionBox.classList.add('hidden');
  loginModal.classList.remove('hidden');
}

async function loadOptions() {
  try {
    const response = await fetch('/api/options');
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || '옵션을 불러오지 못했습니다.');
    }

    fillSelect(insurerSelect, '보험사 전체', data.insurers || []);
    fillSelect(productTypeSelect, '가능상품구분', data.productTypes || []);
  } catch (error) {
    statusText.textContent = error.message;
  }
}

function fillSelect(selectElement, defaultLabel, values) {
  const currentValue = selectElement.value;
  selectElement.innerHTML = '';

  const baseOption = document.createElement('option');
  baseOption.value = 'ALL';
  baseOption.textContent = defaultLabel;
  selectElement.appendChild(baseOption);

  values.forEach((value) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    selectElement.appendChild(option);
  });

  if ([...selectElement.options].some((option) => option.value === currentValue)) {
    selectElement.value = currentValue;
  }
}

function renderResults(data) {
  pageRoot.classList.add('searched');
  resultsSection.classList.remove('hidden');
  resultsBody.innerHTML = '';

  const results = data.results || [];
  resultsSummary.textContent = `검색어: ${data.query || '-'} / 결과 ${data.count || 0}건`;

  if (!results.length) {
    resultsBody.innerHTML = `
      <tr>
        <td colspan="9">검색 결과가 없습니다.</td>
      </tr>
    `;
    return;
  }

  results.forEach((item) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${escapeHtml(item.insurer_name)}</td>
      <td>${escapeHtml(item.original_exception_text || item.disease_name)}</td>
      <td>${escapeHtml(item.disease_code || '-')}</td>
      <td>${escapeHtml(item.min_elapsed_text || '-')}</td>
      <td>${escapeHtml(item.treatment_period_text || '-')}</td>
      <td>${escapeHtml(item.hospitalization_text || '-')}</td>
      <td>${escapeHtml(item.surgery_text || '-')}</td>
      <td>${escapeHtml(item.product_type || '-')}</td>
      <td>${escapeHtml(item.remarks || '-')}</td>
    `;
    resultsBody.appendChild(row);
  });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
