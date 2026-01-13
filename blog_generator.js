require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ✅ 안정적인 모델 사용
const MODEL_NAME = "gemini-flash-lite-latest"; 

// ✅ 현재 홍보할 브랜드 (파이썬 이미지 생성 코드와 매칭용)
const CURRENT_BRAND = "GENITEACHER"; 

// ✅ [핵심 변경] 타겟별 페르소나 및 주제 설정
const TARGET_CONFIG = {
  "STUDENT": {
    role: `너는 공부 효율을 최우선으로 생각하는 '전교 1등 선배' 혹은 '서울대 멘토'다.
    타겟: 중고등학생 (수험생)
    어조: 친근함, 팩트 폭격, "너 아직도 그렇게 공부해?", 동기부여
    
    [핵심 메시지]
    "오답노트 가위질할 시간에 문제 하나 더 풀어라."
    "대치동 애들은 이미 태블릿으로 자동 저장한다."
    공부 시간을 갉아먹는 비효율적인 행동을 지적하고, 스마트한 도구 사용을 권장하라.`,
    topic: "성적 안 오르는 애들 특징: 오답노트에 목숨 검 (feat. 가위질 그만해)"
  },
  "PARENT": {
    role: `너는 대치동 입시 컨설턴트이자 자녀 교육 전문가다.
    타겟: 중고등학생 자녀를 둔 학부모
    어조: 정중함, 신뢰감, 데이터 중심, 공감
    
    [핵심 메시지]
    "아이의 수면 시간과 공부 효율, 도구 하나로 바뀝니다."
    "학원비만큼 중요한 게 '학습 데이터 관리'입니다."
    자녀가 단순 노동(필기, 오답 정리)에 지치지 않게 돕는 스마트한 솔루션을 제안하라.`,
    topic: "우리 아이 수학 점수가 제자리인 이유? '공부 흉내'만 내고 있기 때문입니다."
  },
  "OWNER": {
    role: `너는 학원 경영 컨설턴트이자 에듀테크 비즈니스 파트너다.
    타겟: 학원장, 공부방/교습소 운영자
    어조: 비즈니스맨, 전문적, 수익/효율 강조, "원장님" 호칭 사용
    
    [핵심 메시지]
    "강사들이 조교 업무(채점, 제본)하느라 수업 준비를 못 하고 있지 않나요?"
    "학부모 상담, 감이 아니라 '데이터'로 보여주셔야 등록합니다."
    학원 운영의 비효율(인건비, 시간)을 줄이고 경쟁력을 높이는 시스템 도입을 강조하라.`,
    topic: "강사 이탈과 학부모 클레임, '시스템'이 없으면 결국 원장님 탓입니다."
  }
};

// ✅ 지수 백오프 (재시도 로직)
async function generateWithRetry(model, prompt, retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error(`⚠️ 에러 발생 (${i + 1}/${retries}): ${error.message}`);
      if (error.message.includes("429") || error.message.includes("503")) {
        const waitTime = Math.pow(2, i) * 2000; // 대기 시간 점진적 증가
        console.log(`🕒 ${waitTime / 1000}초 대기 후 재시도...`);
        await new Promise(res => setTimeout(res, waitTime));
      } else {
        return null;
      }
    }
  }
  return null;
}

// 1. 블로그 글 생성
async function generateBlogPost(targetKey) {
  const config = TARGET_CONFIG[targetKey];
  
  const model = genAI.getGenerativeModel({ 
    model: MODEL_NAME,
    systemInstruction: config.role,
    generationConfig: { responseMimeType: "application/json" }
  });
  
  const userPrompt = `
  주제: "${config.topic}"에 대해 블로그 글 작성.
  
  [요구사항]
  1. 타겟 독자의 페르소나에 100% 몰입하여 작성할 것.
  2. 구조: 제목, 훅(Hook), 본문(3~4개 섹션), 해시태그
  
  [출력 포맷 (JSON Only)]
  {
    "title": "클릭을 부르는 자극적인 제목",
    "hook_text": "독자의 공감을 이끌어내는 서두 (2-3문장)",
    "sections": [
      { "sub_title": "소제목", "content": "본문 내용 (줄바꿈은 \\n)" }
    ],
    "hashtags": ["태그1", "태그2"]
  }
  `;

  try {
    const text = await generateWithRetry(model, userPrompt);
    if (!text) return null;
    return JSON.parse(text.replace(/```json/g, "").replace(/```/g, "").trim());
  } catch (e) { 
    console.error(`❌ [JSON 파싱 에러 - ${targetKey}] ${e.message}`);
    return null; 
  }
}

