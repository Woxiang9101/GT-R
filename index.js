import {
    CubeTextureLoader,
    PerspectiveCamera,
    Scene,
    WebGLRenderer,
    AmbientLight,
    DirectionalLight,
    MeshPhysicalMaterial,
    MeshLambertMaterial,
    Color,
    RectAreaLight,
    RectAreaLightHelper,
    PointLight,
    Vector2,
    ShaderMaterial

} from "three/build/three.module.js";


import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { PMREMGenerator } from 'three/examples/jsm/pmrem/PMREMGenerator.js';
import { PMREMCubeUVPacker } from 'three/examples/jsm/pmrem/PMREMCubeUVPacker.js';

import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { AfterimagePass } from 'three/examples/jsm/postprocessing/AfterimagePass.js';
import { GlitchPass } from 'three/examples/jsm/postprocessing/GlitchPass.js';
import {UnrealBloomPass} from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import {ShaderPass} from "three/examples/jsm/postprocessing/ShaderPass.js";


let container, stats, controls;
let camera, scene, renderer;
let mycar,cartop,carlight;
let API = {
    color: 1653,
    '眩晕特效':false,
    '信号错误特效':false,
    '打开车灯':true,
    '自动旋转':true

};
let myMaterial;
let rectLight,rectLightHelper,lightp2,lightp3;
let composer,afterimagePass,glitchPass,bloomComposer,finalComposer;
let redlight;
let materials = {};
let backtex;
let autoRotate;

init();
animate();

