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

  // 시작 날짜가 종료 날짜보다 이후면 빈 배열 반환
  if (startDate > endDate) {
    return [];
  }

  const events: Event[] = [];

  // 매일 반복 처리
  if (repeat.type === 'daily') {
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      events.push({
        ...eventForm,
        id: generateId(),
        date: formatDate(currentDate),
      });

      // 다음 날로 이동
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  return events;
}
