import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createCosmicField, decodeCosmicCatalogue } from '../lib/cosmic-field.mjs';

export async function mountCosmicScene() {
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
    const request=new AbortController();
    const onLoadingPageHide=(event)=>{if(!event.persisted){disposed=true;request.abort();}};
    window.addEventListener('pagehide',onLoadingPageHide);
    const timeout=setTimeout(()=>request.abort(),15000);
    let catalogue;
    try {
      const response=await fetch(host.dataset.sourceUrl,{signal:request.signal});
      if(!response.ok)throw new Error(`Cosmic catalogue request failed (${response.status})`);
      catalogue=decodeCosmicCatalogue(await response.arrayBuffer());
    } finally {
      clearTimeout(timeout);
      window.removeEventListener('pagehide',onLoadingPageHide);
    }
    if(disposed)return;
    renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,window.innerWidth<700?1.25:1.5));
    renderer.setClearColor(0x04050a,0);
    const scene=new THREE.Scene();
    const camera=new THREE.PerspectiveCamera(46,1,.1,180);
    const cameraStart=new THREE.Vector3(2,1.5,37);
    camera.position.copy(cameraStart);
    const cloud=new THREE.Group();
    scene.add(cloud);
    const density=window.innerWidth<700?.55:1;
    const field=createCosmicField(catalogue,density);
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.BufferAttribute(field.positions,3));
    geometry.setAttribute('variance',new THREE.BufferAttribute(field.variances,3));
    geometry.setAttribute('covariance',new THREE.BufferAttribute(field.covariances,3));
    geometry.setAttribute('opacity',new THREE.BufferAttribute(field.opacities,1));
    geometry.setAttribute('tone',new THREE.BufferAttribute(field.tones,1));
    const material=new THREE.ShaderMaterial({
      uniforms:{pixelRatio:{value:renderer.getPixelRatio()},viewportHeight:{value:1}},
      vertexShader:`
        attribute vec3 variance;
        attribute vec3 covariance;
        attribute float opacity;
        attribute float tone;
        varying float pointOpacity;
        varying float pointTone;
        varying float pixelSize;
        varying vec3 inverseKernel;
        uniform float pixelRatio;
        uniform float viewportHeight;
        void main(){
          pointOpacity=opacity;
          pointTone=tone;
          vec4 mv=modelViewMatrix*vec4(position,1.0);
          mat3 kernel=mat3(variance.x,covariance.x,covariance.y,
            covariance.x,variance.y,covariance.z,covariance.y,covariance.z,variance.z);
          mat3 rotation=mat3(modelViewMatrix);
          mat3 projected=rotation*kernel*transpose(rotation);
          float a=projected[0][0],b=projected[1][1],c=projected[0][1];
          float largest=.5*(a+b+sqrt((a-b)*(a-b)+4.0*c*c));
          float normalization=36.0*largest;
          inverseKernel=vec3(b,a,-2.0*c)*normalization/max(a*b-c*c,1e-10);
          pixelSize=clamp(6.0*sqrt(largest)*viewportHeight*projectionMatrix[1][1]/(2.0*max(1.0,-mv.z)),2.0*pixelRatio,110.0*pixelRatio);
          gl_PointSize=pixelSize;
          gl_Position=projectionMatrix*mv;
        }`,
      fragmentShader:`
        varying float pointOpacity;
        varying float pointTone;
        varying float pixelSize;
        varying vec3 inverseKernel;
        uniform float pixelRatio;
        void main(){
          vec2 p=vec2(gl_PointCoord.x-.5,.5-gl_PointCoord.y);
          float r2=dot(p,p);
          if(r2>.25)discard;
          float exponent=dot(vec3(p.x*p.x,p.y*p.y,p.x*p.y),inverseKernel);
          float diffuse=max(0.0,exp(-.5*exponent)-.011109);
          float core=exp(-r2*pixelSize*pixelSize/(2.2*pixelRatio*pixelRatio));
          vec3 color=mix(vec3(.19,.40,.65),vec3(.70,.83,.95),pointTone);
          float alpha=pointOpacity*(diffuse+core*1.4);
          gl_FragColor=vec4(color,alpha);
        }`,
      transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    });
    cloud.add(new THREE.Points(geometry,material));
    disposables.push(geometry,material);
    cloud.rotation.z=-.18;
    cloud.rotation.x=.10;
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
      if(lastTime!==null && time-lastTime<1000/30-1)return;
      if(lastTime!==null)angle+=Math.min((time-lastTime)/1000,.1)*.045;
      lastTime=time;
      cloud.rotation.y=.24*Math.sin(angle);
      draw();
    };
    const schedule=()=>{
      if(disposed)return;
      lastTime=null;
      const active=playing && intersecting && !document.hidden;
      renderer.setAnimationLoop(active ? tick : null);
      host.dataset.rendering=active?'running':'idle';
      toggle.textContent=playing?'Pause motion':'Play motion';
      toggle.setAttribute('aria-pressed',String(!playing));
      host.dataset.motion=playing?'playing':'paused';
      draw();
    };
    const onResize=()=>{
      const {width,height}=host.getBoundingClientRect();
      renderer.setSize(width,height,false);
      camera.aspect=width/height;
      // Spread the web across the background behind the title and profile.
      cloud.position.set(0,width<700?1:0,0);
      cloud.scale.setScalar(width<700?.85:1.3);
      material.uniforms.viewportHeight.value=height*renderer.getPixelRatio();
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
    if(disposed)return;
    renderer?.setAnimationLoop(null);
    resizeObserver?.disconnect();intersectionObserver?.disconnect();
    controls?.dispose();
    disposables.forEach(item=>item.dispose());
    renderer?.dispose();
    console.warn('Cosmic scene unavailable; static content remains accessible.',error);
    fail();
  }
}
