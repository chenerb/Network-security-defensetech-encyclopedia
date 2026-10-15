import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { buildSite } from './site-content.mjs';

export { buildSite } from './site-content.mjs';

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { totals } = await buildSite({ rootDir: fileURLToPath(new URL('../', import.meta.url)) });
    console.log(
      `网站内容：${totals.lessons}篇课程、${totals.exams}套试卷、${totals.questions}题（${totals.choice}选择/${totals.open}开放），${totals.chapters}章。`,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
