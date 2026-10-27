// Browser regression: call with the actual THREE scene after matrix updates.
// No production debug globals required; the inspection harness supplies these.
function verifyFlushWindowGeometry(THREE, scene) {
  scene.updateMatrixWorld(true);
  const close = (a, b, label) => {
    if (Math.abs(a - b) > 0.00001) throw new Error(`${label}: ${a} != ${b}`);
  };
  function interval(mesh, axis) {
    mesh.geometry.computeBoundingBox();
    const bounds = mesh.geometry.boundingBox, values = [];
    for (const x of [bounds.min.x, bounds.max.x])
      for (const y of [bounds.min.y, bounds.max.y])
        for (const z of [bounds.min.z, bounds.max.z])
          values.push(mesh.localToWorld(new THREE.Vector3(x, y, z)).dot(axis));
    return [Math.min(...values), Math.max(...values)];
  }
  const sills = [], exterior = [], frames = [], wallMeshes = [];
  scene.traverse(o => {
    if (o.name === 'White inset window sill') sills.push(o);
    if (o.name === 'Andersen 100 Series exterior concept window') exterior.push(o);
    if (o.name === 'White interior window frame') frames.push(o);
    if (['House wall', 'Kitchen wall with floor-to-ceiling quartz face', 'Upstairs partition'].includes(o.name)) wallMeshes.push(o);
  });
  let unitCount = 0;
  for (const sill of sills) {
    const returns = sill.parent, opening = returns.parent;
    const normal = new THREE.Vector3(0, 0, 1).transformDirection(returns.matrixWorld);
    const span = interval(sill, normal);
    close(span[1] - span[0], 0.5, 'sill actual normal depth');
    const vertical = interval(sill, new THREE.Vector3(0, 1, 0));
    close(vertical[1] - vertical[0], 1 / 12, 'sill actual thickness');
    const edge = returns.getWorldPosition(new THREE.Vector3()).dot(normal);
    close(span[1], edge, 'sill front flush with return front');
    let matchingWall = false;
    const sillPoint = sill.getWorldPosition(new THREE.Vector3());
    for (const wall of wallMeshes) {
      const box = new THREE.Box3().setFromObject(wall);
      // Wall portions immediately above/below this opening establish its plane.
      if (sillPoint.x >= box.min.x - 0.01 && sillPoint.x <= box.max.x + 0.01 &&
          sillPoint.z >= box.min.z - 0.6 && sillPoint.z <= box.max.z + 0.6 &&
          Math.abs(interval(wall, normal)[1] - edge) < 0.00001) matchingWall = true;
    }
    if (!matchingWall) throw new Error(`No actual wall face at ${opening.name}`);
    const units = [];
    opening.traverse(o => { if (o.name === 'White interior window frame') units.push(o); });
    if (!units.length) throw new Error(`Missing frame at ${opening.name}`);
    for (const frame of units) close(span[1] - interval(frame, normal)[1], 0.5, 'frame face to flush front');
    unitCount += units.length / 4;
    const sideBoards = returns.children.filter(part => part.name === 'White casing side board');
    const bottomBoards = returns.children.filter(part => part.name === 'White casing flat bottom board');
    if (sideBoards.length !== 2 || bottomBoards.length !== 1) throw new Error('Missing complete flat window surround');
    const bottomBoard = bottomBoards[0];
    const tangent = new THREE.Vector3(1, 0, 0).transformDirection(returns.matrixWorld);
    const bottomSpan = interval(bottomBoard, tangent);
    const sideSpans = sideBoards.map(part => interval(part, tangent));
    close(bottomSpan[0], Math.min(...sideSpans.map(span => span[0])), 'bottom board left edge aligns with sides');
    close(bottomSpan[1], Math.max(...sideSpans.map(span => span[1])), 'bottom board right edge aligns with sides');
    close(interval(bottomBoard, new THREE.Vector3(0, 1, 0))[1], vertical[0], 'bottom board meets sill underside');
    for (const board of [...sideBoards, bottomBoard]) {
      close(interval(board, normal)[1], edge + 0.0625, 'flat surround faces aligned');
      close(board.geometry.parameters.depth, 0.0625, 'surround is three-quarter-inch flat stock');
    }
    if (/^Prep joined/.test(opening.name)) {
      const bottomBox = new THREE.Box3().setFromObject(bottomBoard);
      scene.traverse(part => {
        if (part.name !== 'Prep quartz backsplash') return;
        const splashBox = new THREE.Box3().setFromObject(part);
        const overlap = bottomBox.clone().intersect(splashBox);
        if (!overlap.isEmpty() && overlap.getSize(new THREE.Vector3()).toArray().every(size => size > 0.00001))
          throw new Error('Prep bottom casing overlaps quartz backsplash');
      });
    }
    for (const name of ['White casing header', 'White casing header bead', 'White casing projecting cap']) {
      const parts = returns.children.filter(part => part.name === name);
      if (parts.length !== 1) throw new Error(`Missing or duplicate window header component: ${name}`);
      const part = parts[0];
      const bounds = interval(part, new THREE.Vector3(0, 1, 0));
      close(bounds[0] - vertical[1], part.position.y - part.geometry.parameters.height / 2, 'header vertical placement');
      if (bounds[0] < vertical[1] + returns.userData.height) throw new Error('Header intrudes below window head');
    }
    for (const part of returns.children) {
      if (['White casing header', 'White casing header bead', 'White casing projecting cap', 'White casing side board', 'White casing flat bottom board'].includes(part.name)) continue;
      if (interval(part, normal)[1] > edge + 0.00001) throw new Error('Return projects into room');
      if (/casing|apron|cap/i.test(part.name)) throw new Error('Projecting window trim remains');
      if (!part.material.color.equals(sill.material.color)) throw new Error('Window returns must share the white sill finish');
    }
    close(sill.geometry.parameters.width, returns.userData.width, 'opening-width sill, no horns');
  }
  for (const frame of exterior) {
    const center = frame.getWorldPosition(new THREE.Vector3());
    const match = frames.some(interior => {
      const owner = interior.parent.parent;
      const units = owner.children.filter(o => /casement concept|picture window unit|sidelight unit/.test(o.name));
      const midpoint = new THREE.Vector3();
      for (const unit of units) midpoint.add(unit.getWorldPosition(new THREE.Vector3()));
      midpoint.divideScalar(units.length);
      return midpoint.distanceTo(center) < 0.00001;
    });
    if (!match) throw new Error(`Exterior frame does not match an actual furnished unit at ${center.toArray()}`);
    const backing = frame.parent.children.filter(o => /Window installation solid/.test(o.name));
    if (backing.length < 4) throw new Error('Missing solid exterior installation returns');
    const normal = new THREE.Vector3(0, 0, 1).transformDirection(frame.matrixWorld);
    for (const part of backing) {
      if (interval(part, normal)[1] < center.dot(normal) + 0.12 - 0.00001)
        throw new Error('Backing stops short of frame exterior face');
    }
    const prepSill = sills.find(o => /^Prep joined/.test(o.parent.parent.name));
    let splash;
    scene.traverse(o => { if (o.name === 'Prep quartz backsplash') splash = o; });
    if (!prepSill || !splash) throw new Error('Missing prep sill/backsplash check geometry');
    if (new THREE.Box3().setFromObject(prepSill).intersectsBox(new THREE.Box3().setFromObject(splash)))
      throw new Error('Prep sill overlaps retained backsplash');
  }
  return { sillAssemblies: sills.length, furnishedUnits: unitCount, exteriorUnits: exterior.length };
}
if (typeof module !== 'undefined') module.exports = { verifyFlushWindowGeometry };
