// find_my_models.js
require('dotenv').config();

const API_KEY = process.env.GEMINI_API_KEY;
const URL = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

async function getAvailableModels() {
  console.log("🔍 구글 서버에 사용 가능한 모델 목록을 요청하고 있습니다...");
  
  try {
    const response = await fetch(URL);
    const data = await response.json();

    if (data.error) {
      console.error("\n❌ API 호출 에러 발생:");
      console.error(data.error.message);
      return;
    }

    console.log("\n✅ 사용 가능한 모델 목록 (아래 이름을 복사해서 쓰세요):");
    console.log("------------------------------------------------");
    
    // 'generateContent' 기능을 지원하는 모델만 필터링해서 보여줍니다.
    const models = data.models.filter(m => m.supportedGenerationMethods.includes("generateContent"));
    
    models.forEach(model => {
      // "models/gemini-pro" -> "gemini-pro" 형태로 깔끔하게 출력
      console.log(`- ${model.name.replace("models/", "")}`);
    });
    
    console.log("------------------------------------------------");
    console.log("👉 위 목록에 있는 이름 중 하나를 blog_generator.js의 MODEL_NAME 변수에 넣으세요.");

  } catch (error) {
    console.error("네트워크 에러:", error);
  }
}

getAvailableModels();