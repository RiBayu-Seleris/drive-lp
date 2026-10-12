import { CatmullRomCurve3, Vector3 } from 'three';
import { clamp } from './runtime';
import { sampleChapter, sampleRoadBend } from './journeyPath';

// One road, one vehicle. Close coverage/inspection shots lead into a spatial service map;
// the final composition follows the repaired vehicle toward the morning horizon.
const positions = [
 [0,3.2,11], [57,5,-80], [39,6,-105], [-5,6,-159],
 [-5,6,-159], [51,7,-253], [91,35,-310], [76,7,-379], [78,6,-445],
];
const targets = [
 [1,2,-40], [53,2,-97], [52,2,-92], [-12,4,-177],
 [-12,4,-177], [42,5,-275], [62,4,-349], [71,4,-402], [78,5,-500],
];
const curves = {
 position: new CatmullRomCurve3(positions.map(p=>new Vector3(...p)),false,'catmullrom',.12),
 target: new CatmullRomCurve3(targets.map(p=>new Vector3(...p)),false,'catmullrom',.12),
};
const mobileCurves = {
 position: new CatmullRomCurve3([
  [-.5,4,15], [54,6.8,-73], [38,7,-106], [-8,9,-151],
  [-8,9,-151], [48,10,-247], [78,39,-312], [74,11,-374], [79,9,-442],
 ].map(p=>new Vector3(...p)),false,'catmullrom',.12),
 target: new CatmullRomCurve3([
  [-1,1.1,-17], [50,5.8,-94], [51,6,-93], [-16,8,-174],
  [-16,8,-174], [40,9,-271], [60,8,-347], [70,10,-400], [77,8,-490],
 ].map(p=>new Vector3(...p)),false,'catmullrom',.12),
};
const scratch=new Vector3(),bend=new Vector3();
export function sampleCamera(at:number,property:'position'|'target',out:{set:(x:number,y:number,z:number)=>unknown},mobile=false) {
 const stage=Math.min(8,Math.floor(Math.max(0,at)));
 const local=clamp(at-stage);
 // Keep the chapter compositions, but travel around road bends rather than cutting across them.
 (mobile?mobileCurves:curves)[property].getPoint(sampleChapter(at)/8,scratch);
 scratch.add(sampleRoadBend(at,bend));
 if(stage<8 && property==='position')scratch.z-=Math.sin(local*Math.PI)*.35;
 out.set(scratch.x,scratch.y,scratch.z);
}

export function sampleView(at:number,mobile:boolean,position:Vector3,target:Vector3){
 sampleCamera(at,'position',position,mobile);sampleCamera(at,'target',target,mobile);
}
