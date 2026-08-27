/**
 * إعداد Jest للواجهة — عبر next/jest (يدعم SWC ومسارات @/*).
 * يُشغَّل عبر: npm run test (jest --ci)
 */

const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // مسار مجلد الواجهة (لحل إعدادات Next.js)
  dir: './',
});

/** @type {import('jest').Config} */
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.next/'],
  // يمنع تصادم Haste بين frontend/package.json ونسخة .next/standalone الناتجة
  // عن next build عند تشغيل الاختبارات من جذر المشروع (T-TEST-HYGIENE-1).
  modulePathIgnorePatterns: ['<rootDir>/.next/'],
  // ⚠️ بيئات CI/Windows البطيئة (قرص + تشغيل متوازٍ لكل المجموعات): أُثبت
  // فعلياً أن مجموعات RTL الثقيلة (review/page، TextField، ChatScreen…)
  // تتجاوز المهلة الافتراضية 5000ms عند التشغيل المتوازي الكامل — كل مجموعة
  // تمرّ وحدها في ~18-33s. رفع testTimeout يمنحها الوقت الكافي دون إضعاف
  // أي تأكيد (assertion) — لم نُعدّل أي منطق اختبار.
  testTimeout: 30000,
};

module.exports = createJestConfig(customJestConfig);
