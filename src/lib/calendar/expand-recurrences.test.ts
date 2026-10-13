import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { expandRecurrences } from './expand-recurrences'

describe('expandRecurrences occurrence end dates', () => {
  it('keeps later weeks of a single-day weekly series on that occurrence day', () => {
    // Trivia Night shape: one master, end_date is the first Thursday,
    // and the rule keeps producing Thursdays after that.
    const master = {
      id: 'trivia',
      title: 'Trivia Night',
      start_date: '2026-09-03',
      end_date: '2026-09-03',
      start_time: '19:00:00',
      end_time: '21:00:00',
      recurrence_rule: 'FREQ=WEEKLY;BYDAY=TH;UNTIL=20261119T235959Z',
    }

    const rows = expandRecurrences(
      [master],
      new Date('2026-10-01T00:00:00Z'),
      new Date('2026-10-31T23:59:59Z'),
    )

    assert.deepEqual(rows.map(r => r.start_date), [
      '2026-10-01',
      '2026-10-08',
      '2026-10-15',
      '2026-10-22',
      '2026-10-29',
    ])
    for (const row of rows) {
      assert.equal(row.end_date, row.start_date)
      assert.ok(row.end_date >= row.start_date)
      assert.equal(row.start_time, '19:00:00')
      assert.equal(row.end_time, '21:00:00')
      assert.notEqual(row.end_date, '2026-11-19')
    }
    // Canonical master is what detail pages and JSON-LD read.
    assert.equal(master.start_date, '2026-09-03')
    assert.equal(master.end_date, '2026-09-03')
  })

  it('does not stretch a weekly occurrence out to a series boundary stored on the master', () => {
    const rows = expandRecurrences(
      [{
        title: 'Weekly Wedge',
        start_date: '2026-01-06',
        end_date: '2026-06-02',
        start_time: '19:00:00',
        end_time: null,
        recurrence_rule: 'FREQ=WEEKLY;BYDAY=TU;UNTIL=20261027T235959Z',
      }],
      new Date('2026-10-01T00:00:00Z'),
      new Date('2026-10-31T23:59:59Z'),
    )

    assert.ok(rows.length > 0)
    for (const row of rows) {
      assert.equal(row.end_date, row.start_date)
    }
  })

  it('preserves a multi-day weekly occurrence length on later weeks', () => {
    const rows = expandRecurrences(
      [{
        title: 'Weekend Market',
        start_date: '2026-09-04',
        end_date: '2026-09-06',
        recurrence_rule: 'FREQ=WEEKLY;BYDAY=FR;UNTIL=20261101T235959Z',
      }],
      new Date('2026-10-01T00:00:00Z'),
      new Date('2026-10-31T23:59:59Z'),
    )

    const oct2 = rows.find(r => r.start_date === '2026-10-02')
    assert.ok(oct2)
    assert.equal(oct2.end_date, '2026-10-04')
    assert.ok(oct2.end_date >= oct2.start_date)
  })

  it('keeps the series end on each day of a continuous FREQ=DAILY event', () => {
    // NewSouth sidewalk sale: one daily series whose end_date is the
    // real last day, not the first day's end.
    const rows = expandRecurrences(
      [{
        title: 'NewSouth Sidewalk Sale',
        start_date: '2026-09-30',
        end_date: '2026-10-03',
        start_time: '10:00:00',
        end_time: '16:00:00',
        recurrence_rule: 'FREQ=DAILY;UNTIL=20261003T235959Z',
      }],
      new Date('2026-09-28T00:00:00Z'),
      new Date('2026-10-10T23:59:59Z'),
    )

    assert.deepEqual(
      rows.map(r => [r.start_date, r.end_date, r.end_time]),
      [
        ['2026-09-30', '2026-10-03', '16:00:00'],
        ['2026-10-01', '2026-10-03', '16:00:00'],
        ['2026-10-02', '2026-10-03', '16:00:00'],
        ['2026-10-03', '2026-10-03', '16:00:00'],
      ],
    )
  })

  it('leaves an unsplit multi-day master on its real span', () => {
    // Alabama National Fair style: start and end differ, no recurrence,
    // so there is no per-day split to re-date.
    const fair = {
      title: 'Alabama National Fair',
      start_date: '2026-10-08',
      end_date: '2026-10-18',
      start_time: '09:00:00',
      end_time: null,
      recurrence_rule: null,
    }
    const rows = expandRecurrences(
      [fair],
      new Date('2026-10-01T00:00:00Z'),
      new Date('2026-10-31T23:59:59Z'),
    )

    assert.equal(rows.length, 1)
    assert.equal(rows[0].start_date, '2026-10-08')
    assert.equal(rows[0].end_date, '2026-10-18')
    assert.equal(fair.end_date, '2026-10-18')
  })
})
