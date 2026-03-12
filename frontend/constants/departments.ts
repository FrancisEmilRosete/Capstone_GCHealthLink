export type DepartmentCode = 'CAHS' | 'CBA' | 'CCS' | 'CEAS' | 'CHTM';

export interface DepartmentCourseEntry {
  code: DepartmentCode;
  name: string;
  courses: string[];
}

export const DEPARTMENT_COURSE_MAP: DepartmentCourseEntry[] = [
  {
    code: 'CAHS',
    name: 'College of Allied Health Studies',
    courses: [
      'Bachelor of Science in Nursing',
      'Bachelor of Science in Midwifery',
    ],
  },
  {
    code: 'CBA',
    name: 'College of Business and Accountancy',
    courses: [
      'Bachelor of Science in Accountancy',
      'Bachelor of Science in Business Administration Major in Financial Management',
      'Bachelor of Science in Business Administration Major in Human Resource Management',
      'Bachelor of Science in Business Administration Major in Marketing Management',
      'Bachelor of Science in Customs Administration',
    ],
  },
  {
    code: 'CCS',
    name: 'College of Computer Studies',
    courses: [
      'Bachelor of Science in Computer Science',
      'Bachelor of Science in Entertainment and Multimedia Computing',
      'Bachelor of Science in Information Technology',
    ],
  },
  {
    code: 'CEAS',
    name: 'College of Education, Arts, and Sciences',
    courses: [
      'Bachelor of Arts in Communication',
      'Bachelor of Early Childhood Education',
      'Bachelor of Culture and Arts Education',
      'Bachelor of Physical Education',
      'Bachelor of Elementary Education (General Education)',
      'Bachelor of Secondary Education major in English',
      'Bachelor of Secondary Education major in Filipino',
      'Bachelor of Secondary Education major in Mathematics',
      'Bachelor of Secondary Education major in Social Studies',
      'Bachelor of Secondary Education major in Science',
      'Teacher Certificate Program (TCP)',
    ],
  },
  {
    code: 'CHTM',
    name: 'College of Hospitality and Tourism Management',
    courses: [
      'Bachelor of Science in Hospitality Management',
      'Bachelor of Science in Tourism Management',
    ],
  },
];

export const VALID_DEPARTMENT_CODES = DEPARTMENT_COURSE_MAP.map((entry) => entry.code);

export function normalizeDepartmentCode(value: unknown): string {
  return typeof value === 'string' ? value.trim().toUpperCase() : '';
}

export function isValidDepartmentCode(value: unknown): value is DepartmentCode {
  const code = normalizeDepartmentCode(value);
  return VALID_DEPARTMENT_CODES.includes(code as DepartmentCode);
}

export function getCoursesByDepartmentCode(value: unknown): string[] {
  const code = normalizeDepartmentCode(value);
  const entry = DEPARTMENT_COURSE_MAP.find((department) => department.code === code);
  return entry ? entry.courses : [];
}

export function isValidCourseForDepartment(course: unknown, departmentCode: unknown): boolean {
  if (typeof course !== 'string' || !course.trim()) {
    return false;
  }

  return getCoursesByDepartmentCode(departmentCode).includes(course.trim());
}