function init() {

    container = document.createElement( 'div' );
    document.body.appendChild( container );

    renderer = new WebGLRenderer( { antialias: true} );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.gammaOutput = true;
    container.appendChild( renderer.domElement );

    camera = new PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 9000000 );
    camera.position.set( - 1.8 *120, 0.9*120, 2.7*120 );

    controls = new OrbitControls( camera , renderer.domElement );
    controls.target.set( 0, - 0.2, - 0.2 );
    controls.update();

    scene = new Scene();

    let light = new AmbientLight( 0x404040 ); // soft white light
    scene.add( light );
    let directionalLight = new DirectionalLight( 0xffffff, 15 );
    scene.add( directionalLight );


    let width = 500;
    let height = 500;
    let intensity = 1;
    rectLight = new RectAreaLight( 0xffffff, intensity,  width, height );
    rectLight.position.set( 0, 0, 500 );
    rectLight.lookAt( 0, 0, 0 );
    scene.add( rectLight );
    rectLightHelper = new RectAreaLightHelper( rectLight );
    rectLightHelper.position.set( 0, 0, 500 );
    // scene.add( rectLightHelper );

    let lightP = new PointLight( 0xffffff, 10, 0 );
    lightP.position.set( 0, 50, 300 );
    scene.add( lightP );


    //镜头光晕
    lightp2 = new PointLight( 0xffffff, 1.5, 2000 );
    lightp3 = new PointLight( 0xffffff, 1.5, 2000 );

    lightp2.position.set(-74,197,17);
    lightp3.position.set(72,197,17);



    //gui
    let gui = new dat.GUI();
    gui.addColor( API, 'color' )
        .listen()
        .onChange( function () {
            cartop.material.color = new Color(API.color);
        } );
    gui.add( API, '打开车灯' )
        .onChange( function () {

        } );
    gui.add( API, '眩晕特效' )
        .onChange( function () {
            console.log(composer);
            if(API['眩晕特效']){
                afterimagePass.enabled = true;
            }
            else {
                afterimagePass.enabled = false;
            }
        } );
    gui.add( API, '信号错误特效' )
        .onChange( function () {
            if(API['信号错误特效']){
                glitchPass.enabled = true;
            }
            else {
                glitchPass.enabled = false;
            }
        } );
    gui.add( API, '自动旋转' )
        .onChange( function () {
            if(API['自动旋转']){
                autoRotate = true;
            }
            else {
                autoRotate = false;
            }
        } );


    gui.domElement.style.webkitUserSelect = 'none';
    // gui.close();



    let urls = [ 'posx.jpg', 'negx.jpg', 'posy.jpg', 'negy.jpg', 'posz.jpg', 'negz.jpg' ];
    let loader = new CubeTextureLoader().setPath( 'Bridge/' );
    loader.load( urls, function ( texture ) {

        let pmremGenerator = new PMREMGenerator( texture );
        pmremGenerator.update( renderer );

        let pmremCubeUVPacker = new PMREMCubeUVPacker( pmremGenerator.cubeLods );
        pmremCubeUVPacker.update( renderer );

        let envMap = pmremCubeUVPacker.CubeUVRenderTarget.texture;


        // model

        // let loader = new GLTFLoader().setPath( 'models/gltf/DamagedHelmet/glTF/' );

        let loader = new GLTFLoader();

        loader.load( 'car/blobcar.glb', function ( gltf ) {


            mycar = gltf.scene;
            console.log(gltf);

            gltf.scene.traverse( function ( child ) {

                if ( child.isMesh ) {

                    let color = child.material.color;
                    let material = new MeshPhysicalMaterial( {color: color} );
                    material.roughness = 0.2;
                    material.metalness = 1;

                    if(child.name === 'gtr_glass_red'){
                        redlight = child;
                    }

                    if(child.name === 'gtr_glass'){
                        carlight = child;
                        material.transparent = true;
                        material.opacity = 0.15;
                        child.add(lightp2);
                        child.add(lightp3);
                    }
                    else if(child.name === 'gtr_window'){
                        material.transparent = true;
                        material.opacity = 0.35;
                        material.roughness = 0;
                        material.metalness = 1;
                    }
                    else if(child.name === 'gtr_HDM_04_03_tire_fl_(1)' || child.name ==='gtr_HDM_04_03_tire_rl'
                        ||child.name ==='gtr_HDM_04_03_tire_rr'||child.name ==='gtr_HDM_04_03_tire_fl'
                        ||child.name === 'gtr_black_lacquer'||child.name === 'gtr_plastic'
                        ||child.name === 'gtr_plastic'){
                        material = new MeshLambertMaterial( {color: color} );
                    }
                    else if(child.name ==='gtr_carpaint'){
                        cartop = child;
                        material.opacity = child.material.opacity;
                        material.envMap  = envMap;
                    }
                    else{
                        material.opacity = child.material.opacity;
                        material.envMap  = envMap;

                    }

                    myMaterial = material;
                    child.material = material;

                }

            } );

            scene.add( gltf.scene );
            // scene.add( redlight );

        } ,function ( xhr ) {

            let pro = Math.floor(xhr.loaded / xhr.total *10000)/100;
            let progressBar = document.getElementById('progressBar');
            progressBar.innerText =
                '加载中 ' + pro + '%......';
           if (pro === 100){
               progressBar.style.display = 'none';
           }

        });

        pmremGenerator.dispose();
        pmremCubeUVPacker.dispose();

        backtex = texture;
        // scene.background = texture;

    } );

    let canvas = document.createElement( 'canvas' );
    let context = canvas.getContext( 'webgl2' );


    window.addEventListener( 'resize', onWindowResize, false );

    // stats
    stats = new Stats();
    container.appendChild( stats.dom );


    //后期处理
    composer = new EffectComposer( renderer );
    let renderPass = new RenderPass( scene, camera );
    composer.addPass( renderPass );
    //眩晕特效
    afterimagePass = new AfterimagePass();
    afterimagePass.enabled = false;
    composer.addPass( afterimagePass );
    //信号错误特效
    glitchPass = new GlitchPass();
    glitchPass.enabled = false;
    composer.addPass( glitchPass );


    /**定义bloom发光特效合成器，不输出到屏幕*/
    bloomComposer = new EffectComposer(renderer);
    bloomComposer.renderToScreen = false;
    //初始渲染过程，（位于开始，渲染好的场景作为输入）
    let renderScene = new RenderPass(scene, camera);
    //bloom发光过程
    let bloomPass = new UnrealBloomPass(new Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
    bloomPass.threshold = 0;
    bloomPass.strength = 8;
    bloomPass.radius = 0;
    //bloom发光特效合成器添加过程链（原始，发光过程）
    bloomComposer.addPass(renderScene);
    bloomComposer.addPass(bloomPass);


    /**finalPass自定义着色器处理过程，材质处理*/
    let finalPass = new ShaderPass(
        new ShaderMaterial({
            uniforms: {
                baseTexture: {value: null},
                bloomTexture: {value: bloomComposer.renderTarget2.texture}
            },
            vertexShader: document.getElementById('vertexshader').textContent,
            fragmentShader: document.getElementById('fragmentshader').textContent,
            defines: {}
        }), "baseTexture"
    );
    finalPass.needsSwap = true;
    //最终特效合成器（原始场景，最终过程处理）
    finalComposer = new EffectComposer(renderer);
    finalComposer.addPass(renderScene);
    finalComposer.addPass(finalPass);
    finalComposer.addPass( afterimagePass );
    finalComposer.addPass( glitchPass );



}

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );

}

function animate() {

    requestAnimationFrame( animate );
    stats.update();

    if (cartop){
        cartop.material.color = new Color(API.color);
    }

    if (mycar && API['自动旋转']){
        mycar.rotation.y -= 0.002;
    }


    if(API['打开车灯'] && mycar){
        scene.background = null;

        let darkMaterial = new THREE.MeshBasicMaterial({color: "black"});
        mycar.traverse( function ( child ) {
            if(child.name !== 'gtr_glass_red' && child.name !== 'gtr_glass'){
                materials[child.uuid] = child.material;
                child.material = darkMaterial;
            }

        });


        bloomComposer.render();

        mycar.traverse( function ( child ) {
            if(child.name !== 'gtr_glass_red' && child.name !== 'gtr_glass'){
                child.material = materials[child.uuid];
            }
        });

        scene.background = backtex;
        finalComposer.render();
    }
    else{
        composer.render();
    }



}
