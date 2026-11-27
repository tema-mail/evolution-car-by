import sys
from PIL import Image
S=sys.argv[1]; out=sys.argv[2]
paints=['Z008PC003','Z008PC006','Z008PC066','Z008PC065','Z008PC043','Z008PC044','Z008PC005','Z008PC004']
wheels=['Z008PC032','Z008PC069','Z008PC033','Z008PC034','Z008PC012','Z008PC011','Z008PC067','Z008PC068','Z008PC046']
BG=(214,218,224); G=2
def cover(im,w,h):
    r=max(w/im.width,h/im.height); im=im.resize((round(im.width*r),round(im.height*r)),Image.LANCZOS)
    x=(im.width-w)//2; y=(im.height-h)//2; return im.crop((x,y,x+w,y+h))
c=Image.new('RGB',(1200,900),BG); cw=(1200-G)//2; ch=(900-3*G)//4
for i,P in enumerate(paints):
    im=Image.open(f'{S}/c_{P}.webp').convert('RGB').crop((50,130,1170,570))
    c.paste(cover(im,cw,ch),((i%2)*(cw+G),(i//2)*(ch+G)))
c.save(f'{out}/cveta.png')
d=Image.new('RGB',(1200,900),BG); cw=(1200-2*G)//3; ch=(900-2*G)//3
for i,W in enumerate(wheels):
    im=Image.open(f'{S}/w_{W}.webp').convert('RGB').crop((73,360,383,592))
    d.paste(cover(im,cw,ch),((i%3)*(cw+G),(i//3)*(ch+G)))
d.save(f'{out}/diski.png')
