# 인수인계 메모 (pdflinkin)

> 마지막 갱신: 2026-07-13 / 최신 커밋 `4a5a2ee` (design: 애플 디자인 시스템으로 재구성)
> **아직 브라우저에서 실제로 카드를 만들어본 적이 한 번도 없다.** 아래 "가장 먼저 할 일" 참고.

---

## 1. 목적과 핵심 기능

카카오톡 "나에게 보내기"에 링크·PDF가 시간순으로 쌓이기만 하고 다시 못 찾는 문제를 푼다.
폴더처럼 "한 항목은 한 위치"를 강요하지 않고, **무한 캔버스 위 공간 배치 자체가 분류**가 되게 한다.

- **v1 범위: 데스크톱 웹 전용. 폰 연동 없음. 운영비 0원.** (기획 근거는 [plan.md](./plan.md))
- 핵심 동작
  - 캔버스에서 `Ctrl+V` → 커서 자리에 링크 카드 (OG 메타 자동 수집)
  - PDF·이미지 드래그앤드롭 → 놓은 자리에 카드 (썸네일·본문 텍스트 자동 추출)
  - 빈 곳 더블클릭 → 메모 카드 / 툴바 `그룹` → 프레임(카드를 끌어다 넣으면 소속·같이 이동)
  - `Ctrl+K` 검색 (제목·설명·메모·**PDF 본문**) → 고르면 캔버스가 그 카드로 이동
  - `Ctrl+Z`/`Ctrl+Shift+Z` 언두/리두, `Ctrl+D` 복제, `Delete` → 휴지통(복원 가능), `F` 화면 맞추기
  - 태그 + 태그 필터(안 맞는 카드는 흐려짐), 카드 간 연결선

---

## 2. 기술 스택

| 영역 | 선택 |
| --- | --- |
| 프레임워크 | Next.js **16.2.10** (App Router, Turbopack), React 19.2.4, TypeScript |
| 스타일 | Tailwind **v4** (`@theme` 토큰 방식), 폰트: `-apple-system` → Inter 폴백 |
| 캔버스 | `@xyflow/react` (React Flow) 12.11 — MIT |
| PDF | `pdfjs-dist` 6.1 (전부 브라우저에서 처리) |
| 상태 | zustand 5 |
| 백엔드 | Supabase (Postgres + Auth + Storage), `@supabase/ssr` 0.12 |
| 배포 | Vercel |

개발 환경: Windows 11, PowerShell, Node 22 / npm 10. **`gh` CLI 없음** (git push 는 자격증명 캐시로 동작함).

---

## 3. 폴더 구조와 파일 역할

```
src/
  middleware.ts                 세션 쿠키 갱신 + 인증 가드(비로그인 → /login). 환경변수 없으면 503 안내
  app/
    layout.tsx                  Inter 폰트, 흰 배경
    globals.css                 ★ 디자인 토큰(@theme) + React Flow 라이트 테마 오버라이드
    page.tsx                    / → /board 리다이렉트
    login/page.tsx              이메일+비밀번호 로그인/가입. Supabase 영문 오류를 한국어로 번역
    auth/callback/route.ts      이메일 확인 링크 → 세션 교환
    board/page.tsx              ★ 서버 컴포넌트. 보드 생성/조회, items·frames·edges·tags 로드,
                                  썸네일 서명 URL 일괄 발급. extracted_text 는 여기서 null 로 지움
    api/unfurl/route.ts         ★ OG 메타 수집. SSRF 방어(사설IP 차단·리다이렉트 재검사), DB 캐시
  components/board/
    BoardClient.tsx             전체 조립 + 태그 필터바 + 빈 화면 안내
    Canvas.tsx                  ★ React Flow. 노드/엣지 유도, 붙여넣기·드롭·단축키, 프레임 재소속 판정
    useIngest.ts                ★ 링크/파일 → 카드 생성 경로. 업로드·썸네일·본문추출
    Toolbar.tsx                 상단 프로스티드 바(52px). URL 입력, 메모/그룹, 언두, 검색, 휴지통, 로그아웃
    Inspector.tsx               단일 선택 시 우측 패널. 제목·색·태그·열기
    SearchPalette.tsx           Ctrl+K. DB 쿼리(pg_trgm) → 카드로 setCenter
    TrashPanel.tsx              휴지통. 복원 / 영구삭제(스토리지 파일까지)
    Viewer.tsx                  PDF 뷰어(페이지 이동·확대·이어읽기) / 이미지 라이트박스
    nodes/                      CardShell, LinkNode, PdfNode, ImageNode, NoteNode, FrameNode, types.ts
  store/
    board.ts                    ★★ 상태 + 언두/리두 + 스냅샷 diff 저장 큐. 이 앱의 심장
    selection.ts                선택된 노드/엣지 id
    viewer.ts                   뷰어 열림 상태
  lib/
    supabase/{client,server,env}.ts   브라우저/서버 클라이언트, 환경변수 확인
    types.ts                    DB Row 타입 + Database 제네릭
    pdf.ts                      pdfjs 동적 import, 썸네일 렌더, 텍스트 추출, destroyPdf
    storage.ts                  업로드, 서명 URL(7일), 삭제
    geometry.ts                 프레임 판정, 절대/상대 좌표 변환
    palette.ts                  카드/프레임 색 토큰 (Tailwind 정적 스캔 때문에 클래스 문자열 조립 금지)
    url.ts                      URL 정규화/추출, 파비콘 폴백
supabase/migrations/0001_init.sql   ★ 테이블 + 인덱스 + RLS + Storage 버킷·정책 (idempotent)
scripts/copy-pdf-worker.mjs         pdf.js 워커를 public/ 으로 복사 (postinstall/prebuild/predev)
```

