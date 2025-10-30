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
  dayInterval: number
): Event[] {
  const events: Event[] = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    events.push({
      ...eventForm,
      id: generateId(),
      date: formatDate(currentDate),
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
function generateDailyRepeatEvents(eventForm: EventForm, startDate: Date, endDate: Date): Event[] {
  return generateRepeatEventsWithInterval(eventForm, startDate, endDate, 1);
}

/**
 * 매주 반복 일정을 생성합니다.
 * @param eventForm 원본 이벤트 폼 데이터
 * @param startDate 시작 날짜
 * @param endDate 종료 날짜
 * @returns 생성된 반복 일정 배열
 */
function generateWeeklyRepeatEvents(eventForm: EventForm, startDate: Date, endDate: Date): Event[] {
  return generateRepeatEventsWithInterval(eventForm, startDate, endDate, 7);
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
  endDate: Date
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
  endDate: Date
): Event[] {
  const events: Event[] = [];
  const startDay = startDate.getDate();
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const event = createEventIfValid(eventForm, year, month, startDay, endDate);

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
function generateYearlyRepeatEvents(eventForm: EventForm, startDate: Date, endDate: Date): Event[] {
  const events: Event[] = [];
  const startMonth = startDate.getMonth() + 1;
  const startDay = startDate.getDate();
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();

  // 시작 년도부터 종료 년도까지 반복
  for (let year = startYear; year <= endYear; year++) {
    const event = createEventIfValid(eventForm, year, startMonth, startDay, endDate);

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

  // 반복 유형에 따라 처리
  switch (repeat.type) {
    case 'daily':
      return generateDailyRepeatEvents(eventForm, startDate, endDate);
    case 'weekly':
      return generateWeeklyRepeatEvents(eventForm, startDate, endDate);
    case 'monthly':
      return generateMonthlyRepeatEvents(eventForm, startDate, endDate);
    case 'yearly':
      return generateYearlyRepeatEvents(eventForm, startDate, endDate);
    default:
      return [];
  }
}
