# 🎨 AI 블로그 & 카드뉴스 자동 생성기 (V15)

Google Gemini API를 활용하여 **블로그 글, 인스타그램 카드뉴스 기획안**을 작성하고, Python을 이용해 **타겟별 맞춤형 디자인 이미지**까지 원스톱으로 생성하는 자동화 툴입니다.

## ✨ 기능
1. **타겟별 자동 생성:** 학생(Student), 학부모(Parent), 원장님(Owner) 맞춤형 콘텐츠 3종 생성.
2. **AI 기획:** 블로그 글, 카드뉴스 대본, 인스타그램 캡션 자동 작성.
3. **자동 디자인:** 기획안을 바탕으로 이미지 합성 (제목 줄바꿈, 페이지 번호, 로고 삽입).

---

## 📁 필수 폴더 구조 (Directory Structure)
**실행 전, 반드시 아래 구조대로 폴더와 사진을 세팅해야 합니다.**

```text
📦 Project-Folder
 ┣ 📂 assets                     # [이미지 소스 폴더]
 ┃ ┗ 📂 GENITEACHER              # 브랜드명 (코드 설정과 일치해야 함)
 ┃    ┣ 📂 student               # [학생용] 이미지 폴더 (img1~6.jpg)
 ┃    ┣ 📂 parent                # [학부모용] 이미지 폴더 (img1~6.jpg)
 ┃    ┗ 📂 owner                 # [원장님용] 이미지 폴더 (img1~6.jpg)
 ┃
 ┣ 📜 .env                       # API 키 설정 파일
 ┣ 📜 package.json               # Node.js 설정 파일
 ┣ 📜 blog_generator.js          # [Step 1] 텍스트 생성 (Node.js)
 ┣ 📜 card_maker.py              # [Step 2] 이미지 생성 (Python)
 ┗ 📜 Pretendard-Bold.ttf...     # 폰트 파일들 (프로젝트 루트에 위치)
```

---

## 🛠️ 설치 및 실행 (Quick Start)

### 1. 환경 설정
* **Node.js**와 **Python**이 설치되어 있어야 합니다.
* 프로젝트 폴더에서 아래 명령어를 실행하여 라이브러리를 설치합니다.

**Node.js 라이브러리 설치**
```bash
npm install
```

**Python 라이브러리 설치**
```bash
pip install pillow
```

### 2. API 키 설정
* 프로젝트 폴더에 `.env` 파일을 만들고 아래 내용을 입력하세요.
* [Google AI Studio](https://aistudio.google.com/app/apikey)에서 키를 발급받을 수 있습니다.

```env
GEMINI_API_KEY=여기에_발급받은_API_키_입력
```

---

### 3. 실행 방법

**Step 1. 텍스트 콘텐츠 생성 (Node.js)**
먼저 실행하여 블로그 글과 카드뉴스 기획안(JSON)을 만듭니다.

```bash
node blog_generator.js
```
> **결과:** 폴더 내에 `card_data_student.json`, `post_student.md` 등의 파일이 생성됩니다.

**Step 2. 이미지 디자인 생성 (Python)**
생성된 JSON 데이터를 읽어 최종 이미지를 만듭니다.

```bash
python card_maker.py
```
> **결과:** `output_GENITEACHER_student` 폴더 등이 생성되고 그 안에 이미지가 저장됩니다.

---

## 🎨 이미지 규칙 가이드
`assets/GENITEACHER/타겟명/` 폴더 안에 사진을 넣으세요.

* **파일명:** `img1.jpg`, `img2.png` ... (확장자는 jpg, png, jpeg 모두 가능)
* **매칭 순서:**
  * `img1` : **표지 (Page 1)** 배경
  * `img2` : **본문 (Page 2)** 배경
  * ...
  * `img6` : **마지막 페이지** 배경

> **Tip:** 만약 `student` 폴더에 사진이 없으면, 코드가 자동으로 상위 폴더(`assets/GENITEACHER/`)의 사진을 찾아 대체합니다.

## ⚠️ 자주 묻는 질문 (Troubleshooting)

**Q. `[403 Forbidden] API key leaked` 오류가 뜹니다.**
> A. API 키가 노출되어 구글이 차단한 것입니다. Google AI Studio에서 새 키를 발급받아 `.env` 파일에 다시 입력하세요.

**Q. `OSError: cannot open resource` (Python)**
> A. 폰트 파일(`Pretendard-Bold.ttf` 등)이 프로젝트 폴더에 없어서 발생합니다. 폰트 파일을 코드와 같은 위치에 넣어주세요.

**Q. `JSON 데이터가 없습니다`**
> A. `node blog_generator.js`를 먼저 실행하지 않아 데이터 파일이 없는 상태입니다. Step 1을 먼저 진행해주세요.
