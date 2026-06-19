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

CHAR = ("realistic 3D football game character, EA Sports FC / eFootball style, almost realistic "
        "proportions with only a SUBTLY enlarged head — about 6.5 heads tall, just a little bigger "
        "than realistic for charm and readability, realistic adult face, skin, hair and kit, "
        "photoreal stadium background, Unreal Engine 5, 4k. NOT a caricature, NOT a bobblehead, "
        "NOT chibi, the head is only slightly larger than normal. ")

MAP = ("top-down 3/4 SLG strategy world map terrain, Last War Survival and Whiteout Survival style, "
       "an OUTDOOR world map of green grassland with roads, rivers, forests and rocky regions; many "
       "separate player bases scattered across the land with spacing, EACH base built as a small "
       "fortified football club with its own little stadium and walls; colored alliance territory "
       "ground tints, a larger central fortress stadium to contest. This is an outdoor strategic "
       "world map terrain, NOT one giant football pitch, there is no big soccer field, bases sit on "
       "grassland. Clean render with NO text and NO UI (UI added later), realistic-stylized 3D, "
       "top-down strategic camera, 4k. ")

SCENES = [
 ("char-messi", "portrait_16_9", CHAR + "the player is Lionel Messi, recognizable likeness: relatively short, short light beard, brown hair, generic light-blue and white striped kit, full body confident standing pose on the pitch, player showcase"),
 ("char-zidane", "portrait_16_9", CHAR + "the player is Zinedine Zidane, recognizable likeness: bald head, mature composed face, tall elegant build, generic all-white kit, full body standing pose on the pitch, player showcase"),
 ("map-terrain", "landscape_16_9", "premium stylized 3D strategy world map, 3/4 top-down angle, a RECOGNIZABLE real-world Earth map with stylized continents, coastlines and oceans (Civilization / Risk premium game-art look); the land is covered with MANY small football STADIUM club-city bases dotted across regions, colored federation territory regions tinting different countries, a glowing GRAND CHAMPIONSHIP STADIUM stronghold at the center surrounded by a ring of iconic landmark stadium strongholds, roads and sea routes with dotted march lines, fog of war at the edges; clean render with NO text and NO UI overlay, premium mobile SLG world map concept art, dramatic lighting, 4k"),
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
