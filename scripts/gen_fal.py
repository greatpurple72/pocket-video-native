#!/usr/bin/env python3
"""
用 fal.ai (FLUX) 生成顶级卡通渲染效果图。
密钥只走环境变量:  export FAL_KEY="id:secret"
用法:  python3 scripts/gen_fal.py [scene_index ...]   # 不带参数=全部
输出:  docs/design/art/generated/*.png
注:FLUX 对英文提示词效果最好,故提示词用英文。
"""
import os, sys, json, urllib.request, urllib.error, pathlib, time

FAL_KEY = os.environ.get("FAL_KEY")
MODEL = os.environ.get("FAL_MODEL", "fal-ai/flux/dev")
ENDPOINT = f"https://fal.run/{MODEL}"
OUT = pathlib.Path("docs/design/art/generated"); OUT.mkdir(parents=True, exist_ok=True)

PREFIX = ""  # 每个场景自带完整提示词(角色与地图风格不同)

CHAR = ("premium 3D caricature of a football star, head MODESTLY enlarged (subtle caricature, about "
        "5.5 heads tall, NOT extreme bobblehead, NOT chibi, NOT a child), realistic detailed adult "
        "face, skin and hair, realistic athletic adult body and football kit, photoreal stadium "
        "background, Unreal Engine 5, 4k, confident mature expression. ")

MAP = ("mobile MMO 4X SLG world map gameplay screenshot, Last War Survival and Whiteout Survival "
       "style, 3/4 top-down stylized terrain, MANY individual player bases each as a small football "
       "stadium / club base with a floating name label, alliance tag and coordinates above it "
       "(simulating many other online players), colored alliance territory regions, dotted march "
       "lines with team-bus and troop icons moving between bases, football resource and event tiles; "
       "full mobile game UI chrome: top resource bar with currency icons and numbers, player avatar "
       "top-left, bottom navigation bar with menu buttons, side floating alliance/event/march "
       "buttons, chat box bottom-left, minimap bottom-right; football themed, realistic-stylized 3D, "
       "4k, authentic in-game screenshot. ")

SCENES = [
 ("char-messi", "portrait_16_9", CHAR + "the football star is Lionel Messi, recognizable likeness: relatively short, short light beard, brown hair, generic light-blue and white striped kit, full body confident standing pose, player showcase screen"),
 ("char-zidane", "portrait_16_9", CHAR + "the football legend is Zinedine Zidane, recognizable likeness: bald head, mature composed face, tall elegant build, generic all-white kit, full body standing pose, player showcase screen. IMPORTANT keep the head only slightly enlarged, about 6 heads tall, subtle caricature, do not make the head too big"),
 ("map-01-world", "landscape_16_9", MAP + "wide world map view with many player stadium bases and floating name/alliance labels spread over real-world style terrain, alliance territories, marches, a central championship stadium fortress contested by alliances"),
 ("map-02-war", "landscape_16_9", MAP + "zoomed-in alliance war scene, several alliance-colored teams marching to siege an enemy stadium fortress, many surrounding player bases with name labels, rally arrows and march lines, battle number popups"),
]

def gen(name, size, scene):
    body = {"prompt": PREFIX + scene, "image_size": size,
            "num_images": 1, "num_inference_steps": 30, "guidance_scale": 3.5,
            "enable_safety_checker": True}
    req = urllib.request.Request(ENDPOINT, data=json.dumps(body).encode("utf-8"),
        headers={"Authorization": f"Key {FAL_KEY}", "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=180) as r:
        data = json.loads(r.read().decode("utf-8"))
    url = data["images"][0]["url"]
    img = urllib.request.urlopen(url, timeout=180).read()
    p = OUT / f"{name}.png"; p.write_bytes(img)
    print(f"  OK -> {p} ({len(img)//1024} KB)")

def main():
    if not FAL_KEY:
        print("缺少 FAL_KEY"); return
    pick = [int(a) for a in sys.argv[1:]] if len(sys.argv) > 1 else list(range(1, len(SCENES)+1))
    print(f"模型 {MODEL} | 生成 {pick}")
    for i in pick:
        name, size, scene = SCENES[i-1]
        print(f"[{name}] 生成中…")
        try:
            gen(name, size, scene)
        except urllib.error.HTTPError as e:
            print(f"  HTTP {e.code}: {e.read().decode('utf-8')[:300]}")
        except Exception as e:
            print(f"  失败: {type(e).__name__}: {e}")
        time.sleep(1)

if __name__ == "__main__":
    main()
