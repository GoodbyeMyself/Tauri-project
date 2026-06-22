export interface HolidayInfo {
  name: string
  isOff?: boolean
  isWork?: boolean
}

// 每年固定日期的节日（非放假类）
const FIXED_HOLIDAYS: Record<string, HolidayInfo> = {
  '02-14': { name: '情人节' },
  '03-08': { name: '妇女节' },
  '03-12': { name: '植树节' },
  '04-01': { name: '愚人节' },
  '06-01': { name: '儿童节' },
  '07-01': { name: '建党节' },
  '08-01': { name: '建军节' },
  '09-10': { name: '教师节' },
  '11-11': { name: '双十一' },
  '12-24': { name: '平安夜' },
  '12-25': { name: '圣诞节' },
}

// 按年份的放假日 + 农历节日（公历日期）
const YEARLY_HOLIDAYS: Record<string, HolidayInfo> = {
  // ==================== 2025 ====================
  // 元旦
  '2025-01-01': { name: '元旦', isOff: true },
  // 春节 1.28~2.4（8天）
  '2025-01-28': { name: '除夕', isOff: true },
  '2025-01-29': { name: '春节', isOff: true },
  '2025-01-30': { name: '初二', isOff: true },
  '2025-01-31': { name: '初三', isOff: true },
  '2025-02-01': { name: '初四', isOff: true },
  '2025-02-02': { name: '初五', isOff: true },
  '2025-02-03': { name: '初六', isOff: true },
  '2025-02-04': { name: '初七', isOff: true },
  '2025-02-12': { name: '元宵节' },
  // 清明 4.4~4.6（3天）
  '2025-04-04': { name: '清明', isOff: true },
  '2025-04-05': { name: '清明', isOff: true },
  '2025-04-06': { name: '清明', isOff: true },
  // 劳动节 5.1~5.5（5天）
  '2025-05-01': { name: '劳动节', isOff: true },
  '2025-05-02': { name: '劳动', isOff: true },
  '2025-05-03': { name: '劳动', isOff: true },
  '2025-05-04': { name: '劳动', isOff: true },
  '2025-05-05': { name: '劳动', isOff: true },
  // 端午 5.31~6.2（3天）
  '2025-05-31': { name: '端午', isOff: true },
  '2025-06-01': { name: '端午', isOff: true },
  '2025-06-02': { name: '端午', isOff: true },
  // 七夕
  '2025-08-29': { name: '七夕' },
  // 国庆+中秋 10.1~10.8（8天）
  '2025-10-01': { name: '国庆节', isOff: true },
  '2025-10-02': { name: '国庆', isOff: true },
  '2025-10-03': { name: '国庆', isOff: true },
  '2025-10-04': { name: '国庆', isOff: true },
  '2025-10-05': { name: '国庆', isOff: true },
  '2025-10-06': { name: '中秋', isOff: true },
  '2025-10-07': { name: '国庆', isOff: true },
  '2025-10-08': { name: '国庆', isOff: true },
  '2025-10-29': { name: '重阳节' },

  // ==================== 2026 ====================
  // 元旦 1.1~1.3（3天）
  '2026-01-01': { name: '元旦', isOff: true },
  '2026-01-02': { name: '元旦', isOff: true },
  '2026-01-03': { name: '元旦', isOff: true },
  // 春节 2.15~2.23（9天）
  '2026-02-15': { name: '除夕', isOff: true },
  '2026-02-16': { name: '除夕', isOff: true },
  '2026-02-17': { name: '春节', isOff: true },
  '2026-02-18': { name: '初二', isOff: true },
  '2026-02-19': { name: '初三', isOff: true },
  '2026-02-20': { name: '初四', isOff: true },
  '2026-02-21': { name: '初五', isOff: true },
  '2026-02-22': { name: '初六', isOff: true },
  '2026-02-23': { name: '初七', isOff: true },
  '2026-03-03': { name: '元宵节' },
  // 清明 4.4~4.6（3天）
  '2026-04-04': { name: '清明', isOff: true },
  '2026-04-05': { name: '清明', isOff: true },
  '2026-04-06': { name: '清明', isOff: true },
  // 劳动节 5.1~5.5（5天）
  '2026-05-01': { name: '劳动节', isOff: true },
  '2026-05-02': { name: '劳动', isOff: true },
  '2026-05-03': { name: '劳动', isOff: true },
  '2026-05-04': { name: '劳动', isOff: true },
  '2026-05-05': { name: '劳动', isOff: true },
  // 端午 6.19~6.21（3天）
  '2026-06-19': { name: '端午', isOff: true },
  '2026-06-20': { name: '端午', isOff: true },
  '2026-06-21': { name: '端午', isOff: true },
  // 七夕
  '2026-08-19': { name: '七夕' },
  // 中秋 9.25~9.27（3天）
  '2026-09-25': { name: '中秋', isOff: true },
  '2026-09-26': { name: '中秋', isOff: true },
  '2026-09-27': { name: '中秋', isOff: true },
  // 国庆 10.1~10.7（7天）
  '2026-10-01': { name: '国庆节', isOff: true },
  '2026-10-02': { name: '国庆', isOff: true },
  '2026-10-03': { name: '国庆', isOff: true },
  '2026-10-04': { name: '国庆', isOff: true },
  '2026-10-05': { name: '国庆', isOff: true },
  '2026-10-06': { name: '国庆', isOff: true },
  '2026-10-07': { name: '国庆', isOff: true },
  '2026-10-18': { name: '重阳节' },

  // ==================== 2027 ====================
  // 元旦 1.1~1.3（3天）
  '2027-01-01': { name: '元旦', isOff: true },
  '2027-01-02': { name: '元旦', isOff: true },
  '2027-01-03': { name: '元旦', isOff: true },
  // 春节 2.5~2.13（9天）
  '2027-02-05': { name: '除夕', isOff: true },
  '2027-02-06': { name: '春节', isOff: true },
  '2027-02-07': { name: '初二', isOff: true },
  '2027-02-08': { name: '初三', isOff: true },
  '2027-02-09': { name: '初四', isOff: true },
  '2027-02-10': { name: '初五', isOff: true },
  '2027-02-11': { name: '初六', isOff: true },
  '2027-02-12': { name: '初七', isOff: true },
  '2027-02-13': { name: '初八', isOff: true },
  '2027-02-20': { name: '元宵节' },
  // 清明 4.4~4.6（3天）
  '2027-04-04': { name: '清明', isOff: true },
  '2027-04-05': { name: '清明', isOff: true },
  '2027-04-06': { name: '清明', isOff: true },
  // 劳动节 5.1~5.5（5天）
  '2027-05-01': { name: '劳动节', isOff: true },
  '2027-05-02': { name: '劳动', isOff: true },
  '2027-05-03': { name: '劳动', isOff: true },
  '2027-05-04': { name: '劳动', isOff: true },
  '2027-05-05': { name: '劳动', isOff: true },
  // 端午 6.14~6.16（3天）
  '2027-06-14': { name: '端午', isOff: true },
  '2027-06-15': { name: '端午', isOff: true },
  '2027-06-16': { name: '端午', isOff: true },
  // 七夕
  '2027-08-08': { name: '七夕' },
  // 中秋 9.23~9.25（3天）
  '2027-09-23': { name: '中秋', isOff: true },
  '2027-09-24': { name: '中秋', isOff: true },
  '2027-09-25': { name: '中秋', isOff: true },
  // 国庆 10.1~10.7（7天）
  '2027-10-01': { name: '国庆节', isOff: true },
  '2027-10-02': { name: '国庆', isOff: true },
  '2027-10-03': { name: '国庆', isOff: true },
  '2027-10-04': { name: '国庆', isOff: true },
  '2027-10-05': { name: '国庆', isOff: true },
  '2027-10-06': { name: '国庆', isOff: true },
  '2027-10-07': { name: '国庆', isOff: true },
  '2027-10-08': { name: '重阳节' },

  // ==================== 2028 ====================
  // 元旦 1.1~1.3（3天）
  '2028-01-01': { name: '元旦', isOff: true },
  '2028-01-02': { name: '元旦', isOff: true },
  '2028-01-03': { name: '元旦', isOff: true },
  // 春节 1.25~2.1（8天）
  '2028-01-25': { name: '除夕', isOff: true },
  '2028-01-26': { name: '春节', isOff: true },
  '2028-01-27': { name: '初二', isOff: true },
  '2028-01-28': { name: '初三', isOff: true },
  '2028-01-29': { name: '初四', isOff: true },
  '2028-01-30': { name: '初五', isOff: true },
  '2028-01-31': { name: '初六', isOff: true },
  '2028-02-01': { name: '初七', isOff: true },
  // 清明 4.4~4.6（3天）
  '2028-04-04': { name: '清明', isOff: true },
  '2028-04-05': { name: '清明', isOff: true },
  '2028-04-06': { name: '清明', isOff: true },
  // 劳动节 4.29~5.3（5天）
  '2028-04-29': { name: '劳动', isOff: true },
  '2028-04-30': { name: '劳动', isOff: true },
  '2028-05-01': { name: '劳动节', isOff: true },
  '2028-05-02': { name: '劳动', isOff: true },
  '2028-05-03': { name: '劳动', isOff: true },
  // 端午 6.10~6.12（3天）
  '2028-06-10': { name: '端午', isOff: true },
  '2028-06-11': { name: '端午', isOff: true },
  '2028-06-12': { name: '端午', isOff: true },
  // 国庆+中秋 10.1~10.8（8天）
  '2028-10-01': { name: '国庆节', isOff: true },
  '2028-10-02': { name: '国庆', isOff: true },
  '2028-10-03': { name: '中秋', isOff: true },
  '2028-10-04': { name: '国庆', isOff: true },
  '2028-10-05': { name: '国庆', isOff: true },
  '2028-10-06': { name: '国庆', isOff: true },
  '2028-10-07': { name: '国庆', isOff: true },
  '2028-10-08': { name: '国庆', isOff: true },
}

