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

CHAR = ("premium realistic 3D caricature of an ADULT male football star, mature face with light "
        "stubble, realistic detailed skin and NORMAL realistic-sized eyes, exaggerated only by a "
        "noticeably ENLARGED head on a realistic athletic adult body (caricature proportion about "
        "4.5 heads), photorealistic kit, grass and stadium, Unreal Engine 5, 4k, serious confident "
        "expression. NOT a child, NOT cute, NOT big anime eyes, NOT a baby, NOT chibi. ")

MAP = ("mobile 4X SLG strategy world map gameplay screenshot, Whiteout Survival and Last War style, "
       "3/4 top-down stylized terrain, MANY small stadium base icons and colored alliance territory "
       "tiles, dotted march lines with tiny troop icons moving between bases, clear mobile game UI "
       "chrome: top resource bar with icons and numbers, bottom row of menu buttons, side event and "
       "alliance/march buttons, minimap in corner, realistic-stylized 3D rendering, 4k. ")

SCENES = [
 ("c-01-match", "landscape_16_9", CHAR + "two big-head caricature footballers contesting the ball during a live match, one dribbling past the other, broadcast camera angle, packed stadium under floodlights, in-game HUD scoreboard and timer overlay, dynamic"),
 ("c-02-player", "portrait_16_9", CHAR + "full body big-head caricature star striker confident standing pose, realistic green and gold kit and shorts, stadium floodlights background, player showcase screen"),
 ("map-01-world", "landscape_16_9", MAP + "football themed: the player's club stadium base and many neighboring alliance stadium bases spread across a stylized real-world map with real continents and coastlines, colored alliance territory regions, small marching troop armies along routes between cities, a giant central championship stadium being contested by alliances, football resource tiles, fog of war at edges"),
 ("map-02-war", "landscape_16_9", MAP + "football themed guild vs guild alliance war: many alliance-colored troop march lines converging to attack an enemy stadium-fortress city, rally arrows, banners, battle number popups, alliance war and rally UI panels, tense"),
 ("map-03-base", "portrait_16_9", MAP + "football themed: the player's own club city base on the world map, a central modern stadium surrounded by training grounds, barracks and resource buildings inside city walls, isometric base view, build and upgrade UI buttons"),
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
