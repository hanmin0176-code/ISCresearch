# 유병자 인수예외질환 검색 DB 표준화 가이드

## 1. 목적
보험사별로 제각각인 엑셀 원본을 그대로 최종 검색 DB에 넣지 않고,

1) 원본 보관
2) AI 1차 변환
3) 관리자 검수
4) 최종 검색 DB 반영

구조로 운영한다.

---

## 2. 표준 컬럼표

### 2-1. 최종 검색 DB 기준 필수 컬럼

| 컬럼명 | 설명 | 입력 기준 | 필수여부 | 예시 |
|---|---|---|---|---|
| insurer_name | 보험사명 | 회사명 표준명으로 통일 | 필수 | 흥국생명 |
| product_group | 상품군 | 간편보험/건강보험/유병자보험 등 상위 분류 | 필수 | 간편보험 |
| product_type | 가능상품구분 | 보험사 원본의 실제 구분값 유지 | 필수 | 335 |
| disease_code | 질환코드 | 원본에 있으면 그대로, 없으면 null | 선택 | A630 |
| disease_name_standard | 표준 질환명 | 검색 기준이 되는 대표 질환명 | 필수 | 항문생식기의 사마귀 |
| disease_name_original | 원본 질환명 | 보험사 원문 표현 | 필수 | 항문생식기의 사마귀 |
| disease_aliases | 별칭/유사어 | 쉼표 또는 JSON 배열 형태 | 선택 | 곤지름,콘딜로마 |
| search_keywords | 검색 확장 키워드 | 코드/표준명/별칭/원문을 합친 검색용 문자열 | 필수 | A630 항문생식기의 사마귀 곤지름 콘딜로마 |
| underwriting_action | 인수 처리 구분 | 가능/제한/불가/추가심사 등 | 선택 | 제한 |
| min_elapsed_text | 최소 경과기간 | 원문 문구 우선 저장 | 선택 | 1개월 |
| treatment_period_text | 치료기간 기준 | 원문 문구 우선 저장 | 선택 | 치료종결 |
| hospitalization_text | 입원 기준 | 원문 문구 우선 저장 | 선택 | 입원 14일 이내 |
| surgery_text | 수술 여부/수술 기준 | 원문 문구 우선 저장 | 선택 | 무관 |
| medication_text | 투약 기준 | 투약 관련 문구 분리 저장 | 선택 | 최근 3개월 복약 없을 것 |
| exclusion_reason_text | 인수예외 사유 | 비고에서 핵심 사유 추출 | 선택 | 최근 입원 이력 |
| remarks | 기타 비고 | 원문 비고 최대한 유지 | 선택 | 간편1형만 가능 |
| special_conditions_json | 보험사 특이조건 | 일반 컬럼에 안 담기는 내용 JSON 저장 | 선택 | {"plan":"간편1형"} |
| source_file | 원본 파일명 | 업로드 원본 파일명 | 필수 | hk_2026q2.xlsx |
| source_sheet | 원본 시트명 | 업로드 원본 시트명 | 필수 | 335형 |
| source_row_no | 원본 행번호 | 원본 추적용 | 필수 | 48 |
| source_version | 원본 버전 | 버전/회차 | 필수 | 2026-04-1차 |
| applied_at | 반영일시 | 최종 검색 DB 반영 시각 | 필수 | 2026-04-07 10:00:00+09 |
| is_active | 사용여부 | 최신 반영본 true | 필수 | true |
| review_status | 검수상태 | approved/review_needed/rejected | 필수 | approved |
| confidence_score | AI 변환 신뢰도 | 0~1 | 선택 | 0.92 |
| reviewed_by | 검수자 | 관리자명 | 선택 | 한민 |
| reviewed_at | 검수시각 | 관리자 승인 시각 | 선택 | 2026-04-07 11:10:00+09 |

### 2-2. 표준화 원칙
- 질환명은 `표준 질환명`과 `원본 질환명`을 분리한다.
- 의미가 불분명하면 추정 입력하지 말고 `review_status = review_needed`로 둔다.
- 기간/입원/수술/투약 조건은 원문을 먼저 보존하고, 필요한 경우만 추가 파생 컬럼을 만든다.
- 보험사마다 다른 특이조건은 `special_conditions_json`에 보관한다.

---

## 3. 원본/중간/최종 테이블 구조

### 3-1. 원본 적재 테이블: raw_insurer_files
원본 업로드 파일 관리용