---

## 4. 구현 완료된 것

- Supabase 스키마 전체(boards / frames / items / tags / item_tags / edges / link_meta_cache),
  모든 테이블 RLS, `files` 비공개 버킷 + 경로 기반 스토리지 정책, `pg_trgm` GIN 인덱스
- 이메일 로그인/가입, 미들웨어 인증 가드
- React Flow 캔버스: 팬·줌·다중선택·드래그·리사이즈·연결선·미니맵
- 프레임(그룹): 드롭 시 소속 자동 판정, 프레임 이동 시 자식 동반, 프레임 삭제해도 카드는 절대좌표로 보존
- 링크 붙여넣기(여러 개 동시 → 격자 배치), OG 메타 수집 + 캐시 + 폴백
- PDF/이미지 드래그앤드롭 업로드, 브라우저 썸네일 렌더 + 본문 텍스트 추출
- PDF 뷰어(이어읽기), 이미지 라이트박스
- 스냅샷 diff 기반 저장 큐 + 언두/리두 + 페이지 이탈 시 flush
- Ctrl+K 검색(PDF 본문 포함) → 카드로 줌 이동
- 태그 추가/삭제, 태그 필터(비매칭 카드 dim), 휴지통(복원/영구삭제)
- 애플 디자인 시스템 적용(아래 9번 참고)

**빌드·타입체크·lint 전부 통과.** 로컬 dev 서버에서 라우팅/인증가드/PDF 워커 서빙/unfurl 401 확인 완료.

---

## 5. 해결한 주요 문제 (다시 밟지 말 것)

| 문제 | 해결 |
| --- | --- |
| 디렉터리명에 한글 → `create-next-app` 이 npm 이름 규칙 위반으로 실패 | ASCII 하위 폴더에 생성 후 파일을 위로 이동 |
| `PDFDocumentProxy.destroy()` 가 pdfjs v6 에 없음 | `doc.loadingTask.destroy()` — `lib/pdf.ts` 의 `destroyPdf()` 사용 |
| React 19 lint 규칙 `react-hooks/set-state-in-effect` | effect 안에서 동기 setState 금지 → 비제어 입력(`defaultValue`+`key`), 모달은 부모가 조건부 마운트, 초기화는 async 콜백 안에서 |
| PDF 본문(extracted_text)이 초기 로딩을 무겁게 함 | 브라우저로 안 내려보냄. `board/page.tsx` 에서 null 처리, `store/board.ts` flush 가 upsert 페이로드에서 제거, `useIngest` 가 `flush()` 후 DB 에 직접 update. 검색은 DB 쿼리로 |
| Vercel 500 `MIDDLEWARE_INVOCATION_FAILED` | 원인은 **Vercel 환경변수 미설정**. 이제 `lib/supabase/env.ts` 가드가 503 + 안내문을 반환 |
| Postgres 기본 전문검색에 한국어 형태소 분석기 없음 | `pg_trgm` 부분일치 + GIN 인덱스 |

