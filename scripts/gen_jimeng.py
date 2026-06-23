#!/usr/bin/env python3
"""
即梦 / Seedream 图像生成(走火山方舟 Ark,OpenAI 兼容 images 接口)。

用法(密钥只走环境变量,绝不写入代码/不提交):
    export ARK_API_KEY="你的火山方舟API Key"
    export ARK_IMAGE_MODEL="你的即梦/Seedream图像模型ID或推理接入点ID"
    python3 scripts/gen_jimeng.py

输出:docs/design/art/generated/ 下的 PNG。
说明:模型ID请从火山方舟控制台获取(开通了即梦/Seedream 图像生成的那个)。
"""
import os, json, base64, urllib.request, urllib.error, pathlib, time

API_KEY = os.environ.get("ARK_API_KEY")
MODEL   = os.environ.get("ARK_IMAGE_MODEL", "")
ENDPOINT = os.environ.get("ARK_IMAGE_ENDPOINT",
                          "https://ark.cn-beijing.volces.com/api/v3/images/generations")
OUT = pathlib.Path("docs/design/art/generated"); OUT.mkdir(parents=True, exist_ok=True)

PREFIX = ("高质感3D卡通渲染,皮克斯/梦工厂电影级画质,虚幻引擎5 Lumen全局光照,"
          "次世代手游CG品质,精致卡通角色,Q版但身材比例协调,清爽高饱和配色,"
          "电影级布光,柔和边缘光,景深虚化,超精细材质,8K,杰作,")

# (文件名, 场景提示词, 尺寸)
SCENES = [
 ("01-match-hero", "一名卡通风格足球前锋在标准足球场上高速带球突破,动感奔跑姿态,翠绿配白球衣,草皮有割草分割条纹,满座体育场观众虚化,午后金色阳光,强烈边缘光,低角度动感广角镜头,电影感构图", "1664x936"),
 ("02-star-card",  "卡通风格明星前锋角色英雄海报半身特写,自信坚定表情,翠绿球衣细节,体育场夜场灯光虚化背景,星光氛围,影棚柔光加金色边缘光,适合做UR球员卡", "936x1664"),
 ("03-club-home",  "卡通风格现代足球俱乐部基地全景,中央一座精致体育场,周边训练中心、青训楼、商业区建筑,旗帜飘扬,温暖黄昏金光,等距偏俯视构图,手游主界面氛围", "936x1664"),
 ("04-gacha",      "卡通风格传奇球员抽卡揭晓瞬间,金色UR卡框,角色从耀眼光芒中浮现,放射光线,星光粒子,史诗仪式感,金色与紫色主调,强烈视觉冲击", "936x1664"),
 ("05-minigame",   "超休闲手游广告风格,大头Q版足球运动员点球射门瞬间,夸张搞笑动作,守门员飞身扑救,鲜艳糖果色,明亮简洁背景,TikTok爆款广告画面", "936x1664"),
 ("06-league",     "卡通风格两大球队联盟史诗对抗,体育场上空两队队徽激烈碰撞,一侧火焰一侧绿茵能量,旗帜与狂热人群,震撼电竞宣传海报构图", "1664x936"),
]
NEGATIVE = "低质量,模糊,畸形,多余手指,比例失调,丑陋,杂乱背景,文字水印,真实照片写实人脸,恐怖谷"

def gen(name, scene, size):
    body = {
        "model": MODEL,
        "prompt": PREFIX + scene,
        "size": size,
        "response_format": "url",
        "n": 1,
        # 部分模型支持以下可选项,不支持会被忽略/报错时可删:
        "watermark": False,
    }
    req = urllib.request.Request(ENDPOINT, data=json.dumps(body).encode("utf-8"),
        headers={"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=120) as r:
        data = json.loads(r.read().decode("utf-8"))
    item = data["data"][0]
    if item.get("url"):
        img = urllib.request.urlopen(item["url"], timeout=120).read()
    else:
        img = base64.b64decode(item["b64_json"])
    p = OUT / f"{name}.png"; p.write_bytes(img)
    print(f"  OK -> {p} ({len(img)//1024} KB)")

def main():
    if not API_KEY or not MODEL:
        print("缺少 ARK_API_KEY 或 ARK_IMAGE_MODEL 环境变量。"); return
    print(f"模型: {MODEL} | 输出: {OUT}")
    for name, scene, size in SCENES:
        print(f"[{name}] 生成中…")
        try:
            gen(name, scene, size)
        except urllib.error.HTTPError as e:
            print(f"  HTTP {e.code}: {e.read().decode('utf-8')[:300]}")
        except Exception as e:
            print(f"  失败: {e}")
        time.sleep(1)

if __name__ == "__main__":
    main()
