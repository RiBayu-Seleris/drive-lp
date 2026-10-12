import { CatmullRomCurve3, MathUtils, Vector3 } from 'three';
import { clamp } from './runtime';
import { sampleChapter, sampleRoadBend } from './journeyPath';

// One road, one vehicle. Close coverage/inspection shots lead into a spatial service map;
// the final composition follows the repaired vehicle toward the morning horizon.
const positions = [
 [0,3.2,11], [57,5,-80], [39,6,-105], [3,8,-153],
 [3,8,-153], [56,9,-248], [91,35,-310], [79,8,-376], [78,6,-445],
];
const targets = [
 [1,2,-40], [53,2,-97], [52,2,-92], [-10,4,-176],
 [-10,4,-176], [42,5,-275], [62,4,-349], [71,4,-402], [78,5,-500],
];
const curves = {
 position: new CatmullRomCurve3(positions.map(p=>new Vector3(...p)),false,'catmullrom',.12),
 target: new CatmullRomCurve3(targets.map(p=>new Vector3(...p)),false,'catmullrom',.12),
};
const scratch=new Vector3(),bend=new Vector3();
export function sampleCamera(at:number,property:'position'|'target',out:{set:(x:number,y:number,z:number)=>unknown}) {
 const stage=Math.min(8,Math.floor(Math.max(0,at)));
 const local=clamp(at-stage);
 // Keep the chapter compositions, but travel around road bends rather than cutting across them.
 curves[property].getPoint(sampleChapter(at)/8,scratch);
 scratch.add(sampleRoadBend(at,bend));
 if(stage<8 && property==='position')scratch.z-=Math.sin(local*Math.PI)*.35;
 out.set(scratch.x,scratch.y,scratch.z);
}

export function sampleView(at:number,mobile:boolean,position:Vector3,target:Vector3){
 sampleCamera(at,'position',position);sampleCamera(at,'target',target);
 if(!mobile)return;
 const intro=1-MathUtils.smoothstep(at,.55,1.3);
 position.z+=8;position.y+=1.8;target.y+=3.5*(1-intro);
 position.x=MathUtils.lerp(position.x,-.5,intro);position.y=MathUtils.lerp(position.y,4,intro);position.z=MathUtils.lerp(position.z,15,intro);
 target.x=MathUtils.lerp(target.x,-1,intro);target.y=MathUtils.lerp(target.y,1.1,intro);target.z=MathUtils.lerp(target.z,-17,intro);
}
