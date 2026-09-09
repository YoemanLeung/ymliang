/**
 * Deterministic illustrative geometry, not a measured map or simulation dataset.
 * Fixed seed keeps the scene and performance stable across rebuilds.
 */
export function createCosmicField(seed = 7021, density = 1) {
  let state = seed >>> 0;
  const random = () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const gaussian = () => Math.sqrt(-2 * Math.log(Math.max(random(), 1e-8))) * Math.cos(2 * Math.PI * random());
  const nodes = [
    [-11,5,-2],[-8,-4,0],[-5,8,-5],[-3,1,4],[0,-6,-4],[1,5,0],
    [5,0,1],[6,9,-3],[9,-6,-1],[12,5,3],[13,-1,-5],[-10,-10,-6],
    [-3,-11,3],[5,-11,5],[11,11,-8],[-6,0,-9],[0,11,5],[9,2,9],
  ];
  const edges = [[0,2],[0,3],[0,1],[1,3],[1,11],[2,5],[2,16],[3,5],[3,4],
    [3,15],[4,6],[4,12],[4,13],[5,6],[5,7],[5,16],[6,8],[6,9],[6,17],
    [7,9],[7,14],[8,10],[8,13],[9,10],[9,14],[9,17],[11,12],[12,13],[15,2],[15,4]];
  const positions=[],colors=[],sizes=[],linePositions=[];
  const add = (x,y,z,color,size) => {
    positions.push(x,y,z);colors.push(...color);sizes.push(size);
  };
  const cold=[.25,.58,.97],warm=[1,.82,.49],hot=[1,.3,.5];
  const curve = (a,b,t,phase) => [
    a[0]+(b[0]-a[0])*t+Math.sin(t*Math.PI)*Math.sin(phase)*1.1,
    a[1]+(b[1]-a[1])*t+Math.sin(t*Math.PI)*Math.cos(phase)*1.4,
    a[2]+(b[2]-a[2])*t+Math.sin(t*Math.PI)*Math.sin(phase*2)*1.8,
  ];
  edges.forEach(([ia,ib],index)=>{
    const a=nodes[ia],b=nodes[ib],phase=index*2.31;
    for(let j=0;j<Math.floor(310*density);j++){
      const t=random(),p=curve(a,b,t,phase),spread=.15+Math.sin(t*Math.PI)*.25;
      add(p[0]+gaussian()*spread,p[1]+gaussian()*spread,p[2]+gaussian()*spread,cold,.026+random()*.055);
    }
    for(let j=0;j<35;j++)linePositions.push(...curve(a,b,j/35,phase),...curve(a,b,(j+1)/35,phase));
  });
  nodes.forEach((n,index)=>{
    const quasar=[3,6,9].includes(index);
    for(let j=0;j<Math.floor((quasar?620:330)*density);j++){
      const s=.12+random()*.75,color=quasar && j%5===0 ? hot : (j%4===0?warm:cold);
      add(n[0]+gaussian()*s,n[1]+gaussian()*s,n[2]+gaussian()*s,color,.03+random()*.075);
    }
    add(...n,quasar?hot:warm,quasar?.6:.35);
  });
  for(let i=0;i<Math.floor(2100*density);i++){
    add((random()-.5)*85,(random()-.5)*65,(random()-.5)*65,[.55,.68,.85],.02+random()*.035);
  }
  return {positions:new Float32Array(positions),colors:new Float32Array(colors),sizes:new Float32Array(sizes),linePositions:new Float32Array(linePositions)};
}
