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

PREFIX = ("stylized 3D game render, high-end mobile game CG, stylized cartoon-realism (Honor of "
          "Kings / Overwatch / League of Legends 3D hero look), CLEARLY stylized proportions: "
          "slightly oversized head, about 5 heads tall, stocky heroic athletic build, NOT "
          "photorealistic and NOT cute baby chibi, mature confident faces, dramatic cinematic "
          "lighting, Unreal Engine 5, 4k, ultra detailed. ")

SCENES = [
 ("s5-01-match", "landscape_16_9", "in-game football match, a stylized 5-heads-tall hero striker with slightly big head and heroic build dribbling past a defender, broadcast camera, semi-stylized stadium with crowd, in-game HUD scoreboard and timer overlay, dynamic action"),
 ("s5-02-player", "portrait_16_9", "full body stylized star striker hero standing pose, clearly 5 heads tall with slightly oversized head and stocky heroic proportions, emerald-green and white kit, stadium floodlights, character showcase, splash-art style"),
 ("gvg-01-worldmap", "landscape_16_9", "zoomed-out top-down 4X strategy world map gameplay screenshot, dozens of tiny player city bases dotted across grid terrain with rivers and roads, colored alliance territory regions, small marching army units moving along roads, resource tiles, fog of war at edges, a central fortress under siege by many small troops, minimap and alliance power UI HUD overlay, Whiteout Survival / Last War world map view, mobile strategy game"),
 ("gvg-02-battle", "landscape_16_9", "zoomed-in section of a 4X strategy map during guild vs guild war, many small alliance-colored troop march lines converging to siege an enemy fortress city, rally arrows, banners, battle number popups, march and rally UI overlay, top-down strategy camera, mobile SLG screenshot"),
 ("gvg-03-base", "portrait_16_9", "player home base on the SLG world map, a fortified football club city with a central stadium, training grounds, walls, barracks and resource buildings, isometric base-building view, upgrade and resource UI overlay, stylized 3D mobile SLG"),
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