---

## 6. 남아 있는 오류 / 미완성

### 블로커
1. **Vercel 배포가 아직 안 됨.** https://pdflinkin.vercel.app 는 환경변수가 없어 동작 안 함
   (지금은 500 대신 503 + 안내문이 뜰 것). → 7번 조치 필요.
2. **Supabase 이메일 확인이 켜져 있음** (`mailer_autoconfirm: false`). 가입해도 메일 확인 전엔 로그인 불가.
3. **브라우저 end-to-end 검증 미완료.** 링크 붙여넣기 / PDF 업로드 / 프레임 드롭 / 언두 / 검색을
   실제로 눌러본 적이 없다. 여기서 버그가 나올 가능성이 가장 크다.

### 알려진 사소한 것
- Next 16 이 `middleware.ts` 대신 `proxy.ts` 를 권장 → 빌드 시 deprecation 경고. **동작에는 문제 없어 그대로 뒀다.**
- `item_kind` enum 에 `'file'` 이 있지만 `useIngest` 는 PDF·이미지만 받고 나머지는 alert 후 거부.
  `Canvas.tsx` 는 안전장치로 `'file'` → LinkNode 로 매핑.
- 태그 추가/삭제는 **언두 대상이 아니다** (DB 직접 write). 의도된 설계.
- `link_meta_cache` insert 실패(중복 URL 등)는 무시한다. 의도됨.

### 만들지 않은 것 (plan.md 의 v2)
브라우저 확장 + 인박스 / 폰 지원 / 페이지 스냅샷 아카이브 / PDF 하이라이트 / AI 자동 태깅

---

## 7. 환경변수 · API · 배포

### 환경변수 (2개뿐)
```env
NEXT_PUBLIC_SUPABASE_URL=https://nfwthowdcyciorqabiae.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon / public key>
```
- 로컬: `.env.local` 에 **실제 키가 이미 들어 있음** (gitignore 됨). `.env.example` 은 커밋됨.
- `anon key` 는 공개돼도 되는 키. 보호는 전적으로 RLS 담당. **`service_role` 키는 절대 넣지 말 것.**

### Supabase
- 프로젝트: `nfwthowdcyciorqabiae` — https://supabase.com/dashboard/project/nfwthowdcyciorqabiae
- **스키마 마이그레이션은 이미 실행 완료** (테이블·RLS·`files` 버킷 존재 확인함).
  스키마를 바꾸려면 `supabase/migrations/` 에 SQL 을 추가하고 **SQL Editor 에 붙여넣어 직접 실행**한다
  (Supabase CLI 는 세팅돼 있지 않음).
- 무료 프로젝트는 며칠 미사용 시 일시정지 → 대시보드에서 재개.

### 내부 API
- `GET /api/unfurl?url=...` — 로그인 필요(401). OG 메타 반환, `link_meta_cache` 에 캐시.
  runtime `nodejs` (SSRF 방어에 `node:dns` 사용).

### Vercel
- 프로젝트 연결됨, GitHub push 시 자동 배포. **Settings → Environment Variables 에 위 2개를 넣고 Redeploy 필요.**
  `NEXT_PUBLIC_*` 는 빌드 타임에 코드로 박히므로 값만 넣고 재배포 안 하면 반영 안 됨.
- 배포 후 Supabase → Authentication → URL Configuration 의 Site URL / Redirect URLs 에
  `https://pdflinkin.vercel.app` 추가 (이메일 확인을 끄지 않았다면 필수).

### Git
- 원격: `https://github.com/bugoms/pdflinkin` (main)
- 커밋 메시지에 한글 여러 줄을 쓸 때는 PowerShell here-string 이 깨진 적이 있음 →
  **파일에 쓰고 `git commit -F <file>`** 을 쓰는 게 안전.

---

## 8. 다음 채팅에서 가장 먼저 할 일

순서대로:

1. **사용자에게 확인**: Vercel 환경변수 2개 추가 + Redeploy 했는지, Supabase 의 `Confirm email` 을 껐는지.
   (안 했으면 그것부터 안내. 이걸 안 하면 아무것도 검증할 수 없다.)
