import json
import textwrap
import os
import glob
from PIL import Image, ImageDraw, ImageFont

# ✅ 디자인 설정
THEMES = {
    "GENITEACHER": {
        "bg_color": "#FFFFFF",
        "primary_color": "#111111",
        "secondary_color": "#555555",
        "accent_color": "#00C73C",
        "line_color": "#EEEEEE",
    },
    "PK_ACADEMY": {
        "bg_color": "#FFFFFF",
        "primary_color": "#111111",
        "secondary_color": "#555555",
        "accent_color": "#1A2B50",
        "line_color": "#EEEEEE",
    }
}

def load_fonts():
    fonts = {}
    try:
        fonts['title_main'] = ImageFont.truetype("Pretendard-Bold.ttf", 75)
        fonts['title_sub'] = ImageFont.truetype("Pretendard-Medium.ttf", 38)
        fonts['tag'] = ImageFont.truetype("Pretendard-Bold.ttf", 28)
        fonts['headline'] = ImageFont.truetype("Pretendard-Bold.ttf", 60)
        fonts['body'] = ImageFont.truetype("Pretendard-Medium.ttf", 34)
        fonts['page'] = ImageFont.truetype("Pretendard-Regular.ttf", 24)
        fonts['logo'] = ImageFont.truetype("Pretendard-ExtraBold.ttf", 90) 
    except:
        print("⚠️ Pretendard 폰트 없음. 맑은 고딕 사용.")
        fonts['title_main'] = ImageFont.truetype("malgunbd.ttf", 75)
        fonts['title_sub'] = ImageFont.truetype("malgun.ttf", 38)
        fonts['tag'] = ImageFont.truetype("malgunbd.ttf", 28)
        fonts['headline'] = ImageFont.truetype("malgunbd.ttf", 60)
        fonts['body'] = ImageFont.truetype("malgun.ttf", 34)
        fonts['page'] = ImageFont.truetype("malgun.ttf", 24)
        fonts['logo'] = ImageFont.truetype("malgunbd.ttf", 90)
    return fonts

# ✅ [핵심 수정] 타겟(target_name) 폴더를 우선적으로 탐색
def prepare_image(brand, target_name, target_w, target_h, img_idx):
    # 1순위: 타겟별 폴더 (예: assets/GENITEACHER/student/img1.jpg)
    target_dir = f"./assets/{brand}/{target_name}"
    search_pattern = f"{target_dir}/img{img_idx}.*"
    found_files = glob.glob(search_pattern)
    
    # 2순위: 타겟 폴더에 없으면 공용 폴더 (예: assets/GENITEACHER/img1.jpg) - 비상용
    if not found_files:
        common_dir = f"./assets/{brand}"
        found_files = glob.glob(f"{common_dir}/img{img_idx}.*")

    img_path = found_files[0] if found_files else None

    if not img_path:
        # print(f"⚠️ [이미지 없음] {brand}/{target_name}/img{img_idx}")
        return Image.new('RGB', (target_w, target_h), "#F5F5F5")
    
    try:
        img = Image.open(img_path).convert("RGB")
        ratio = max(target_w / img.width, target_h / img.height)
        new_size = (int(img.width * ratio), int(img.height * ratio))
        img = img.resize(new_size, Image.LANCZOS)
        
        left = (img.width - target_w) / 2
        top = (img.height - target_h) / 2
        img = img.crop((left, top, left + target_w, top + target_h))
        return img
    except Exception as e:
        print(f"❌ 이미지 오류 ({img_path}): {e}")
        return Image.new('RGB', (target_w, target_h), "#F5F5F5")

def draw_text_wrap(draw, text, x, y, font, color, max_width, line_spacing=20):
    lines = text.split('\n')
    final_lines = []
    for line in lines:
        final_lines.extend(textwrap.wrap(line, width=max_width))
    
    current_y = y
    bbox = font.getbbox("가")
    line_h = (bbox[3] - bbox[1]) + line_spacing
    
    for line in final_lines:
        draw.text((x, current_y), line, font=font, fill=color)
        current_y += line_h
    return current_y

