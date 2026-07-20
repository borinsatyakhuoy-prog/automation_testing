import { defineConfig } from 'allure';

export default defineConfig({
  name: 'Family Partners (FAPA) QA Report',
  output: './allure-report',
  historyPath: './allure-history/history.jsonl',
  plugins: {
    awesome: {
      options: {
        reportName: 'Family Partners (FAPA) QA Report',
        singleFile: false,
        reportLanguage: 'en',
      },
    },
  },
});