// 调休上班日（周末补班）
const WORK_DAYS: Record<string, HolidayInfo> = {
  // 2025
  '2025-01-26': { name: '班', isWork: true },
  '2025-02-08': { name: '班', isWork: true },
  '2025-04-27': { name: '班', isWork: true },
  '2025-09-28': { name: '班', isWork: true },
  '2025-10-11': { name: '班', isWork: true },
  // 2026
  '2026-01-04': { name: '班', isWork: true },
  '2026-02-14': { name: '班', isWork: true },
  '2026-02-28': { name: '班', isWork: true },
  '2026-05-09': { name: '班', isWork: true },
  '2026-09-20': { name: '班', isWork: true },
  '2026-10-10': { name: '班', isWork: true },
  // 2027
  '2027-01-31': { name: '班', isWork: true },
  '2027-02-14': { name: '班', isWork: true },
  '2027-05-08': { name: '班', isWork: true },
  '2027-09-26': { name: '班', isWork: true },
  '2027-10-09': { name: '班', isWork: true },
  // 2028
  '2028-01-23': { name: '班', isWork: true },
  '2028-02-05': { name: '班', isWork: true },
  '2028-05-06': { name: '班', isWork: true },
  '2028-09-24': { name: '班', isWork: true },
  '2028-10-07': { name: '班', isWork: true },
}

