import { randomUUID } from 'crypto';

import { Event, EventForm } from '../types';
import { formatDate, getDaysInMonth } from './dateUtils';

/**
 * 고유한 ID를 생성합니다.
 */
function generateId(): string {
  return randomUUID();
}

/**
 * 시작 날짜와 종료 날짜의 유효성을 검증합니다.
 * @param startDate 시작 날짜
 * @param endDate 종료 날짜
 * @returns 유효한 날짜 범위인지 여부
 */
function isValidDateRange(startDate: Date, endDate: Date): boolean {
  return startDate <= endDate;
}

/**
 * 지정된 일수 간격으로 반복 일정을 생성합니다.
 * @param eventForm 원본 이벤트 폼 데이터
 * @param startDate 시작 날짜
 * @param endDate 종료 날짜
 * @param dayInterval 날짜 증가 간격 (일)
 * @returns 생성된 반복 일정 배열
 */
function generateRepeatEventsWithInterval(
  eventForm: EventForm,
  startDate: Date,
  endDate: Date,
  dayInterval: number,
  repeatId: string
): Event[] {
  const events: Event[] = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    events.push({
      ...eventForm,
      id: generateId(),
      date: formatDate(currentDate),
      repeat: {
        ...eventForm.repeat,
        id: repeatId,
      },
    });

    currentDate.setDate(currentDate.getDate() + dayInterval);
  }

  return events;
}

/**
 * 매일 반복 일정을 생성합니다.
 * @param eventForm 원본 이벤트 폼 데이터
 * @param startDate 시작 날짜
 * @param endDate 종료 날짜
 * @returns 생성된 반복 일정 배열
 */
function generateDailyRepeatEvents(
  eventForm: EventForm,
  startDate: Date,
  endDate: Date,
  repeatId: string
): Event[] {
  return generateRepeatEventsWithInterval(eventForm, startDate, endDate, 1, repeatId);
}

/**
 * 매주 반복 일정을 생성합니다.
 * @param eventForm 원본 이벤트 폼 데이터
 * @param startDate 시작 날짜
 * @param endDate 종료 날짜
 * @param repeatId 반복 일정 그룹 ID
 * @returns 생성된 반복 일정 배열
 */
function generateWeeklyRepeatEvents(
  eventForm: EventForm,
  startDate: Date,
  endDate: Date,
  repeatId: string
): Event[] {
  return generateRepeatEventsWithInterval(eventForm, startDate, endDate, 7, repeatId);
}

/**
 * 날짜가 존재하고 종료 날짜 이내인 경우 일정을 생성합니다.
 * @param eventForm 원본 이벤트 폼 데이터
 * @param year 년도
 * @param month 월 (1-12)
 * @param day 일
 * @param endDate 종료 날짜
 * @returns 생성된 일정 또는 null
 */
function createEventIfValid(
  eventForm: EventForm,
  year: number,
  month: number,
  day: number,
  endDate: Date,
  repeatId: string
): Event | null {
  const daysInMonth = getDaysInMonth(year, month);
  if (day > daysInMonth) {
    return null; // 해당 날짜가 존재하지 않으면 null 반환
  }

  const eventDate = new Date(year, month - 1, day);

  // 종료 날짜를 넘지 않는 경우에만 일정 생성
  if (eventDate <= endDate) {
    return {
      ...eventForm,
      id: generateId(),
      date: formatDate(eventDate),
      repeat: {
        ...eventForm.repeat,
        id: repeatId,
      },
    };
  }

  return null;
}

/**
 * 매월 반복 일정을 생성합니다.
 * @param eventForm 원본 이벤트 폼 데이터
 * @param startDate 시작 날짜
 * @param endDate 종료 날짜
 * @returns 생성된 반복 일정 배열
 */
function generateMonthlyRepeatEvents(
  eventForm: EventForm,
  startDate: Date,
  endDate: Date,
  repeatId: string
): Event[] {
  const events: Event[] = [];
  const startDay = startDate.getDate();
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const event = createEventIfValid(eventForm, year, month, startDay, endDate, repeatId);

    if (event) {
      events.push(event);
    }

    // 다음 달로 이동
    currentDate.setMonth(currentDate.getMonth() + 1);
    currentDate.setDate(1); // 월 초로 설정
  }

  return events;
}

