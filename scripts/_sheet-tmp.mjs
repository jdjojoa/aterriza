import sharp from "sharp";
const [,,dir,out,cols,...names]=process.argv;
const imgs=await Promise.all(names.map(async n=>{const b=await sharp(`${dir}/${n}.png`).resize({height:+process.env.H||300}).png().toBuffer();const m=await sharp(b).metadata();return {b,w:m.width,h:m.height};}));
const C=+cols, cw=Math.max(...imgs.map(i=>i.w))+10, rows=Math.ceil(imgs.length/C);
await sharp({create:{width:cw*C,height:(+process.env.H||300)*rows+10*rows,channels:4,background:"#888"}}).composite(imgs.map((im,i)=>({input:im.b,left:(i%C)*cw,top:Math.floor(i/C)*((+process.env.H||300)+10)}))).png().toFile(out);