| 컬럼명 | 타입 | 설명 |
|---|---|---|
| id | uuid pk | 파일 ID |
| insurer_name | text | 보험사명 |
| file_name | text | 원본 파일명 |
| file_hash | text | 중복판단용 해시 |
| source_version | text | 원본 버전 |
| uploaded_by | text | 업로드자 |
| uploaded_at | timestamptz | 업로드 시각 |
| notes | text | 비고 |
| raw_file_url | text | 저장 위치 |
| status | text | uploaded/parsed/failed |

### 3-2. 원본 행 적재 테이블: raw_insurer_rows
시트/행 단위 원본 보관용

| 컬럼명 | 타입 | 설명 |
|---|---|---|
| id | uuid pk | 행 ID |
| file_id | uuid fk | raw_insurer_files 연결 |
| insurer_name | text | 보험사명 |
| source_sheet | text | 시트명 |
| row_no | integer | 원본 행번호 |
| raw_headers_json | jsonb | 원본 헤더 정보 |
| raw_row_json | jsonb | 원본 행 전체 |
| raw_text | text | 셀 내용을 합친 원문 |
| parse_status | text | parsed/review_needed/failed |
| created_at | timestamptz | 생성시각 |

### 3-3. AI 변환 중간 테이블: mapped_disease_rules
AI 1차 변환 결과 저장용

| 컬럼명 | 타입 | 설명 |
|---|---|---|
| id | uuid pk | 변환 ID |
| raw_row_id | uuid fk | raw_insurer_rows 연결 |
| insurer_name | text | 보험사명 |
| product_group | text | 상위 상품군 |
| product_type | text | 가능상품구분 |
| disease_code | text | 질환코드 |
| disease_name_standard | text | 표준 질환명 |
| disease_name_original | text | 원본 질환명 |
| disease_aliases | jsonb | 별칭 배열 |
| search_keywords | text | 검색 키워드 |
| underwriting_action | text | 인수 처리 구분 |
| min_elapsed_text | text | 최소 경과기간 |
| treatment_period_text | text | 치료기간 기준 |
| hospitalization_text | text | 입원 기준 |
| surgery_text | text | 수술 기준 |
| medication_text | text | 투약 기준 |
| exclusion_reason_text | text | 예외 사유 |
| remarks | text | 비고 |
| special_conditions_json | jsonb | 특이조건 |
| mapping_notes | text | AI 설명 |
| confidence_score | numeric | 신뢰도 |
| review_status | text | pending/review_needed/approved/rejected |
| review_note | text | 검수 메모 |
| created_at | timestamptz | 생성시각 |
| updated_at | timestamptz | 수정시각 |

### 3-4. 최종 검색 테이블: disease_rules
검수 완료된 데이터만 반영

| 컬럼명 | 타입 | 설명 |
|---|---|---|
| id | uuid pk | 최종 ID |
| mapped_id | uuid fk | mapped_disease_rules 연결 |
| insurer_name | text | 보험사명 |
| product_group | text | 상위 상품군 |
| product_type | text | 가능상품구분 |
| disease_code | text | 질환코드 |
| disease_name_standard | text | 표준 질환명 |
| disease_name_original | text | 원본 질환명 |
| disease_aliases | jsonb | 별칭 배열 |
| search_keywords | text | 검색 키워드 |
| underwriting_action | text | 인수 처리 구분 |
| min_elapsed_text | text | 최소 경과기간 |
| treatment_period_text | text | 치료기간 기준 |
| hospitalization_text | text | 입원 기준 |
| surgery_text | text | 수술 기준 |
| medication_text | text | 투약 기준 |
| exclusion_reason_text | text | 예외 사유 |
| remarks | text | 비고 |
| special_conditions_json | jsonb | 특이조건 |
| source_file | text | 원본 파일명 |
| source_sheet | text | 원본 시트명 |
| source_row_no | integer | 원본 행번호 |
| source_version | text | 원본 버전 |
| applied_at | timestamptz | 반영 시각 |
| is_active | boolean | 사용 여부 |
| review_status | text | approved 고정 운영 가능 |
| reviewed_by | text | 검수자 |
| reviewed_at | timestamptz | 검수 시각 |
| created_at | timestamptz | 생성시각 |
| updated_at | timestamptz | 수정시각 |

### 3-5. 권장 운영 흐름
1. 보험사 엑셀 업로드
2. raw_insurer_files 저장
3. 시트/행 분해 후 raw_insurer_rows 저장
4. AI 변환 실행 후 mapped_disease_rules 저장
5. 관리자 검수
6. 승인건만 disease_rules 반영
7. 검색은 disease_rules만 조회

---

## 4. AI 변환 프롬프트 초안

### 4-1. 시스템 프롬프트
당신은 보험사 간편보험/유병자보험 인수예외질환 원본 엑셀을 표준 DB 구조로 변환하는 데이터 정리 보조 AI다.
목표는 원본 의미를 보존하면서 표준 컬럼으로 1차 변환하는 것이다.

