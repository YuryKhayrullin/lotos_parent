import type { Child, Lesson, Overview, Preview } from './contracts'
import { addDays, localDay, mondayOf } from './contracts'
export function createPreview(): Preview {
  const today = localDay('Europe/Moscow')
  const children: Child[] = [
    {
      id: 'preview-maria',
      name: 'Мария Соколова',
      birthDate: '2018-08-26',
      branchName: 'Основной бассейн',
      timeZone: 'Europe/Moscow',
      category: 'synchronized_swimming',
      lessonsPerWeek: 3,
      status: 'active',
    },
    {
      id: 'preview-petya',
      name: 'Петя Соколов',
      birthDate: '2020-06-12',
      branchName: 'Основной бассейн',
      timeZone: 'Europe/Moscow',
      category: 'swimming',
      lessonsPerWeek: 2,
      status: 'active',
    },
  ]
  const weekStart = mondayOf(today)
  const makeLesson = (offset: number, attendance: Lesson['attendance'] = null): Lesson => {
    const day = addDays(today, offset)
    return {
      id: 'preview-lesson-' + offset,
      title: 'Синхронное плавание',
      localDate: day,
      startsAt: day + 'T15:30:00.000Z',
      endsAt: day + 'T17:00:00.000Z',
      timeZone: 'Europe/Moscow',
      location: 'Бассейн 1',
      coachName: 'Елена Викторовна',
      status: offset < 0 ? 'completed' : 'scheduled',
      attendance,
    }
  }
  const schedule = [makeLesson(1), makeLesson(3), makeLesson(5)]
  const maria: Overview = {
    child: children[0],
    remainingLessons: 18,
    weekStart,
    weekEnd: addDays(weekStart, 6),
    nextLesson: schedule[0],
    schedule: schedule.filter((item) => item.localDate <= addDays(weekStart, 6)),
    attendance: { attended: 22, absent: 2, unmarked: 0, percent: 92, from: addDays(today, -29), to: today },
    history: Array.from({ length: 24 }, (_, i) => makeLesson(-1 - i, i < 2 ? 'absent' : 'attended')),
    historyHasMore: false,
    payments: {
      items: [
        {
          id: 'preview-payment',
          paidAt: addDays(today, -12) + 'T10:00:00.000Z',
          amountMinor: '2400000',
          lessonsAdded: 24,
          packageLessons: 12,
        },
      ],
      nextCursor: null,
    },
    updatedAt: new Date().toISOString(),
  }
  return {
    parentName: 'Анна',
    children,
    overviews: {
      [children[0].id]: maria,
      [children[1].id]: {
        ...maria,
        child: children[1],
        remainingLessons: 0,
        nextLesson: null,
        schedule: [],
        history: [],
        payments: { items: [], nextCursor: null },
        attendance: { ...maria.attendance, attended: 0, absent: 0, percent: null },
      },
    },
  }
}
