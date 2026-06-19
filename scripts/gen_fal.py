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
          "style, photorealistic 3D rendering, Unreal Engine 5, realistic stadium, kits, skin and "
          "faces, athletic adult male footballers. REALISTIC rendering but with a SUBTLY enlarged "
          "head, about 6.5 heads tall, a slight tasteful stylization for game readability and "
          "charm — still photoreal materials, NOT cartoon, NOT chibi. Broadcast camera, 4k, ultra "
          "detailed. ")

SCENES = [
 ("r6-01-match", "landscape_16_9", "live match gameplay, a star striker (subtly enlarged head, realistic body) dribbling past a defender, in-game HUD scoreboard and timer overlay, broadcast camera, packed photoreal stadium under floodlights, dramatic"),
 ("r6-02-player", "portrait_16_9", "full body realistic star striker standing pose, subtly enlarged head ~6.5 heads tall, realistic emerald-green and white kit and shorts, photoreal skin, stadium floodlights, player showcase screen"),
 ("earth-01-globe", "landscape_16_9", "realistic 3D strategy view of planet Earth as a global football SLG world map, real continents and oceans seen from space, glowing football club stadium bases placed on real-world cities, colored alliance territories spanning real countries, glowing arc march/route lines between cities across the globe, holographic strategy UI overlay, realistic rendering, epic global scale, night side city lights"),
 ("earth-02-region", "landscape_16_9", "zoomed-in region of the real-Earth football SLG world map over Europe, realistic terrain and coastlines with real cities as fortified stadium bases, alliance territory borders over real countries, small marching armies along routes between cities, strategy game UI panels (alliance, power, march), realistic rendering, top-down strategic camera"),
 ("earth-03-base", "portrait_16_9", "a player's fortified football club city base on the real-world strategy map, a real-city themed base with a central modern stadium, training grounds, walls and resource buildings, realistic isometric base view, upgrade and resource UI overlay, next-gen SLG"),
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