반드시 지켜야 할 원칙:
1. 없는 정보를 추정해서 확정하지 말 것.
2. 불명확하면 null 또는 review_needed 로 표시할 것.
3. 질환명은 원본 표현과 표준 표현을 분리할 것.
4. 기간, 입원, 수술, 투약 기준은 원문을 최대한 보존할 것.
5. 여러 조건이 한 행에 섞여 있으면 가능한 한 분리하되, 확신이 낮으면 설명을 남길 것.
6. 결과는 반드시 JSON으로만 반환할 것.
7. 출력 필드는 사전에 정의된 스키마만 사용할 것.
8. 보험/약관/보상 여부를 임의 판단하지 말고 원문을 구조화하는 역할만 수행할 것.

### 4-2. 사용자 프롬프트 템플릿
아래는 보험사 원본 엑셀에서 추출한 한 행의 정보다.
이 데이터를 표준 DB 구조에 맞게 변환하라.

입력 정보:
- insurer_name: {{insurer_name}}
- source_file: {{source_file}}
- source_sheet: {{source_sheet}}
- row_no: {{row_no}}
- headers_json: {{headers_json}}
- raw_row_json: {{raw_row_json}}
- raw_text: {{raw_text}}
- product_context: {{product_context}}

변환 규칙:
- disease_code: 질병코드가 명확할 때만 입력
- disease_name_standard: 검색용 대표 질환명
- disease_name_original: 원본 질환명 그대로 유지
- disease_aliases: 별칭이 명확하면 배열로 입력
- search_keywords: 코드/표준명/원본명/별칭을 합쳐 검색에 유리하게 구성
- underwriting_action: 가능, 제한, 불가, 추가심사 중 가장 가까운 값이 있을 때만 입력
- min_elapsed_text, treatment_period_text, hospitalization_text, surgery_text, medication_text: 원문 보존
- exclusion_reason_text: 인수예외 핵심 사유가 명확할 때만 입력
- remarks: 남은 설명 요약
- special_conditions_json: 상품형, 플랜, 특약, 회사별 특이조건 저장
- confidence_score: 0~1
- review_status: approved, review_needed, rejected 중 하나
- mapping_notes: 왜 그렇게 매핑했는지 짧게 설명

출력 스키마:
{
  "insurer_name": "",
  "product_group": "",
  "product_type": "",
  "disease_code": null,
  "disease_name_standard": "",
  "disease_name_original": "",
  "disease_aliases": [],
  "search_keywords": "",
  "underwriting_action": null,
  "min_elapsed_text": null,
  "treatment_period_text": null,
  "hospitalization_text": null,
  "surgery_text": null,
  "medication_text": null,
  "exclusion_reason_text": null,
  "remarks": null,
  "special_conditions_json": {},
  "confidence_score": 0,
  "review_status": "review_needed",
  "mapping_notes": ""
}

### 4-3. 검수 강화 프롬프트
아래 AI 변환 결과를 검토하라.
원본과 비교하여 다음 중 하나로 판정하라.
- approved: 원문 의미가 충분히 보존됨
- review_needed: 일부 애매함
- rejected: 잘못 매핑되었음

검토 기준:
1. 질환코드를 임의 생성했는가?
2. 질환명을 원문과 다르게 단정했는가?
3. 입원/수술/치료기간/투약 기준을 추정했는가?
4. 보험사 특이조건을 누락했는가?
5. 여러 조건이 있는 행을 과도하게 단순화했는가?

결과는 아래 JSON만 반환:
{
  "review_status": "approved",
  "review_note": "",
  "corrected_fields": {}
}

---

## 5. ChatGPT 사용 추천 방식

### 5-1. 추천 용도별 모드
- 구조 설계, 테이블 설계, 예외 케이스 분석: Thinking 계열 추천
- 반복 정리, CSV 컬럼 매핑, 대량 프롬프트 실행: 일반 고속 모드 추천
- 파일 많고 세션 길고 검수량이 많음: 상위 요금제가 유리할 수 있음

### 5-2. 실무 추천
- 처음 1~2주: Thinking 모드로 표준 컬럼/예외규칙 설계
- 이후 반복 작업: 일반 모드 + 고정 프롬프트로 변환
- 최종 검수용: 다시 Thinking 모드로 샘플 검토

### 5-3. 운영 원칙
- AI를 최종 확정자가 아니라 1차 정리 담당으로 사용한다.
- 원본 파일명/시트명/행번호를 항상 남긴다.
- confidence_score 낮은 건 자동 반영하지 않는다.