// 2. 카드뉴스 기획 생성
async function generateCardContent(targetKey, blogPostJson) {
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });
  const config = TARGET_CONFIG[targetKey];
  
  const prompt = `
  너는 인스타그램 콘텐츠 기획자다.
  위 블로그 글을 바탕으로 **${targetKey}(타겟)**에게 어필할 **6장의 카드뉴스 기획안**을 작성하라.
  
  [기획 가이드]
  - **타겟 맞춤형 멘트:**
    - 학생: "친구야, 아직도 손 아프게 쓰고 있니?"
    - 학부모: "어머님, 옆집 아이 성적 비결이 궁금하세요?"
    - 원장님: "원장님, 채점 알바비만 아껴도 월 100입니다."
  
  - **Page 1 (표지):** 15자 이내, 임팩트 있는 카피. (줄바꿈 \\n 필수)
  - **Page 2~5 (본문):** 문제(Pain) -> 해결(Solution) -> 근거/기능 -> 혜택(Benefit)
  - **Page 6 (엔딩):** 저장 및 프로필 링크 유도

  [출력 포맷 (JSON)]
  {
    "brand": "${CURRENT_BRAND}",
    "cards": [
      {
        "page": 1,
        "tag": "핵심 질문",
        "headline": "짧고 강렬한\\n헤드라인",
        "body": "보조 설명 텍스트"
      }
      ... (총 6장)
    ]
  }
  `;

  if (!blogPostJson) return null;
  const inputPrompt = `[블로그 제목]: ${blogPostJson.title}\n[내용]: ${JSON.stringify(blogPostJson.sections)}\n\n${prompt}`;

  try {
    const text = await generateWithRetry(model, inputPrompt);
    if (!text) return null;
    return JSON.parse(text.replace(/```json/g, "").replace(/```/g, "").trim());
  } catch (e) { return null; }
}

// 3. 인스타 캡션 생성
async function generateInstaCaption(targetKey, blogPostJson, cardDataJson) {
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });
  const config = TARGET_CONFIG[targetKey];

  const prompt = `
  타겟 독자(${targetKey})의 감성을 자극하는 인스타그램 본문(Caption)을 작성해.
  
  [작성 요령]
  1. 첫 줄은 무조건 "더 보기"를 누르게 만드는 후킹 문구.
  2. 본문은 이모티콘을 적절히 사용하여 읽기 쉽게.
  3. 마지막엔 행동 유도(저장, 공유, 프로필 링크 클릭).
  4. 해시태그는 타겟이 검색할만한 키워드 15개.
  
  출력은 JSON이 아니라 일반 텍스트(String)로.
  `;

  if (!blogPostJson || !cardDataJson) return null;
  const inputPrompt = `[블로그]: ${JSON.stringify(blogPostJson)}\n[카드뉴스]: ${JSON.stringify(cardDataJson)}\n\n${prompt}`;

  try {
    return await generateWithRetry(model, inputPrompt);
  } catch (e) { return null; }
}

function saveFile(fileName, content) {
  fs.writeFileSync(fileName, content);
  console.log(`💾 저장 완료: ${fileName}`);
}

async function run() {
  console.log(`🚀 [${CURRENT_BRAND}] 타겟별 콘텐츠 생성 시작...`);
  
  // 타겟 목록 순회 (STUDENT -> PARENT -> OWNER)
  const targets = Object.keys(TARGET_CONFIG);

  for (const target of targets) {
    console.log(`\n=============================================`);
    console.log(`🎯 Target: ${target} (생성 중...)`);
    console.log(`=============================================`);

    // 1. 블로그 글
    const post = await generateBlogPost(target);
    if (post) {
      // 마크다운 변환 저장
      const mdContent = `# ${post.title}\n\n> ${post.hook_text}\n\n---\n\n${post.sections.map(s => `## ${s.sub_title}\n${s.content}`).join('\n\n')}\n\n---\n${post.hashtags.map(t=>`#${t}`).join(' ')}`;
      saveFile(`post_${target.toLowerCase()}.md`, mdContent);

      // 2. 카드뉴스 데이터
      const cardData = await generateCardContent(target, post);
      if (cardData) {
        saveFile(`card_data_${target.toLowerCase()}.json`, JSON.stringify(cardData, null, 2));

        // 3. 인스타 캡션
        const caption = await generateInstaCaption(target, post, cardData);
        if (caption) {
          saveFile(`caption_${target.toLowerCase()}.txt`, caption);
        }
      }
    } else {
      console.log(`⚠️ ${target} 콘텐츠 생성 실패.`);
    }

    // API 과부하 방지 (10초 대기)
    if (target !== targets[targets.length - 1]) {
        console.log("\n⏳ 다음 타겟 생성을 위해 10초 대기...");
        await new Promise(r => setTimeout(r, 10000));
    }
  }

  console.log("\n✨ 모든 타겟 작업 완료!");
}

run();