/**
 * 매년 반복 일정을 생성합니다.
 * @param eventForm 원본 이벤트 폼 데이터
 * @param startDate 시작 날짜
 * @param endDate 종료 날짜
 * @returns 생성된 반복 일정 배열
 */
function generateYearlyRepeatEvents(
  eventForm: EventForm,
  startDate: Date,
  endDate: Date,
  repeatId: string
): Event[] {
  const events: Event[] = [];
  const startMonth = startDate.getMonth() + 1;
  const startDay = startDate.getDate();
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();

  // 시작 년도부터 종료 년도까지 반복
  for (let year = startYear; year <= endYear; year++) {
    const event = createEventIfValid(eventForm, year, startMonth, startDay, endDate, repeatId);

    if (event) {
      events.push(event);
    }
  }

  return events;
}

/**
 * 반복 일정을 생성하는 함수
 * @param eventForm 반복 일정의 원본 이벤트 폼 데이터
 * @returns 생성된 반복 일정 배열
 */
export function generateRepeatEvents(eventForm: EventForm): Event[] {
  const { repeat, date } = eventForm;

  // 반복 유형이 none이면 원본 일정 1개만 반환
  if (repeat.type === 'none') {
    return [{ ...eventForm, id: generateId() }];
  }

  // 종료 날짜가 없으면 빈 배열 반환
  if (!repeat.endDate) {
    return [];
  }

  // 시작 날짜와 종료 날짜 파싱
  const startDate = new Date(date);
  const endDate = new Date(repeat.endDate);

  // 날짜 범위 유효성 검증
  if (!isValidDateRange(startDate, endDate)) {
    return [];
  }

  // 반복 일정 그룹 ID 생성
  const repeatId = generateId();

  // 반복 유형에 따라 처리
  switch (repeat.type) {
    case 'daily':
      return generateDailyRepeatEvents(eventForm, startDate, endDate, repeatId);
    case 'weekly':
      return generateWeeklyRepeatEvents(eventForm, startDate, endDate, repeatId);
    case 'monthly':
      return generateMonthlyRepeatEvents(eventForm, startDate, endDate, repeatId);
    case 'yearly':
      return generateYearlyRepeatEvents(eventForm, startDate, endDate, repeatId);
    default:
      return [];
  }
}

/**
 * 단일 발생 건을 반복에서 분리합니다.
 * @param event 반복에서 분리할 일정
 * @returns repeat.type이 'none'으로 변경된 새로운 일정
 */
export function detachSingleOccurrence(event: Event): Event {
  return {
    ...event,
    repeat: {
      ...event.repeat,
      type: 'none',
    },
  };
}

/**
 * 반복 일정의 특정 발생 건이나 전체를 업데이트합니다.
 * @param events 반복 일정 배열
 * @param occurrenceId 업데이트할 일정의 ID
 * @param updates 적용할 업데이트 내용
 * @param mode 'single'이면 해당 일정만 수정하고 반복에서 분리, 'all'이면 전체 수정
 * @returns 업데이트된 일정 배열
 */
export function updateRepeatEvents(
  events: Event[],
  occurrenceId: string,
  updates: Partial<Event>,
  mode: 'single' | 'all'
): Event[] {
  // occurrenceId로 이벤트 찾기
  const targetEvent = events.find((event) => event.id === occurrenceId);
  if (!targetEvent) {
    return events; // 해당 이벤트를 찾지 못하면 원본 반환
  }

  // 반복 일정 그룹 ID 확인
  const repeatId = targetEvent.repeat.id;
  if (!repeatId) {
    // repeat.id가 없으면 일반 일정이므로 단일 수정만 가능
    if (mode === 'single') {
      return events.map((event) => {
        if (event.id === occurrenceId) {
          return {
            ...event,
            ...updates,
          };
        }
        return event;
      });
    }
    return events;
  }

  if (mode === 'single') {
    // 단일 수정: 해당 일정만 수정하고 반복에서 분리
    return events.map((event) => {
      if (event.id === occurrenceId) {
        return {
          ...event,
          ...updates,
          repeat: {
            ...event.repeat,
            type: 'none',
            id: undefined, // 반복 그룹에서 분리
          },
        };
      }
      return event;
    });
  }

  // mode === 'all': 같은 반복 그룹의 모든 일정 수정
  return events.map((event) => {
    if (event.repeat.id === repeatId) {
      return {
        ...event,
        ...updates,
      };
    }
    return event;
  });
}
