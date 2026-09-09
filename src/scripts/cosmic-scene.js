import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createCosmicField } from '../lib/cosmic-field.mjs';

export function mountCosmicScene() {
  const host=document.querySelector('[data-cosmic-stage]');
  if(!host)return;
  const canvas=host.querySelector('canvas');
  const toggle=document.getElementById('motion-toggle');
  const reset=document.getElementById('scene-reset');
  const status=document.getElementById('scene-status');
  const preference=window.matchMedia('(prefers-reduced-motion: reduce)');
  let renderer,controls,resizeObserver,intersectionObserver;
  let disposed=false,intersecting=true,playing=!preference.matches;
  let selectedMotion=false,lastTime=null,angle=0;
  const disposables=[];
  const fail=()=>{
    if(disposed)return;
    host.dataset.state='fallback';
    canvas.hidden=true;
    toggle.hidden=true;
    reset.hidden=true;
    status.textContent='Illustrative cosmic web · static view';
  };
  try {
    renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:false,powerPreference:'low-power'});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.6));
    renderer.setClearColor(0x04050a,0);
    const scene=new THREE.Scene();
    const camera=new THREE.PerspectiveCamera(46,1,.1,180);
    const cameraStart=new THREE.Vector3(2,1.5,37);
    camera.position.copy(cameraStart);
    const cloud=new THREE.Group();
    scene.add(cloud);
    const density=window.innerWidth<700?.55:1;
    const field=createCosmicField(7021,density);
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.BufferAttribute(field.positions,3));
    geometry.setAttribute('color',new THREE.BufferAttribute(field.colors,3));
    geometry.setAttribute('pointSize',new THREE.BufferAttribute(field.sizes,1));
    const material=new THREE.ShaderMaterial({
      uniforms:{pixelRatio:{value:renderer.getPixelRatio()}},
      vertexShader:`
        attribute float pointSize;
        attribute vec3 color;
        varying vec3 pointColor;
        uniform float pixelRatio;
        void main(){
          pointColor=color;
          vec4 mv=modelViewMatrix*vec4(position,1.0);
          gl_PointSize=clamp(pointSize*440.0*pixelRatio/max(1.0,-mv.z),1.0,38.0*pixelRatio);
          gl_Position=projectionMatrix*mv;
        }`,
      fragmentShader:`
        varying vec3 pointColor;
        void main(){
          float r=length(gl_PointCoord-vec2(.5));
          if(r>.5)discard;
          float halo=exp(-r*r*18.0);
          float core=exp(-r*r*85.0);
          gl_FragColor=vec4(pointColor*(.8+core),halo*.7);
        }`,
      transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    });
    cloud.add(new THREE.Points(geometry,material));
    const lineGeometry=new THREE.BufferGeometry();
    lineGeometry.setAttribute('position',new THREE.BufferAttribute(field.linePositions,3));
    const lineMaterial=new THREE.LineBasicMaterial({color:0x579ed9,transparent:true,opacity:.10,depthWrite:false,blending:THREE.AdditiveBlending});
    cloud.add(new THREE.LineSegments(lineGeometry,lineMaterial));
    disposables.push(geometry,material,lineGeometry,lineMaterial);
    cloud.rotation.z=-.24;
    cloud.rotation.x=.13;
    controls=new OrbitControls(camera,canvas);
    controls.target.set(0,0,0);
    controls.enableZoom=false;
    controls.enablePan=false;
    controls.enableDamping=false;
    controls.rotateSpeed=.36;
    controls.minPolarAngle=.5;
    controls.maxPolarAngle=2.5;
    // Keep page scrolling natural on touchscreens; keyboard orbit remains available.
    if(window.matchMedia('(pointer: coarse)').matches)controls.enabled=false;
    canvas.style.touchAction='pan-y';
    const draw=()=>{if(!disposed)renderer.render(scene,camera);};
    const tick=(time)=>{
      if(lastTime!==null)angle+=Math.min((time-lastTime)/1000,.05)*.025;
      lastTime=time;
      cloud.rotation.y=angle;
      draw();
    };
    const schedule=()=>{
      if(disposed)return;
      lastTime=null;
      renderer.setAnimationLoop(playing && intersecting && !document.hidden ? tick : null);
      toggle.textContent=playing?'Pause motion':'Play motion';
      toggle.setAttribute('aria-pressed',String(!playing));
      host.dataset.motion=playing?'playing':'paused';
      draw();
    };
    const onResize=()=>{
      const {width,height}=host.getBoundingClientRect();
      renderer.setSize(width,height,false);
      camera.aspect=width/height;
      // Offset the 3D structure toward the open right half of the hero.
      cloud.position.x=width<700?2:7;
      cloud.position.y=width<700?3:0;
      camera.updateProjectionMatrix();
      draw();
    };
    const onToggle=()=>{selectedMotion=true;playing=!playing;schedule();};
    const onReset=()=>{
      camera.position.copy(cameraStart);
      controls.target.set(0,0,0);controls.update();
      angle=0;cloud.rotation.y=0;draw();
    };
    const onKey=(event)=>{
      if(!['ArrowLeft','ArrowRight','Home'].includes(event.key))return;
      event.preventDefault();
      if(event.key==='Home')onReset();
      else {camera.position.applyAxisAngle(new THREE.Vector3(0,1,0),event.key==='ArrowLeft'?-.1:.1);controls.update();draw();}
    };
    const onPreference=()=>{if(!selectedMotion){playing=!preference.matches;schedule();}};
    const onLost=(event)=>{event.preventDefault();fail();cleanup();};
    const cleanup=()=>{
      if(disposed)return;
      disposed=true;
      renderer.setAnimationLoop(null);
      resizeObserver?.disconnect();intersectionObserver?.disconnect();
      controls.removeEventListener('change',draw);controls.dispose();
      toggle.removeEventListener('click',onToggle);reset.removeEventListener('click',onReset);
      canvas.removeEventListener('keydown',onKey);canvas.removeEventListener('webglcontextlost',onLost);
      document.removeEventListener('visibilitychange',schedule);
      window.removeEventListener('pagehide',onPageHide);
      window.removeEventListener('pageshow',onPageShow);
      preference.removeEventListener('change',onPreference);
      disposables.forEach(item=>item.dispose());renderer.dispose();
    };
    const onPageHide=(event)=>{if(event.persisted)renderer.setAnimationLoop(null);else cleanup();};
    const onPageShow=(event)=>{if(event.persisted)schedule();};
    controls.addEventListener('change',draw);
    toggle.addEventListener('click',onToggle);reset.addEventListener('click',onReset);
    canvas.addEventListener('keydown',onKey);canvas.addEventListener('webglcontextlost',onLost);
    preference.addEventListener('change',onPreference);
    document.addEventListener('visibilitychange',schedule);
    window.addEventListener('pagehide',onPageHide);
    window.addEventListener('pageshow',onPageShow);
    resizeObserver=new ResizeObserver(onResize);resizeObserver.observe(host);
    intersectionObserver=new IntersectionObserver(([entry])=>{intersecting=entry.isIntersecting;schedule();});
    intersectionObserver.observe(host);
    onResize();schedule();
    host.dataset.state='ready';
    toggle.disabled=false;reset.disabled=false;
    status.textContent=controls.enabled?'Illustrative cosmic web · drag to orbit':'Illustrative cosmic web';
  } catch(error) {
    renderer?.setAnimationLoop(null);
    resizeObserver?.disconnect();intersectionObserver?.disconnect();
    controls?.dispose();
    disposables.forEach(item=>item.dispose());
    renderer?.dispose();
    console.warn('Cosmic scene unavailable; static content remains accessible.',error);
    fail();
  }
}
