(function(root) {
  'use strict';
  function hip(id, bounds, base, pitch) {
    const [left,right,rear,front] = bounds;
    return {id,bounds:bounds.slice(),planes:[
      [pitch,0,base-pitch*left],[-pitch,0,base+pitch*right],
      [0,pitch,base-pitch*rear],[0,-pitch,base+pitch*front]
    ]};
  }
  function definitions(base, alternative, floor = 10) {
    if (!['A','B','C','D'].includes(alternative)) throw new Error(`Unknown roof study: ${alternative}`);
    const roofs = (base.getHistoricalRoofDefinitions ?? base.getConnectedRoofDefinitions)(floor).map(d=>({...d,bounds:d.bounds.slice(),planes:d.planes.map(p=>p.slice())}));
    if (alternative === 'A') return roofs;
    const attic = roofs.find(d=>d.id==='Garage attic storage roof');
    const returnRoof = roofs.find(d=>d.id==='Garage service return');
    if (alternative === 'D') {
      const eave = floor + 10.66;
      Object.assign(attic,hip(attic.id,attic.bounds,eave,0.25));
      const slope=(eave-8.9)/(returnRoof.bounds[3]-returnRoof.bounds[2]);
      returnRoof.planes=[[0,-slope,eave+slope*returnRoof.bounds[2]]];
      return roofs;
    }
    const eave = floor + 10.66, pitch = alternative === 'B' ? 0.25 : 3.5/12;
    Object.assign(attic, hip(attic.id,attic.bounds,eave,pitch));
    Object.assign(returnRoof,hip(returnRoof.id,returnRoof.bounds,8.9,alternative==='B'?0.5:4.5/12));
    if (alternative === 'C') {
      for (const roof of roofs) {
        if (['Main house','Primary bath rear','East rear wing'].includes(roof.id))
          Object.assign(roof,hip(roof.id,roof.bounds,floor+10.6,3.5/12));
        if (['West front gable','East front gable'].includes(roof.id)) {
          const [left,right,rear] = roof.bounds, slope=7.3/((right-left)/2), baseHeight=floor+9.2;
          roof.planes=[[slope,0,baseHeight-slope*left],[-slope,0,baseHeight+slope*right],[0,slope,baseHeight-slope*rear]];
        }
        if (roof.id==='Garage hip') Object.assign(roof,hip(roof.id,roof.bounds,8.9,4.5/12));
        if (roof.id==='Garage front gable') {
          const [left,right,rear,front]=roof.bounds, slope=6.3/((right-left)/2);
          roof.planes=[[slope,0,8.9-slope*left],[-slope,0,8.9+slope*right],[0,6.3/(front-rear),8.9-6.3/(front-rear)*rear]];
        }
      }
    }
    return roofs;
  }
  function library(base, alternative) {
    const connected = floor=>definitions(base,alternative,floor);
    return {...base,studyAlternative:alternative,getConnectedRoofDefinitions:connected,
      getLowerRoofDefinitions() {
        const changes=connected(10);
        return changes.filter(d=>d.id.startsWith('Garage')||d.id==='Dining rear projection');
      }};
  }
  const api={definitions,library};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.HomeRoofStudies=api;
})(typeof globalThis!=='undefined'?globalThis:this);
