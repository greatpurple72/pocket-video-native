#!/usr/bin/env python3
"""把 SLG 实机 UI 合成到 FLUX 生成的足球地图底图上,产出"实机截图"效果。
用法: python3 scripts/compose_map_ui.py <底图> <输出>"""
import sys
from PIL import Image, ImageDraw, ImageFont

FONT = "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc"
def f(sz): return ImageFont.truetype(FONT, sz)

base_path = sys.argv[1] if len(sys.argv) > 1 else "docs/design/art/generated/map-02-war.png"
out_path  = sys.argv[2] if len(sys.argv) > 2 else "docs/design/art/generated/map-ui-world.png"

img = Image.open(base_path).convert("RGBA")
W, H = img.size
ov = Image.new("RGBA", (W, H), (0,0,0,0))
d = ImageDraw.Draw(ov)

def panel(x0,y0,x1,y1,fill,r=14):
    d.rounded_rectangle([x0,y0,x1,y1], radius=r, fill=fill)
def text(x,y,s,sz,col=(255,255,255,255),anchor="la",bold=False):
    d.text((x,y), s, font=f(sz), fill=col, anchor=anchor)
def coin(x,y,r,col):  # simple resource icon
    d.ellipse([x-r,y-r,x+r,y+r], fill=col, outline=(0,0,0,120), width=2)
def tag(x,y,name,ally,col):  # other-player base label
    s=f(15); s2=f(13)
    w1=d.textlength("["+ally+"] ",font=s2); w2=d.textlength(name,font=s)
    w=int(w1+w2)+18; h=24
    d.rounded_rectangle([x,y,x+w,y+h], radius=8, fill=(8,14,22,200))
    d.rounded_rectangle([x,y,x+6,y+h], radius=3, fill=col)  # alliance color bar
    d.text((x+10,y+4), "["+ally+"]", font=s2, fill=col)
    d.text((x+10+w1,y+3), name, font=s, fill=(235,242,250,255))

GOLD=(255,210,90,255); CYAN=(120,210,255,255)

# ---- top resource bar ----
panel(0,0,W,58,(10,18,30,205),r=0)
d.ellipse([12,8,54,50], fill=(39,196,106,255), outline=(255,255,255,180), width=2)
text(30,29,"绿",22,(255,255,255,255),anchor="mm")
text(64,8,"绿茵王朝  R5",18,(255,255,255,255))
text(64,33,"战力 12.4M",16,GOLD)
# resource pills (right)
rx=W-20
for label,val,ic in [("钻石","860",CYAN),("声望","3.2k",(190,150,255,255)),("金币","124k",GOLD),("体力","118",(120,230,140,255))]:
    s=f(16); w=int(d.textlength(val,font=s))+58
    panel(rx-w,12,rx,46,(8,14,22,200),r=17)
    coin(rx-w+20,29,11,ic)
    d.text((rx-w+38,20),val,font=s,fill=(235,242,250,255))
    rx-=w+10

# ---- center objective banner ----
bw=360; panel(W//2-bw//2,68,W//2+bw//2,104,(40,18,18,200),r=12)
d.polygon([(W//2-bw//2+18,86),(W//2-bw//2+34,78),(W//2-bw//2+34,94)],fill=GOLD)
text(W//2,86,"世界冠军球场争夺   02:14:30",18,(255,225,180,255),anchor="mm")

# ---- other players' base labels (simulate many online players) ----
players=[("绿茵王朝","FCB",(80,200,120,255),0.18,0.30),
         ("烈焰之心","RED",(255,90,90,255),0.62,0.24),
         ("北境之狼","WLF",(120,180,255,255),0.40,0.42),
         ("皇家骑士","RMA",(255,210,90,255),0.74,0.52),
         ("蓝色风暴","BLU",(90,160,255,255),0.20,0.62),
         ("钢铁联盟","IRN",(180,190,200,255),0.55,0.70),
         ("黄潜军团","YEL",(245,205,70,255),0.30,0.80),
         ("黑鹰部落","BLK",(150,120,255,255),0.80,0.78)]
for name,ally,col,fx,fy in players:
    tag(int(W*fx),int(H*fy),name,ally,col)

# ---- march dashed lines + timers ----
def march(x0,y0,x1,y1,col,t):
    n=18
    for i in range(n):
        if i%2==0:
            ax=x0+(x1-x0)*i/n; ay=y0+(y1-y0)*i/n
            bx=x0+(x1-x0)*(i+1)/n; by=y0+(y1-y0)*(i+1)/n
            d.line([ax,ay,bx,by],fill=col,width=3)
    d.ellipse([x1-5,y1-5,x1+5,y1+5],fill=col)
    midx,midy=(x0+x1)//2,(y0+y1)//2
    panel(midx-30,midy-12,midx+30,midy+12,(8,14,22,210),r=10)
    text(midx,midy,t,13,(235,242,250,255),anchor="mm")
march(int(W*0.24),int(H*0.34),int(W*0.46),int(H*0.46),(255,210,90,255),"00:42")
march(int(W*0.66),int(H*0.28),int(W*0.5),int(H*0.46),(255,90,90,255),"01:10")

# ---- left/right side round buttons ----
def rbtn(x,y,label,col=(20,30,44,210)):
    d.ellipse([x-26,y-26,x+26,y+26],fill=col,outline=(120,170,220,160),width=2)
    text(x,y,label,14,(210,228,245,255),anchor="mm")
for i,l in enumerate(["邮件","任务","活动"]): rbtn(40,150+i*70,l)
for i,l in enumerate(["联盟","集结","搜索"]): rbtn(W-40,150+i*70,l)

# ---- minimap bottom-right ----
mm=130; panel(W-mm-16,H-mm-74,W-16,H-74,(8,14,22,210),r=10)
d.rectangle([W-mm-8,H-mm-66,W-24,H-82],outline=(80,120,160,180),width=1)
import random; random.seed(7)
for _ in range(26):
    px=random.randint(W-mm-6,W-26); py=random.randint(H-mm-64,H-84)
    d.ellipse([px-2,py-2,px+2,py+2],fill=random.choice([(255,90,90,255),(90,200,120,255),(120,180,255,255)]))

# ---- chat bottom-left ----
panel(16,H-150,300,H-74,(8,14,22,190),r=10)
text(28,H-142,"[联盟] 队长: 全员集合中央球场!",13,(160,230,180,255))
text(28,H-120,"[世界] 烈焰之心: 谁来支援东线",13,(200,210,225,255))
text(28,H-98, "[联盟] 绿茵王朝: 大巴2分钟到",13,(160,230,180,255))

# ---- bottom nav bar ----
nbh=58; panel(0,H-nbh,W,H,(10,18,30,215),r=0)
items=["世界","联盟","比赛","球员","商店"]
seg=W/len(items)
for i,it in enumerate(items):
    cx=seg*i+seg/2
    sel=(it=="世界")
    if sel: panel(cx-44,H-nbh+6,cx+44,H-6,(39,196,106,210),r=12)
    d.ellipse([cx-14,H-nbh+12,cx+14,H-nbh+40],outline=(235,242,250,230),width=2)
    text(cx,H-16,it,15,(255,255,255,255) if sel else (180,196,212,255),anchor="mm")

out = Image.alpha_composite(img, ov).convert("RGB")
out.save(out_path, quality=92)
print("saved", out_path, out.size)
