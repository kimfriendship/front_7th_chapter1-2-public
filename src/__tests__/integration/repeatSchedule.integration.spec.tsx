import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { render, screen, within } from '@testing-library/react';
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
  const {
    title,
    date,
    startTime,
    endTime,
    description = '',
    location = '',
    category = '',
    repeatType,
    repeatEndDate,
  } = form;

  await user.click(screen.getAllByText('일정 추가')[0]);

  await user.type(screen.getByLabelText('제목'), title);
  await user.type(screen.getByLabelText('날짜'), date);
  await user.type(screen.getByLabelText('시작 시간'), startTime);
  await user.type(screen.getByLabelText('종료 시간'), endTime);
  if (description) await user.type(screen.getByLabelText('설명'), description);
  if (location) await user.type(screen.getByLabelText('위치'), location);
  if (category) {
    await user.click(screen.getByLabelText('카테고리'));
    await user.click(within(screen.getByLabelText('카테고리')).getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: `${category}-option` }));
  }

  // 반복 일정 체크박스 활성화
  await user.click(screen.getByLabelText('반복 일정'));

  // 반복 유형 선택
  const repeatTypeCombos = screen.getAllByRole('combobox');
  const repeatTypeCombo = repeatTypeCombos.find((combo) => {
    const parent = combo.closest('div');
    return parent?.textContent?.includes('반복 유형');
  });
  if (repeatTypeCombo) {
    await user.click(repeatTypeCombo);
    const repeatTypeLabels: Record<typeof repeatType, string> = {
      daily: '매일',
      weekly: '매주',
      monthly: '매월',
      yearly: '매년',
    };
    await user.click(screen.getByRole('option', { name: repeatTypeLabels[repeatType] }));
  }

  // 반복 종료일 입력
  const dateInputs = screen.getAllByRole('textbox');
  const endDateInput = dateInputs.find((input) => {
    const parent = input.closest('div');
    return parent?.textContent?.includes('반복 종료일');
  });
  if (endDateInput) {
    await user.type(endDateInput, repeatEndDate);
  }

  await user.click(screen.getByTestId('event-submit-button'));
};

describe('반복 일정 - 통합', () => {
  beforeEach(() => {
    server.resetHandlers();
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
      repeatEndDate: '2025-01-04',
    });

    // 월별 뷰에서 1일, 2일 셀 각각에 일정이 노출되는지 확인
    const monthView = await screen.findByTestId('month-view');
    const day1Cell = within(monthView).getByText('1').closest('td')!;
    const day2Cell = within(monthView).getByText('2').closest('td')!;
    expect(within(day1Cell).getByText('반복 생성')).toBeInTheDocument();
    expect(within(day2Cell).getByText('반복 생성')).toBeInTheDocument();

    // 반복 아이콘 확인 (월간 뷰 셀 내에서 반복 아이콘 SVG 요소 확인)
    const repeatIconInDay1 = within(day1Cell).queryByRole('img', { hidden: true });
    expect(repeatIconInDay1).toBeInTheDocument();
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
      repeatEndDate: '2025-01-04',
    });

    // 주간 뷰로 전환
    await user.click(within(screen.getByLabelText('뷰 타입 선택')).getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: 'week-option' }));

    // 주간 뷰에서 일정이 표시되는지 확인
    const weekView = await screen.findByTestId('week-view');
    expect(within(weekView).getByText('반복 생성')).toBeInTheDocument();

    // 반복 아이콘 확인 (주간 뷰에서 일정이 있는 셀을 찾아 반복 아이콘 확인)
    const weekViewCells = within(weekView).getAllByRole('cell');
    const cellWithEvent = weekViewCells.find((cell) => within(cell).queryByText('반복 생성'));
    expect(cellWithEvent).toBeDefined();
    const repeatIconInWeek = within(cellWithEvent!).queryByRole('img', { hidden: true });
    expect(repeatIconInWeek).toBeInTheDocument();
  });
});
