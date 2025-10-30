import { screen, waitFor, within } from '@testing-library/react';

import { setupMockHandlerCreation } from '../../__mocks__/handlersUtils';
import App from '../../App';
import { server } from '../../setupTests';
import { saveRepeatSchedule, setupTestApp } from './helpers/repeatScheduleTestHelpers';

describe('반복 일정 - 통합', () => {
  beforeEach(() => {
    server.resetHandlers();
    vi.setSystemTime('2025-01-01T00:00:00');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('INT-001: 매일 반복 생성 후 월간 뷰 표시 검증', async () => {
    setupMockHandlerCreation([]);
    const { user } = setupTestApp(<App />);

    await saveRepeatSchedule(user, {
      title: '반복 생성',
      date: '2025-01-01',
      startTime: '09:00',
      endTime: '10:00',
      repeatType: 'daily',
      repeatEndDate: '2025-01-03',
    });

    // 월별 뷰에서 1일, 2일 셀 각각에 일정이 노출되는지 확인
    const monthView = await screen.findByTestId('month-view');
    const day1Cell = within(monthView).getByText('1').closest('td')!;
    const day2Cell = within(monthView).getByText('2').closest('td')!;
    const day3Cell = within(monthView).getByText('3').closest('td')!;
    expect(within(day1Cell).getByText('반복 생성')).toBeInTheDocument();
    expect(within(day1Cell).getByTestId('repeat-icon')).toBeInTheDocument();
    expect(within(day2Cell).getByText('반복 생성')).toBeInTheDocument();
    expect(within(day2Cell).getByTestId('repeat-icon')).toBeInTheDocument();
    expect(within(day3Cell).getByText('반복 생성')).toBeInTheDocument();
    expect(within(day3Cell).getByTestId('repeat-icon')).toBeInTheDocument();
  });

  it('INT-002: 매일 반복 생성 후 주간 뷰 표시 검증', async () => {
    setupMockHandlerCreation([]);
    const { user } = setupTestApp(<App />);

    await saveRepeatSchedule(user, {
      title: '반복 생성',
      date: '2025-01-01',
      startTime: '09:00',
      endTime: '10:00',
      repeatType: 'daily',
      repeatEndDate: '2025-01-03',
    });

    // 주간 뷰로 전환
    await user.click(within(screen.getByLabelText('뷰 타입 선택')).getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: 'week-option' }));

    // 주간 뷰에서 일정이 표시되는지 확인 (반복 일정이므로 여러 개 존재)
    const weekView = await screen.findByTestId('week-view');
    const day1Cell = within(weekView).getByText('1').closest('td')!;
    const day2Cell = within(weekView).getByText('2').closest('td')!;
    const day3Cell = within(weekView).getByText('3').closest('td')!;
    expect(within(day1Cell).getByText('반복 생성')).toBeInTheDocument();
    expect(within(day1Cell).getByTestId('repeat-icon')).toBeInTheDocument();
    expect(within(day2Cell).getByText('반복 생성')).toBeInTheDocument();
    expect(within(day2Cell).getByTestId('repeat-icon')).toBeInTheDocument();
    expect(within(day3Cell).getByText('반복 생성')).toBeInTheDocument();
    expect(within(day3Cell).getByTestId('repeat-icon')).toBeInTheDocument();
  });

  it('INT-003: 단일 일정을 반복 일정으로 변경', async () => {
    // 1. 초기 단일 일정 설정
    setupMockHandlerCreation([
      {
        id: '1',
        title: '단일 일정',
        date: '2025-01-01',
        startTime: '09:00',
        endTime: '10:00',
        description: '',
        location: '',
        category: '업무',
        repeat: { type: 'none', interval: 1 },
        notificationTime: 10,
      },
    ]);
    const { user } = setupTestApp(<App />);

    // 2. 월간 뷰에서 생성된 일정 확인 (반복 아이콘 없음)
    const monthView = await screen.findByTestId('month-view');
    await waitFor(() => {
      const day1Cell = within(monthView).getByText('1').closest('td')!;
      expect(within(day1Cell).getByText('단일 일정')).toBeInTheDocument();
      expect(within(day1Cell).queryByTestId('repeat-icon')).not.toBeInTheDocument();
    });

    // 3. event-list에서 "단일 일정" 카드의 Edit 버튼 클릭
    const eventList = screen.getByTestId('event-list');
    const eventCard = within(eventList)
      .getByText('단일 일정')
      .closest('div[class*="Box"]') as HTMLElement;
    const editButton = within(eventCard).getByLabelText('Edit event');
    await user.click(editButton);

    // 4. 반복 일정 체크박스 활성화
    const repeatCheckbox = screen.getByLabelText('반복 일정') as HTMLInputElement;
    await user.click(repeatCheckbox);

    // 5. 반복 유형 선택 (매일)
    await waitFor(() => {
      const repeatTypeSelect = document.getElementById('repeat-type');
      expect(repeatTypeSelect).not.toBeNull();
    });

    const repeatTypeSelect = document.getElementById('repeat-type');
    await user.click(repeatTypeSelect!);

    await waitFor(() => {
      const option = document.getElementById('daily-option');
      expect(option).not.toBeNull();
    });
    const dailyOption = document.getElementById('daily-option');
    await user.click(dailyOption!);

    // 6. 반복 종료일 설정
    await waitFor(() => {
      const input = document.getElementById('repeat-end-date');
      expect(input).not.toBeNull();
    });

    const repeatEndDateInput = document.getElementById('repeat-end-date')!;
    await user.click(repeatEndDateInput);
    await user.clear(repeatEndDateInput);
    await user.type(repeatEndDateInput, '2025-01-03');

    // 7. 저장
    await user.click(screen.getByTestId('event-submit-button'));

    // 8. 검증: 원본 일정 삭제되고, 1일, 2일, 3일에 반복 일정이 생성됨
    await waitFor(() => {
      // getAllByText로 모든 "단일 일정" 요소 찾기 (3개여야 함)
      const allEvents = within(monthView).getAllByText('단일 일정');
      expect(allEvents).toHaveLength(3);

      // 모든 반복 아이콘 찾기 (3개여야 함)
      const allRepeatIcons = within(monthView).getAllByTestId('repeat-icon');
      expect(allRepeatIcons).toHaveLength(3);
    });
  });

  it('INT-004: 반복 종료일 input에서 2025-12-31까지만 선택 가능해야 함', async () => {
    setupMockHandlerCreation([]);
    const { user } = setupTestApp(<App />);

    // 1. 일정 추가 버튼 클릭
    await user.click(screen.getAllByText('일정 추가')[0]);

    // 2. 반복 일정 체크박스 활성화
    const repeatCheckbox = screen.getByLabelText('반복 일정') as HTMLInputElement;

    // 체크박스가 이미 checked 상태이면 unchecked로 만들기
    if (repeatCheckbox.checked) {
      await user.click(repeatCheckbox);
    }

    // 이제 checked 상태로 만들기
    await user.click(repeatCheckbox);

    // 3. 반복 유형 Select가 나타날 때까지 대기
    await waitFor(() => {
      const repeatTypeSelect = document.getElementById('repeat-type');
      expect(repeatTypeSelect).not.toBeNull();
    });

    // 4. 반복 유형 선택 (매일)
    const repeatTypeSelect = document.getElementById('repeat-type');
    await user.click(repeatTypeSelect!);

    await waitFor(() => {
      const option = document.getElementById('daily-option');
      expect(option).not.toBeNull();
    });
    const dailyOption = document.getElementById('daily-option');
    await user.click(dailyOption!);

    // 5. 반복 종료일 input 필드가 나타날 때까지 대기
    await waitFor(() => {
      const repeatEndDateInput = document.getElementById('repeat-end-date');
      expect(repeatEndDateInput).not.toBeNull();
    });

    // 6. 반복 종료일 input 필드의 max 속성이 2025-12-31로 설정되어 있는지 확인
    const repeatEndDateInput = document.getElementById('repeat-end-date') as HTMLInputElement;
    expect(repeatEndDateInput).not.toBeNull();
    expect(repeatEndDateInput.max).toBe('2025-12-31');
    expect(repeatEndDateInput.type).toBe('date');

    // 7. 2025-12-31 날짜를 입력할 수 있는지 확인
    await user.click(repeatEndDateInput);
    await user.clear(repeatEndDateInput);
    await user.type(repeatEndDateInput, '2025-12-31');
    expect(repeatEndDateInput.value).toBe('2025-12-31');

    // 8. 2025-12-31 이전 날짜도 선택 가능한지 확인
    await user.clear(repeatEndDateInput);
    await user.type(repeatEndDateInput, '2025-12-30');
    expect(repeatEndDateInput.value).toBe('2025-12-30');

    // 9. max 속성 확인 (2025-12-31까지만 선택 가능)
    expect(repeatEndDateInput.getAttribute('max')).toBe('2025-12-31');
  });
});
