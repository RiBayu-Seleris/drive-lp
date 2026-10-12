import { useEffect, useMemo } from 'react';
import { CanvasTexture, SRGBColorSpace, DoubleSide, TextureLoader } from 'three';
import { useLoader, type ThreeElements } from '@react-three/fiber';

export type PanelKind='vehicle'|'route'|'document'|'form'|'capture'|'analysis'|'identity'|'policy'|'damage'|'workshop'|'towing';
export type VehicleView='preview'|'front'|'rear'|'right'|'left';
const vehicleViewRows:Record<VehicleView,number>={preview:0,front:1,rear:2,right:3,left:4};
function line(ctx:CanvasRenderingContext2D,points:number[][],color='#78caff',width=2){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();}
function documentIcon(ctx:CanvasRenderingContext2D,x:number,y:number,scale=1){
 ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);line(ctx,[[0,0],[44,0],[65,22],[65,88],[0,88],[0,0]],'#9ad6ff',2);line(ctx,[[44,0],[44,22],[65,22]],'#9ad6ff',2);
 for(let i=0;i<4;i++)line(ctx,[[12,36+i*11],[51-i%2*8,36+i*11]],'#86b2d5',2);ctx.restore();
}
function marker(ctx:CanvasRenderingContext2D,x:number,y:number){ctx.strokeStyle='#74c5e5';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,5,0,Math.PI*2);ctx.stroke();}
function drawPanel(title:string,kind:PanelKind,rows:readonly string[],vehiclePreview:CanvasImageSource,vehicleView:VehicleView){
 const canvas=document.createElement('canvas');canvas.width=768;canvas.height=480;const ctx=canvas.getContext('2d')!;
 const drawVehicle=(x:number,y:number,width:number,height:number)=>ctx.drawImage(vehiclePreview,0,vehicleViewRows[vehicleView]*600,1200,600,x,y,width,height);
 const bg=ctx.createLinearGradient(0,0,768,480);bg.addColorStop(0,'rgba(5,19,35,0.97)');bg.addColorStop(1,'rgba(9,33,55,0.9)');ctx.fillStyle=bg;ctx.fillRect(0,0,768,480);
 ctx.strokeStyle='#468fc1';ctx.lineWidth=2;ctx.strokeRect(2,2,764,476);ctx.fillStyle='#94d7ff';ctx.fillRect(25,0,76,3);
 ctx.font='500 24px sans-serif';ctx.fillStyle='#d3edff';ctx.fillText(title.toUpperCase(),32,50);
 ctx.font='12px monospace';ctx.fillStyle='#6897b8';ctx.fillText('DRIVE  /  ILUSTRASI LAYANAN',32,77);line(ctx,[[32,98],[736,98]],'#29526f');
 if(kind==='vehicle'||kind==='damage'){
  for(let i=0;i<7;i++)line(ctx,[[50,155+i*32],[690,155+i*32]],'#102f4a',1);
  drawVehicle(54,124,660,330);ctx.font='14px monospace';ctx.fillStyle='#7fb5d8';ctx.fillText(kind==='damage'?'BAGIAN TERDAMPAK':'DATA KENDARAAN',46,436);
 }else if(kind==='route'){
  for(let r=0;r<11;r++){const p=[];for(let x=0;x<22;x++)p.push([28+x*34,130+r*26+Math.sin(x*.7+r*.5)*18]);line(ctx,p,'#24445d',1);}
  for(let col=0;col<18;col++)line(ctx,[[40+col*40,120],[22+col*41,430]],'#1e3b51',1);
  const route=[[120,372],[218,344],[247,283],[376,256],[418,191],[571,176],[625,147]];line(ctx,route,'#519cc5',7);line(ctx,route,'#a7e7ff',2);route.filter((_,i)=>i%2===0).forEach(([x,y])=>{ctx.fillStyle='#bbeeff';ctx.beginPath();ctx.arc(x,y,5,0,Math.PI*2);ctx.fill();});
  ctx.font='13px monospace';ctx.fillStyle='#9ac8e7';ctx.fillText('PILIH LANGKAH BERIKUTNYA',35,449);
 }else if(kind==='capture'){
  drawVehicle(84,109,600,300);ctx.strokeStyle='#79d7ff';ctx.lineWidth=3;ctx.strokeRect(65,126,637,240);ctx.font='18px sans-serif';ctx.fillStyle='#bde8ff';ctx.fillText('FOTO KENDARAAN',100,410);ctx.beginPath();ctx.arc(640,409,25,0,Math.PI*2);ctx.stroke();
 }else{
  if(kind==='identity') {
   ctx.strokeStyle='#8ed4ff';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(110,199,36,46,0,0,Math.PI*2);ctx.stroke();
   line(ctx,[[43,324],[52,280],[87,260],[133,260],[169,280],[180,324]],'#8ed4ff',3);
   for(let i=0;i<6;i++)line(ctx,[[74,173+i*11],[146,173+i*11]],'#285577',1);
  } else if(kind==='policy') {
   line(ctx,[[47,161],[110,141],[174,161],[166,247],[145,280],[110,307],[75,280],[53,247],[47,161]],'#94d8ff',3);
   documentIcon(ctx,88,184,.7);
  } else if(kind==='analysis') {
   ctx.strokeStyle='#91d5ff';ctx.lineWidth=3;ctx.strokeRect(57,167,108,108);ctx.strokeRect(81,191,60,60);
   for(let i=0;i<5;i++){line(ctx,[[47,177+i*21],[29,177+i*21]],'#80bfe9',3);line(ctx,[[177,177+i*21],[195,177+i*21]],'#80bfe9',3);}
   ctx.font='24px monospace';ctx.fillStyle='#bdedff';ctx.fillText('AI',94,230);
  } else if(kind==='workshop') {
   line(ctx,[[52,322],[52,187],[111,144],[174,187],[174,322]],'#91d5ff',3);
   line(ctx,[[72,322],[72,226],[153,226],[153,322]],'#91d5ff',3);
   for(let i=0;i<4;i++)line(ctx,[[72,235+i*16],[153,235+i*16]],'#397ca8',2);
  } else if(kind==='towing') {
   line(ctx,[[32,244],[32,282],[185,282],[185,218],[166,192],[137,192],[137,244],[32,244]],'#91d5ff',3);
   line(ctx,[[146,202],[160,202],[177,224],[146,224],[146,202]],'#91d5ff',2);
   [62,159].forEach(x=>{ctx.beginPath();ctx.arc(x,285,15,0,Math.PI*2);ctx.stroke();});
   drawVehicle(30,198,108,54);
  } else if(kind==='form') {
   ctx.strokeStyle='#76bdec';ctx.lineWidth=2;ctx.strokeRect(45,145,132,182);
   for(let i=0;i<4;i++){ctx.strokeRect(61,165+i*36,98,24);line(ctx,[[68,177+i*36],[131,177+i*36]],'#659fc7',2);}
  } else documentIcon(ctx,50,152,1.9);
  rows.forEach((row,i)=>{marker(ctx,237,155+i*57);ctx.font='19px sans-serif';ctx.fillStyle='#c9e4f7';ctx.fillText(row,265,162+i*57,463);});
  line(ctx,[[48,410],[720,410]],'#264860',2);
 }
 // Subpixel scan structure is part of the surface, not a fullscreen filter.
 ctx.fillStyle='rgba(84,172,222,.025)';for(let y=0;y<480;y+=4)ctx.fillRect(0,y,768,1);
 const texture=new CanvasTexture(canvas);texture.colorSpace=SRGBColorSpace;return texture;
}
export function HologramPanel({title,kind='document',rows=[],width=8,vehicleView='preview',...props}:ThreeElements['group']&{title:string;kind?:PanelKind;rows?:readonly string[];width?:number;vehicleView?:VehicleView}) {
 // A single cached render of the same GLB keeps every preview/capture panel consistent.
 const vehiclePreview=useLoader(TextureLoader,'/assets/models/aventador-preview.webp');
 const rowKey=rows.join('|');
 const texture=useMemo(()=>drawPanel(title,kind,rowKey?rowKey.split('|'):[],vehiclePreview.image,vehicleView),[title,kind,rowKey,vehiclePreview,vehicleView]);
 useEffect(()=>()=>texture.dispose(),[texture]);
 return <group {...props}>
 <mesh><planeGeometry args={[width,width*.625]}/><meshBasicMaterial map={texture} transparent opacity={.91} side={DoubleSide} toneMapped={false}/></mesh>
 <mesh position={[0,-width*.3125-.055,0]}><boxGeometry args={[width,.025,.045]}/><meshBasicMaterial color="#a2dbff" toneMapped={false}/></mesh>
 </group>;
}
