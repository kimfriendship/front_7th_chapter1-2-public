import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { render, screen, within, waitFor } from '@testing-library/react';
import { UserEvent, userEvent } from '@testing-library/user-event';
import { SnackbarProvider } from 'notistack';
import { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { setupMockHandlerCreation } from '../../__mocks__/handlersUtils';
import App from '../../App';

const theme = createTheme();

const setup = (element: ReactElement) => {
  const user = userEvent.setup();

  return {
    ...render(
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <SnackbarProvider>{element}</SnackbarProvider>
      </ThemeProvider>
    ),
    user,
  };
};

/**
 * 반복 일정 생성 헬퍼 함수
 */
const saveRepeatSchedule = async (
  user: UserEvent,
  form: {
    title: string;
    date: string;
    startTime: string;
    endTime: string;
    repeatType: 'daily' | 'weekly' | 'monthly' | 'yearly';
    repeatEndDate: string;
  }
) => {
  const { title, date, startTime, endTime, repeatType, repeatEndDate } = form;

  await user.click(screen.getAllByText('일정 추가')[0]);
  await user.type(screen.getByLabelText('제목'), title);
  await user.type(screen.getByLabelText('날짜'), date);
  await user.type(screen.getByLabelText('시작 시간'), startTime);
  await user.type(screen.getByLabelText('종료 시간'), endTime);

  // 반복 일정 체크박스 활성화
  const repeatCheckbox = screen.getByLabelText('반복 일정') as HTMLInputElement;

  if (repeatCheckbox.checked) {
    await user.click(repeatCheckbox);
  }

  await user.click(repeatCheckbox);

  // 반복 유형 Select가 나타날 때까지 대기
  await waitFor(() => {
    const repeatTypeSelect = document.getElementById('repeat-type');
    expect(repeatTypeSelect).not.toBeNull();
  });

  const repeatTypeSelect = document.getElementById('repeat-type');
  await user.click(repeatTypeSelect!);

  await waitFor(() => {
    const option = document.getElementById(`${repeatType}-option`);
    expect(option).not.toBeNull();
  });
  const option = document.getElementById(`${repeatType}-option`);
  await user.click(option!);

  // 반복 종료일 입력
  await waitFor(() => {
    const input = document.getElementById('repeat-end-date');
    expect(input).not.toBeNull();
  });

  const repeatEndDateInput = document.getElementById('repeat-end-date')!;
  await user.click(repeatEndDateInput);
  await user.clear(repeatEndDateInput);
  await user.type(repeatEndDateInput, repeatEndDate);

  await user.click(screen.getByTestId('event-submit-button'));
};

describe('반복 일정 삭제 - 통합', () => {
  beforeEach(() => {
    vi.setSystemTime(new Date('2025-01-01T00:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('INT-DEL-001: 반복 일정 단일 삭제 - 해당 일정만 삭제되고 나머지 유지', async () => {
    setupMockHandlerCreation([]);
    const { user } = setup(<App />);

    // 1. 반복 일정 생성 (2025-01-01 ~ 2025-01-05, 매일)
    await saveRepeatSchedule(user, {
      title: '매일 운동',
      date: '2025-01-01',
      startTime: '07:00',
      endTime: '08:00',
      repeatType: 'daily',
      repeatEndDate: '2025-01-05',
    });

    // 2. 월간 뷰에서 5개 일정 생성 확인
    const monthView = await screen.findByTestId('month-view');
    await waitFor(() => {
      const allEvents = within(monthView).getAllByText('매일 운동');
      expect(allEvents).toHaveLength(5);

      // 모두 반복 아이콘 있어야 함
      const allRepeatIcons = within(monthView).getAllByTestId('repeat-icon');
      expect(allRepeatIcons).toHaveLength(5);
    });

    // 3. event-list에서 1월 3일 일정 찾아서 삭제 (3번째 일정)
    const eventList = within(screen.getByTestId('event-list'));
    const allEventCards = eventList.getAllByText('매일 운동');

    // 1월 3일 일정은 3번째 카드 (0-indexed로 2번)
    const jan3Card = allEventCards[2].closest('div[class*="MuiBox-root"]')!;
    const deleteButton = within(jan3Card as HTMLElement).getByLabelText('Delete event');
    await user.click(deleteButton);

    // 4. Dialog에서 "이 일정만" 버튼 클릭
    const singleButton = await screen.findByText('이 일정만');
    await user.click(singleButton);

    // 5. 검증: 1월 3일만 삭제되고 나머지 4개 유지
    await waitFor(() => {
      const remainingEvents = within(monthView).getAllByText('매일 운동');
      expect(remainingEvents).toHaveLength(4);

      // 나머지 일정들은 반복 아이콘 유지
      const remainingRepeatIcons = within(monthView).getAllByTestId('repeat-icon');
      expect(remainingRepeatIcons).toHaveLength(4);
    });

    // 6. 1월 3일 셀 확인: 일정이 없어야 함
    const day3Cell = within(monthView).getByText('3').closest('td')!;
    const eventsInDay3 = within(day3Cell).queryAllByText('매일 운동');
    expect(eventsInDay3).toHaveLength(0);

    // 7. 다른 날짜들은 일정 유지
    const day1Cell = within(monthView).getByText('1').closest('td')!;
    expect(within(day1Cell).getByText('매일 운동')).toBeInTheDocument();

    const day2Cell = within(monthView).getByText('2').closest('td')!;
    expect(within(day2Cell).getByText('매일 운동')).toBeInTheDocument();

    const day4Cell = within(monthView).getByText('4').closest('td')!;
    expect(within(day4Cell).getByText('매일 운동')).toBeInTheDocument();

    const day5Cell = within(monthView).getByText('5').closest('td')!;
    expect(within(day5Cell).getByText('매일 운동')).toBeInTheDocument();
  });

  it('INT-DEL-002: 반복 일정 전체 삭제 - 모든 일정이 삭제됨', async () => {
    setupMockHandlerCreation([]);
    const { user } = setup(<App />);

    // 1. 반복 일정 생성 (2025-01-01 ~ 2025-01-05, 매일)
    await saveRepeatSchedule(user, {
      title: '매일 독서',
      date: '2025-01-01',
      startTime: '20:00',
      endTime: '21:00',
      repeatType: 'daily',
      repeatEndDate: '2025-01-05',
    });

    // 2. 월간 뷰에서 5개 일정 생성 확인
    const monthView = await screen.findByTestId('month-view');
    await waitFor(() => {
      const allEvents = within(monthView).getAllByText('매일 독서');
      expect(allEvents).toHaveLength(5);
    });

    // 3. event-list에서 2번째 일정 삭제 버튼 클릭
    const eventList = within(screen.getByTestId('event-list'));
    const allEventCards = eventList.getAllByText('매일 독서');
    const jan2Card = allEventCards[1].closest('div[class*="MuiBox-root"]')!;
    const deleteButton = within(jan2Card as HTMLElement).getByLabelText('Delete event');
    await user.click(deleteButton);

    // 4. Dialog에서 "모든 일정" 버튼 클릭
    const allButton = await screen.findByText('모든 일정');
    await user.click(allButton);

    // 5. 검증: 모든 일정이 삭제됨
    await waitFor(() => {
      const remainingEvents = within(monthView).queryAllByText('매일 독서');
      expect(remainingEvents).toHaveLength(0);

      // 반복 아이콘도 모두 사라짐
      const remainingRepeatIcons = within(monthView).queryAllByTestId('repeat-icon');
      expect(remainingRepeatIcons).toHaveLength(0);
    });

    // 6. 1월 1일부터 5일까지 모든 셀 확인: 일정이 없어야 함
    for (let day = 1; day <= 5; day++) {
      const dayCell = within(monthView).getByText(String(day)).closest('td')!;
      const eventsInDay = within(dayCell).queryAllByText('매일 독서');
      expect(eventsInDay).toHaveLength(0);
    }

    // 7. event-list에서도 일정이 사라졌는지 확인
    const remainingInList = eventList.queryAllByText('매일 독서');
    expect(remainingInList).toHaveLength(0);
  });
});
