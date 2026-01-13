require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ✅ [수정 1] 모델명 확인 (안정적인 버전 사용 권장)
// 혹시 2.5 버전을 쓰셔야 한다면 그대로 두셔도 되지만, 404/503 에러가 계속되면 1.5-flash로 바꿔보세요.
const MODEL_NAME = "gemini-flash-lite-latest";

const PROMPT_TEMPLATES = {
  "GENITEACHER": {
    role: `너는 대한민국 상위 1%를 위한 에듀테크 컨설턴트다.
    너의 글을 읽는 타겟은 다음과 같다:
    1. **중고등학생:** 오답노트 만들 시간에 문제 하나 더 풀고 싶어함.
    2. **학부모:** 내 아이에게 가장 효율적인 학습 도구를 쥐여주고 싶음.
    3. **학원/독서실 원장:** 우리 학원만의 차별화된 관리 시스템(CRM) 도입을 고민함.

    [핵심 메시지]
    "아직도 가위로 오리고 풀로 붙이나요? 대치동은 펜으로 쓰고 자동 저장합니다."
    단순한 필기구가 아니라, **'데이터가 남는 공부'**라는 점을 강조하여 
    학생에겐 '시간 단축', 원장에겐 '학습 데이터 관리'의 이점을 어필하라.`
  },
  "PK_ACADEMY": {
    role: `너는 입시의 본질을 꿰뚫는 대치동 입시 분석가다.
    타겟: 독학재수생, N수생, 그리고 이들의 부모님.
    
    [핵심 메시지]
    "질문하러 줄 서는 시간도 공부 시간에서 까먹는 겁니다."
    관리형 독서실의 한계(질문 해결 불가)와 과외의 한계(비용)를 동시에 해결하는
    **'AI 즉문즉답 시스템'**의 압도적 효율성을 팩트 폭격 스타일로 전달하라.`
  }
};

// ✅ [수정 2] 지수 백오프 (Exponential Backoff) 적용
// 실패할수록 대기 시간을 늘려서 API 차단을 방지합니다.
async function generateWithRetry(model, prompt, retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error(`⚠️ 에러 발생 (${i + 1}/${retries}): ${error.message}`);
      
      if (error.message.includes("429") || error.message.includes("503") || error.message.includes("Overloaded")) {
        // 대기 시간: 10초 -> 20초 -> 40초 -> ...
        const waitTime = Math.pow(2, i) * 10000; 
        console.log(`🕒 서버 혼잡. ${waitTime / 1000}초 대기 후 재시도...`);
        await new Promise(res => setTimeout(res, waitTime));
      } else {
        // 429/503 이외의 치명적 에러(인증 실패 등)는 즉시 중단
        console.error("❌ 치명적 오류로 중단합니다.");
        return null;
      }
    }
  }
  return null;
}

async function generateBlogPost(brandType, topic) {
  // 1. 모델 설정에 JSON 모드 추가 (Gemini 1.5 Flash/Pro 기능)
  const model = genAI.getGenerativeModel({ 
    model: MODEL_NAME,
    systemInstruction: PROMPT_TEMPLATES[brandType].role,
    generationConfig: {
      responseMimeType: "application/json" // ✨ 이 줄이 핵심입니다! JSON 출력을 강제함
    }
  });
  
  // 2. 프롬프트에 정확한 JSON 스키마(구조) 명시
  const userPrompt = `
  주제: "${topic}"에 대해 블로그 글 작성.
  
  [요구사항]
  1. 구조: 제목, 훅, 본문(3~5개 섹션), 해시태그
  2. 톤앤매너: 친근하고 신뢰감 있는 어조
  
  [출력 포맷]
  반드시 아래 JSON 스키마를 엄격히 준수하여 출력할 것. (Markdown 코드 블록 없이 순수 JSON만 반환)
  
  {
    "title": "블로그 제목",
    "hook_text": "독자의 관심을 끄는 1-2문장",
    "sections": [
      {
        "sub_title": "소제목 1",
        "content": "본문 내용 (줄바꿈은 \\n 사용)"
      },
      {
        "sub_title": "소제목 2",
        "content": "본문 내용"
      }
    ],
    "hashtags": ["태그1", "태그2", "태그3"]
  }
  `;

  try {
    const text = await generateWithRetry(model, userPrompt);
    
    if (!text) {
        console.error(`❌ [실패] 블로그 글 생성 실패 (API 응답 없음) - ${brandType}`);
        return null;
    }

    // 혹시 모를 마크다운 코드블록 제거
    const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleanJson);
  } catch (e) { 
    console.error(`❌ [JSON 파싱 에러] ${e.message}`);
    console.error(`수신된 텍스트 일부: ${e.text ? e.text.substring(0, 100) : "내용 없음"}`); // 디버깅용
    return null; 
  }
}