// 浮动节日（按规则计算）
function getNthWeekday(year: number, month: number, weekday: number, nth: number): string {
  let count = 0
  for (let d = 1; d <= 31; d++) {
    const date = new Date(year, month - 1, d)
    if (date.getMonth() !== month - 1) break
    if (date.getDay() === weekday) {
      count++
      if (count === nth) {
        const mm = String(month).padStart(2, '0')
        const dd = String(d).padStart(2, '0')
        return `${year}-${mm}-${dd}`
      }
    }
  }
  return ''
}

function getFloatingHolidays(year: number): Record<string, HolidayInfo> {
  const map: Record<string, HolidayInfo> = {}
  const mothersDay = getNthWeekday(year, 5, 0, 2)
  if (mothersDay) map[mothersDay] = { name: '母亲节' }
  const fathersDay = getNthWeekday(year, 6, 0, 3)
  if (fathersDay) map[fathersDay] = { name: '父亲节' }
  const thanksgiving = getNthWeekday(year, 11, 4, 4)
  if (thanksgiving) map[thanksgiving] = { name: '感恩节' }
  return map
}

const floatingCache: Record<number, Record<string, HolidayInfo>> = {}

function getFloatingCached(year: number): Record<string, HolidayInfo> {
  if (!floatingCache[year]) floatingCache[year] = getFloatingHolidays(year)
  return floatingCache[year]
}

export function getHoliday(dateStr: string): HolidayInfo | null {
  if (WORK_DAYS[dateStr]) return WORK_DAYS[dateStr]

  if (YEARLY_HOLIDAYS[dateStr]) return YEARLY_HOLIDAYS[dateStr]

  const year = parseInt(dateStr.slice(0, 4))
  const floating = getFloatingCached(year)
  if (floating[dateStr]) return floating[dateStr]

  const mmdd = dateStr.slice(5)
  if (FIXED_HOLIDAYS[mmdd]) return FIXED_HOLIDAYS[mmdd]

  return null
}
