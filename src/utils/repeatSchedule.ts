import { randomUUID } from 'crypto';

import { Event, EventForm } from '../types';
import { formatDate } from './dateUtils';

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

  // 매일 반복 처리
  if (repeat.type === 'daily') {
    return generateDailyRepeatEvents(eventForm, startDate, endDate);
  }

  // 매주 반복 처리
  if (repeat.type === 'weekly') {
    return generateWeeklyRepeatEvents(eventForm, startDate, endDate);
  }

  return [];
}
