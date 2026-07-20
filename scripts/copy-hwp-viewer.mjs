/**
 * hwp.js(한글 뷰어) ESM 을 public/vendor/ 로 복사한다.
 *
 * 왜 번들하지 않고 벤더링하나:
 *  - Turbopack 프로덕션 최적화가 hwp.js 의 옵션 전달(Viewer→parse→cfb.read)을 망가뜨려
 *    `{type:'array'}` 가 cfb 까지 닿지 않는다(→ "s.split is not a function").
 *  - 그래서 브라우저가 원본 ESM 을 그대로 네이티브 import 하도록 /vendor/hwp.js 로 서빙하고,
 *    HwpBody 는 `import(/* turbopackIgnore: true *\/ "/vendor/hwp.js")` 로 로드한다.
 *  - 브라우저는 bare 'fs' 를 못 푸므로(라이브러리 내부 cfb 의 node 전용 import, 런타임 미사용)
 *    그 한 줄만 빈 객체로 치환한다.
 *
 * postinstall / prebuild / predev 에서 자동 실행된다.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const src = join(root, "node_modules", "hwp.js", "build", "esm.js");
const destDir = join(root, "public", "vendor");
const dest = join(destDir, "hwp.js");

if (!existsSync(src)) {
  console.warn("[copy-hwp-viewer] hwp.js 를 찾지 못했습니다:", src);
  process.exit(0);
}

let code = readFileSync(src, "utf8");
const before = code;
// node 전용 `import X from 'fs'` 한 줄만 빈 객체로 치환(브라우저 네이티브 import 가능하도록)
code = code.replace(/^import\s+([\w$]+)\s+from\s+['"]fs['"];?/m, "const $1 = {};");

if (code === before) {
  console.warn("[copy-hwp-viewer] 'fs' import 를 찾지 못했습니다 — hwp.js 버전이 바뀌었는지 확인 필요");
  process.exit(1);
}
if (/from\s+['"]fs['"]/.test(code)) {
  console.warn("[copy-hwp-viewer] 치환 후에도 'fs' import 가 남아 있습니다");
  process.exit(1);
}

mkdirSync(destDir, { recursive: true });
writeFileSync(dest, code);
console.log("[copy-hwp-viewer] →", dest);