async function generateCardContent(brandType, blogPostJson) {
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });
  
  const prompt = `
  너는 인스타그램 콘텐츠 기획자다.
  위 블로그 글을 바탕으로 **총 6장의 카드뉴스 기획안**을 작성하라.
  !중요! 카드 뉴스 제작시에는 이모티콘이 렌더링 안되기 때문에 사용하지 말 것.
  
  [타겟 독자]
  - 공부 효율을 따지는 똑똑한 **학생**
  - 자녀 성적과 학습법을 고민하는 **학부모**
  - 학원 경쟁력을 높이고 싶은 **원장님**

  [기획 가이드]
  1. **Page 1 (표지):** - 폰트가 커야 하므로 **공백 포함 15자 이내**로 제한. 
     - 줄바꿈(\\n) 필수. 
     - 질문형이나 도발적인 카피 추천 (예: "원장님, 아직도 복사하시나요?")
  2. **Page 2~5 (본문):** - 문제 제기(비효율) -> 해결책(솔루션) -> 근거(데이터/기능) -> 기대효과.
  3. **Page 6 (엔딩):** - 저장 및 프로필 링크 클릭 유도.

  [출력 포맷 (JSON)]
  {
    "brand": "${brandType}",
    "cards": [
      {

      "page": 1,

      "type": "body",

      "tag": "팩트 체크",

      "headline": "사진 찍는 거?\n아니, 실시간 인식!",

      "body": "사진 찍을 필요도 없어요.\n종이에 쓰면 태블릿에 그대로 뜹니다."

    },
      ... (총 6장)
    ]
  }
  `;

  // 블로그 글 생성 실패 시 방어 로직
  if (!blogPostJson) return null;

  const inputPrompt = `[블로그 제목]: ${blogPostJson.title}\n[블로그 내용]: ${JSON.stringify(blogPostJson.sections)}\n\n${prompt}`;

  try {
    const text = await generateWithRetry(model, inputPrompt);
    if (!text) return null; // NULL 체크

    const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleanJson);
  } catch (e) { return null; }
}

async function generateInstaCaption(brandType, blogPostJson, cardDataJson) {
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  const prompt = `
  너는 SNS 마케팅 전문가다.
  작성된 블로그 글과 카드뉴스 내용을 바탕으로, **인스타그램 피드에 올릴 '본문 텍스트(Caption)'**를 작성해라.

  [타겟 분석]
  - 학생: "성적 오르는 꿀팁이네? 저장해야지."
  - 학부모: "우리 애한테 이거 사줘야겠네."
  - 학원장: "우리 학원에도 도입해볼까?"

  [작성 가이드]
  1. **첫 줄(Hook):** 카드뉴스 표지보다 더 구체적이고 호기심을 자극하는 문장.
  2. **본문:** 줄글 대신 **이모티콘(✅, 🔥, 📚, 💡)**을 활용한 리스트(Bullet point) 형태로 가독성 높게.
  3. **내용 구성:**
     - 😫 Pain Point: 기존 공부/운영의 비효율성 (가위질 노동, 질문 대기 등)
     - ✨ Solution: 서비스의 핵심 기능 (스마트펜 자동저장, AI 즉답)
     - 🚀 Benefit: 성적 상승, 워라밸, 학원 차별화
  4. **마무리(CTA):** "더 자세한 내용은 프로필 링크 확인!" 또는 "도입 문의는 DM 주세요."
  5. **해시태그:** 타겟별 검색 키워드 15개 이상 (예: #공스타그램 #수험생 #학원운영 #원장님 #에듀테크 등)

  출력은 JSON이 아니라 **일반 텍스트(String)** 로 해줘.
  `;

  if (!blogPostJson || !cardDataJson) return null;

  const inputPrompt = `[블로그 정보]: ${JSON.stringify(blogPostJson)}\n[카드뉴스 기획]: ${JSON.stringify(cardDataJson)}\n\n${prompt}`;

  try {
    return await generateWithRetry(model, inputPrompt);
  } catch (e) { return null; }
}

