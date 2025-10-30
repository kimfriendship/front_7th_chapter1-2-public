import { EventForm } from '../../types';
import { generateRepeatEvents } from '../../utils/repeatSchedule';

describe('generateRepeatEvents - TC-001: 매일 반복 일정 생성', () => {
  const baseEvent: EventForm = {
    title: '테스트 일정',
    date: '2025-01-01',
    startTime: '09:00',
    endTime: '10:00',
    description: '',
    location: '',
    category: '',
    repeat: { type: 'daily', interval: 1, endDate: '2025-12-31' },
    notificationTime: 10,
  };

  it('2025-01-01부터 매일 반복 일정을 생성하면 365개의 일정이 생성되어야 한다', () => {
    const events = generateRepeatEvents(baseEvent);

    expect(events).toHaveLength(365);
  });

  it('첫 번째 일정의 날짜는 시작 날짜와 일치해야 한다', () => {
    const events = generateRepeatEvents(baseEvent);

    expect(events[0].date).toBe('2025-01-01');
  });

  it('마지막 일정의 날짜는 종료 날짜와 일치해야 한다', () => {
    const events = generateRepeatEvents(baseEvent);

    expect(events[events.length - 1].date).toBe('2025-12-31');
  });

  it('연속된 날짜 사이의 간격이 1일인지 확인한다', () => {
    const events = generateRepeatEvents(baseEvent);

    for (let i = 0; i < events.length - 1; i++) {
      const currentDate = new Date(events[i].date);
      const nextDate = new Date(events[i + 1].date);
      const diffDays = (nextDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBe(1);
    }
  });

  it('모든 일정이 동일한 제목, 시간, 설명 등의 정보를 가져야 한다', () => {
    const events = generateRepeatEvents(baseEvent);

    events.forEach((event) => {
      expect(event.title).toBe(baseEvent.title);
      expect(event.startTime).toBe(baseEvent.startTime);
      expect(event.endTime).toBe(baseEvent.endTime);
      expect(event.description).toBe(baseEvent.description);
      expect(event.location).toBe(baseEvent.location);
      expect(event.category).toBe(baseEvent.category);
      expect(event.notificationTime).toBe(baseEvent.notificationTime);
    });
  });

  it('반복 일정은 일정 겹침을 고려하지 않는다', () => {
    const events = generateRepeatEvents(baseEvent);

    // 같은 시간대의 일정이 여러 개 있어도 문제없어야 함
    expect(events.length).toBe(365);
    expect(events.every((e) => e.startTime === '09:00' && e.endTime === '10:00')).toBe(true);
  });
});

describe('generateRepeatEvents - TC-002: 매주 반복 일정 생성', () => {
  const baseEvent: EventForm = {
    title: '주간 회의',
    date: '2025-01-01', // 수요일
    startTime: '14:00',
    endTime: '15:00',
    description: '',
    location: '',
    category: '',
    repeat: { type: 'weekly', interval: 1, endDate: '2025-12-31' },
    notificationTime: 30,
  };

  it('2025-01-01(수요일)부터 매주 반복 일정을 생성하면 53개의 일정이 생성되어야 한다', () => {
    const events = generateRepeatEvents(baseEvent);

    expect(events).toHaveLength(53); // 2025년 1월 1일부터 12월 31일까지 매주 수요일 = 53개
  });

  it('첫 번째 일정의 날짜는 시작 날짜와 일치해야 한다', () => {
    const events = generateRepeatEvents(baseEvent);

    expect(events[0].date).toBe('2025-01-01');
  });

  it('모든 일정이 수요일에 생성되어야 한다', () => {
    const events = generateRepeatEvents(baseEvent);

    events.forEach((event) => {
      const date = new Date(event.date);
      expect(date.getDay()).toBe(3); // 3 = 수요일
    });
  });
});

describe('generateRepeatEvents - TC-003: 매월 반복 일정 생성 (일반 날짜)', () => {
  const baseEvent: EventForm = {
    title: '월간 회의',
    date: '2025-01-15',
    startTime: '10:00',
    endTime: '11:00',
    description: '',
    location: '',
    category: '',
    repeat: { type: 'monthly', interval: 1, endDate: '2025-12-31' },
    notificationTime: 15,
  };

  it('첫 번째 일정의 날짜는 시작 날짜와 일치해야 한다', () => {
    const events = generateRepeatEvents(baseEvent);

    expect(events[0].date).toBe('2025-01-15');
  });

  it('모든 일정이 15일에 생성되어야 한다', () => {
    const events = generateRepeatEvents(baseEvent);

    events.forEach((event) => {
      const date = new Date(event.date);
      expect(date.getDate()).toBe(15);
    });
  });

  it('1월부터 12월까지 각 월에 정확히 1개씩 일정이 생성되어야 한다', () => {
    const events = generateRepeatEvents(baseEvent);

    expect(events).toHaveLength(12);

    const actualMonths = events.map((event) => new Date(event.date).getMonth() + 1);
    const expectedMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

    expect(actualMonths).toEqual(expectedMonths);
  });
});

describe('generateRepeatEvents - TC-004: 매월 반복 일정 생성 (31일 처리)', () => {
  const baseEvent: EventForm = {
    title: '월말 정산',
    date: '2025-01-31',
    startTime: '18:00',
    endTime: '19:00',
    description: '',
    location: '',
    category: '',
    repeat: { type: 'monthly', interval: 1, endDate: '2025-12-31' },
    notificationTime: 60,
  };

  it('2025-01-31부터 매월 반복 일정을 생성하면 7개의 일정이 생성되어야 한다', () => {
    const events = generateRepeatEvents(baseEvent);

    expect(events).toHaveLength(7); // 31일이 있는 월만: 1, 3, 5, 7, 8, 10, 12월
  });

  it('첫 번째 일정의 날짜는 시작 날짜와 일치해야 한다', () => {
    const events = generateRepeatEvents(baseEvent);

    expect(events[0].date).toBe('2025-01-31');
  });

  it('모든 일정이 31일에 생성되어야 한다', () => {
    const events = generateRepeatEvents(baseEvent);

    events.forEach((event) => {
      const date = new Date(event.date);
      expect(date.getDate()).toBe(31);
    });
  });

  it('31일이 있는 월(1, 3, 5, 7, 8, 10, 12월)에만 일정이 생성되어야 한다', () => {
    const events = generateRepeatEvents(baseEvent);

    const actualMonths = events.map((event) => new Date(event.date).getMonth() + 1);
    const expectedMonths = [1, 3, 5, 7, 8, 10, 12];

    expect(actualMonths).toEqual(expectedMonths);
  });
});

describe('generateRepeatEvents - TC-005: 매년 반복 일정 생성 (일반 날짜)', () => {
  const baseEvent: EventForm = {
    title: '연간 회의',
    date: '2025-06-15',
    startTime: '09:00',
    endTime: '17:00',
    description: '',
    location: '',
    category: '',
    repeat: { type: 'yearly', interval: 1, endDate: '2025-12-31' },
    notificationTime: 1440,
  };

  it('2025-06-15부터 매년 반복 일정을 생성하면 1개의 일정만 생성되어야 한다', () => {
    const events = generateRepeatEvents(baseEvent);

    expect(events).toHaveLength(1); // 같은 해 내에서는 1개만 생성
  });

  it('일정이 2025년 6월 15일에 생성되어야 한다', () => {
    const events = generateRepeatEvents(baseEvent);

    expect(events).toHaveLength(1);

    const date = new Date(events[0].date);
    expect(date.getFullYear()).toBe(2025);
    expect(date.getMonth() + 1).toBe(6);
    expect(date.getDate()).toBe(15);
  });
});
