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

PREFIX = ("in-game screenshot of a next-gen AAA football video game, EA Sports FC / eFootball "
          "style, photorealistic 3D rendering, Unreal Engine 5, ray tracing, photoreal stadium "
          "and grass, detailed realistic kits, skin and faces, athletic adult male footballers "
          "with realistic body proportions (about 5.5 heads tall, mature and serious, NOT chibi, "
          "NOT cartoon, NOT cute), subtle motion blur, broadcast TV camera, 4k, ultra detailed. ")

SCENES = [
 ("01-match-hero", "landscape_16_9", "live match gameplay moment, a star striker dribbling past a defender near the box, in-game HUD overlay with scoreboard, match timer 67:32 and small radar minimap, broadcast camera angle, packed photoreal stadium under floodlights, dramatic atmosphere"),
 ("02-star-card", "portrait_16_9", "cinematic in-engine close-up of a determined adult male star striker, realistic sweat and skin detail, realistic emerald-green and white kit, night stadium floodlights bokeh, player showcase screen, serious confident expression"),
 ("03-club-home", "portrait_16_9", "football career mode club hub screen, realistic modern stadium exterior at golden sunset, sleek dark game UI panels and menu buttons overlay, resource and squad widgets, next-gen management game interface"),
 ("04-gacha", "portrait_16_9", "player pack walkout reveal screen, a realistic star footballer walkout under a spotlight, golden volumetric lighting, premium rarity card UI frame and stats overlay, ultimate team style reveal"),
 ("05-minigame", "portrait_16_9", "penalty kick gameplay moment, realistic striker stepping up to shoot, goalkeeper on the line, on-screen aim arrow and power meter UI, broadcast camera behind the taker, tense floodlit stadium"),
 ("06-goal", "landscape_16_9", "goal celebration gameplay moment, star player sliding on his knees celebrating, roaring photoreal crowd, in-game HUD shows score 2-1, night stadium with fireworks, epic broadcast replay angle"),
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
