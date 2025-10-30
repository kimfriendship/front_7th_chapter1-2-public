import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { render, screen, waitFor, within } from '@testing-library/react';
import { UserEvent, userEvent } from '@testing-library/user-event';
import { SnackbarProvider } from 'notistack';
import { ReactElement } from 'react';

import { setupMockHandlerCreation } from '../../__mocks__/handlersUtils';
import App from '../../App';
import { server } from '../../setupTests';

const theme = createTheme();

// ! Hard 여기 제공 안함
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

// ! Hard 여기 제공 안함
const saveRepeatSchedule = async (
  user: UserEvent,
  form: {
    title: string;
    date: string;
    startTime: string;
    endTime: string;
    description?: string;
    location?: string;
    category?: string;
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

  // 반복 일정 체크박스 활성화 (isRepeating이 true가 되면 반복 유형 Select가 나타남)
  const repeatCheckbox = screen.getByLabelText('반복 일정') as HTMLInputElement;

  // 체크박스가 이미 checked 상태이면 unchecked로 만들기
  if (repeatCheckbox.checked) {
    await user.click(repeatCheckbox);
  }

  // 이제 checked 상태로 만들기
  await user.click(repeatCheckbox);

  // 반복 유형 Select가 나타날 때까지 대기
  await waitFor(() => {
    const repeatTypeSelect = document.getElementById('repeat-type');
    expect(repeatTypeSelect).not.toBeNull();
  });

  // id를 사용해서 정확히 반복 유형 Select 찾기
  const repeatTypeSelect = document.getElementById('repeat-type');
  await user.click(repeatTypeSelect!);

  // Select가 열릴 때까지 대기
  await waitFor(() => {
    const option = document.getElementById(`${repeatType}-option`);
    expect(option).not.toBeNull();
  });
  const option = document.getElementById(`${repeatType}-option`);
  await user.click(option!);

  // 반복 종료일 입력 필드가 렌더링될 때까지 대기
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
    const { user } = setup(<App />);

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
    const { user } = setup(<App />);

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
});