function saveToMarkdown(fileName, data) {
  if (!data) return; // 데이터 없으면 저장 안함
  const content = `# ${data.title}\n\n> ${data.hook_text}\n\n---\n\n${data.sections.map(s => `## ${s.sub_title}\n${s.content}`).join('\n\n')}\n\n---\n${data.hashtags.map(t=>`#${t}`).join(' ')}`;
  fs.writeFileSync(fileName, content.trim());
  console.log(`💾 블로그 저장 완료: ${fileName}`);
}

async function run() {
  console.log(`🚀 콘텐츠 생성 프로세스 시작... (Model: ${MODEL_NAME})`);

  // 1. 지니티처
  const topic1 = "학원 원장님과 전교 1등이 주목하는, 가위질 필요 없는 스마트 오답노트";
  console.log(`\n[1] 지니티처 콘텐츠 생성 중...`);
  
  const post1 = await generateBlogPost("GENITEACHER", topic1);
  if(post1) {
    saveToMarkdown("geniteacher_post.md", post1);
    const card1 = await generateCardContent("GENITEACHER", post1);
    
    if(card1) {
        fs.writeFileSync("card_data_genie.json", JSON.stringify(card1, null, 2));
        console.log(`💾 카드뉴스 데이터 저장 완료: card_data_genie.json`);

        const caption1 = await generateInstaCaption("GENITEACHER", post1, card1);
        if(caption1) {
            fs.writeFileSync("insta_caption_genie.txt", caption1);
            console.log(`💾 인스타 캡션 저장 완료: insta_caption_genie.txt`);
        }
    }
  } else {
    console.log("⚠️ 지니티처 콘텐츠 생성 실패 (API 응답 없음)");
  }

  // 쿨다운 (안전하게 10초)
  console.log("\n⏳ 다음 작업을 위해 10초 대기 중...");
  await new Promise(r => setTimeout(r, 10000));

  // 2. PK학원
  const topic2 = "독학재수 성공의 열쇠: 질문 대기시간 0초의 비밀";
  console.log(`\n[2] PK학원 콘텐츠 생성 중...`);
  
  const post2 = await generateBlogPost("PK_ACADEMY", topic2);
  if(post2) {
    saveToMarkdown("pk_academy_post.md", post2);
    const card2 = await generateCardContent("PK_ACADEMY", post2);
    
    if(card2) {
        fs.writeFileSync("card_data_pk.json", JSON.stringify(card2, null, 2));
        console.log(`💾 카드뉴스 데이터 저장 완료: card_data_pk.json`);

        const caption2 = await generateInstaCaption("PK_ACADEMY", post2, card2);
        if(caption2) {
            fs.writeFileSync("insta_caption_pk.txt", caption2);
            console.log(`💾 인스타 캡션 저장 완료: insta_caption_pk.txt`);
        }
    }
  } else {
    console.log("⚠️ PK학원 콘텐츠 생성 실패 (API 응답 없음)");
  }
  
  console.log("\n✨ 모든 작업 완료! 생성된 파일을 확인하세요.");
}

run();