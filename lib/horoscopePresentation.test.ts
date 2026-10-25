import test from 'node:test';
import assert from 'node:assert/strict';
import { CONSTELLATIONS, moonShape } from './horoscope/presentation';
import { SIGNS } from './horoscope/model';
import { horoscopeDesign } from './i18n/horoscope-design';
import { LOCALES } from './i18n/config';

test('all zodiac artworks have distinct, bounded, connected star paths',()=>{
  assert.deepEqual(Object.keys(CONSTELLATIONS),[...SIGNS]);
  const identities=new Set();
  for(const pattern of Object.values(CONSTELLATIONS)) {
    identities.add(JSON.stringify(pattern));
    for(const [x,y] of pattern.points) assert.ok(x>=20&&x<=220&&y>=20&&y<=220);
    const used=new Set(pattern.paths.flat());
    assert.equal(used.size,pattern.points.length);
    for(const index of used) assert.ok(pattern.points[index]);
  }
  assert.equal(identities.size,12);
});
test('Moon projection matches illuminated disc area at every major phase and both directions',()=>{
  for(const fraction of [0,.01,.25,.5,.75,.99,1]) {
    const waxing=moonShape(90,fraction,1),waning=moonShape(270,fraction,1);
    assert.equal(waxing.mirror,false);assert.equal(waning.mirror,true);
    assert.equal(waxing.path,waning.path);
    // Independently integrate the lit region between spherical limb and terminator.
    let area=0;const slices=100000,dy=2/slices;
    for(let i=0;i<slices;i++) {const y=-1+(i+.5)*dy;const limb=Math.sqrt(1-y*y);area+=(limb-waxing.terminatorX*limb)*dy;}
    assert.ok(Math.abs(area/Math.PI-fraction)<1e-6);
    assert.equal(waxing.path==='',fraction===0);
    assert.ok(!waxing.path.includes('NaN'));
  }
  assert.equal(moonShape(0,0).mirror,false);
  assert.equal(moonShape(360,0).mirror,false);
  assert.equal(moonShape(-90,.5).mirror,true);
  assert.equal(moonShape(90,2).fraction,1);
  assert.throws(()=>moonShape(NaN,.5));
});
test('redesign strings, intros, lunar themes and aspect explanations cover every UI locale',()=>{
  assert.deepEqual(Object.keys(horoscopeDesign).sort(),[...LOCALES].sort());
  for(const locale of LOCALES){
    const copy=horoscopeDesign[locale];
    assert.equal(copy.intro.length,12);assert.equal(copy.phaseThemes.length,8);assert.equal(copy.elements.length,4);
    assert.equal(Object.keys(copy.aspectThemes).length,5);
    assert.ok(copy.shareText.includes('{sign}')&&copy.shareText.includes('{date}'));
    assert.ok(copy.inSign.includes('{planet}')&&copy.inSign.includes('{sign}'));
    for(const value of Object.values(copy)){if(typeof value==='string')assert.ok(value.trim().length>0);else for(const text of Object.values(value))assert.ok(text.trim().length>0);}
  }
});
