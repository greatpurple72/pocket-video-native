#!/usr/bin/env python3
"""把不同界面的 UI 合成到 FLUX 底图上。
用法: python3 scripts/compose_screens.py <mode: match|city> <底图> <输出>"""
import sys
from PIL import Image, ImageDraw, ImageFont

FONT = "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc"
def f(sz): return ImageFont.truetype(FONT, sz)
mode = sys.argv[1]; base_path = sys.argv[2]; out_path = sys.argv[3]
img = Image.open(base_path).convert("RGBA"); W,H = img.size
ov = Image.new("RGBA",(W,H),(0,0,0,0)); d = ImageDraw.Draw(ov)
GOLD=(255,210,90,255); CYAN=(120,210,255,255)
def panel(x0,y0,x1,y1,fill,r=14): d.rounded_rectangle([x0,y0,x1,y1],radius=r,fill=fill)
def txt(x,y,s,sz,col=(255,255,255,255),anchor="la"): d.text((x,y),s,font=f(sz),fill=col,anchor=anchor)
def coin(x,y,r,col): d.ellipse([x-r,y-r,x+r,y+r],fill=col,outline=(0,0,0,120),width=2)

def topbar():
    panel(0,0,W,56,(10,18,30,205),r=0)
    d.ellipse([12,8,50,46],fill=(39,196,106,255),outline=(255,255,255,180),width=2); txt(31,27,"绿",18,anchor="mm")
    txt(60,8,"绿茵王朝 R5",16); txt(60,31,"战力 12.4M",14,GOLD)
    rx=W-16
    for val,ic in [("860",CYAN),("124k",GOLD),("3.2k",(190,150,255,255)),("118",(120,230,140,255))]:
        s=f(15); w=int(d.textlength(val,font=s))+50
        panel(rx-w,12,rx,44,(8,14,22,200),r=16); coin(rx-w+18,28,10,ic); d.text((rx-w+34,20),val,font=s,fill=(235,242,250,255)); rx-=w+8

def bottomnav(sel):
    nbh=54; panel(0,H-nbh,W,H,(10,18,30,215),r=0); items=["世界","联盟","比赛","球员","商店"]; seg=W/len(items)
    for i,it in enumerate(items):
        cx=seg*i+seg/2
        if it==sel: panel(cx-42,H-nbh+5,cx+42,H-5,(39,196,106,210),r=12)
        d.ellipse([cx-13,H-nbh+10,cx+13,H-nbh+36],outline=(235,242,250,230),width=2)
        txt(cx,H-15,it,14,(255,255,255,255) if it==sel else (180,196,212,255),anchor="mm")

def rbtn(x,y,label):
    d.ellipse([x-24,y-24,x+24,y+24],fill=(20,30,44,210),outline=(120,170,220,160),width=2); txt(x,y,label,13,(210,228,245,255),anchor="mm")

