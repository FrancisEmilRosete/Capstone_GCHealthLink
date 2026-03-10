const DEPARTMENT_COURSE_MAP = Object.freeze([
  {
    code: "CAHS",
    name: "College of Allied Health Studies",
    courses: [
      "Bachelor of Science in Nursing",
      "Bachelor of Science in Midwifery",
    ],
  },
  {
    code: "CBA",
    name: "College of Business and Accountancy",
    courses: [
      "Bachelor of Science in Accountancy",
      "Bachelor of Science in Business Administration Major in Financial Management",
      "Bachelor of Science in Business Administration Major in Human Resource Management",
      "Bachelor of Science in Business Administration Major in Marketing Management",
      "Bachelor of Science in Customs Administration",
    ],
  },
  {
    code: "CCS",
    name: "College of Computer Studies",
    courses: [
      "Bachelor of Science in Computer Science",
      "Bachelor of Science in Entertainment and Multimedia Computing",
      "Bachelor of Science in Information Technology",
    ],
  },
  {
    code: "CEAS",
    name: "College of Education, Arts, and Sciences",
    courses: [
      "Bachelor of Arts in Communication",
      "Bachelor of Early Childhood Education",
      "Bachelor of Culture and Arts Education",
      "Bachelor of Physical Education",
      "Bachelor of Elementary Education (General Education)",
      "Bachelor of Secondary Education major in English",
      "Bachelor of Secondary Education major in Filipino",
      "Bachelor of Secondary Education major in Mathematics",
      "Bachelor of Secondary Education major in Social Studies",
      "Bachelor of Secondary Education major in Science",
      "Teacher Certificate Program (TCP)",
    ],
  },
  {
    code: "CHTM",
    name: "College of Hospitality and Tourism Management",
    courses: [
      "Bachelor of Science in Hospitality Management",
      "Bachelor of Science in Tourism Management",
    ],
  },
]);

const DEPARTMENT_MAP_BY_CODE = Object.freeze(
  Object.fromEntries(DEPARTMENT_COURSE_MAP.map((entry) => [entry.code, entry]))
);

const VALID_DEPARTMENT_CODES = Object.freeze(DEPARTMENT_COURSE_MAP.map((entry) => entry.code));
const VALID_DEPARTMENT_CODE_SET = new Set(VALID_DEPARTMENT_CODES);

function normalizeDepartmentCode(value) {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

function getDepartmentByCode(value) {
  const code = normalizeDepartmentCode(value);
  return DEPARTMENT_MAP_BY_CODE[code] || null;
}

function getCoursesByDepartmentCode(value) {
  const department = getDepartmentByCode(value);
  return department ? department.courses : [];
}

function isValidDepartmentCode(value) {
  return VALID_DEPARTMENT_CODE_SET.has(normalizeDepartmentCode(value));
}

function isValidCourseForDepartment(course, departmentCode) {
  if (typeof course !== "string") {
    return false;
  }

  const normalizedCourse = course.trim();
  if (!normalizedCourse) {
    return false;
  }

  const validCourses = getCoursesByDepartmentCode(departmentCode);
  return validCourses.includes(normalizedCourse);
}

module.exports = {
  DEPARTMENT_COURSE_MAP,
  VALID_DEPARTMENT_CODES,
  normalizeDepartmentCode,
  getDepartmentByCode,
  getCoursesByDepartmentCode,
  isValidDepartmentCode,
  isValidCourseForDepartment,
};