2. `npm run dev` 로 로컬 실행 → **가입 → 실제로 다음을 다 눌러본다**:
   - 링크 `Ctrl+V` → 카드 생성 + OG 썸네일 도착
   - PDF 드롭 → 썸네일 생성 + 뷰어 열림 + 이어읽기 저장
   - 카드를 프레임 안으로 드래그 → 소속 변경, 프레임 이동 시 동반
   - `Ctrl+Z` 되돌리기, 새로고침 후 상태 유지(= 저장 큐 정상)
   - `Ctrl+K` 로 PDF 본문 검색
3. 여기서 나오는 버그를 잡는다. **의심 1순위는 `store/board.ts` 의 저장 큐 / `Canvas.tsx` 의
   dimensions·position 변경 처리 / 프레임 재소속 좌표 변환.**
4. 그 다음에야 새 기능(브라우저 확장, 인박스 등)을 논의한다.

---

## 9. 반드시 지켜야 할 조건 · 주의사항

### 아키텍처
- **저장은 스냅샷 diff 하나로만 한다.** 모든 변경은 `useBoard.apply()` (히스토리 남김) 또는
  `applyLive()` (드래그 중) → 이전/새 스냅샷의 차이가 저장 큐로 간다.
  **Supabase 를 직접 호출해 items/frames/edges 를 쓰지 말 것.** (예외: extracted_text, 태그, 휴지통 영구삭제)
- **`extracted_text` 는 절대 브라우저 상태에 담지 않는다.** upsert 페이로드에서도 제거된다.
  이 규칙을 어기면 카드를 한 번만 수정해도 DB 의 PDF 본문이 null 로 날아간다.
- **PDF 처리는 전부 클라이언트에서.** 서버 연산 = 돈. 서버 함수는 `/api/unfurl` 하나뿐이어야 한다.
- **모든 테이블에 RLS.** 브라우저가 anon key 로 DB 에 직접 붙는 구조라 이게 유일한 방어선이다.
  새 테이블을 만들면 RLS 정책도 같이 만든다.
- 파일은 **비공개 버킷 + 서명 URL**. 퍼블릭 버킷 금지. 스토리지 경로 규칙은 `{user_id}/{item_id}.{ext}`
  (스토리지 정책이 첫 폴더명 = uid 로 검사한다).

### React Flow
- 노드는 **스토어에서 유도**한다(controlled). 프레임 노드가 배열에서 자식보다 **앞**에 와야 한다.
- `dimensions` 변경은 `change.setAttributes` 가 true 일 때만 반영한다(측정값이 크기를 덮어쓰지 않게).
- `deleteKeyCode={null}` — 삭제는 직접 구현한다. RF 기본 삭제는 프레임의 자식까지 지워버린다.

### 디자인 (DESIGN-apple.md 기준, `globals.css` 의 `@theme` 이 단일 출처)
- **Action Blue(`bg-action`, #0066cc) 하나만 "누를 수 있음"을 뜻한다.** 두 번째 액센트 색 금지.
  카드 색 6종은 분류용이며 절대 액션 신호가 아니다.
- **그림자 금지.** 면은 헤어라인(`border-hairline`)과 표면색(canvas / parchment / pearl)으로만 만든다.
  유일한 예외는 `.product-shadow` — PDF 지면과 사진처럼 "표면 위에 놓인 실물"에만.
- 모양 문법: `rounded-full` = 액션(버튼·검색·태그) / `rounded-apple-md` = 유틸리티 버튼 /
  `rounded-apple-lg` = 카드·패널. 그 사이 값 쓰지 말 것.
- 다크 모드 없음. 배경은 흰색이다.

### 코드
- **Tailwind 클래스 문자열을 동적으로 조립하지 말 것** (정적 스캔이라 안 잡힌다). `lib/palette.ts` 처럼 전부 적어둔다.
- **effect 안에서 동기 setState 금지** (lint 에러). 비제어 입력 + `key`, 또는 async 콜백 안에서 set.
- 커밋 전 `npx tsc --noEmit` + `npx eslint src --max-warnings=0` + `npm run build` 를 통과시킨다.
