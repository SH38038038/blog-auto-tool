import markdown
import os
import re  # 정규표현식 모듈 추가 (텍스트 치환용)

def preprocess_markdown(text):
    """
    마크다운 변환 전, 원본 텍스트를 네이버 블로그에 맞게 1차 가공합니다.
    """
    lines = text.split('\n')
    processed_lines = []
    
    for line in lines:
        stripped = line.strip()
        
        # 1. 인용구(>)를 볼드체(**)로 변경
        # 문장이 '>'로 시작하면 인용구 문법을 제거하고 앞뒤에 **를 붙임
        if stripped.startswith('> '):
            content = stripped[2:]  # '> ' 제거
            # 줄바꿈이 포함된 경우를 위해 HTML 태그 <br> 사용하거나 문단 분리
            processed_lines.append(f'\n**{content}**\n')
            
        # 2. 해시태그 파싱 문제 해결
        # 문장이 '#'으로 시작하지만 뒤에 공백이 없는 경우 (예: #수학공부법)
        # 마크다운 헤더(H1)로 인식되지 않도록 이스케이프(\) 처리하고 스타일링 적용
        elif stripped.startswith('#') and not stripped.startswith('# '):
            # 해시태그들을 찾아서 색상 스타일(파란색) 입히기
            # 정규식: # 뒤에 공백이 아닌 문자가 오는 패턴 찾기
            def color_tag(match):
                return f'<span style="color:#0067a3; background:#f2f2f2; padding:2px 5px; border-radius:4px; margin-right:5px;">{match.group()}</span>'
            
            # 해당 라인의 모든 해시태그를 스타일링된 HTML로 변환
            styled_line = re.sub(r'#[^\s#]+', color_tag, stripped)
            processed_lines.append(styled_line + "  ") # 끝에 공백 2개는 줄바꿈
            
        else:
            processed_lines.append(line)
            
    return '\n'.join(processed_lines)

def save_for_naver_blog(title, content_md, filename):
    
    # 0. 마크다운 전처리 (해시태그 및 인용구 수정)
    preprocessed_md = preprocess_markdown(content_md)
    
    # 1. 마크다운을 HTML로 변환
    html_content = markdown.markdown(preprocessed_md, extensions=['fenced_code', 'nl2br'])

    # 2. 네이버 블로그용 스타일 (가독성 최적화)
    full_html = f"""
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <style>
            body {{
                font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif;
                line-height: 1.8;
                color: #333;
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
            }}
            /* 제목 스타일 */
            h1 {{ font-size: 2em; border-bottom: 2px solid #eee; padding-bottom: 10px; margin-bottom: 20px; }}
            h2 {{ font-size: 1.5em; border-left: 5px solid #2db400; padding-left: 10px; margin-top: 40px; margin-bottom: 15px; }}
            h3 {{ font-size: 1.2em; font-weight: bold; margin-top: 30px; margin-bottom: 10px; }}
            
            /* 본문 스타일 */
            p {{ margin-bottom: 15px; word-break: keep-all; }}
            strong {{ color: #000; font-weight: 900; }} /* 볼드체 더 진하게 */
            
            /* 코드 블록 스타일 */
            pre {{ background-color: #f5f5f5; padding: 15px; border-radius: 5px; overflow-x: auto; margin: 20px 0; }}
            code {{ font-family: consolas, monospace; }}
            
            /* 리스트 스타일 */
            ul, ol {{ margin-bottom: 20px; padding-left: 20px; }}
            li {{ margin-bottom: 8px; }}
            
            /* 링크 스타일 */
            a {{ color: #00c73c; text-decoration: none; font-weight: bold; }}
        </style>
    </head>
    <body>
        <h1 style="border:none; font-size:2.2em; text-align:center; margin-bottom:50px;">{title}</h1>
        
        {html_content}
        
        <br><br>
    </body>
    </html>
    """

    with open(filename, "w", encoding="utf-8") as f:
        f.write(full_html)
    
    print(f"✅ 변환 완료: {filename}")

# --- 메인 실행 부분 ---

target_files = [
    "post_owner.md",
    "post_parent.md",
    "post_student.md"
]

current_dir = os.getcwd()
print(f"📂 작업 경로: {current_dir}\n")

for md_file in target_files:
    file_path = os.path.join(current_dir, md_file)
    
    if os.path.exists(file_path):
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                md_content = f.read()
            
            html_filename = md_file.replace(".md", ".html")
            title = md_file.replace(".md", "")
            
            save_for_naver_blog(title, md_content, html_filename)
            
        except Exception as e:
            print(f"❌ 에러 발생 ({md_file}): {e}")
    else:
        print(f"⚠️ 파일을 찾을 수 없음: {md_file}")

print("\n👉 생성된 HTML 파일을 브라우저로 열고 [Ctrl+A] -> [Ctrl+C] 하세요.")