def create_card_news(json_filename):
    try:
        with open(json_filename, "r", encoding="utf-8") as f:
            data = json.load(f)
    except:
        return

    brand = data.get("brand", "GENITEACHER")
    cards = data.get("cards", [])
    theme = THEMES.get(brand, THEMES["GENITEACHER"])
    fonts = load_fonts()
    
    # ✅ 파일명에서 타겟 추출 (student, parent, owner)
    base_name = os.path.basename(json_filename)
    target_name = base_name.replace("card_data_", "").replace(".json", "")
    
    output_dir = f"./output_{brand}_{target_name}"
    os.makedirs(output_dir, exist_ok=True)
    
    print(f"🎨 [{brand} - {target_name}] 생성 중 (폴더: assets/{brand}/{target_name})")

    W, H = 1080, 1350

    for i, card in enumerate(cards):
        img = Image.new('RGB', (W, H), theme["bg_color"])
        draw = ImageDraw.Draw(img)
        
        current_img_idx = i + 1
        is_title_page = (i == 0)
        
        if is_title_page:
            # === [표지] ===
            img_h = 850 
            # ✅ prepare_image에 target_name 전달
            asset_img = prepare_image(brand, target_name, W, img_h, current_img_idx)
            img.paste(asset_img, (0, 0))
            
            draw.text((50, 50), f"@{brand}", font=fonts['tag'], fill="white")
            text_x, text_y = 80, img_h + 80
            
            headline = card.get("headline", "")
            last_y = draw_text_wrap(draw, headline, text_x, text_y, fonts['title_main'], theme["primary_color"], 10, 25)
            
            sub_text = card.get("sub_text", "")
            if sub_text:
                draw_text_wrap(draw, sub_text, text_x, last_y + 35, fonts['title_sub'], theme["secondary_color"], 22, 20)

        else:
            # === [본문] ===
            img_h = 700
            # ✅ prepare_image에 target_name 전달
            asset_img = prepare_image(brand, target_name, W, img_h, current_img_idx)
            img.paste(asset_img, (0, 0))
            
            tag_text = card.get("tag", "").upper()
            draw.text((60, 60), tag_text, font=fonts['tag'], fill="white")
            text_x, text_y = 80, img_h + 80
            
            headline = card.get("headline", "")
            last_y = draw_text_wrap(draw, headline, text_x, text_y, fonts['headline'], theme["primary_color"], 12, 25)
            draw.line((text_x, last_y + 35, text_x + 80, last_y + 35), fill=theme["accent_color"], width=4)
            
            body = card.get("body", "")
            draw_text_wrap(draw, body, text_x, last_y + 70, fonts['body'], theme["secondary_color"], 24, 20)

        page_text = f"{i+1}"
        page_w = fonts['page'].getlength(page_text)
        draw.text((W - page_w - 60, H - 60), page_text, font=fonts['page'], fill="#CCCCCC")
        
        img.save(f"{output_dir}/feed_{i+1:02d}.jpg", quality=95)

    # [엔딩 페이지]
    last_idx = len(cards) + 1
    end_img = Image.new('RGB', (W, H), theme["bg_color"])
    end_draw = ImageDraw.Draw(end_img)
    logo_text = f"@{brand}"
    bbox = fonts['logo'].getbbox(logo_text)
    cx, cy = (W - (bbox[2] - bbox[0])) / 2, (H - (bbox[3] - bbox[1])) / 2
    end_draw.text((cx, cy), logo_text, font=fonts['logo'], fill=theme["accent_color"])
    end_img.save(f"{output_dir}/feed_{last_idx:02d}.jpg", quality=95)
    
    print(f"✅ [{target_name}] 완료! -> {output_dir}")

if __name__ == "__main__":
    files = glob.glob("card_data_*.json")
    if not files:
        print("❌ JSON 데이터가 없습니다. Node.js를 먼저 실행하세요.")
    else:
        for f in files:
            create_card_news(f)