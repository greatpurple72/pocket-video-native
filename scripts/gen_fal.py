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

PREFIX = ("high-end stylized 3D cartoon render, Pixar/DreamWorks cinematic quality, "
          "Unreal Engine 5 Lumen global illumination, AAA mobile game CG, polished toon "
          "characters, slightly chibi but well-proportioned, clean vibrant saturated colors, "
          "cinematic lighting, soft rim light, depth of field, ultra-detailed, 8k, masterpiece. ")

SCENES = [
 ("01-match-hero", "landscape_16_9", "a stylized cartoon soccer striker sprinting and dribbling at speed on a standard pitch, dynamic running pose, emerald-green and white kit, mowed grass stripes, packed stadium crowd bokeh, golden afternoon sunlight, strong rim light, low-angle dynamic wide shot, cinematic composition"),
 ("02-star-card", "portrait_16_9", "heroic half-body close-up of a stylized cartoon star striker, confident determined expression, detailed emerald kit, blurred night stadium floodlights, sparkle atmosphere, studio soft light with golden rim, designed as a UR player card"),
 ("03-club-home", "portrait_16_9", "panoramic stylized cartoon modern football club base, a polished stadium in the center, surrounded by training center, youth academy and commercial buildings, waving flags, warm golden sunset, isometric slightly top-down view, mobile game home screen vibe"),
 ("04-gacha", "portrait_16_9", "stylized cartoon legendary player gacha reveal, golden UR card frame, character emerging from radiant light, light rays, sparkling particles, epic ritual feeling, gold and purple palette, strong visual impact"),
 ("05-minigame", "portrait_16_9", "hyper-casual mobile ad style, big-head chibi soccer player taking a penalty kick, exaggerated funny pose, goalkeeper diving to save, bright candy colors, clean bright background, viral ad shot"),
 ("06-league", "landscape_16_9", "stylized cartoon epic clash of two football alliances, two team crests colliding above a stadium, fire energy vs green-pitch energy, flags and roaring crowd, dramatic esports promo poster composition"),
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
