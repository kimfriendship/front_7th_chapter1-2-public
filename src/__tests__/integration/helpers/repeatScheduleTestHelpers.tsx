import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { render, screen, waitFor, RenderResult } from '@testing-library/react';
import { UserEvent, userEvent } from '@testing-library/user-event';
import { SnackbarProvider } from 'notistack';
import { ReactElement } from 'react';

const theme = createTheme();

/**
 * 테스트용 App 렌더링 및 user-event setup
 */
export const setupTestApp = (element: ReactElement): RenderResult & { user: UserEvent } => {
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
 * 반복 일정 저장 헬퍼 함수
 */
export const saveRepeatSchedule = async (
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

  // 반복 일정 체크박스 활성화
  await activateRepeatCheckbox(user);

  // 반복 유형 선택
  await selectRepeatType(user, repeatType);

  // 반복 종료일 입력
  await inputRepeatEndDate(user, repeatEndDate);

  await user.click(screen.getByTestId('event-submit-button'));
};

/**
 * 반복 일정 체크박스 활성화
 */
const activateRepeatCheckbox = async (user: UserEvent) => {
  const repeatCheckbox = screen.getByLabelText('반복 일정') as HTMLInputElement;

  // 체크박스가 이미 checked 상태이면 unchecked로 만들기
  if (repeatCheckbox.checked) {
    await user.click(repeatCheckbox);
  }

  // checked 상태로 만들기
  await user.click(repeatCheckbox);
};

/**
 * 반복 유형 선택
 */
const selectRepeatType = async (
  user: UserEvent,
  repeatType: 'daily' | 'weekly' | 'monthly' | 'yearly'
) => {
  // 반복 유형 Select가 나타날 때까지 대기
  await waitFor(() => {
    const repeatTypeSelect = document.getElementById('repeat-type');
    expect(repeatTypeSelect).not.toBeNull();
  });

  const repeatTypeSelect = document.getElementById('repeat-type');
  await user.click(repeatTypeSelect!);

  // Select가 열릴 때까지 대기
  await waitFor(() => {
    const option = document.getElementById(`${repeatType}-option`);
    expect(option).not.toBeNull();
  });

  const option = document.getElementById(`${repeatType}-option`);
  await user.click(option!);
};

/**
 * 반복 종료일 입력
 */
const inputRepeatEndDate = async (user: UserEvent, repeatEndDate: string) => {
  // 반복 종료일 입력 필드가 렌더링될 때까지 대기
  await waitFor(() => {
    const input = document.getElementById('repeat-end-date');
    expect(input).not.toBeNull();
  });

  const repeatEndDateInput = document.getElementById('repeat-end-date')!;
  await user.click(repeatEndDateInput);
  await user.clear(repeatEndDateInput);
  await user.type(repeatEndDateInput, repeatEndDate);
};
