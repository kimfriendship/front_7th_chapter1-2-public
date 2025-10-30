# 반복 일정 통합 기능 설계

## 1. 현재 상황 분석

### 1.1 테스트 상태

- ✅ 유닛 테스트: 반복 일정 생성 로직 (`generateRepeatEvents`) 완료
- ❌ 통합 테스트: INT-001, INT-002 실패
  - 실패 원인: UI에서 반복 일정 저장 시 여러 이벤트 생성 및 저장이 이루어지지 않음

### 1.2 기존 코드 구조

#### 구현 완료

- `src/utils/repeatSchedule.ts`
  - `generateRepeatEvents(EventForm): Event[]` - 반복 일정 배열 생성
  - 반복 타입별 생성 로직 (daily, weekly, monthly, yearly)
  - 반복 그룹 ID 관리 (`repeat.id`)

#### 미구현 부분

- `src/hooks/useEventOperations.ts`
  - `saveEvent`: 단일 이벤트만 저장 (`POST /api/events`)
  - 여러 이벤트 저장 기능 없음

- `src/App.tsx`
  - `addOrUpdateEvent`: 단일 `EventForm`만 `saveEvent`로 전달
  - 반복 일정인 경우 여러 이벤트 생성 로직 없음

#### 서버 엔드포인트

- `/api/events-list` (POST): 여러 이벤트를 한 번에 저장 가능 ✅

### 1.3 영향 범위

#### 수정 필요 파일

1. `src/hooks/useEventOperations.ts`
   - 여러 이벤트 저장 메서드 추가 또는 `saveEvent` 확장

2. `src/App.tsx`
   - `addOrUpdateEvent`에서 반복 일정 처리 로직 추가
   - `generateRepeatEvents` import 및 사용

3. `src/__mocks__/handlersUtils.ts` (테스트 환경)
   - `setupMockHandlerCreation`이 `/api/events-list` 처리하도록 확장 필요 가능

#### 영향 없는 파일

- `src/utils/repeatSchedule.ts` - 이미 완료
- 테스트 파일들 - 기대 동작만 정의

## 2. 기능 설계 (PRD 기준)

### 2.1 PRD 요구사항 확인

**핵심 요구사항**:

- 반복일정은 일정 겹침을 고려하지 않는다 (PRD 1.6)
- 반복 종료 조건: 특정 날짜까지 (PRD 3)
- 반복 일정 표시: 아이콘으로 구분 (PRD 2)

**현재 구현 범위**:

- 반복 일정 생성만 구현 (수정/삭제는 별도 작업)
- INT-001, INT-002 통합 테스트 통과 목표

### 2.2 여러 이벤트 저장 기능 추가

**위치**: `src/hooks/useEventOperations.ts`

**기능**:

- `saveEvents(events: Event[]): Promise<void>` 메서드 추가
- 여러 이벤트를 한 번에 저장하는 기능

**API 호출**:

```typescript
POST /api/events-list
Body: { events: Event[] }
```

**동작**:

1. 여러 이벤트를 배열로 받음
2. `/api/events-list` 엔드포인트로 POST 요청
3. 저장 성공 시 `fetchEvents()` 호출로 상태 갱신
4. 성공 메시지 표시 (예: "일정이 추가되었습니다.")

### 2.3 반복 일정 저장 로직 통합

**위치**: `src/App.tsx`

**수정 위치**: `addOrUpdateEvent` 함수

**주요 변경사항**:

- **반복 일정은 충돌 검사를 하지 않음** (PRD 요구사항)
- 반복 일정인 경우 `generateRepeatEvents` 호출하여 여러 이벤트 생성
- 생성된 이벤트 배열을 `saveEvents`로 저장

**로직**:

```typescript
const addOrUpdateEvent = async () => {
  // ... 기존 검증 로직 ...

  const eventForm: EventForm = {
    // ... 기존 필드 ...
    repeat: {
      type: isRepeating ? repeatType : 'none',
      interval: repeatInterval,
      endDate: repeatEndDate || undefined,
    },
  };

  // 반복 일정인 경우 여러 이벤트 생성 (충돌 검사 없음)
  if (isRepeating && repeatType !== 'none' && repeatEndDate) {
    const repeatEvents = generateRepeatEvents(eventForm);

    // PRD 요구사항: "반복일정은 일정 겹침을 고려하지 않는다"
    // 충돌 검사 없이 바로 저장
    await saveEvents(repeatEvents);
    resetForm();
  } else {
    // 단일 이벤트 저장 (기존 로직 - 충돌 검사 유지)
    const overlapping = findOverlappingEvents(eventForm, events);
    if (overlapping.length > 0) {
      setOverlappingEvents(overlapping);
      setIsOverlapDialogOpen(true);
    } else {
      await saveEvent(eventForm);
      resetForm();
    }
  }
};
```

### 2.4 테스트 핸들러 확장

**위치**: `src/__mocks__/handlersUtils.ts`

**필요성 확인**:

- 현재 `setupMockHandlerCreation`이 단일 이벤트만 처리하는지 확인
- `/api/events-list` 엔드포인트 핸들러 추가 필요 여부 검토

## 3. 구현 세부사항

### 3.1 에러 처리

- 반복 일정 생성 실패: `generateRepeatEvents`가 빈 배열 반환하는 경우 처리
- API 저장 실패: 기존과 동일한 에러 핸들링

### 3.2 사용자 피드백

- 단일 일정: "일정이 추가되었습니다."
- 반복 일정: "반복 일정이 추가되었습니다. (N개의 일정)"
- 또는: "일정이 추가되었습니다." (단일 메시지로 통일)

### 3.3 충돌 검사 (PRD 기준)

- **반복 일정**: 충돌 검사 **하지 않음** (PRD 1.6 요구사항)
- **단일 일정**: 기존대로 충돌 검사 수행
- 반복 일정 저장 시 충돌 검사 로직을 우회하여 바로 저장

## 4. 테스트 고려사항

### 4.1 통합 테스트 통과 조건

- INT-001: 월간 뷰에서 반복 일정 발생 건들이 표시됨
- INT-002: 주간 뷰에서 반복 일정 발생 건들이 표시됨
- 반복 아이콘 표시 확인

### 4.2 단위 테스트 추가 권장

- `useEventOperations`의 `saveEvents` 메서드 테스트
- `addOrUpdateEvent`의 반복 일정 분기 로직 테스트

## 5. 구현 우선순위

1. **High**: `useEventOperations`에 여러 이벤트 저장 기능 추가
2. **High**: `App.tsx`의 `addOrUpdateEvent`에 반복 일정 처리 로직 추가
3. **Medium**: 테스트 핸들러 확장 (필요한 경우)
4. **Low**: 사용자 피드백 메시지 개선

## 6. 의존성

- `src/utils/repeatSchedule.ts` - `generateRepeatEvents` 함수 ✅
- 서버 API: `/api/events-list` 엔드포인트 ✅
- 기존 충돌 검사 로직: `findOverlappingEvents` ✅