if mode=="match":
    # scoreboard top-center
    bw=300; panel(W//2-bw//2,12,W//2+bw//2,60,(10,18,30,215),r=12)
    d.ellipse([W//2-bw//2+12,22,W//2-bw//2+40,50],fill=(39,196,106,255)); txt(W//2-bw//2+26,36,"主",14,anchor="mm")
    txt(W//2-40,36,"2",26,anchor="mm"); txt(W//2,36,"-",22,anchor="mm"); txt(W//2+40,36,"1",26,anchor="mm")
    d.ellipse([W//2+bw//2-40,22,W//2+bw//2-12,50],fill=(255,90,90,255)); txt(W//2+bw//2-26,36,"客",14,anchor="mm")
    panel(W//2-44,64,W//2+44,90,(10,18,30,200),r=10); txt(W//2,77,"67:32",16,GOLD,anchor="mm")
    # radar top-left
    panel(16,70,150,150,(8,14,22,200),r=10); d.rectangle([26,80,140,140],outline=(80,120,160,150),width=1)
    import random; random.seed(3)
    for _ in range(8): px,py=random.randint(30,136),random.randint(84,136); d.ellipse([px-3,py-3,px+3,py+3],fill=(120,230,140,255))
    for _ in range(8): px,py=random.randint(30,136),random.randint(84,136); d.ellipse([px-3,py-3,px+3,py+3],fill=(255,110,110,255))
    # joystick bottom-left
    cx,cy=120,H-120; d.ellipse([cx-70,cy-70,cx+70,cy+70],outline=(255,255,255,90),width=4); d.ellipse([cx-30,cy-30,cx+30,cy+30],fill=(63,174,107,210))
    # buttons bottom-right
    d.ellipse([W-110,H-150,W-30,H-70],fill=(31,111,235,220)); txt(W-70,H-110,"射门",18,anchor="mm")
    d.ellipse([W-200,H-120,W-150,H-70],fill=(39,196,106,220)); txt(W-175,H-95,"传",15,anchor="mm")
    d.ellipse([W-150,H-210,W-104,H-164],fill=(255,107,53,220)); txt(W-127,H-187,"冲",14,anchor="mm")
    # stamina
    panel(W//2-120,H-46,W//2+120,H-26,(8,14,22,160),r=10); panel(W//2-120,H-46,W//2+60,H-26,(255,210,63,230),r=10); txt(W//2-150,H-44,"体力",13,(255,255,255,255))
    out_default="比赛 HUD"

elif mode=="city":
    topbar(); bottomnav("世界")
    # building tags
    tags=[("中央体育场 Lv.12",0.50,0.42,GOLD),("训练中心 Lv.9",0.20,0.30,(120,230,140,255)),
          ("青训营 Lv.7",0.80,0.26,(120,180,255,255)),("医疗室 Lv.6",0.16,0.66,(255,140,140,255)),
          ("商业区 Lv.8",0.82,0.66,(245,205,70,255)),("转会市场 Lv.5",0.50,0.74,(190,150,255,255))]
    for name,fx,fy,col in tags:
        x,y=int(W*fx),int(H*fy); s=f(14); w=int(d.textlength(name,font=s))+40
        panel(x-w//2,y,x+w//2,y+26,(8,14,22,205),r=8); d.rounded_rectangle([x-w//2,y,x-w//2+5,y+26],radius=2,fill=col)
        txt(x-w//2+12,y+5,name,14);
        d.ellipse([x+w//2-24,y+3,x+w//2-3,y+24],fill=(39,196,106,255)); txt(x+w//2-13,y+13,"↑",14,anchor="mm")
    rbtn(36,150,"邮件"); rbtn(36,210,"任务"); rbtn(W-36,150,"联盟"); rbtn(W-36,210,"活动")
    # start match button
    panel(W//2-110,H-110,W//2+110,H-66,(255,210,90,255),r=22); txt(W//2,H-88,"▶ 开始比赛",24,(90,60,0,255),anchor="mm")

def stars(cx,y,n,sz=22):
    tot=n*(sz+4)
    for i in range(n): txt(cx-tot//2+i*(sz+4)+sz//2,y,"★",sz,(255,210,90,255),anchor="mm")

if mode=="gacha":
    d.rectangle([0,0,W,H],fill=(10,6,20,90))
    # golden rays from upper center
    import math
    ox,oy=W//2,int(H*0.32)
    for a in range(0,360,15):
        rad=math.radians(a); x2=ox+math.cos(rad)*W; y2=oy+math.sin(rad)*W
        d.line([ox,oy,x2,y2],fill=(255,210,90,40),width=10)
    panel(16,70,96,108,(200,40,40,255),r=10); txt(56,89,"UR",22,(255,255,255,255),anchor="mm")
    stars(W//2,int(H*0.60),5,26)
    panel(W//2-150,int(H*0.63),W//2+150,int(H*0.70),(8,14,22,210),r=12); txt(W//2,int(H*0.665),"C · 罗纳尔多  ST",20,(255,225,180,255),anchor="mm")
    panel(W//2-160,int(H*0.71),W//2+160,int(H*0.80),(8,14,22,200),r=12)
    st=[("速度","95"),("射门","96"),("盘带","90"),("体能","94"),("传球","85"),("防守","42")]
    for i,(k,v) in enumerate(st):
        cx=W//2-110+(i%3)*110; cy=int(H*0.73)+(i//3)*34; txt(cx,cy,k+" ",15,(170,190,210,255)); txt(cx+44,cy,v,15,GOLD)
    panel(40,H-96,W//2-8,H-44,(39,196,106,255),r=16); txt((40+W//2-8)//2,H-70,"单抽  🎯30",18,(255,255,255,255),anchor="mm")
    panel(W//2+8,H-96,W-40,H-44,(246,183,60,255),r=16); txt((W//2+8+W-40)//2,H-70,"十连抽  🎯300",18,(90,60,0,255),anchor="mm")

elif mode=="rank":
    d.rectangle([0,0,W,H],fill=(8,12,22,200))
    txt(W//2,28,"跨服赛季排行榜 · S6",24,(255,225,150,255),anchor="mm")
    rows=[("1","皇家骑士","RMA",GOLD,"48.6M"),("2","东方巨龙","DRG",(220,220,230,255),"45.1M"),
          ("3","烈焰之心","RED",(205,140,80,255),"43.9M"),("4","曼城之巅","SKY",(150,170,190,255),"39.2M"),
          ("5","绿茵王朝(你)","FCB",(120,230,140,255),"37.8M"),("6","沙漠雄鹰","DSR",(150,170,190,255),"34.0M"),
          ("7","南十字星","ANZ",(150,170,190,255),"31.5M"),("8","狮城卫士","LON",(150,170,190,255),"28.7M")]
    y0=64; rh=(H-120)//len(rows)
    for i,(r,name,fed,col,pw) in enumerate(rows):
        y=y0+i*rh; mine=(name.endswith("(你)"))
        panel(60,y,W-60,y+rh-8,(39,196,106,60) if mine else (16,24,38,200),r=10)
        txt(96,y+rh//2-2,r,22,col,anchor="mm")
        d.ellipse([130,y+8,130+rh-24,y+rh-16],fill=col);
        txt(150+rh,y+rh//2-2,name+"  ["+fed+"]",18,(235,242,250,255),anchor="lm")
        txt(W-96,y+rh//2-2,pw,18,GOLD,anchor="rm")

elif mode=="rally":
    d.rectangle([0,0,W,H],fill=(6,10,18,150))
    px0,py0,px1,py1=W//2-300,70,W//2+300,H-70
    panel(px0,py0,px1,py1,(14,22,36,240),r=18)
    txt(W//2,py0+30,"联盟集结 · 攻打 温布利球场据点(Lv.6)",18,(255,225,150,255),anchor="mm")
    txt(px0+30,py0+70,"目标:中立强据点  防御 8.2M",15,(190,205,220,255))
    txt(px0+30,py0+98,"集结出发倒计时  00:42",15,(255,160,120,255))
    # troop slots
    for i in range(6):
        cx=px0+70+i*92; cy=py0+160
        d.ellipse([cx-30,cy-30,cx+30,cy+30],fill=(24,34,50,255),outline=(120,170,220,160),width=2)
        if i<3: d.ellipse([cx-26,cy-26,cx+26,cy+26],fill=(39,196,106,200)); txt(cx,cy,"队"+str(i+1),13,(255,255,255,255),anchor="mm")
        else: txt(cx,cy,"+",26,(150,180,210,255),anchor="mm")
    txt(px0+30,py0+220,"已集结 3 / 6 支球队大巴",15,(190,205,220,255))
    panel(W//2-150,py1-66,W//2-8,py1-22,(39,196,106,255),r=16); txt((W//2-150+W//2-8)//2,py1-44,"加入集结",18,(255,255,255,255),anchor="mm")
    panel(W//2+8,py1-66,W//2+150,py1-22,(246,183,60,255),r=16); txt((W//2+8+W//2+150)//2,py1-44,"发起集结",18,(90,60,0,255),anchor="mm")

out = Image.alpha_composite(img,ov).convert("RGB"); out.save(out_path,quality=92); print("saved",out_path,out.size)
