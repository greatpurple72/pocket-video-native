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

CHAR = ("realistic 3D football game player render, EA Sports FC / eFootball style, photoreal skin, "
        "hair, kit and stadium. The body has FULLY REALISTIC proportions and the head is ONLY about "
        "10 percent larger than normal (roughly 6 heads tall) — a very subtle stylization, clearly "
        "NOT a bobblehead, NOT a caricature, NOT chibi, just a slightly larger head on a realistic "
        "athletic body. Full body standing showcase pose, premium player card render, 4k. ")

SCENES = [
 ("star-messi", "portrait_16_9", CHAR + "the player is Lionel Messi, recognizable likeness: relatively short, short dark beard, brown hair, light-blue and white vertical striped national kit, confident calm expression"),
 ("star-zidane", "portrait_16_9", CHAR + "the player is Zinedine Zidane, recognizable likeness: bald head, mature composed face, tall elegant build, all-white kit"),
 ("star-ronaldo", "portrait_16_9", CHAR + "the player is Cristiano Ronaldo, recognizable likeness: athletic muscular build, short dark hair, sharp confident expression, red and green kit"),
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
