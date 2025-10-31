import { screen, within, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { setupMockHandlerCreation } from '../../__mocks__/handlersUtils';
import App from '../../App';
import { saveRepeatSchedule, setupTestApp } from './helpers/repeatScheduleTestHelpers';

describe('반복 일정 수정 - 통합', () => {
  beforeEach(() => {
    vi.setSystemTime(new Date('2025-01-01T00:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('INT-EDIT-001: 반복 일정 단일 수정 - 해당 일정만 수정되고 반복 아이콘 제거', async () => {
    setupMockHandlerCreation([]);
    const { user } = setupTestApp(<App />);

    // 1. 반복 일정 생성 (2025-01-01 ~ 2025-01-05, 매일)
    await saveRepeatSchedule(user, {
      title: '매일 스탠드업',
      date: '2025-01-01',
      startTime: '09:00',
      endTime: '09:30',
      repeatType: 'daily',
      repeatEndDate: '2025-01-05',
    });

    // 2. 월간 뷰에서 5개 일정 생성 확인
    const monthView = await screen.findByTestId('month-view');
    await waitFor(() => {
      const allEvents = within(monthView).getAllByText('매일 스탠드업');
      expect(allEvents).toHaveLength(5);

      // 모두 반복 아이콘 있어야 함
      const allRepeatIcons = within(monthView).getAllByTestId('repeat-icon');
      expect(allRepeatIcons).toHaveLength(5);
    });

    // 3. event-list에서 1월 3일 일정 찾아서 편집 (3번째 일정)
    const eventList = within(screen.getByTestId('event-list'));
    const allEventCards = eventList.getAllByText('매일 스탠드업');

    // 1월 3일 일정은 3번째 카드 (0-indexed로 2번)
    const jan3Card = allEventCards[2].closest('div[class*="MuiBox-root"]')!;
    const editButton = within(jan3Card as HTMLElement).getByLabelText('Edit event');
    await user.click(editButton);

    // 4. 제목 수정
    await user.clear(screen.getByLabelText('제목'));
    await user.type(screen.getByLabelText('제목'), '매일 스탠드업 (변경됨)');

    // 5. 시간 수정
    await user.clear(screen.getByLabelText('시작 시간'));
    await user.type(screen.getByLabelText('시작 시간'), '10:00');
    await user.clear(screen.getByLabelText('종료 시간'));
    await user.type(screen.getByLabelText('종료 시간'), '10:30');

    // 6. 저장 버튼 클릭 (Dialog 나타남)
    await user.click(screen.getByTestId('event-submit-button'));

    // 7. Dialog에서 "이 일정만" 버튼 클릭
    const singleButton = await screen.findByText('이 일정만');
    await user.click(singleButton);

    // 8. Dialog가 닫힐 때까지 대기
    await waitFor(() => {
      expect(screen.queryByText('반복 일정 수정')).not.toBeInTheDocument();
    });

    // 9. 변경된 제목의 일정이 나타날 때까지 대기 (최종 상태 확인)
    const changedEvent = within(monthView).getByText('매일 스탠드업 (변경됨)');
    expect(changedEvent).toBeInTheDocument();

    // 10. 기존 제목이 4개로 줄어들었는지 확인
    const originalEvents = within(monthView).getAllByText('매일 스탠드업');
    expect(originalEvents).toHaveLength(4);

    // 11. 1월 3일 셀 확인: 반복 아이콘이 없어야 함
    const day3Cell = within(monthView).getByText('3').closest('td')!;
    const changedEventInCell = within(day3Cell).getByText('매일 스탠드업 (변경됨)');
    expect(changedEventInCell).toBeInTheDocument();

    // 해당 이벤트에 반복 아이콘이 없어야 함
    const repeatIconsInDay3 = within(day3Cell).queryAllByTestId('repeat-icon');
    expect(repeatIconsInDay3).toHaveLength(0);

    // 12. 다른 날짜들은 반복 아이콘 유지
    const day1Cell = within(monthView).getByText('1').closest('td')!;
    expect(within(day1Cell).getByTestId('repeat-icon')).toBeInTheDocument();

    const day2Cell = within(monthView).getByText('2').closest('td')!;
    expect(within(day2Cell).getByTestId('repeat-icon')).toBeInTheDocument();
  });

  it('INT-EDIT-002: 반복 일정 전체 수정 - 모든 일정이 수정되고 반복 아이콘 유지', async () => {
    setupMockHandlerCreation([]);
    const { user } = setupTestApp(<App />);

    // 1. 반복 일정 생성 (2025-01-01 ~ 2025-01-05, 매일)
    await saveRepeatSchedule(user, {
      title: '매일 회의',
      date: '2025-01-01',
      startTime: '14:00',
      endTime: '15:00',
      repeatType: 'daily',
      repeatEndDate: '2025-01-05',
    });

    // 2. 월간 뷰에서 5개 일정 생성 확인
    const monthView = await screen.findByTestId('month-view');
    await waitFor(() => {
      const allEvents = within(monthView).getAllByText('매일 회의');
      expect(allEvents).toHaveLength(5);
    });

    // 3. event-list에서 2번째 일정 편집
    const eventList = within(screen.getByTestId('event-list'));
    const allEventCards = eventList.getAllByText('매일 회의');
    const jan2Card = allEventCards[1].closest('div[class*="MuiBox-root"]')!;
    const editButton = within(jan2Card as HTMLElement).getByLabelText('Edit event');
    await user.click(editButton);

    // 4. 제목 수정
    await user.clear(screen.getByLabelText('제목'));
    await user.type(screen.getByLabelText('제목'), '매일 팀 회의');

    // 5. 시간 수정
    await user.clear(screen.getByLabelText('시작 시간'));
    await user.type(screen.getByLabelText('시작 시간'), '15:00');
    await user.clear(screen.getByLabelText('종료 시간'));
    await user.type(screen.getByLabelText('종료 시간'), '16:00');

    // 6. 저장 버튼 클릭 (Dialog 나타남)
    await user.click(screen.getByTestId('event-submit-button'));

    // 7. Dialog에서 "모든 일정" 버튼 클릭
    const allButton = await screen.findByText('모든 일정');
    await user.click(allButton);

    // 8. Dialog가 닫힐 때까지 대기
    await waitFor(() => {
      expect(screen.queryByText('반복 일정 수정')).not.toBeInTheDocument();
    });

    // 9. 모든 일정이 새 제목으로 변경되었는지 확인
    await waitFor(() => {
      const allEvents = within(monthView).getAllByText('매일 팀 회의');
      expect(allEvents).toHaveLength(5);
    });

    // 10. 모든 반복 아이콘이 유지되는지 확인
    await waitFor(() => {
      const allRepeatIcons = within(monthView).getAllByTestId('repeat-icon');
      expect(allRepeatIcons).toHaveLength(5);
    });

    // 11. 이벤트 리스트에서 시간 변경 확인
    const timeElements = eventList.getAllByText('15:00 - 16:00');
    expect(timeElements.length).toBeGreaterThanOrEqual(1);
  });
});
